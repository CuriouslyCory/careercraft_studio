import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Helper function to normalize URLs for comparison
function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove www prefix and trailing slashes for comparison
    let normalizedHost = urlObj.hostname.toLowerCase();
    if (normalizedHost.startsWith("www.")) {
      normalizedHost = normalizedHost.substring(4);
    }

    // Remove trailing slash from pathname
    let normalizedPath = urlObj.pathname;
    if (normalizedPath.endsWith("/") && normalizedPath.length > 1) {
      normalizedPath = normalizedPath.slice(0, -1);
    }

    // Reconstruct URL without search params and hash for comparison
    return `${urlObj.protocol}//${normalizedHost}${normalizedPath}`;
  } catch {
    // If URL is invalid, return lowercase version for basic comparison
    return url.toLowerCase().trim();
  }
}

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
        title: z
          .string()
          .min(1, "Title is required")
          .max(200, "Title must be 200 characters or less"),
        url: z
          .string()
          .url("Must be a valid URL")
          .max(500, "URL must be 500 characters or less"),
        type: z.string().optional().default("OTHER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Normalize URL before validation and storage
      let normalizedUrl: string;
      try {
        const urlObj = new URL(input.url);
        // Ensure protocol is present and normalize
        normalizedUrl = urlObj.toString();
      } catch {
        throw new Error("Invalid URL format provided");
      }

      // Check for existing duplicate URLs
      const existingLinks = await ctx.db.userLink.findMany({
        where: { userId: ctx.session.user.id },
      });

      const normalizedInputUrl = normalizeUrl(normalizedUrl);
      const existingLink = existingLinks.find(
        (link) => normalizeUrl(link.url) === normalizedInputUrl,
      );

      if (existingLink) {
        throw new Error(
          `A link with this URL already exists: "${existingLink.title}". Please update the existing link instead of creating a duplicate.`,
        );
      }

      try {
        return await ctx.db.userLink.create({
          data: {
            title: input.title.trim(),
            url: normalizedUrl,
            type: input.type,
            user: { connect: { id: ctx.session.user.id } },
          },
        });
      } catch (error) {
        // Handle Prisma unique constraint violations
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            // P2002 is Prisma's unique constraint violation error
            throw new Error(
              "A link with this URL already exists. Please update the existing link instead of creating a duplicate.",
            );
          }
        }
        throw error;
      }
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
  if (!userLinks || userLinks.length === 0) {
    console.log("No user links to process");
    return;
  }

  // Get existing user links
  const existingLinks = await ctx.db.userLink.findMany({
    where: { userId },
  });

  console.log(
    `Processing ${userLinks.length} user links. User has ${existingLinks.length} existing links.`,
  );

  for (const linkRaw of userLinks) {
    const link = linkRaw;

    // Skip links with missing required data
    if (!link.url || !link.title) {
      console.log("Skipping incomplete link:", link);
      continue;
    }

    // Normalize URLs for comparison
    const normalizedUrl = normalizeUrl(link.url);

    // Check if this link already exists (by normalized URL)
    const existingLink = existingLinks.find(
      (existing) => normalizeUrl(existing.url) === normalizedUrl,
    );

    if (existingLink) {
      // Update existing link if title or type differs and new data is more complete
      let shouldUpdate = false;
      const updateData: { title?: string; type?: string } = {};

      // Update title if new one is different and not empty
      if (link.title && existingLink.title !== link.title) {
        updateData.title = link.title;
        shouldUpdate = true;
      }

      // Update type if new one is provided and different (and not the default "OTHER")
      if (
        link.type &&
        link.type !== "OTHER" &&
        existingLink.type !== link.type
      ) {
        updateData.type = link.type;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await ctx.db.userLink.update({
          where: { id: existingLink.id },
          data: updateData,
        });
        console.log(
          `Updated existing link: "${link.title}" with type: ${link.type ?? "N/A"}`,
        );
      } else {
        console.log(
          `Skipping duplicate link: "${link.title}" (already exists with same data)`,
        );
      }
    } else {
      // Create new link
      try {
        await ctx.db.userLink.create({
          data: {
            title: link.title,
            url: link.url,
            type: link.type ?? "OTHER",
            user: { connect: { id: userId } },
          },
        });
        console.log(
          `Created new link: "${link.title}" (${link.type ?? "OTHER"}) - ${link.url}`,
        );
      } catch (error) {
        // Handle Prisma unique constraint violations gracefully
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          console.log(
            `Skipping duplicate link (database constraint): "${link.title}" - ${link.url}`,
          );
        } else {
          console.error(`Failed to create link "${link.title}":`, error);
        }
        // Continue processing other links even if one fails
      }
    }
  }

  console.log("Finished processing user links");
}
