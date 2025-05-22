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
      include: { achievements: true, skills: true },
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

  // WorkSkill CRUD (by WorkHistory)
  listSkills: protectedProcedure
    .input(z.object({ workHistoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workSkill.findMany({
        where: { workHistoryId: input.workHistoryId },
        orderBy: { createdAt: "asc" },
      });
    }),

  createSkill: protectedProcedure
    .input(
      z.object({
        workHistoryId: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workSkill.create({
        data: input,
      });
    }),

  deleteSkill: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workSkill.delete({
        where: { id: input.id },
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

    // Upsert skills to avoid duplicates
    const skills = Array.isArray(exp.skills) ? exp.skills : [];
    for (const skill of skills) {
      if (typeof skill === "string") {
        // Check if skill already exists for this work history
        const existingSkill = await ctx.db.workSkill.findFirst({
          where: {
            workHistoryId,
            name: skill,
          },
        });

        if (!existingSkill) {
          await ctx.db.workSkill.create({
            data: {
              name: skill,
              workHistory: { connect: { id: workHistoryId } },
            },
          });
        }
      }
    }
  }
}
