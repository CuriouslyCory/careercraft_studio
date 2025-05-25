import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { CompatibilityAnalyzer } from "~/server/services/compatibility-analyzer";
import { SkillNormalizationService } from "~/server/services/skill-normalization";

export const compatibilityRouter = createTRPCRouter({
  /**
   * Migrate existing job postings to create JobSkillRequirement records
   */
  migrateJobPostings: protectedProcedure.mutation(async ({ ctx }) => {
    const jobPostings = await ctx.db.jobPosting.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        details: true,
        skillRequirements: true,
      },
    });

    let migratedCount = 0;

    for (const jobPosting of jobPostings) {
      // Skip if already has skill requirements
      if (jobPosting.skillRequirements.length > 0) {
        continue;
      }

      // Skip if no details
      if (!jobPosting.details) {
        continue;
      }

      const details = jobPosting.details;

      // Use the SkillNormalizationService for consistent skill handling
      await ctx.db.$transaction(async (tx) => {
        const skillNormalizer = new SkillNormalizationService(tx);

        // Create JobSkillRequirement records for required skills
        const allRequiredSkills = [
          ...details.technicalSkills,
          ...details.softSkills,
        ];

        const allBonusSkills = [
          ...details.bonusTechnicalSkills,
          ...details.bonusSoftSkills,
        ];

        // Process required skills with normalization
        const requiredSkillResults =
          await skillNormalizer.normalizeSkills(allRequiredSkills);

        // Process bonus skills with normalization
        const bonusSkillResults =
          await skillNormalizer.normalizeSkills(allBonusSkills);

        // Collect unique skill requirements to avoid duplicates
        const skillRequirements = new Map<
          string,
          {
            skillId: string;
            isRequired: boolean;
            priority: number;
          }
        >();

        // Process required skills first (higher priority)
        for (const skillResult of requiredSkillResults) {
          skillRequirements.set(skillResult.baseSkillId, {
            skillId: skillResult.baseSkillId,
            isRequired: true,
            priority: 1,
          });
        }

        // Process bonus skills (only add if not already required)
        for (const skillResult of bonusSkillResults) {
          if (!skillRequirements.has(skillResult.baseSkillId)) {
            skillRequirements.set(skillResult.baseSkillId, {
              skillId: skillResult.baseSkillId,
              isRequired: false,
              priority: 2,
            });
          }
        }

        // Create all unique skill requirements in a single batch
        const skillRequirementData = Array.from(skillRequirements.values()).map(
          (req) => ({
            skillId: req.skillId,
            jobPostingId: jobPosting.id,
            isRequired: req.isRequired,
            priority: req.priority,
          }),
        );

        if (skillRequirementData.length > 0) {
          await tx.jobSkillRequirement.createMany({
            data: skillRequirementData,
            skipDuplicates: true, // This will skip any duplicates instead of failing
          });
        }
      });

      migratedCount++;
    }

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} job postings`,
      totalJobPostings: jobPostings.length,
      migratedCount,
    };
  }),

  /**
   * Analyze compatibility between a user and a job posting
   */
  analyze: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const analyzer = new CompatibilityAnalyzer(ctx.db);
      return await analyzer.analyzeCompatibility(
        ctx.session.user.id,
        input.jobPostingId,
      );
    }),

  /**
   * Get compatibility summary for multiple job postings
   */
  analyzeMultiple: protectedProcedure
    .input(
      z.object({
        jobPostingIds: z.array(z.string()).max(10), // Limit to 10 for performance
      }),
    )
    .query(async ({ ctx, input }) => {
      const analyzer = new CompatibilityAnalyzer(ctx.db);
      const results = await Promise.all(
        input.jobPostingIds.map(async (jobPostingId) => {
          try {
            return await analyzer.analyzeCompatibility(
              ctx.session.user.id,
              jobPostingId,
            );
          } catch (error) {
            console.error(
              `Error analyzing compatibility for job ${jobPostingId}:`,
              error,
            );
            return null;
          }
        }),
      );

      // Filter out failed analyses
      return results.filter(Boolean);
    }),

  /**
   * Get a quick compatibility score for multiple job postings (lighter weight)
   */
  getCompatibilityScores: protectedProcedure
    .input(
      z.object({
        jobPostingIds: z.array(z.string()).max(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const analyzer = new CompatibilityAnalyzer(ctx.db);

      const scores = await Promise.all(
        input.jobPostingIds.map(async (jobPostingId) => {
          try {
            const analysis = await analyzer.analyzeCompatibility(
              ctx.session.user.id,
              jobPostingId,
            );
            return {
              jobPostingId,
              overallScore: analysis.overallScore,
              perfectMatches: analysis.summary.perfectMatches,
              partialMatches: analysis.summary.partialMatches,
              missingRequirements: analysis.summary.missingRequirements,
            };
          } catch (error) {
            console.error(
              `Error getting compatibility score for job ${jobPostingId}:`,
              error,
            );
            return {
              jobPostingId,
              overallScore: 0,
              perfectMatches: 0,
              partialMatches: 0,
              missingRequirements: 0,
              error: "Failed to analyze",
            };
          }
        }),
      );

      return scores;
    }),
});
