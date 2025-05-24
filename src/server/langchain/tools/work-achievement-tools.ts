import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import { createLLM } from "../agent";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { type WorkHistoryResponse } from "./types";
import {
  validateUserId,
  withErrorHandling,
  ResourceNotFoundError,
  UnauthorizedError,
  DatabaseError,
  createSuccessMessage,
  isErrorResponse,
} from "./errors";
import { TOOL_CONFIG, VALIDATION_LIMITS } from "./config";

// =============================================================================
// WORK ACHIEVEMENT MANAGEMENT TOOLS
// =============================================================================

/**
 * Tool to get achievements for a specific work history record
 */
export function createGetWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_work_achievements",
    description:
      "Get all achievements for a specific work history record by work history ID",
    schema: z.object({
      workHistoryId: z
        .string()
        .min(1, "Work history ID is required")
        .describe("The ID of the work history record to get achievements for"),
    }),
    func: withErrorHandling(
      async ({
        workHistoryId,
      }: {
        workHistoryId: string;
      }): Promise<WorkHistoryResponse> => {
        console.log(
          `Getting work achievements for work history ID: ${workHistoryId}`,
        );

        validateUserId(userId);

        // Verify the work history belongs to this user
        const workHistory = await db.workHistory.findFirst({
          where: {
            id: workHistoryId,
            userId,
          },
        });

        if (!workHistory) {
          throw new ResourceNotFoundError("Work history record", workHistoryId);
        }

        const achievements = await db.workAchievement.findMany({
          where: { workHistoryId },
          orderBy: { createdAt: "asc" },
        });

        if (achievements.length === 0) {
          throw new ResourceNotFoundError(
            `achievements for work history: ${workHistory.jobTitle} at ${workHistory.companyName}`,
          );
        }

        return {
          workHistory: {
            id: workHistory.id,
            jobTitle: workHistory.jobTitle,
            companyName: workHistory.companyName,
            startDate: workHistory.startDate?.toISOString().split("T")[0] ?? "",
            endDate:
              workHistory.endDate?.toISOString().split("T")[0] ?? "Present",
          },
          achievements: achievements.map((achievement) => ({
            id: achievement.id,
            description: achievement.description,
            createdAt: achievement.createdAt.toISOString(),
          })),
        };
      },
      "get_work_achievements",
    ),
  });
}

/**
 * Tool to replace all achievements for a work history record with merged ones
 */
export function createReplaceWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "replace_work_achievements",
    description:
      "Replace all achievements for a work history record with new merged achievements. This will delete existing achievements and create new ones.",
    schema: z.object({
      workHistoryId: z
        .string()
        .min(1, "Work history ID is required")
        .describe(
          "The ID of the work history record to update achievements for",
        ),
      newAchievements: z
        .array(
          z
            .string()
            .min(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MIN)
            .max(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MAX),
        )
        .max(TOOL_CONFIG.MAX_ACHIEVEMENTS_PER_JOB)
        .describe(
          "Array of new achievement descriptions to replace the old ones",
        ),
    }),
    func: withErrorHandling(
      async ({
        workHistoryId,
        newAchievements,
      }: {
        workHistoryId: string;
        newAchievements: string[];
      }): Promise<string> => {
        console.log(
          `Replacing work achievements for work history ID: ${workHistoryId}`,
        );

        validateUserId(userId);

        // Verify the work history belongs to this user
        const workHistory = await db.workHistory.findFirst({
          where: {
            id: workHistoryId,
            userId,
          },
        });

        if (!workHistory) {
          throw new ResourceNotFoundError("Work history record", workHistoryId);
        }

        try {
          // Use a transaction with proper timeout
          const result = await db.$transaction(
            async (tx) => {
              // Delete all existing achievements for this work history
              const deletedCount = await tx.workAchievement.deleteMany({
                where: { workHistoryId },
              });

              // Create new achievements
              const createdAchievements = [];
              for (const description of newAchievements) {
                if (description.trim()) {
                  const achievement = await tx.workAchievement.create({
                    data: {
                      description: description.trim(),
                      workHistoryId,
                    },
                  });
                  createdAchievements.push(achievement);
                }
              }

              return {
                deletedCount: deletedCount.count,
                createdCount: createdAchievements.length,
                achievements: createdAchievements,
              };
            },
            {
              timeout: TOOL_CONFIG.TRANSACTION_TIMEOUT,
              maxWait: TOOL_CONFIG.TRANSACTION_MAX_WAIT,
            },
          );

          return createSuccessMessage(
            "replaced",
            `${result.deletedCount} achievements with ${result.createdCount} new achievements`,
            `for ${workHistory.jobTitle} at ${workHistory.companyName}`,
          );
        } catch (error) {
          throw new DatabaseError("replace work achievements", error as Error);
        }
      },
      "replace_work_achievements",
    ),
  });
}

/**
 * Tool to merge and replace work achievements using LLM
 */
export function createMergeAndReplaceWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "merge_and_replace_work_achievements",
    description:
      "Get existing achievements for a work history record, merge them with new achievements using AI, and replace the existing ones with the merged results",
    schema: z.object({
      workHistoryId: z
        .string()
        .min(1, "Work history ID is required")
        .describe("The ID of the work history record to update"),
      newAchievements: z
        .array(
          z
            .string()
            .min(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MIN)
            .max(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MAX),
        )
        .max(TOOL_CONFIG.MAX_ACHIEVEMENTS_PER_JOB)
        .describe(
          "Array of new achievement descriptions to merge with existing ones",
        ),
    }),
    func: withErrorHandling(
      async ({
        workHistoryId,
        newAchievements,
      }: {
        workHistoryId: string;
        newAchievements: string[];
      }): Promise<string> => {
        console.log(
          `Merging and replacing work achievements for work history ID: ${workHistoryId}`,
        );

        validateUserId(userId);

        // Get existing achievements
        const getAchievementsTool = createGetWorkAchievementsTool(userId);
        const existingDataRaw: unknown = await getAchievementsTool.invoke({
          workHistoryId,
        });

        const existingData =
          typeof existingDataRaw === "string"
            ? existingDataRaw
            : JSON.stringify(existingDataRaw);

        if (isErrorResponse(existingData)) {
          return existingData;
        }

        // Parse existing achievements
        const parsedData = JSON.parse(existingData) as WorkHistoryResponse;
        const existingAchievements = parsedData.achievements.map(
          (a) => a.description,
        );

        if (existingAchievements.length === 0 && newAchievements.length === 0) {
          throw new Error("No achievements to merge.");
        }

        // Use the merge tool to combine achievements
        const mergeResultRaw = await mergeWorkAchievementsTool.invoke({
          existingAchievements,
          newAchievements,
        });

        const mergeResult =
          typeof mergeResultRaw === "string"
            ? mergeResultRaw
            : JSON.stringify(mergeResultRaw);

        // Parse merged results
        const mergedAchievements = JSON.parse(mergeResult) as string[];

        if (mergedAchievements.length === 0) {
          throw new Error("Merge operation resulted in no achievements.");
        }

        // Replace achievements with merged ones
        const replaceTool = createReplaceWorkAchievementsTool(userId);
        const replaceResultRaw: unknown = await replaceTool.invoke({
          workHistoryId,
          newAchievements: mergedAchievements,
        });

        const replaceResult =
          typeof replaceResultRaw === "string"
            ? replaceResultRaw
            : JSON.stringify(replaceResultRaw);

        return `${replaceResult}\n\nMerged achievements:\n${mergedAchievements
          .map((a, i) => `${i + 1}. ${a}`)
          .join("\n")}`;
      },
      "merge_and_replace_work_achievements",
    ),
  });
}

/**
 * Tool to add a single achievement to a work history record
 */
export function createAddWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "add_work_achievement",
    description: "Add a single achievement to a work history record",
    schema: z.object({
      workHistoryId: z
        .string()
        .min(1, "Work history ID is required")
        .describe(
          "The ID of the work history record to add the achievement to",
        ),
      description: z
        .string()
        .min(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MIN)
        .max(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MAX)
        .describe("The achievement description to add"),
    }),
    func: withErrorHandling(
      async ({
        workHistoryId,
        description,
      }: {
        workHistoryId: string;
        description: string;
      }): Promise<string> => {
        console.log(
          `Adding work achievement to work history ID: ${workHistoryId}`,
        );

        validateUserId(userId);

        // Verify the work history belongs to this user
        const workHistory = await db.workHistory.findFirst({
          where: {
            id: workHistoryId,
            userId,
          },
        });

        if (!workHistory) {
          throw new ResourceNotFoundError("Work history record", workHistoryId);
        }

        try {
          const achievement = await db.workAchievement.create({
            data: {
              description: description.trim(),
              workHistoryId,
            },
          });

          return createSuccessMessage(
            "added",
            "achievement",
            `to ${workHistory.jobTitle} at ${workHistory.companyName}: "${achievement.description}"`,
          );
        } catch (error) {
          throw new DatabaseError("add work achievement", error as Error);
        }
      },
      "add_work_achievement",
    ),
  });
}

/**
 * Tool to update a specific achievement
 */
export function createUpdateWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "update_work_achievement",
    description: "Update the description of a specific work achievement",
    schema: z.object({
      achievementId: z
        .string()
        .min(1, "Achievement ID is required")
        .describe("The ID of the achievement to update"),
      description: z
        .string()
        .min(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MIN)
        .max(VALIDATION_LIMITS.ACHIEVEMENT_DESCRIPTION.MAX)
        .describe("The new achievement description"),
    }),
    func: withErrorHandling(
      async ({
        achievementId,
        description,
      }: {
        achievementId: string;
        description: string;
      }): Promise<string> => {
        console.log(`Updating work achievement ID: ${achievementId}`);

        validateUserId(userId);

        // Get the achievement and verify it belongs to this user
        const existingAchievement = await db.workAchievement.findFirst({
          where: { id: achievementId },
          include: {
            workHistory: {
              select: {
                userId: true,
                jobTitle: true,
                companyName: true,
              },
            },
          },
        });

        if (!existingAchievement) {
          throw new ResourceNotFoundError("Achievement", achievementId);
        }

        if (existingAchievement.workHistory.userId !== userId) {
          throw new UnauthorizedError("achievement", "update");
        }

        try {
          const updatedAchievement = await db.workAchievement.update({
            where: { id: achievementId },
            data: { description: description.trim() },
          });

          return createSuccessMessage(
            "updated",
            "achievement",
            `for ${existingAchievement.workHistory.jobTitle} at ${existingAchievement.workHistory.companyName}: "${updatedAchievement.description}"`,
          );
        } catch (error) {
          throw new DatabaseError("update work achievement", error as Error);
        }
      },
      "update_work_achievement",
    ),
  });
}

/**
 * Tool to delete a specific achievement
 */
export function createDeleteWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "delete_work_achievement",
    description: "Delete a specific work achievement",
    schema: z.object({
      achievementId: z
        .string()
        .min(1, "Achievement ID is required")
        .describe("The ID of the achievement to delete"),
    }),
    func: withErrorHandling(
      async ({ achievementId }: { achievementId: string }): Promise<string> => {
        console.log(`Deleting work achievement ID: ${achievementId}`);

        validateUserId(userId);

        // Get the achievement and verify it belongs to this user
        const existingAchievement = await db.workAchievement.findFirst({
          where: { id: achievementId },
          include: {
            workHistory: {
              select: {
                userId: true,
                jobTitle: true,
                companyName: true,
              },
            },
          },
        });

        if (!existingAchievement) {
          throw new ResourceNotFoundError("Achievement", achievementId);
        }

        if (existingAchievement.workHistory.userId !== userId) {
          throw new UnauthorizedError("achievement", "delete");
        }

        try {
          await db.workAchievement.delete({
            where: { id: achievementId },
          });

          return createSuccessMessage(
            "deleted",
            "achievement",
            `"${existingAchievement.description}" from ${existingAchievement.workHistory.jobTitle} at ${existingAchievement.workHistory.companyName}`,
          );
        } catch (error) {
          throw new DatabaseError("delete work achievement", error as Error);
        }
      },
      "delete_work_achievement",
    ),
  });
}

// =============================================================================
// UTILITY TOOLS
// =============================================================================

/**
 * Tool to merge achievement lists using an LLM
 * Improved version with better error handling and configuration
 */
export const mergeWorkAchievementsTool = new DynamicStructuredTool({
  name: "merge_work_achievements",
  description:
    "Merges two lists of work achievements (strings) into a single, concise list. Use this to combine achievements from different sources for the same job.",
  schema: z.object({
    existingAchievements: z
      .array(z.string())
      .describe("List of existing achievement strings."),
    newAchievements: z
      .array(z.string())
      .describe("List of new achievement strings to merge."),
  }),
  func: withErrorHandling(
    async ({
      existingAchievements,
      newAchievements,
    }: {
      existingAchievements: string[];
      newAchievements: string[];
    }): Promise<string[]> => {
      console.log(
        `Merging achievements: Existing count=${existingAchievements.length}, New count=${newAchievements.length}`,
      );

      // Combine the lists and remove duplicates
      const combinedAchievements = [
        ...existingAchievements,
        ...newAchievements,
      ].filter((item, index, self) => self.indexOf(item) === index);

      if (combinedAchievements.length === 0) {
        return []; // Return empty array if no achievements
      }

      try {
        // Create a specific LLM for this task
        const mergeLLM = createLLM();

        const prompt = `You are a text merging assistant. Your task is to review the following list of achievement statements and combine any redundant or very similar items into a single, concise statement. Ensure all unique achievements are retained and clearly stated. Return ONLY the merged list of achievement statements as a JSON array of strings.

Statements to merge:
${JSON.stringify(combinedAchievements)}

Merged list:`;

        const messages: BaseMessage[] = [new HumanMessage(prompt)];

        const response = await mergeLLM.invoke(messages);

        let mergedContent = "";
        if (response && typeof response.content === "string") {
          mergedContent = response.content;
        } else if (
          response &&
          typeof response.content === "object" &&
          response.content !== null
        ) {
          // Handle potential complex content if necessary, though expecting string/JSON
          mergedContent = JSON.stringify(response.content);
        } else {
          console.warn("Merge LLM returned empty or unexpected content.");
          // Fallback to returning the combined achievements without further LLM processing
          return combinedAchievements;
        }

        console.log("Raw merge LLM response:", mergedContent);

        // Clean up the response by removing markdown code blocks if present
        let cleanedContent = mergedContent.trim();
        if (cleanedContent.startsWith("```json")) {
          cleanedContent = cleanedContent.replace(/^```json\n?/, "");
        }
        if (cleanedContent.endsWith("```")) {
          cleanedContent = cleanedContent.replace(/```$/, "");
        }

        // Attempt to parse the JSON output from the LLM
        try {
          const finalMergedAchievements = JSON.parse(
            cleanedContent,
          ) as string[];
          console.log(
            "Successfully parsed merged achievements:",
            finalMergedAchievements,
          );
          return finalMergedAchievements;
        } catch (parseError) {
          console.error("Failed to parse LLM JSON output:", parseError);
          console.log("Cleaned content that failed to parse:", cleanedContent);
          // Fallback to returning the combined achievements if LLM output is not valid JSON
          return combinedAchievements;
        }
      } catch (llmError) {
        console.error("Error during LLM achievement merging:", llmError);
        // Fallback to returning the combined achievements on LLM error
        return combinedAchievements;
      }
    },
    "merge_work_achievements",
  ),
});
