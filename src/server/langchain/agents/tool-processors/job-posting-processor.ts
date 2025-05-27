import type { ValidatedToolCall, CompletedAction } from "../../types";
import {
  validateToolArgs,
  shouldSkipToolCall,
  contentToString,
} from "../../utils";
import { ParseJobPostingSchema } from "../../types/schemas";
import { getJobPostingTools } from "../../tools";

/**
 * Specialized tool call processor for job posting operations
 * @param toolCalls - Validated tool calls to process
 * @param userId - User ID for tool execution
 * @param response - LLM response containing the tool calls
 * @param completedActions - Previously completed actions for duplicate detection
 * @returns Formatted summary of tool call results
 */
export async function processJobPostingToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  const agentType = "job_posting_manager";
  let actuallyProcessed = false;
  let toolCallSummary = "";

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

    // Mark that we're actually processing something
    actuallyProcessed = true;

    if (toolCall.name === "parse_and_store_job_posting") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          ParseJobPostingSchema,
          "parse_and_store_job_posting",
        );
        const tools = getJobPostingTools(userId);
        const parseAndStoreJobPostingTool = tools.find(
          (t) => t.name === "parse_and_store_job_posting",
        );

        if (parseAndStoreJobPostingTool) {
          const result = (await parseAndStoreJobPostingTool.invoke({
            content: args.content,
          })) as string;
          toolCallSummary += `${result}\n\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error parsing and storing job posting: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "find_job_postings") {
      try {
        const tools = getJobPostingTools(userId);
        const findJobPostingsTool = tools.find(
          (t) => t.name === "find_job_postings",
        );

        if (findJobPostingsTool) {
          const result = (await findJobPostingsTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Found job postings:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error finding job postings: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "compare_skills_to_job") {
      try {
        const tools = getJobPostingTools(userId);
        const compareSkillsTool = tools.find(
          (t) => t.name === "compare_skills_to_job",
        );

        if (compareSkillsTool) {
          const result = (await compareSkillsTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Skill comparison analysis:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error comparing skills: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "get_user_profile") {
      try {
        const tools = getJobPostingTools(userId);
        const getUserProfileTool = tools.find(
          (t) => t.name === "get_user_profile",
        );

        if (getUserProfileTool) {
          const result = (await getUserProfileTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `• Retrieved user profile data:\n${result}\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error retrieving user profile: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else {
      toolCallSummary += `• ${toolCall.name}: Processed successfully\n`;
    }
  }

  // Add any content from the response
  const responseContent = contentToString(response.content);
  if (responseContent?.trim()) {
    toolCallSummary += "\n" + responseContent;
  }

  // Prepend appropriate header based on whether actual processing occurred
  if (actuallyProcessed) {
    return `I've processed your job posting request:\n\n${toolCallSummary}`;
  } else {
    return `I reviewed your job posting request:\n\n${toolCallSummary}`;
  }
}
