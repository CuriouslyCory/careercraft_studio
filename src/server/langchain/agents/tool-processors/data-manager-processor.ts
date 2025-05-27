import type { ValidatedToolCall, CompletedAction } from "../../types";
import {
  validateToolArgs,
  shouldSkipToolCall,
  contentToString,
} from "../../utils";
import {
  StoreUserPreferenceSchema,
  StoreWorkHistorySchema,
  GetUserProfileSchema,
} from "../../types/schemas";
import { getUserProfileTool, getDataManagerTools } from "../../tools";

/**
 * Specialized tool call processor for data manager operations
 * @param toolCalls - Validated tool calls to process
 * @param userId - User ID for tool execution
 * @param response - LLM response containing the tool calls
 * @param completedActions - Previously completed actions for duplicate detection
 * @returns Formatted summary of tool call results
 */
export async function processDataManagerToolCalls(
  toolCalls: ValidatedToolCall[],
  userId: string,
  response: { content?: unknown },
  completedActions: CompletedAction[] = [],
): Promise<string> {
  let toolCallSummary = "I've processed your request:\n\n";
  const agentType = "data_manager";

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

    if (toolCall.name === "store_user_preference") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          StoreUserPreferenceSchema,
          "store_user_preference",
        );
        toolCallSummary += `• Stored preference for ${args.category}: ${args.preference}\n`;
      } catch (error) {
        toolCallSummary += `• Error storing preference: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "store_work_history") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          StoreWorkHistorySchema,
          "store_work_history",
        );
        toolCallSummary += `• Stored work history: ${args.jobTitle} at ${args.companyName}\n`;
      } catch (error) {
        toolCallSummary += `• Error storing work history: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "get_user_profile") {
      try {
        const args = validateToolArgs(
          toolCall.args,
          GetUserProfileSchema,
          "get_user_profile",
        );
        const profileTool = getUserProfileTool(userId);
        const result = (await profileTool.invoke(args)) as string;

        // Format the data based on the type requested
        if (args.dataType === "skills") {
          try {
            const skillsData = JSON.parse(result) as Array<{
              name: string;
              category: string;
              proficiency: string;
              workContext?: string;
              yearsExperience?: number | null;
            }>;

            if (skillsData.length === 0) {
              toolCallSummary += `No skills found in your profile yet. You can add skills by describing your work experience or uploading a resume.`;
            } else {
              toolCallSummary += `## Your Skills\n\n`;

              // Group skills by proficiency level
              const expertSkills = skillsData.filter(
                (s) => s.proficiency === "EXPERT",
              );
              const advancedSkills = skillsData.filter(
                (s) => s.proficiency === "ADVANCED",
              );
              const intermediateSkills = skillsData.filter(
                (s) => s.proficiency === "INTERMEDIATE",
              );
              const beginnerSkills = skillsData.filter(
                (s) => s.proficiency === "BEGINNER",
              );

              if (expertSkills.length > 0) {
                toolCallSummary += `### Expert Level\n`;
                expertSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (advancedSkills.length > 0) {
                toolCallSummary += `### Advanced Level\n`;
                advancedSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (intermediateSkills.length > 0) {
                toolCallSummary += `### Intermediate Level\n`;
                intermediateSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              if (beginnerSkills.length > 0) {
                toolCallSummary += `### Beginner Level\n`;
                beginnerSkills.forEach((skill) => {
                  toolCallSummary += `- **${skill.name}**`;
                  if (skill.workContext) {
                    toolCallSummary += ` _(${skill.workContext})_`;
                  }
                  toolCallSummary += `\n`;
                });
                toolCallSummary += `\n`;
              }

              toolCallSummary += `\n_Total: ${skillsData.length} skills in your profile_\n\n`;
            }
          } catch {
            // Fallback to raw JSON if parsing fails
            toolCallSummary += `• Retrieved ${args.dataType} data:\n\n\`\`\`json\n${result}\n\`\`\`\n\n`;
          }
        } else {
          // For other data types, format as JSON
          let formattedResult: string;
          try {
            const parsedResult = JSON.parse(result) as unknown;
            formattedResult = JSON.stringify(parsedResult, null, 2);
          } catch {
            formattedResult = result;
          }

          toolCallSummary += `• Retrieved ${args.dataType} data:\n\n\`\`\`json\n${formattedResult}\n\`\`\`\n\n`;
        }
      } catch (error) {
        const dataType =
          typeof toolCall.args?.dataType === "string"
            ? toolCall.args.dataType
            : "unknown";
        toolCallSummary += `Error retrieving ${dataType} data: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "parse_and_store_resume") {
      try {
        // The resume parsing tool handles its own processing and returns a detailed summary
        const resumeParsingTool = getDataManagerTools(userId).find(
          (t) => t.name === "parse_and_store_resume",
        );
        if (resumeParsingTool) {
          const result = (await resumeParsingTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Resume parsing tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error parsing resume: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (
      toolCall.name.startsWith("get_work_achievements") ||
      toolCall.name.includes("work_achievement")
    ) {
      try {
        // Find the appropriate work achievement tool
        const achievementTool = getDataManagerTools(userId).find(
          (t) => t.name === toolCall.name,
        );
        if (achievementTool) {
          const result = (await achievementTool.invoke(
            toolCall.args,
          )) as string;

          // Format the result nicely for work achievement operations
          if (toolCall.name === "get_work_achievements") {
            try {
              const parsedResult = JSON.parse(result) as {
                workHistory: { jobTitle: string; companyName: string };
                achievements: Array<{ id: string; description: string }>;
              };

              toolCallSummary += `• **${parsedResult.workHistory.jobTitle}** at **${parsedResult.workHistory.companyName}**\n`;
              toolCallSummary += `  Current achievements (${parsedResult.achievements.length}):\n`;
              parsedResult.achievements.forEach((achievement, index) => {
                toolCallSummary += `  ${index + 1}. ${achievement.description} *(ID: ${achievement.id})*\n`;
              });
              toolCallSummary += `\n`;
            } catch {
              toolCallSummary += `• ${result}\n`;
            }
          } else {
            toolCallSummary += `• ${result}\n`;
          }
        } else {
          toolCallSummary += `• Error: Tool ${toolCall.name} not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error with ${toolCall.name}: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "deduplicate_and_merge_key_achievements") {
      try {
        // The deduplication tool handles its own processing and returns a formatted summary
        const deduplicationTool = getDataManagerTools(userId).find(
          (t) => t.name === "deduplicate_and_merge_key_achievements",
        );
        if (deduplicationTool) {
          const result = (await deduplicationTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Key achievements deduplication tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error deduplicating key achievements: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } else if (toolCall.name === "deduplicate_and_merge_work_achievements") {
      try {
        // The work achievements deduplication tool handles its own processing and returns a formatted summary
        const deduplicationTool = getDataManagerTools(userId).find(
          (t) => t.name === "deduplicate_and_merge_work_achievements",
        );
        if (deduplicationTool) {
          const result = (await deduplicationTool.invoke(
            toolCall.args,
          )) as string;
          toolCallSummary += `${result}\n\n`;
        } else {
          toolCallSummary += `• Error: Work achievements deduplication tool not found\n`;
        }
      } catch (error) {
        toolCallSummary += `• Error deduplicating work achievements: ${error instanceof Error ? error.message : String(error)}\n`;
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

  return toolCallSummary;
}
