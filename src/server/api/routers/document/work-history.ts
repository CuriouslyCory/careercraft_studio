import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import { mergeWorkAchievements } from "./utils/llm-merger";
import { distance } from "fastest-levenshtein";
import { SkillNormalizationService } from "~/server/services/skill-normalization";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "~/env";
import { zodToJsonSchema } from "zod-to-json-schema";

// Helper function to check if two work history records match
export function doWorkHistoryRecordsMatch(
  existing: {
    companyName: string;
    startDate: Date;
    endDate: Date | null;
  },
  newRecord: {
    company?: string;
    startDate?: Date;
    endDate?: Date;
  },
): boolean {
  // Company name must match using Levenshtein distance (case insensitive, ignoring all whitespace)
  const existingCompany = existing.companyName.toLowerCase().replace(/\s/g, "");
  const newCompany = (newRecord.company ?? "").toLowerCase().replace(/\s/g, "");

  // Allow for a Levenshtein distance of up to 5 characters
  const nameDistance = distance(existingCompany, newCompany);
  if (nameDistance > 5) {
    return false;
  }

  // Start dates must match (within the same month)
  const existingStart = existing.startDate;
  const newStart = newRecord.startDate;

  if (!newStart) return false;

  const existingStartMonth =
    existingStart.getFullYear() * 12 + existingStart.getMonth();
  const newStartMonth = newStart.getFullYear() * 12 + newStart.getMonth();

  if (existingStartMonth !== newStartMonth) {
    return false;
  }

  // End dates must match (within the same month, or both be null/undefined)
  const existingEnd = existing.endDate;
  const newEnd = newRecord.endDate ?? null;

  if (!existingEnd && !newEnd) {
    return true; // Both are current positions
  }

  if (!existingEnd || !newEnd) {
    return false; // One is current, other is not
  }

  const existingEndMonth =
    existingEnd.getFullYear() * 12 + existingEnd.getMonth();
  const newEndMonth = newEnd.getFullYear() * 12 + newEnd.getMonth();

  return existingEndMonth === newEndMonth;
}

export const workHistoryRouter = createTRPCRouter({
  // WorkHistory CRUD
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workHistory.findMany({
      where: { userId: ctx.session.user.id },
      include: { achievements: true },
      orderBy: { startDate: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        companyName: z.string(),
        jobTitle: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workHistory.create({
        data: {
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.workHistory.update({
        where: { id, userId: ctx.session.user.id },
        data: {
          ...data,
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workHistory.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  // WorkAchievement CRUD (by WorkHistory)
  listAchievements: protectedProcedure
    .input(z.object({ workHistoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workAchievement.findMany({
        where: { workHistoryId: input.workHistoryId },
        orderBy: { createdAt: "asc" },
      });
    }),

  createAchievement: protectedProcedure
    .input(
      z.object({
        workHistoryId: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.create({
        data: input,
      });
    }),

  updateAchievement: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.update({
        where: { id: input.id },
        data: { description: input.description },
      });
    }),

  deleteAchievement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.delete({
        where: { id: input.id },
      });
    }),

  // Modern UserSkill functions for work history context
  listUserSkillsForWork: protectedProcedure
    .input(z.object({ workHistoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.userSkill.findMany({
        where: {
          userId: ctx.session.user.id,
          workHistoryId: input.workHistoryId,
        },
        include: {
          skill: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  addUserSkillToWork: protectedProcedure
    .input(
      z.object({
        workHistoryId: z.string(),
        skillName: z.string(),
        proficiency: z
          .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
          .optional(),
        yearsExperience: z.number().min(0).max(50).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find or create the skill using normalization
      const skillNormalizer = new SkillNormalizationService(ctx.db);
      const normalizedSkill = await skillNormalizer.normalizeSkill(
        input.skillName,
        "OTHER", // Default category, can be categorized later
      );

      // Check if user already has this skill
      const existingUserSkill = await ctx.db.userSkill.findFirst({
        where: {
          userId: ctx.session.user.id,
          skillId: normalizedSkill.baseSkillId,
        },
      });

      if (existingUserSkill) {
        // Update existing skill to reference this work history if not already linked
        if (!existingUserSkill.workHistoryId) {
          return await ctx.db.userSkill.update({
            where: { id: existingUserSkill.id },
            data: {
              workHistoryId: input.workHistoryId,
              notes: input.notes ?? existingUserSkill.notes,
            },
            include: {
              skill: true,
              workHistory: true,
            },
          });
        }
        throw new Error("You already have this skill linked to your profile");
      }

      // Create new UserSkill linked to this work history
      return await ctx.db.userSkill.create({
        data: {
          userId: ctx.session.user.id,
          skillId: normalizedSkill.baseSkillId,
          proficiency: input.proficiency ?? "INTERMEDIATE",
          yearsExperience: input.yearsExperience,
          source: "WORK_EXPERIENCE",
          notes: input.notes,
          workHistoryId: input.workHistoryId,
        },
        include: {
          skill: true,
          workHistory: true,
        },
      });
    }),

  removeUserSkillFromWork: protectedProcedure
    .input(z.object({ userSkillId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the user skill belongs to this user and delete it
      return await ctx.db.userSkill.delete({
        where: {
          id: input.userSkillId,
          userId: ctx.session.user.id,
        },
      });
    }),

  /**
   * Deduplicates and merges similar work achievements for a specific work history using AI.
   * Removes exact duplicates and intelligently merges similar achievements
   * while preserving all important details without making up information.
   */
  deduplicateAndMergeWorkAchievements: protectedProcedure
    .input(
      z.object({
        workHistoryId: z
          .string()
          .describe("The work history ID to deduplicate achievements for"),
        dryRun: z
          .boolean()
          .default(false)
          .describe("If true, returns preview without making changes"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await deduplicateAndMergeWorkAchievements(
        ctx.db,
        ctx.session.user.id,
        input.workHistoryId,
        input.dryRun,
      );
    }),
});

// Helper function for processing work experience from parsed resumes
export async function processWorkExperience(
  workExperience: Array<{
    company?: string;
    jobTitle?: string;
    startDate?: Date;
    endDate?: Date;
    achievements?: string[];
    skills?: string[];
  }>,
  userId: string,
  ctx: { db: PrismaClient },
) {
  // First, get all existing work history for the user
  const existingWorkHistory = await ctx.db.workHistory.findMany({
    where: { userId },
    include: {
      achievements: true,
    },
  });

  for (const expRaw of workExperience) {
    // Safe due to schema enforcement
    const exp = expRaw;

    // Check if this work experience matches an existing record
    const matchingRecord = existingWorkHistory.find((existing) =>
      doWorkHistoryRecordsMatch(existing, exp),
    );

    let workHistoryId: string;

    if (matchingRecord) {
      // Update existing record - merge achievements and upsert skills
      console.log(
        `Found matching work history: ${matchingRecord.companyName} - ${matchingRecord.jobTitle}`,
      );

      // Get existing achievements as strings
      const existingAchievements = matchingRecord.achievements.map(
        (a) => a.description,
      );

      // Get new achievements
      const newAchievements = Array.isArray(exp.achievements)
        ? exp.achievements.filter((a): a is string => typeof a === "string")
        : [];

      // Merge achievements using LLM
      const mergedAchievements = await mergeWorkAchievements(
        existingAchievements,
        newAchievements,
      );

      // Update the work history record (in case job title or other details changed)
      await ctx.db.workHistory.update({
        where: { id: matchingRecord.id },
        data: {
          jobTitle: exp.jobTitle ?? matchingRecord.jobTitle,
          // Keep the original dates but allow updates if more specific
          startDate: exp.startDate ?? matchingRecord.startDate,
          endDate: exp.endDate ?? matchingRecord.endDate,
        },
      });

      for (const desc of mergedAchievements) {
        await ctx.db.workAchievement.create({
          data: {
            description: desc,
            workHistory: { connect: { id: matchingRecord.id } },
          },
        });
      }

      workHistoryId = matchingRecord.id;
    } else {
      // Create new work history record
      const wh = await ctx.db.workHistory.create({
        data: {
          companyName: exp.company ?? "",
          jobTitle: exp.jobTitle ?? "",
          startDate: exp.startDate ?? new Date(),
          endDate: exp.endDate,
          user: { connect: { id: userId } },
        },
      });

      // Add achievements for new record
      const responsibilities = Array.isArray(exp.achievements)
        ? exp.achievements
        : [];
      for (const desc of responsibilities) {
        if (typeof desc === "string") {
          await ctx.db.workAchievement.create({
            data: {
              description: desc,
              workHistory: { connect: { id: wh.id } },
            },
          });
        }
      }

      workHistoryId = wh.id;
    }

    // Process skills for this work history using normalized skills
    const skills = Array.isArray(exp.skills) ? exp.skills : [];

    if (skills.length > 0) {
      // Use skill normalization service for consistent skill handling
      const skillNormalizer = new SkillNormalizationService(ctx.db);
      const normalizedSkills = await skillNormalizer.normalizeSkills(
        skills.filter(
          (s): s is string => typeof s === "string" && s.trim() !== "",
        ),
        "OTHER", // Default category, can be categorized later
      );

      for (const normalizedSkill of normalizedSkills) {
        // Check if user already has this base skill
        const existingUserSkill = await ctx.db.userSkill.findFirst({
          where: {
            userId,
            skillId: normalizedSkill.baseSkillId,
          },
        });

        if (existingUserSkill) {
          // If skill exists but not linked to any work history, link it to this one
          if (!existingUserSkill.workHistoryId) {
            await ctx.db.userSkill.update({
              where: { id: existingUserSkill.id },
              data: {
                workHistoryId,
                notes: `Used at ${exp.company} - ${exp.jobTitle}`,
              },
            });
          }
          // If already linked to a different work history, we could create skill aliases or leave as-is
          // For now, we'll skip to avoid duplicates
        } else {
          // Create new UserSkill linked to this work history using the normalized base skill
          await ctx.db.userSkill.create({
            data: {
              userId,
              skillId: normalizedSkill.baseSkillId,
              proficiency: "INTERMEDIATE", // Default proficiency, can be updated later
              source: "WORK_EXPERIENCE",
              notes: `Used at ${exp.company} - ${exp.jobTitle}${normalizedSkill.detailedVariant ? ` (${normalizedSkill.detailedVariant})` : ""}`,
              workHistoryId,
            },
          });
        }
      }
    }
  }
}

// Zod schema for AI merge result for work achievements
const WorkAchievementMergeResultSchema = z.object({
  finalAchievements: z.array(
    z.object({
      description: z
        .string()
        .describe(
          "The final achievement description (either merged from multiple achievements or individually optimized)",
        ),
      originalIndices: z
        .array(z.number())
        .min(1)
        .describe(
          "Which original achievements were used to create this final achievement (1-indexed). For merged achievements, this will have multiple indices. For standalone achievements, this will have one index.",
        ),
      action: z
        .enum(["merged", "optimized"])
        .describe(
          "Whether this achievement was created by merging multiple achievements or by optimizing a single achievement",
        ),
    }),
  ),
  reasoning: z
    .string()
    .optional()
    .describe("Brief explanation of what was merged and optimized"),
});

type WorkAchievementMergeResult = z.infer<
  typeof WorkAchievementMergeResultSchema
>;

// Types for the work achievement deduplication service
export type WorkAchievementDeduplicationResult = {
  success: boolean;
  message: string;
  originalCount: number;
  finalCount: number;
  exactDuplicatesRemoved: number;
  similarGroupsMerged: number;
  preview: Array<{ description: string; action: "kept" | "merged" | "final" }>;
};

export type WorkAchievementRecord = {
  id: string;
  description: string;
  createdAt: Date;
};

/**
 * Centralized service function for deduplicating and merging work achievements
 * This function can be used by both tRPC routes and agent tools
 */
export async function deduplicateAndMergeWorkAchievements(
  db: PrismaClient,
  userId: string,
  workHistoryId: string,
  dryRun = false,
): Promise<WorkAchievementDeduplicationResult> {
  return await db.$transaction(async (tx) => {
    // Verify the work history belongs to the user
    const workHistory = await tx.workHistory.findFirst({
      where: { id: workHistoryId, userId },
    });

    if (!workHistory) {
      throw new Error("Work history not found or access denied");
    }

    // Get all work achievements for this work history
    const achievements = await tx.workAchievement.findMany({
      where: { workHistoryId },
      orderBy: { createdAt: "asc" }, // Preserve chronological order
    });

    if (achievements.length <= 1) {
      return {
        success: true,
        message:
          "No deduplication needed - this work history has 1 or fewer achievements.",
        originalCount: achievements.length,
        finalCount: achievements.length,
        exactDuplicatesRemoved: 0,
        similarGroupsMerged: 0,
        preview: [],
      };
    }

    // Step 1: Remove exact duplicates
    const { uniqueAchievements, exactDuplicatesRemoved } =
      removeExactDuplicateWorkAchievements(achievements);

    if (uniqueAchievements.length <= 1) {
      if (!dryRun && exactDuplicatesRemoved > 0) {
        // Delete the duplicate records
        const duplicateIds = achievements
          .filter((a) => !uniqueAchievements.some((u) => u.id === a.id))
          .map((a) => a.id);

        await tx.workAchievement.deleteMany({
          where: {
            id: { in: duplicateIds },
            workHistoryId,
          },
        });
      }

      return {
        success: true,
        message: `Removed ${exactDuplicatesRemoved} exact duplicates. No similar achievements to merge.`,
        originalCount: achievements.length,
        finalCount: uniqueAchievements.length,
        exactDuplicatesRemoved,
        similarGroupsMerged: 0,
        preview: uniqueAchievements.map((a) => ({
          description: a.description,
          action: "kept" as const,
        })),
      };
    }

    // Step 2: Use AI to identify and merge similar achievements
    const mergeResult = await mergeWorkAchievementsWithAI(uniqueAchievements);

    if (dryRun) {
      return {
        success: true,
        message: "Preview of work achievement deduplication and merge process",
        originalCount: achievements.length,
        finalCount: mergeResult.finalAchievements.length,
        exactDuplicatesRemoved,
        similarGroupsMerged: mergeResult.groupsMerged,
        preview: mergeResult.finalAchievements.map((a) => ({
          description: a.description,
          action: "merged" as const,
        })),
      };
    }

    // Step 3: Apply changes to database
    // Delete all existing achievements for this work history
    await tx.workAchievement.deleteMany({
      where: { workHistoryId },
    });

    // Create the merged achievements
    await tx.workAchievement.createMany({
      data: mergeResult.finalAchievements.map((achievement) => ({
        description: achievement.description,
        workHistoryId,
      })),
    });

    return {
      success: true,
      message: `Successfully deduplicated and merged work achievements. Removed ${exactDuplicatesRemoved} exact duplicates and merged ${mergeResult.groupsMerged} groups of similar achievements.`,
      originalCount: achievements.length,
      finalCount: mergeResult.finalAchievements.length,
      exactDuplicatesRemoved,
      similarGroupsMerged: mergeResult.groupsMerged,
      preview: mergeResult.finalAchievements.map((a) => ({
        description: a.description,
        action: "final" as const,
      })),
    };
  });
}

/**
 * Removes exact duplicate work achievements, keeping the oldest one
 */
export function removeExactDuplicateWorkAchievements(
  achievements: WorkAchievementRecord[],
) {
  const seen = new Set<string>();
  const uniqueAchievements: WorkAchievementRecord[] = [];
  let exactDuplicatesRemoved = 0;

  for (const achievement of achievements) {
    const normalizedDescription = achievement.description.trim().toLowerCase();

    if (!seen.has(normalizedDescription)) {
      seen.add(normalizedDescription);
      uniqueAchievements.push(achievement);
    } else {
      exactDuplicatesRemoved++;
    }
  }

  return { uniqueAchievements, exactDuplicatesRemoved };
}

/**
 * Uses AI to identify and merge similar work achievements while preserving all details
 */
export async function mergeWorkAchievementsWithAI(
  achievements: WorkAchievementRecord[],
): Promise<{
  finalAchievements: Array<{ description: string }>;
  groupsMerged: number;
}> {
  if (achievements.length <= 1) {
    return {
      finalAchievements: achievements.map((a) => ({
        description: a.description,
      })),
      groupsMerged: 0,
    };
  }

  try {
    // Initialize the LLM with structured output
    const llm = new ChatGoogleGenerativeAI({
      apiKey: env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash",
      temperature: 0.3, // Increased temperature for better optimization while maintaining accuracy
    }).withStructuredOutput(WorkAchievementMergeResultSchema);

    const achievementsList = achievements
      .map((a, index) => `${index + 1}. ${a.description}`)
      .join("\n");

    // Generate JSON schema for the LLM prompt
    const mergeResultJsonSchema = JSON.stringify(
      zodToJsonSchema(WorkAchievementMergeResultSchema),
      null,
      2,
    );

    const prompt = `You are an expert at analyzing and merging professional work achievements for resume optimization. Your task is to identify ONLY truly similar or duplicate achievements and merge them while preserving ALL important details and creating compelling resume entries that work for both human recruiters and Applicant Tracking Systems (ATS). Most achievements should remain separate.

CRITICAL RULES:
1. PRESERVE all quantifiable metrics, percentages, dollar amounts, timeframes, headcounts from the original text
2. ONLY merge achievements that describe the SAME specific accomplishment or are near-duplicates
3. Keep achievements that demonstrate different skills, projects, or impacts as SEPARATE items
4. OPTIMIZE language for professional impact while preserving factual accuracy
5. Start each achievement with strong, dynamic action verbs
6. **RETURN ALL FINAL ACHIEVEMENTS**: Your finalAchievements array must include EVERY achievement that should appear in the final list - both merged entries AND standalone entries that were optimized
7. **ACCOUNT FOR EVERY ORIGINAL**: Every original achievement (1-${achievements.length}) must be referenced in at least one finalAchievement's originalIndices array

RESUME OPTIMIZATION GUIDELINES:
- **Strong Action Verbs**: Begin each achievement with powerful action verbs (Led, Developed, Increased, Streamlined, Implemented, Achieved, Delivered, etc.)
- **Quantifiable Results**: Emphasize concrete numbers, percentages, dollar amounts, and measurable outcomes
- **Impact Focus**: Highlight achievements and contributions, not just responsibilities
- **Keyword Optimization**: Maintain industry-relevant keywords and terminology for ATS compatibility
- **Clarity & Readability**: Use clear, concise language that's easily parsed by both humans and ATS
- **Professional Formatting**: Ensure achievements work well in standard bullet point format

OPTIMIZATION EXAMPLES:
- "Developed interactive storytelling experiences powered by generative Al." → "Developed innovative interactive storytelling experiences leveraging generative AI technology"
- "Managed the full development lifecycle" → "Successfully managed complete development lifecycle from conception to deployment"
- "Built a robust and scalable NFT marketplace" → "Architected and built robust, scalable NFT marketplace platform"

MERGING GUIDELINES:
- **DO MERGE**: Near-duplicate achievements describing the same specific accomplishment
  Example: "Increased team productivity by 20%" + "Boosted team efficiency by 20% through process improvements" → "Increased team productivity by 20% through process improvements"
  
- **DO NOT MERGE**: Different achievements in the same category/domain
  Example: Keep separate: "Led team of 5 developers" + "Managed $100K budget" + "Reduced deployment time by 50%"
  (These are 3 distinct management/leadership achievements showcasing different competencies)

INPUT ACHIEVEMENTS:
${achievementsList}

INSTRUCTIONS:
1. Identify achievements that are near-duplicates or describe the exact same accomplishment
2. For true duplicates/near-duplicates, create ONE optimized achievement combining unique details (mark as "merged")
3. For ALL other achievements (those not being merged), optimize them individually using the resume best practices above (mark as "optimized")
4. Ensure EVERY achievement in your finalAchievements array starts with a strong action verb and demonstrates specific, measurable impact
5. Your finalAchievements array must contain ALL achievements that should appear in the final work history - this includes both merged entries AND individually optimized standalone entries
6. For each final achievement, include the originalIndices array showing which input achievements (1-indexed) were used to create it
7. Set the action field to "merged" for achievements created by combining multiple inputs, or "optimized" for achievements that were enhanced from a single input
8. **VALIDATION**: Ensure every number from 1 to ${achievements.length} appears in at least one originalIndices array

**CRITICAL**: You must return exactly the right number of achievements. If you start with ${achievements.length} achievements and merge some, the total count of unique original indices across all finalAchievements must equal ${achievements.length}.

Return the data as JSON matching this exact schema:

${mergeResultJsonSchema}`;

    const aiResult = (await llm.invoke(prompt)) as WorkAchievementMergeResult;

    // Validate the AI result
    if (
      !aiResult.finalAchievements ||
      !Array.isArray(aiResult.finalAchievements)
    ) {
      throw new Error("Invalid AI response structure");
    }

    // Validate that all original achievements are accounted for
    const allReferencedIndices = new Set<number>();
    for (const achievement of aiResult.finalAchievements) {
      if (
        !achievement.originalIndices ||
        achievement.originalIndices.length === 0
      ) {
        throw new Error("Each final achievement must have originalIndices");
      }
      for (const index of achievement.originalIndices) {
        allReferencedIndices.add(index);
      }
    }

    // Check that all original achievements (1 to N) are referenced
    const expectedIndices = new Set(
      Array.from({ length: achievements.length }, (_, i) => i + 1),
    );
    const missingIndices = [...expectedIndices].filter(
      (i) => !allReferencedIndices.has(i),
    );

    if (missingIndices.length > 0) {
      console.error("Missing achievement indices:", missingIndices);
      throw new Error(
        `AI failed to account for achievements: ${missingIndices.join(", ")}`,
      );
    }

    // Calculate how many groups were merged
    const groupsMerged = Math.max(
      0,
      achievements.length - aiResult.finalAchievements.length,
    );

    console.log("AI Work Achievement Merging Result:", {
      originalCount: achievements.length,
      mergedCount: aiResult.finalAchievements.length,
      groupsMerged,
      reasoning: aiResult.reasoning,
      allIndicesAccountedFor: allReferencedIndices.size === achievements.length,
    });

    return {
      finalAchievements: aiResult.finalAchievements.map((a) => ({
        description: a.description,
      })),
      groupsMerged,
    };
  } catch (error) {
    console.error("Error in AI work achievement merging:", error);

    // Fallback: return original achievements if AI processing fails
    return {
      finalAchievements: achievements.map((a) => ({
        description: a.description,
      })),
      groupsMerged: 0,
    };
  }
}
