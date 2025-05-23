import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import { mergeWorkAchievements } from "./utils/llm-merger";

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
  // Company name must match (case insensitive)
  const existingCompany = existing.companyName.toLowerCase().trim();
  const newCompany = (newRecord.company ?? "").toLowerCase().trim();

  if (existingCompany !== newCompany) {
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
      // Find or create the skill
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

      skill ??= await ctx.db.skill.create({
        data: {
          name: input.skillName,
          category: "OTHER", // Default category, can be updated later
        },
      });

      // Check if user already has this skill
      const existingUserSkill = await ctx.db.userSkill.findFirst({
        where: {
          userId: ctx.session.user.id,
          skillId: skill.id,
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
          skillId: skill.id,
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
      skills: true,
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

      // Delete existing achievements and replace with merged ones
      await ctx.db.workAchievement.deleteMany({
        where: { workHistoryId: matchingRecord.id },
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

    // Process skills for this work history using modern UserSkill approach
    const skills = Array.isArray(exp.skills) ? exp.skills : [];
    for (const skillName of skills) {
      if (typeof skillName === "string" && skillName.trim()) {
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

        skill ??= await ctx.db.skill.create({
          data: {
            name: skillName,
            category: "OTHER", // Default category, can be categorized later
          },
        });

        // Check if user already has this skill
        const existingUserSkill = await ctx.db.userSkill.findFirst({
          where: {
            userId,
            skillId: skill.id,
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
          // Create new UserSkill linked to this work history
          await ctx.db.userSkill.create({
            data: {
              userId,
              skillId: skill.id,
              proficiency: "INTERMEDIATE", // Default proficiency, can be updated later
              source: "WORK_EXPERIENCE",
              notes: `Used at ${exp.company} - ${exp.jobTitle}`,
              workHistoryId,
            },
          });
        }
      }
    }
  }
}
