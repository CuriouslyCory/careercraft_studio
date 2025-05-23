import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";

export const userLinksRouter = createTRPCRouter({
  // UserLink CRUD
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.userLink.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        url: z.string().url("Must be a valid URL"),
        type: z.string().optional().default("OTHER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userLink.create({
        data: {
          ...input,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1, "Title is required").optional(),
        url: z.string().url("Must be a valid URL").optional(),
        type: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.userLink.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userLink.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});

// Helper function for processing user links from parsed resumes
export async function processUserLinks(
  userLinks: Array<{
    title?: string;
    url?: string;
    type?: string;
  }>,
  userId: string,
  ctx: { db: PrismaClient },
) {
  // Get existing user links
  const existingLinks = await ctx.db.userLink.findMany({
    where: { userId },
  });

  for (const linkRaw of userLinks) {
    const link = linkRaw;

    if (!link.url || !link.title) {
      console.log("Skipping incomplete link:", link);
      continue;
    }

    // Check if this link already exists (by URL)
    const existingLink = existingLinks.find(
      (existing) => existing.url.toLowerCase() === link.url?.toLowerCase(),
    );

    if (existingLink) {
      // Update existing link if title or type differs
      if (
        existingLink.title !== link.title ||
        (link.type && existingLink.type !== link.type)
      ) {
        await ctx.db.userLink.update({
          where: { id: existingLink.id },
          data: {
            title: link.title,
            type: link.type ?? existingLink.type,
          },
        });
        console.log(`Updated existing link: ${link.title}`);
      }
    } else {
      // Create new link
      await ctx.db.userLink.create({
        data: {
          title: link.title,
          url: link.url,
          type: link.type ?? "OTHER",
          user: { connect: { id: userId } },
        },
      });
      console.log(`Created new link: ${link.title}`);
    }
  }
}
