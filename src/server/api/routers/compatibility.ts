import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { CompatibilityAnalyzer } from "~/server/services/compatibility-analyzer";

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

      // Create JobSkillRequirement records for required skills
      const allRequiredSkills = [
        ...details.technicalSkills,
        ...details.softSkills,
      ];

      const allBonusSkills = [
        ...details.bonusTechnicalSkills,
        ...details.bonusSoftSkills,
      ];

      // Process required skills
      for (const skillName of allRequiredSkills) {
        if (skillName.trim()) {
          // Find or create the skill
          let skill = await ctx.db.skill.findFirst({
            where: {
              OR: [
                { name: { equals: skillName, mode: "insensitive" } },
                {
                  aliases: {
                    some: {
                      alias: { equals: skillName, mode: "insensitive" },
                    },
                  },
                },
              ],
            },
          });

          if (!skill) {
            // Create new skill with appropriate category
            const category = details.technicalSkills.includes(skillName)
              ? "PROGRAMMING_LANGUAGE"
              : "SOFT_SKILLS";

            skill = await ctx.db.skill.create({
              data: {
                name: skillName,
                category,
              },
            });
          }

          // Create the skill requirement
          try {
            await ctx.db.jobSkillRequirement.create({
              data: {
                skillId: skill.id,
                jobPostingId: jobPosting.id,
                isRequired: true,
                priority: 1,
              },
            });
          } catch (error) {
            // Skip if already exists
            console.log(`Skill requirement already exists for ${skillName}`);
          }
        }
      }

      // Process bonus skills
      for (const skillName of allBonusSkills) {
        if (skillName.trim()) {
          // Find or create the skill
          let skill = await ctx.db.skill.findFirst({
            where: {
              OR: [
                { name: { equals: skillName, mode: "insensitive" } },
                {
                  aliases: {
                    some: {
                      alias: { equals: skillName, mode: "insensitive" },
                    },
                  },
                },
              ],
            },
          });

          if (!skill) {
            // Create new skill with appropriate category
            const category = details.bonusTechnicalSkills.includes(skillName)
              ? "PROGRAMMING_LANGUAGE"
              : "SOFT_SKILLS";

            skill = await ctx.db.skill.create({
              data: {
                name: skillName,
                category,
              },
            });
          }

          // Create the skill requirement
          try {
            await ctx.db.jobSkillRequirement.create({
              data: {
                skillId: skill.id,
                jobPostingId: jobPosting.id,
                isRequired: false,
                priority: 2,
              },
            });
          } catch (error) {
            // Skip if already exists
            console.log(`Skill requirement already exists for ${skillName}`);
          }
        }
      }

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
