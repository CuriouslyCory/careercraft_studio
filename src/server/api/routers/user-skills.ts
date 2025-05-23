import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ProficiencyLevel, SkillSource } from "@prisma/client";

export const userSkillsRouter = createTRPCRouter({
  /**
   * Migrate legacy WorkSkill data to UserSkill format
   */
  migrateLegacySkills: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user already has UserSkill records
    const existingUserSkills = await ctx.db.userSkill.findMany({
      where: { userId: ctx.session.user.id },
    });

    if (existingUserSkills.length > 0) {
      return {
        success: true,
        message: "User already has modern skill records",
        migratedCount: 0,
      };
    }

    // Get work history with legacy skills
    const workHistoryWithSkills = await ctx.db.workHistory.findMany({
      where: { userId: ctx.session.user.id },
      include: { skills: true },
    });

    // Convert legacy WorkSkill data to UserSkill format
    const legacySkillsMap = new Map<
      string,
      { count: number; latestWorkId: string }
    >();

    for (const work of workHistoryWithSkills) {
      for (const workSkill of work.skills) {
        const existing = legacySkillsMap.get(workSkill.name);
        if (existing) {
          existing.count++;
        } else {
          legacySkillsMap.set(workSkill.name, {
            count: 1,
            latestWorkId: work.id,
          });
        }
      }
    }

    let migratedCount = 0;

    for (const [skillName, data] of legacySkillsMap) {
      // Find or create the skill in the normalized table
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

      // Create new skill with default category
      skill ??= await ctx.db.skill.create({
        data: {
          name: skillName,
          category: "OTHER", // Default category for legacy skills
        },
      });

      // Estimate proficiency based on usage frequency
      let proficiency: ProficiencyLevel = "INTERMEDIATE"; // Default
      if (data.count >= 3) {
        proficiency = "EXPERT";
      } else if (data.count >= 2) {
        proficiency = "ADVANCED";
      } else {
        proficiency = "INTERMEDIATE";
      }

      // Create the UserSkill record
      try {
        await ctx.db.userSkill.create({
          data: {
            userId: ctx.session.user.id,
            skillId: skill.id,
            proficiency,
            source: "WORK_EXPERIENCE",
            notes: `Migrated from legacy work skills (appeared ${data.count} times)`,
            workHistoryId: data.latestWorkId,
          },
        });
        migratedCount++;
      } catch (error) {
        console.log(`Skill already exists: ${skillName}`);
      }
    }

    return {
      success: true,
      message: `Successfully migrated ${migratedCount} skills from work history`,
      migratedCount,
    };
  }),

  /**
   * Get all user skills with skill details
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.userSkill.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        skill: true,
        workHistory: true,
      },
      orderBy: [{ proficiency: "desc" }, { yearsExperience: "desc" }],
    });
  }),

  /**
   * Add a new skill to user's profile
   */
  add: protectedProcedure
    .input(
      z.object({
        skillName: z.string().min(1),
        proficiency: z.nativeEnum(ProficiencyLevel),
        yearsExperience: z.number().min(0).max(50).optional(),
        source: z.nativeEnum(SkillSource),
        notes: z.string().optional(),
        workHistoryId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First, find or create the skill
      let skill = await ctx.db.skill.findFirst({
        where: {
          OR: [
            { name: { equals: input.skillName, mode: "insensitive" } },
            {
              aliases: {
                some: {
                  alias: { equals: input.skillName, mode: "insensitive" },
                },
              },
            },
          ],
        },
      });

      // Create new skill with default category
      skill ??= await ctx.db.skill.create({
        data: {
          name: input.skillName,
          category: "OTHER", // Default category, can be updated later
        },
      });

      // Check if user already has this skill
      const existingUserSkill = await ctx.db.userSkill.findUnique({
        where: {
          userId_skillId: {
            userId: ctx.session.user.id,
            skillId: skill.id,
          },
        },
      });

      if (existingUserSkill) {
        throw new Error("You already have this skill in your profile");
      }

      // Create the user skill
      return await ctx.db.userSkill.create({
        data: {
          userId: ctx.session.user.id,
          skillId: skill.id,
          proficiency: input.proficiency,
          yearsExperience: input.yearsExperience,
          source: input.source,
          notes: input.notes,
          workHistoryId: input.workHistoryId,
        },
        include: {
          skill: true,
          workHistory: true,
        },
      });
    }),

  /**
   * Update an existing user skill
   */
  update: protectedProcedure
    .input(
      z.object({
        userSkillId: z.string(),
        proficiency: z.nativeEnum(ProficiencyLevel).optional(),
        yearsExperience: z.number().min(0).max(50).optional(),
        source: z.nativeEnum(SkillSource).optional(),
        notes: z.string().optional(),
        workHistoryId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { userSkillId, ...updateData } = input;

      // Verify the skill belongs to the user
      const userSkill = await ctx.db.userSkill.findFirst({
        where: {
          id: userSkillId,
          userId: ctx.session.user.id,
        },
      });

      if (!userSkill) {
        throw new Error("Skill not found or doesn't belong to you");
      }

      return await ctx.db.userSkill.update({
        where: { id: userSkillId },
        data: updateData,
        include: {
          skill: true,
          workHistory: true,
        },
      });
    }),

  /**
   * Remove a skill from user's profile
   */
  remove: protectedProcedure
    .input(
      z.object({
        userSkillId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the skill belongs to the user
      const userSkill = await ctx.db.userSkill.findFirst({
        where: {
          id: input.userSkillId,
          userId: ctx.session.user.id,
        },
      });

      if (!userSkill) {
        throw new Error("Skill not found or doesn't belong to you");
      }

      await ctx.db.userSkill.delete({
        where: { id: input.userSkillId },
      });

      return { success: true };
    }),

  /**
   * Get skill suggestions based on partial name
   */
  searchSkills: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(20).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skills = await ctx.db.skill.findMany({
        where: {
          OR: [
            { name: { contains: input.query, mode: "insensitive" } },
            {
              aliases: {
                some: {
                  alias: { contains: input.query, mode: "insensitive" },
                },
              },
            },
          ],
        },
        include: {
          aliases: true,
        },
        take: input.limit,
        orderBy: { name: "asc" },
      });

      return skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        aliases: skill.aliases.map((alias) => alias.alias),
      }));
    }),

  /**
   * Get skills similar to a given skill
   */
  getSimilarSkills: protectedProcedure
    .input(
      z.object({
        skillId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const similarities = await ctx.db.skillSimilarity.findMany({
        where: {
          OR: [{ skillId: input.skillId }, { relatedSkillId: input.skillId }],
        },
        include: {
          skill: true,
          relatedSkill: true,
        },
        orderBy: { similarityScore: "desc" },
      });

      return similarities.map((similarity) => ({
        skill:
          similarity.skillId === input.skillId
            ? similarity.relatedSkill
            : similarity.skill,
        similarityScore: similarity.similarityScore,
      }));
    }),
});
