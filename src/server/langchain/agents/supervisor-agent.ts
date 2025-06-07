import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import type { AgentState } from "../types";
import { RouteToAgentSchema } from "../types/schemas";
import {
  createSpecializedLLM,
  prepareAgentMessages,
  getCleanContentForAiMessage,
  extractToolCallsFromContent,
  processToolCalls,
  validateToolArgs,
  handleAgentError,
  logger,
} from "../utils";
import { getSupervisorTools } from "../tools";

/**
 * Supervisor agent node that handles routing and coordination
 * @param state - Current agent state
 * @returns Updated state with routing decision
 */
export async function supervisorNode(
  state: typeof AgentState.State,
): Promise<Partial<typeof AgentState.State>> {
  try {
    // Create LLM with specialized configuration
    const model = await createSpecializedLLM("supervisor");
    const llm = model.bindTools(getSupervisorTools());
    logger.info("Successfully initialized supervisor LLM with tools");

    const systemMessage = `You are the Supervisor Agent for CareerCraft Studio, an AI system that helps users create professional resumes and cover letters.

Your primary job is to analyze messages and route them to the correct specialized agent. Your routing decisions are critical to system functioning.

INTERACTIVE ELEMENTS:
You can provide interactive buttons and links in your responses using these formats:

1. Action Buttons (for user confirmation/choices):
<div data-interactive="action-group">
  <button data-type="chat-action" data-message="parse and store">Parse and Store</button>
  <button data-type="chat-action" data-message="just analyze this job posting">Analyze Only</button>
</div>

2. Navigation Links:
[View your skills](@navigate:/dashboard/skills)
[Check job posting compatibility](@navigate:/dashboard/job-postings?action=compatibility&jobId={jobId})

3. Chat Actions:
[Yes, add this to my profile](@chat:yes, add this to my profile)

Use these when:
- User provides ambiguous content (job posting, resume) - offer action choices
- After successful operations - suggest next steps with navigation
- When referencing specific items - provide direct links

CLARIFICATION PATTERNS - Ask for clarification when:
1. User provides job posting content without clear intent: "Job post: [content]" or "Here's a job posting: [content]"
   - Provide action buttons: "I see you've shared a job posting. What would you like me to do with it?"
   
   <div data-interactive="action-group">
     <button data-type="chat-action" data-message="parse and store this job posting">Parse and Store</button>
     <button data-type="chat-action" data-message="just analyze the requirements">Analyze Only</button>
     <button data-type="chat-action" data-message="compare this to my skills">Compare to My Skills</button>
   </div>

2. User provides resume content without clear intent: "My resume: [content]" or "Here's my resume: [content]"
   - Provide action buttons: "I see you've shared resume content. What would you like me to do with it?"
   
   <div data-interactive="action-group">
     <button data-type="chat-action" data-message="parse and store this resume information">Parse and Store</button>
     <button data-type="chat-action" data-message="provide feedback on this resume">Give Feedback</button>
     <button data-type="chat-action" data-message="help me improve this resume">Help Improve</button>
   </div>

3. Ambiguous requests about skills: "What about my skills?" or "Skills analysis"
   - Provide navigation and action options: "I can help with skills in several ways:"
   
   <div data-interactive="action-group">
     <button data-type="navigation" data-route="/dashboard/skills">View Current Skills</button>
     <button data-type="chat-action" data-message="compare my skills to a job posting">Compare to Job</button>
     <button data-type="chat-action" data-message="help me add new skills">Add New Skills</button>
   </div>

ROUTING RULES:
1. For data storage or retrieval requests (work history, education, etc.) OR resume parsing: Route to 'data_manager'
   Example: "Can you store my work experience?", "Look up my skills", "Save my preferences", "Parse this resume", "I'm pasting my resume"

2. For resume creation, editing, or advice: Route to 'resume_generator'
   Example: "Create a resume", "How should I format my resume?", "Help with my resume"

3. For cover letter creation, editing, or advice: Route to 'cover_letter_generator'
   Example: "Write a cover letter", "Tailor a cover letter for this job", "Cover letter tips"

4. For job posting analysis, parsing, OR skill comparison: Route to 'job_posting_manager'
   Example: "Parse this job posting", "Analyze job requirements", "What does this job require?", "How do my skills match this job?", "Compare my skills to job requirements"
   Note: Job posting parsing and storage now happen automatically in one action

5. For general user profile questions: Route to 'user_profile'
   Example: "What information do you have about me?", "How is my data used?"

6. For general questions or completed tasks: Call 'route_to_agent' with '${END}'
   Example: "Thank you", "That's all for now"

IMPORTANT: When content is provided without clear intent, provide clarification options with interactive buttons instead of assuming. Only route to agents when the user's intent is clear.

ROUTING RESPONSE FORMAT:
When you route to another agent, provide a brief acknowledgment in your response content, such as:
- "I'll look up your skills data for you." (when routing to data_manager)
- "Let me help you with your resume." (when routing to resume_generator)
- "I'll analyze that job posting for you." (when routing to job_posting_manager)

ALWAYS call the 'route_to_agent' tool with one of these exact destination values: 'data_manager', 'resume_generator', 'cover_letter_generator', 'job_posting_manager', 'user_profile', or '${END}'.

If you're unsure which specialized agent to route to, ask for clarification rather than guessing.

If you don't call 'route_to_agent', your response will be sent directly to the user, so only do this for clarification questions or simple informational responses.`;

    // Prepare messages using the utility function
    const messages = prepareAgentMessages(state.messages, systemMessage);

    logger.info("Supervisor invoking LLM", {
      messageCount: messages.length,
      userId: state.userId,
    });

    // Invoke the LLM
    const response = await llm.invoke(messages);

    // Debug logging to understand the response structure
    logger.info("Supervisor LLM response debug", {
      hasToolCalls: !!(response?.tool_calls && response.tool_calls.length > 0),
      toolCallsLength: response?.tool_calls?.length ?? 0,
      contentType: typeof response?.content,
      contentPreview:
        typeof response?.content === "string"
          ? response.content.substring(0, 200)
          : JSON.stringify(response?.content).substring(0, 200),
      rawResponse: JSON.stringify(response).substring(0, 500),
    });

    // Check if tool calls are embedded in content (workaround for Google GenAI bug)
    if (
      (!response?.tool_calls || response.tool_calls.length === 0) &&
      response?.content
    ) {
      const extractedToolCalls = extractToolCallsFromContent(response.content);

      if (extractedToolCalls && extractedToolCalls.length > 0) {
        logger.info("Successfully extracted tool calls from content", {
          extractedCount: extractedToolCalls.length,
          toolNames: extractedToolCalls.map((tc) => tc.name),
        });

        return await processSupervisorToolCalls(extractedToolCalls, response);
      }
    }

    // Process tool calls if present (normal path)
    if (response?.tool_calls && response.tool_calls.length > 0) {
      return await processSupervisorToolCalls(response.tool_calls, response);
    }

    // Handle direct response
    return handleSupervisorDirectResponse(response);
  } catch (error) {
    return handleAgentError(error, "supervisor");
  }
}

/**
 * Processes supervisor tool calls with validation
 * @param toolCalls - Tool calls to process
 * @param response - LLM response
 * @returns State update with routing decision
 */
async function processSupervisorToolCalls(
  toolCalls: Array<{
    name?: string;
    args?: unknown;
    id?: string;
    type?: string;
  }>,
  response: {
    content?: unknown;
    tool_calls?: Array<{
      name: string;
      args: Record<string, unknown>;
      id?: string;
      type?: "tool_call";
    }>;
  },
): Promise<{ messages: BaseMessage[]; next: string }> {
  try {
    const processedToolCalls = processToolCalls(toolCalls);
    const cleanContent = getCleanContentForAiMessage(response.content);

    if (processedToolCalls.length === 0) {
      logger.warn(
        "All supervisor tool calls were filtered out, providing direct response",
      );
      return {
        messages: [
          new AIMessage({
            content: cleanContent || "I understand your request.",
          }),
        ],
        next: END,
      };
    }

    const routingCall = processedToolCalls.find(
      (tc) => tc.name === "route_to_agent",
    );

    if (routingCall) {
      try {
        const validatedArgs = validateToolArgs(
          routingCall.args,
          RouteToAgentSchema,
          "route_to_agent",
        );
        let destination = validatedArgs.next;

        if (destination === "__end__") {
          destination = END;
        }

        logger.info("Supervisor routing decision", { destination });

        return {
          messages: [
            new AIMessage({
              content: cleanContent || "I understand your request.",
              tool_calls: [routingCall],
            }),
          ],
          next: destination,
        };
      } catch (validationError) {
        logger.error("Invalid routing arguments", {
          args: routingCall.args,
          error: validationError,
        });

        return {
          messages: [
            new AIMessage(
              "I encountered an error with my routing decision. Let me try to help you directly.",
            ),
          ],
          next: END,
        };
      }
    }

    logger.warn("No route_to_agent tool call found, handling directly");
    return {
      messages: [
        new AIMessage({
          content: cleanContent || "I understand your request.",
        }),
      ],
      next: END,
    };
  } catch (error) {
    logger.error("Error processing supervisor tool calls", { error });
    return {
      messages: [
        new AIMessage(
          "I encountered an error while processing your request. Please try again.",
        ),
      ],
      next: END,
    };
  }
}

/**
 * Handles supervisor direct responses (no tool calls)
 * @param response - LLM response
 * @returns State update with direct response
 */
function handleSupervisorDirectResponse(response: { content?: unknown }): {
  messages: BaseMessage[];
  next: string;
} {
  const cleanContent = getCleanContentForAiMessage(response.content);

  if (
    !cleanContent ||
    (typeof cleanContent === "string" && cleanContent.trim() === "")
  ) {
    logger.warn("Supervisor response had empty content");
    return {
      messages: [
        new AIMessage(
          "I apologize, but I don't have enough information to help with that specific request. Could you provide more details about what you're looking for?",
        ),
      ],
      next: END,
    };
  }

  logger.info("Supervisor providing direct response");
  return {
    messages: [new AIMessage({ content: cleanContent })],
    next: END,
  };
}
