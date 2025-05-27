import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * User Profile Router
 * Manages user's professional profile information separate from auth provider data
 */
export const userProfileRouter = createTRPCRouter({
  /**
   * Get the current user's profile
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });

    return profile;
  }),

  /**
   * Create or update user profile
   */
  upsert: protectedProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        location: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Clean up empty strings to null for optional fields
      const cleanedInput = {
        ...input,
        email: input.email === "" ? null : input.email,
        firstName: input.firstName === "" ? null : input.firstName,
        lastName: input.lastName === "" ? null : input.lastName,
        phone: input.phone === "" ? null : input.phone,
        location: input.location === "" ? null : input.location,
      };

      return ctx.db.userProfile.upsert({
        where: { userId: ctx.session.user.id },
        create: {
          ...cleanedInput,
          user: { connect: { id: ctx.session.user.id } },
        },
        update: cleanedInput,
      });
    }),

  /**
   * Delete user profile
   */
  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const existingProfile = await ctx.db.userProfile.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!existingProfile) {
      throw new Error("No profile found to delete");
    }

    return ctx.db.userProfile.delete({
      where: { userId: ctx.session.user.id },
    });
  }),
});
