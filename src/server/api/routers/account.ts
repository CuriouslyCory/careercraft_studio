import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Account Router
 * Handles user data export and deletion requests, and soft-deletes the user.
 */
export const accountRouter = createTRPCRouter({
  /**
   * Request a data export (GDPR-style)
   */
  requestDataExport: protectedProcedure.mutation(async ({ ctx }) => {
    // Create a DataRequest of type EXPORT
    await ctx.db.dataRequest.create({
      data: {
        userId: ctx.session.user.id,
        type: "EXPORT",
        status: "PENDING",
      },
    });
    return { success: true };
  }),

  /**
   * Request account deletion (soft delete)
   */
  requestAccountDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    // Create a DataRequest of type DELETE
    await ctx.db.dataRequest.create({
      data: {
        userId: ctx.session.user.id,
        type: "DELETE",
        status: "PENDING",
      },
    });
    // Soft-delete the user
    await ctx.db.user.update({
      where: { id: ctx.session.user.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    return { success: true };
  }),

  /**
   * List all data requests for the current user
   */
  listDataRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.dataRequest.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
});
