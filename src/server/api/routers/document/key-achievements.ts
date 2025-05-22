import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";

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
