import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { SkillNormalizationService } from "~/server/services/skill-normalization";

export const skillsRouter = createTRPCRouter({
  /**
   * Get skill suggestions for autocomplete
   */
  suggestions: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skillNormalizer = new SkillNormalizationService(ctx.db);
      return await skillNormalizer.getSkillSuggestions(
        input.query,
        input.limit,
      );
    }),

  /**
   * Normalize a skill name and get the base skill information
   */
  normalize: protectedProcedure
    .input(
      z.object({
        skillName: z.string().min(1),
        category: z
          .enum([
            "PROGRAMMING_LANGUAGE",
            "FRAMEWORK_LIBRARY",
            "DATABASE",
            "CLOUD_PLATFORM",
            "DEVOPS_TOOLS",
            "DESIGN_TOOLS",
            "PROJECT_MANAGEMENT",
            "SOFT_SKILLS",
            "INDUSTRY_KNOWLEDGE",
            "CERTIFICATION",
            "METHODOLOGY",
            "OTHER",
          ])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const skillNormalizer = new SkillNormalizationService(ctx.db);
      return await skillNormalizer.normalizeSkill(
        input.skillName,
        input.category ?? "OTHER",
      );
    }),

  /**
   * Migrate existing skills to use normalization
   * This will consolidate duplicate skills and create proper aliases
   */
  migrateExisting: protectedProcedure.mutation(async ({ ctx }) => {
    const skillNormalizer = new SkillNormalizationService(ctx.db);
    return await skillNormalizer.migrateExistingSkills();
  }),

  /**
   * Parse a skill name to see how it would be normalized
   */
  parseSkillName: protectedProcedure
    .input(z.object({ skillName: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const skillNormalizer = new SkillNormalizationService(ctx.db);
      return skillNormalizer.parseSkillName(input.skillName);
    }),

  /**
   * Get all skills with their aliases
   */
  listWithAliases: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.skill.findMany({
      include: {
        aliases: true,
        _count: {
          select: {
            userSkills: true,
            jobRequirements: true,
          },
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),
});
