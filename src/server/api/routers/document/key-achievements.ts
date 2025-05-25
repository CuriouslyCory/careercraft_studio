import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "~/env";
import { zodToJsonSchema } from "zod-to-json-schema";

// Zod schema for AI merge result
const AIMergeResultSchema = z.object({
  mergedAchievements: z.array(
    z.object({
      content: z
        .string()
        .describe(
          "The merged achievement text preserving all original details",
        ),
      originalIndices: z
        .array(z.number())
        .optional()
        .describe("Which original achievements were merged (1-indexed)"),
    }),
  ),
  reasoning: z
    .string()
    .optional()
    .describe("Brief explanation of what was merged and why"),
});

type AIMergeResult = z.infer<typeof AIMergeResultSchema>;

// Types for the deduplication service
export type DeduplicationResult = {
  success: boolean;
  message: string;
  originalCount: number;
  finalCount: number;
  exactDuplicatesRemoved: number;
  similarGroupsMerged: number;
  preview: Array<{ content: string; action: "kept" | "merged" | "final" }>;
};

export type KeyAchievementRecord = {
  id: string;
  content: string;
  createdAt: Date;
};

export const keyAchievementsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.keyAchievement.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.create({
        data: {
          content: input.content,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { content: input.content },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  /**
   * Deduplicates and merges similar key achievements using AI.
   * Removes exact duplicates and intelligently merges similar achievements
   * while preserving all important details without making up information.
   */
  deduplicateAndMerge: protectedProcedure
    .input(
      z.object({
        dryRun: z
          .boolean()
          .default(false)
          .describe("If true, returns preview without making changes"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await deduplicateAndMergeKeyAchievements(
        ctx.db,
        ctx.session.user.id,
        input.dryRun,
      );
    }),
});

// Helper function for processing key achievements from parsed resumes
export async function processKeyAchievements(
  keyAchievements: string[],
  userId: string,
  ctx: { db: PrismaClient },
) {
  for (const ach of keyAchievements) {
    if (typeof ach === "string") {
      await ctx.db.keyAchievement.create({
        data: {
          content: ach,
          user: { connect: { id: userId } },
        },
      });
    }
  }
}

/**
 * Centralized service function for deduplicating and merging key achievements
 * This function can be used by both tRPC routes and agent tools
 */
export async function deduplicateAndMergeKeyAchievements(
  db: PrismaClient,
  userId: string,
  dryRun = false,
): Promise<DeduplicationResult> {
  return await db.$transaction(async (tx) => {
    // Get all key achievements for the user
    const achievements = await tx.keyAchievement.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }, // Preserve chronological order
    });

    if (achievements.length <= 1) {
      return {
        success: true,
        message: "No deduplication needed - you have 1 or fewer achievements.",
        originalCount: achievements.length,
        finalCount: achievements.length,
        exactDuplicatesRemoved: 0,
        similarGroupsMerged: 0,
        preview: [],
      };
    }

    // Step 1: Remove exact duplicates
    const { uniqueAchievements, exactDuplicatesRemoved } =
      removeExactDuplicates(achievements);

    if (uniqueAchievements.length <= 1) {
      if (!dryRun && exactDuplicatesRemoved > 0) {
        // Delete the duplicate records
        const duplicateIds = achievements
          .filter((a) => !uniqueAchievements.some((u) => u.id === a.id))
          .map((a) => a.id);

        await tx.keyAchievement.deleteMany({
          where: {
            id: { in: duplicateIds },
            userId,
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
          content: a.content,
          action: "kept" as const,
        })),
      };
    }

    // Step 2: Use AI to identify and merge similar achievements
    const mergeResult = await mergeAchievementsWithAI(uniqueAchievements);

    if (dryRun) {
      return {
        success: true,
        message: "Preview of deduplication and merge process",
        originalCount: achievements.length,
        finalCount: mergeResult.mergedAchievements.length,
        exactDuplicatesRemoved,
        similarGroupsMerged: mergeResult.groupsMerged,
        preview: mergeResult.mergedAchievements.map((a) => ({
          content: a.content,
          action: "merged" as const,
        })),
      };
    }

    // Step 3: Apply changes to database
    // Delete all existing achievements
    await tx.keyAchievement.deleteMany({
      where: { userId },
    });

    // Create the merged achievements
    await tx.keyAchievement.createMany({
      data: mergeResult.mergedAchievements.map((achievement) => ({
        content: achievement.content,
        userId,
      })),
    });

    return {
      success: true,
      message: `Successfully deduplicated and merged achievements. Removed ${exactDuplicatesRemoved} exact duplicates and merged ${mergeResult.groupsMerged} groups of similar achievements.`,
      originalCount: achievements.length,
      finalCount: mergeResult.mergedAchievements.length,
      exactDuplicatesRemoved,
      similarGroupsMerged: mergeResult.groupsMerged,
      preview: mergeResult.mergedAchievements.map((a) => ({
        content: a.content,
        action: "final" as const,
      })),
    };
  });
}

/**
 * Removes exact duplicate achievements, keeping the oldest one
 */
export function removeExactDuplicates(achievements: KeyAchievementRecord[]) {
  const seen = new Set<string>();
  const uniqueAchievements: KeyAchievementRecord[] = [];
  let exactDuplicatesRemoved = 0;

  for (const achievement of achievements) {
    const normalizedContent = achievement.content.trim().toLowerCase();

    if (!seen.has(normalizedContent)) {
      seen.add(normalizedContent);
      uniqueAchievements.push(achievement);
    } else {
      exactDuplicatesRemoved++;
    }
  }

  return { uniqueAchievements, exactDuplicatesRemoved };
}

/**
 * Uses AI to identify and merge similar achievements while preserving all details
 */
export async function mergeAchievementsWithAI(
  achievements: KeyAchievementRecord[],
): Promise<{
  mergedAchievements: Array<{ content: string }>;
  groupsMerged: number;
}> {
  if (achievements.length <= 1) {
    return {
      mergedAchievements: achievements.map((a) => ({ content: a.content })),
      groupsMerged: 0,
    };
  }

  try {
    // Initialize the LLM with structured output
    const llm = new ChatGoogleGenerativeAI({
      apiKey: env.GOOGLE_API_KEY,
      model: "gemini-2.0-flash",
      temperature: 0.1, // Low temperature for consistent, factual merging
    }).withStructuredOutput(AIMergeResultSchema);

    const achievementsList = achievements
      .map((a, index) => `${index + 1}. ${a.content}`)
      .join("\n");

    // Generate JSON schema for the LLM prompt
    const mergeResultJsonSchema = JSON.stringify(
      zodToJsonSchema(AIMergeResultSchema),
      null,
      2,
    );

    const prompt = `You are an expert at analyzing and merging professional achievements. Your task is to identify ONLY truly similar or duplicate achievements and merge them while preserving ALL important details. Most achievements should remain separate.

CRITICAL RULES:
1. NEVER make up or invent any details that aren't explicitly stated
2. NEVER add numbers, dates, or specifics that weren't in the original text
3. PRESERVE all quantifiable metrics, percentages, dollar amounts, timeframes, headcounts
4. ONLY merge achievements that describe the SAME specific accomplishment or are near-duplicates
5. Keep achievements that demonstrate different skills, projects, or impacts as SEPARATE items
6. Maintain professional language and clarity
7. Lead with strong action verbs when possible

MERGING GUIDELINES:
- **DO MERGE**: Near-duplicate achievements describing the same specific accomplishment
  Example: "Increased sales by 20%" + "Boosted revenue by 20% through new strategies" → "Increased sales by 20% through implementation of new strategies"
  
- **DO NOT MERGE**: Different achievements in the same category/domain
  Example: Keep separate: "Built AI chatbot" + "Developed ML pipeline" + "Integrated AI into mobile app"
  (These are 3 distinct AI-related achievements, not duplicates)

- **DO NOT MERGE**: Achievements with different metrics, timeframes, or contexts
  Example: Keep separate: "Led team of 5" + "Managed budget of $100K" + "Reduced costs by 15%"

- **DO NOT MERGE**: Achievements demonstrating different skills or competencies
  Example: Keep separate: "Architected scalable systems" + "Implemented CI/CD" + "Led cross-functional teams"

ACHIEVEMENT BEST PRACTICES TO PRESERVE:
- Quantification (percentages, dollar amounts, headcounts, time savings, scale)
- Results and impact focus (not just responsibilities)
- Strong action verbs (Led, Developed, Increased, Streamlined, etc.)
- Diverse skill demonstration
- Specific, measurable outcomes

INPUT ACHIEVEMENTS:
${achievementsList}

INSTRUCTIONS:
1. Identify achievements that are near-duplicates or describe the exact same accomplishment
2. For true duplicates/near-duplicates, create ONE merged achievement combining unique details
3. Keep all other achievements as separate, distinct items
4. Ensure each achievement demonstrates a specific, measurable impact
5. Preserve the diversity of skills and accomplishments shown

Remember: It's better to keep achievements separate than to incorrectly merge distinct accomplishments. Only merge when you're confident they describe the same specific achievement.

Return the data as JSON matching this exact schema:

${mergeResultJsonSchema}

For originalIndices, use 1-based indexing to match the numbered list above.`;

    const aiResult = (await llm.invoke(prompt)) as AIMergeResult;

    // Validate the AI result
    if (
      !aiResult.mergedAchievements ||
      !Array.isArray(aiResult.mergedAchievements)
    ) {
      throw new Error("Invalid AI response structure");
    }

    // Calculate how many groups were merged
    const groupsMerged = Math.max(
      0,
      achievements.length - aiResult.mergedAchievements.length,
    );

    console.log("AI Achievement Merging Result:", {
      originalCount: achievements.length,
      mergedCount: aiResult.mergedAchievements.length,
      groupsMerged,
      reasoning: aiResult.reasoning,
    });

    return {
      mergedAchievements: aiResult.mergedAchievements.map((a) => ({
        content: a.content,
      })),
      groupsMerged,
    };
  } catch (error) {
    console.error("Error in AI achievement merging:", error);

    // Fallback: return original achievements if AI processing fails
    return {
      mergedAchievements: achievements.map((a) => ({ content: a.content })),
      groupsMerged: 0,
    };
  }
}
