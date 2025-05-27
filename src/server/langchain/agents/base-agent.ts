import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import type { AgentState, ValidatedToolCall, CompletedAction } from "../types";
import {
  createSpecializedLLM,
  handleAgentError,
  checkLoopLimits,
  updateLoopMetrics,
  processToolCalls,
  prepareAgentMessages,
  getCleanContentForAiMessage,
  extractToolCallsFromContent,
  validateUserId,
  logger,
} from "../utils";

/**
 * Configuration interface for creating agent nodes
 */
export interface AgentConfig {
  /** Type identifier for the agent */
  agentType: string;
  /** System message that defines the agent's role and capabilities */
  systemMessage: string;
  /** Function to get tools available to this agent */
  getTools: (
    userId: string,
  ) => Array<{ name: string; invoke: (args: unknown) => Promise<string> }>;
  /** Optional custom tool call processor */
  processToolCalls?: (
    toolCalls: ValidatedToolCall[],
    userId: string,
    response: {
      content?: unknown;
      tool_calls?: Array<{
        name?: string;
        args?: unknown;
        id?: string;
        type?: string;
      }>;
    },
    completedActions?: CompletedAction[],
  ) => Promise<string>;
  /** Whether this agent requires a valid user ID (default: true) */
  requiresUserId?: boolean;
}

/**
 * Agent node factory that creates standardized agent functions
 * @param config - Agent configuration
 * @returns Agent node function for use in StateGraph
 */
export function createAgentNode(config: AgentConfig) {
  return async (
    state: typeof AgentState.State,
  ): Promise<Partial<typeof AgentState.State>> => {
    try {
      // Check loop limits before processing
      const loopCheck = checkLoopLimits(
        state.loopMetrics ?? {
          agentSwitches: 0,
          toolCallsPerAgent: {},
          clarificationRounds: 0,
          lastAgentType: null,
        },
        config.agentType,
      );

      if (loopCheck.exceeded) {
        logger.warn(`Loop limit exceeded for ${config.agentType}`, {
          reason: loopCheck.reason,
          agentType: config.agentType,
        });

        return {
          messages: [
            new AIMessage(
              `${loopCheck.reason}. ${loopCheck.suggestion ?? "Please try a different approach or provide more specific information."}`,
            ),
          ],
          next: END,
        };
      }

      // Create LLM with specialized configuration
      const model = await createSpecializedLLM("agent");

      // Validate user ID if required (default: true)
      const requiresUserId = config.requiresUserId ?? true;
      if (requiresUserId) {
        validateUserId(state.userId);
      }

      const userId = state.userId || "";

      // Get tools and bind to LLM
      const tools = config.getTools(userId);
      const llm = model.bindTools(tools);

      logger.info(
        `Successfully initialized ${config.agentType} LLM with tools`,
        {
          agentType: config.agentType,
          toolCount: tools.length,
          userId: userId ? "[PRESENT]" : "[MISSING]",
          loopMetrics: state.loopMetrics,
        },
      );

      // Prepare messages using the utility function
      const messages = prepareAgentMessages(
        state.messages,
        config.systemMessage,
      );

      logger.info(`${config.agentType} invoking LLM`, {
        messageCount: messages.length,
        userId: userId ? "[PRESENT]" : "[MISSING]",
      });

      // Invoke the LLM
      const response = await llm.invoke(messages);

      // Count tool calls for loop metrics
      const toolCallCount = response?.tool_calls?.length ?? 0;

      // Update loop metrics
      const updatedLoopMetrics = updateLoopMetrics(
        state.loopMetrics ?? {
          agentSwitches: 0,
          toolCallsPerAgent: {},
          clarificationRounds: 0,
          lastAgentType: null,
        },
        config.agentType,
        toolCallCount,
      );

      // Handle tool calls properly using LangChain format
      if (response?.tool_calls && response.tool_calls.length > 0) {
        const result = await handleAgentToolCalls(
          response,
          config,
          userId,
          state,
        );
        return {
          ...result,
          loopMetrics: updatedLoopMetrics,
        };
      }

      // Handle direct response
      const result = handleDirectAgentResponse(response, config.agentType);
      return {
        ...result,
        loopMetrics: updatedLoopMetrics,
      };
    } catch (error) {
      return handleAgentError(error, config.agentType);
    }
  };
}

/**
 * Handles agent tool calls using proper LangChain format
 * @param response - LLM response with tool calls
 * @param config - Agent configuration
 * @param userId - User ID for tool execution
 * @param state - Current agent state
 * @returns Updated state with tool call results
 */
async function handleAgentToolCalls(
  response: {
    content?: unknown;
    tool_calls?: Array<{
      name?: string;
      args?: unknown;
      id?: string;
      type?: string;
    }>;
  },
  config: AgentConfig,
  userId: string,
  state: typeof AgentState.State,
): Promise<{
  messages: BaseMessage[];
  next: string;
  completedActions?: CompletedAction[];
}> {
  try {
    let toolCallsToProcess = response.tool_calls;
    const cleanContent = getCleanContentForAiMessage(response.content);

    if (
      (!toolCallsToProcess || toolCallsToProcess.length === 0) &&
      response?.content
    ) {
      const extractedToolCalls = extractToolCallsFromContent(response.content);
      if (extractedToolCalls && extractedToolCalls.length > 0) {
        logger.info(
          `Successfully extracted tool calls from content for ${config.agentType}`,
          {
            extractedCount: extractedToolCalls.length,
            toolNames: extractedToolCalls.map((tc) => tc.name),
          },
        );
        toolCallsToProcess = extractedToolCalls;
      }
    }

    if (!toolCallsToProcess || toolCallsToProcess.length === 0) {
      return handleDirectAgentResponse(
        { content: cleanContent },
        config.agentType,
      );
    }

    const processedToolCalls = processToolCalls(toolCallsToProcess);

    if (processedToolCalls.length === 0) {
      logger.warn(`All ${config.agentType} tool calls were filtered out`, {
        agentType: config.agentType,
      });
      return handleDirectAgentResponse(
        { content: cleanContent },
        config.agentType,
      );
    }

    const aiMessageWithToolCalls = new AIMessage({
      content: cleanContent,
      tool_calls: (response.tool_calls ?? [])
        .map((tc) => {
          let parsedArgs: Record<string, unknown> = {};
          if (typeof tc.args === "string") {
            try {
              parsedArgs = JSON.parse(tc.args) as Record<string, unknown>;
            } catch (e) {
              logger.warn(
                "Failed to parse stringified tool call args for AIMessage",
                { args: tc.args, error: e },
              );
              // Keep parsedArgs as {} if parsing fails
            }
          } else if (typeof tc.args === "object" && tc.args !== null) {
            parsedArgs = tc.args as Record<string, unknown>;
          } // else tc.args is undefined or some other type, parsedArgs remains {}

          return {
            name: tc.name ?? "",
            args: parsedArgs,
            id: tc.id,
            type: "tool_call" as const,
          };
        })
        .filter((tc) => tc.id && tc.name), // Also ensure name is present for a valid tool_call
    });

    // Track completed actions for duplicate detection
    const newCompletedActions: CompletedAction[] = [];

    if (config.processToolCalls) {
      try {
        const customResult = await config.processToolCalls(
          processedToolCalls,
          userId,
          // Pass the original response structure
          { content: cleanContent, tool_calls: response.tool_calls },
          state.completedActions,
        );

        // Create completed actions for each tool call that was processed
        for (const toolCall of processedToolCalls) {
          const completedAction: CompletedAction = {
            id: `${config.agentType}_${toolCall.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agentType: config.agentType,
            toolName: toolCall.name,
            args: toolCall.args,
            result: customResult.substring(0, 500), // Store first 500 chars of result
            timestamp: Date.now(),
          };

          newCompletedActions.push(completedAction);
        }

        const customResultMessage = new ToolMessage({
          content: customResult,
          tool_call_id:
            processedToolCalls[0]?.id ?? `custom_processing_${Date.now()}`,
        });
        return {
          messages: [aiMessageWithToolCalls, customResultMessage],
          next: "supervisor",
          completedActions: newCompletedActions,
        };
      } catch (customError) {
        logger.error(`Error in custom tool processor for ${config.agentType}`, {
          error:
            customError instanceof Error
              ? customError.message
              : String(customError),
          agentType: config.agentType,
        });
        // Fallback to default processing if custom processor fails
      }
    }

    const toolMessages: ToolMessage[] = [];
    const tools = config.getTools(userId);

    for (const toolCall of processedToolCalls) {
      try {
        const tool = tools.find((t) => t.name === toolCall.name);
        if (!tool) {
          logger.warn(`Tool ${toolCall.name} not found in available tools`, {
            agentType: config.agentType,
            availableTools: tools.map((t) => t.name),
          });
          toolMessages.push(
            new ToolMessage({
              content: `Error: Tool ${toolCall.name} not found`,
              tool_call_id: toolCall.id,
            }),
          );
          continue;
        }

        logger.info(`Executing tool ${toolCall.name}`, {
          agentType: config.agentType,
          toolArgs: toolCall.args,
        });
        const toolResult = await tool.invoke(toolCall.args);
        const toolResultString =
          typeof toolResult === "string"
            ? toolResult
            : JSON.stringify(toolResult);

        toolMessages.push(
          new ToolMessage({
            content: toolResultString,
            tool_call_id: toolCall.id,
          }),
        );

        // Track this as a completed action
        const completedAction: CompletedAction = {
          id: `${config.agentType}_${toolCall.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agentType: config.agentType,
          toolName: toolCall.name,
          args: toolCall.args,
          result: toolResultString.substring(0, 500), // Store first 500 chars of result
          timestamp: Date.now(),
        };

        newCompletedActions.push(completedAction);

        logger.info(`Tool ${toolCall.name} executed successfully`, {
          agentType: config.agentType,
          resultLength: toolResultString.length,
        });
      } catch (toolError) {
        const errorMessage =
          toolError instanceof Error ? toolError.message : String(toolError);
        logger.error(`Error executing tool ${toolCall.name}`, {
          agentType: config.agentType,
          error: errorMessage,
          toolArgs: toolCall.args,
        });
        toolMessages.push(
          new ToolMessage({
            content: `Error executing ${toolCall.name}: ${errorMessage}`,
            tool_call_id: toolCall.id,
          }),
        );
      }
    }

    return {
      messages: [aiMessageWithToolCalls, ...toolMessages],
      next: "supervisor",
      completedActions: newCompletedActions,
    };
  } catch (error) {
    logger.error(`Error in handleAgentToolCalls for ${config.agentType}`, {
      error: error instanceof Error ? error.message : String(error),
      agentType: config.agentType,
    });
    return {
      messages: [
        new AIMessage(
          "I encountered an error while processing the tool calls. Please try again.",
        ),
      ],
      next: "supervisor",
    };
  }
}

/**
 * Handles direct responses from agents (no tool calls)
 * @param response - LLM response
 * @param agentType - Type of agent
 * @returns State update with direct response
 */
function handleDirectAgentResponse(
  response: { content?: unknown },
  agentType: string,
): { messages: BaseMessage[]; next: string } {
  const cleanContent = getCleanContentForAiMessage(response.content);

  if (
    !cleanContent ||
    (typeof cleanContent === "string" && cleanContent.trim() === "")
  ) {
    logger.warn(`${agentType} response had empty content`, { agentType });
    return {
      messages: [
        new AIMessage(
          "I processed your request but couldn't generate a proper response. Let me hand this back to the supervisor.",
        ),
      ],
      next: "supervisor",
    };
  }

  logger.info(`${agentType} generated response`, {
    agentType,
    responseLength:
      typeof cleanContent === "string"
        ? cleanContent.length
        : JSON.stringify(cleanContent).length,
  });

  return {
    messages: [new AIMessage({ content: cleanContent })],
    next: "supervisor",
  };
}
