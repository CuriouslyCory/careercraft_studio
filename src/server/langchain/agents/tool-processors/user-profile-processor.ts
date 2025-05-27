import type { ValidatedToolCall, CompletedAction } from "../../types";
import {
  validateToolArgs,
  shouldSkipToolCall,
  contentToString,
} from "../../utils";
import { GetUserProfileSchema } from "../../types/schemas";
import { getUserProfileTool } from "../../tools";

/**
 * Specialized tool call processor for user profile operations
 * @param toolCalls - Validated tool calls to process
 * @param userId - User ID for tool execution
 * @param response - LLM response containing the tool calls
 * @param completedActions - Previously completed actions for duplicate detection
 * @returns Formatted summary of tool call results
 */
export async function processUserProfileToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  let toolCallSummary = "Here's the information from your profile:\n\n";
  const agentType = "user_profile";

  for (const toolCall of toolCalls) {
    // Check for duplicates before processing
    const duplicateCheck = shouldSkipToolCall(
      toolCall,
      agentType,
      completedActions,
    );

    if (duplicateCheck.skip) {
      toolCallSummary += `• Skipped ${toolCall.name}: ${duplicateCheck.reason}\n`;
      if (duplicateCheck.existingAction) {
        toolCallSummary += `  Previous result: ${duplicateCheck.existingAction.result.substring(0, 200)}${duplicateCheck.existingAction.result.length > 200 ? "..." : ""}\n\n`;
      }
      continue;
    }

    if (toolCall.name === "get_user_profile") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          GetUserProfileSchema,
          "get_user_profile",
        );
        const profileTool = getUserProfileTool(userId);
        const result = (await profileTool.invoke(args)) as string;

        let formattedResult: string;
        try {
          const parsedResult = JSON.parse(result) as unknown;
          formattedResult = JSON.stringify(parsedResult, null, 2);
        } catch {
          formattedResult = result;
        }

        toolCallSummary += `## ${args.dataType.replace("_", " ").toUpperCase()} ##\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
      } catch (error) {
        const dataType =
          typeof toolCall.args?.dataType === "string"
            ? toolCall.args.dataType
            : "unknown";
        toolCallSummary += `Error retrieving ${dataType} data: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    }
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  return toolCallSummary;
}
