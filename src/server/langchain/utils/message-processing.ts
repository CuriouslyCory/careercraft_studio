import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { AgentStateType, LLMPart } from "../types";
import { logger } from "./logging";

/**
 * Message processing utilities for the agent system
 */

/**
 * Safely converts message content to string format
 * @param content - The content to convert (can be various types)
 * @returns String representation of the content
 */
export function contentToString(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content === null || content === undefined) {
    return "";
  }

  // Handle array content (MessageContentComplex[])
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(" ");
  }

  // Handle object content - try to extract meaningful text
  if (typeof content === "object") {
    try {
      // Check if it's a structured response with a text field
      const obj = content as Record<string, unknown>;
      if (obj.text && typeof obj.text === "string") {
        return obj.text;
      }
      if (obj.content && typeof obj.content === "string") {
        return obj.content;
      }
      if (obj.message && typeof obj.message === "string") {
        return obj.message;
      }

      // If no meaningful text field found, stringify the whole object
      const jsonString = JSON.stringify(content);

      // Try to parse it as a structured response and extract text
      try {
        const parsed = JSON.parse(jsonString) as Record<string, unknown>;
        if (
          parsed.type === "text" &&
          parsed.text &&
          typeof parsed.text === "string"
        ) {
          return parsed.text;
        }
      } catch {
        // Ignore parse errors and continue
      }

      return jsonString;
    } catch {
      return "[Complex Content]";
    }
  }

  // Only primitives should reach here (number, boolean, bigint, symbol)
  if (
    typeof content === "number" ||
    typeof content === "boolean" ||
    typeof content === "bigint" ||
    typeof content === "symbol"
  ) {
    return String(content);
  }

  // Fallback for any unexpected types
  return "[Unknown Type]";
}

/**
 * Cleans and formats LLM content for AI messages
 * @param rawLLMContent - Raw content from LLM response
 * @returns Clean content suitable for AI messages
 */
export function getCleanContentForAiMessage(
  rawLLMContent: unknown,
): string | Array<{ type: "text"; text: string }> {
  if (typeof rawLLMContent === "string") {
    // If the string itself is a JSON representation of Parts (due to earlier stringification)
    // This was observed in logs: contentPreview showing a string that is actually a JSON array.
    if (
      rawLLMContent.startsWith("[") &&
      rawLLMContent.endsWith("]") &&
      (rawLLMContent.includes('"type":"text"') ||
        rawLLMContent.includes('"functionCall"'))
    ) {
      try {
        const parsedParts = JSON.parse(rawLLMContent) as Array<LLMPart>;
        const textParts = parsedParts
          .filter(
            (
              part,
            ): part is { type: "text"; text: string } => // Type guard
              part.type === "text" && typeof part.text === "string",
          )
          .map((part) => ({ type: "text" as const, text: part.text }));
        if (textParts.length === 1 && textParts[0]) return textParts[0].text;
        return textParts.length > 0 ? textParts : "";
      } catch {
        if (rawLLMContent.includes('"functionCall"')) return "";
        return rawLLMContent;
      }
    }
    return rawLLMContent;
  }

  if (Array.isArray(rawLLMContent)) {
    const partsArray = rawLLMContent as Array<LLMPart>;
    const textParts = partsArray
      .filter(
        (
          part,
        ): part is { type: "text"; text: string } => // Type guard
          part.type === "text" && typeof part.text === "string",
      )
      .map((part) => ({ type: "text" as const, text: part.text }));

    if (textParts.length === 0) {
      return "";
    }
    if (textParts.length === 1 && textParts[0]) {
      return textParts[0].text;
    }
    return textParts;
  }

  return "";
}

/**
 * Prepares messages for agent processing by filtering and organizing them
 * @param stateMessages - Messages from the current state
 * @param systemMessage - System message to prepend
 * @returns Formatted messages array for agent processing
 */
export function prepareAgentMessages(
  stateMessages: BaseMessage[],
  systemMessage: string,
): BaseMessage[] {
  // Filter to keep human, AI, and tool messages (tool messages contain tool call results)
  const userMessages = stateMessages.filter(
    (msg) =>
      msg._getType() === "human" ||
      msg._getType() === "ai" ||
      msg._getType() === "tool",
  );

  // Create new messages array with system message first, then user messages
  return [new SystemMessage(systemMessage), ...userMessages];
}

/**
 * Converts tRPC message format to agent state input format
 * @param messages - Messages in tRPC format
 * @param userId - Optional user ID
 * @returns Agent state input object
 */
export function convertToAgentStateInput(
  messages: { role: string; content: string }[],
  userId?: string,
): AgentStateType {
  logger.debug("Converting messages to agent state input", {
    messageCount: messages.length,
    userId: userId ? "[PRESENT]" : "[MISSING]",
  });

  // Sort messages into system, non-system
  const systemMessages: BaseMessage[] = [];
  const nonSystemMessages: BaseMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessages.push(new SystemMessage(msg.content));
    } else if (msg.role === "user") {
      nonSystemMessages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      nonSystemMessages.push(new AIMessage(msg.content));
    }
  }

  logger.debug("Message categorization complete", {
    systemCount: systemMessages.length,
    nonSystemCount: nonSystemMessages.length,
  });

  // Add a default system message if there are none
  if (systemMessages.length === 0) {
    systemMessages.push(
      new SystemMessage(
        "You are Resume Master, an AI assistant that helps with resume writing, cover letters, and job applications. Be helpful, concise, and professional.",
      ),
    );
    logger.debug("Added default system message");
  }

  // Ensure system messages come first, then the rest
  const formattedMessages = [...systemMessages, ...nonSystemMessages];

  logger.debug("Message formatting complete", {
    totalMessages: formattedMessages.length,
    messageTypes: formattedMessages.map((m) => m._getType()),
  });

  return {
    messages: formattedMessages,
    next: "supervisor", // Always start with the supervisor
    userId, // Set userId directly in the state object
    completedActions: [], // Initialize empty completed actions
    pendingClarification: null, // No pending clarification initially
    loopMetrics: {
      agentSwitches: 0,
      toolCallsPerAgent: {},
      clarificationRounds: 0,
      lastAgentType: null,
    }, // Initialize loop metrics
  };
}

/**
 * Extracts tool calls from content when they're embedded as text (workaround for Google GenAI bug)
 * @param content - Content that may contain embedded tool calls
 * @returns Array of extracted tool calls or null if none found
 */
export function extractToolCallsFromContent(content: unknown): Array<{
  name: string;
  args: Record<string, unknown>;
  id: string;
  type: "tool_call";
}> | null {
  const contentStr = contentToString(content);

  if (
    !contentStr.includes("functionCall") &&
    !contentStr.includes("tool_call")
  ) {
    return null;
  }

  try {
    // Handle different possible formats
    const patterns = [
      // Format: {"functionCall":{"name":"tool_name","args":{...}}}
      /\{"functionCall":\{"name":"([^"]+)","args":\{([^}]*)\}\}\}/g,
      // Format: {"name":"tool_name","args":{...},"type":"tool_call"}
      /\{"name":"([^"]+)","args":\{([^}]*)\},"type":"tool_call"\}/g,
      // Format: "tool_call":{"name":"tool_name","args":{...}}
      /"tool_call":\{"name":"([^"]+)","args":\{([^}]*)\}\}/g,
    ];

    const extractedCalls: Array<{
      name: string;
      args: Record<string, unknown>;
      id: string;
      type: "tool_call";
    }> = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(contentStr)) !== null) {
        if (match[1] && match[2] !== undefined) {
          const toolName = match[1];
          const argsString = match[2];

          // Parse the arguments
          let args: Record<string, unknown> = {};
          try {
            // Handle simple key-value pairs
            const argPairs = argsString.split(",");
            for (const pair of argPairs) {
              const colonIndex = pair.indexOf(":");
              if (colonIndex > 0) {
                const key = pair
                  .substring(0, colonIndex)
                  .trim()
                  .replace(/"/g, "");
                const value = pair
                  .substring(colonIndex + 1)
                  .trim()
                  .replace(/"/g, "");
                args[key] = value;
              }
            }
          } catch (parseError) {
            logger.warn("Failed to parse tool call arguments", {
              toolName,
              argsString,
              error: parseError,
            });
            args = {};
          }

          extractedCalls.push({
            name: toolName,
            args,
            id: `extracted_${toolName}_${Date.now()}`,
            type: "tool_call",
          });
        }
      }
    }

    return extractedCalls.length > 0 ? extractedCalls : null;
  } catch (error) {
    logger.error("Error extracting tool calls from content", {
      error,
      contentPreview: contentStr.substring(0, 200),
    });
    return null;
  }
}
