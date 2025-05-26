import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { SubscriptionService } from "~/server/services/subscription-service";
import { UsageTracker } from "~/server/services/usage-tracker";
import { TRPCError } from "@trpc/server";

/**
 * tRPC router for subscription and usage management
 * Provides endpoints for subscription status, usage tracking, and tier management
 */
export const subscriptionRouter = createTRPCRouter({
  /**
   * Get the current user's subscription status and tier information
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionService = new SubscriptionService(ctx.db);
    const subscription = await subscriptionService.getUserSubscription(
      ctx.session.user.id,
    );

    return {
      subscription,
      isActive: subscription
        ? await subscriptionService.isSubscriptionActive(ctx.session.user.id)
        : false,
    };
  }),

  /**
   * Get the current user's usage limits and current usage
   */
  getUsageLimits: protectedProcedure.query(async ({ ctx }) => {
    const usageTracker = new UsageTracker(ctx.db);
    const [limits, currentUsage] = await Promise.all([
      usageTracker.getUserLimits(ctx.session.user.id),
      usageTracker.getCurrentMonthUsageSummary(ctx.session.user.id),
    ]);

    return {
      limits,
      currentUsage,
    };
  }),

  /**
   * Get current month's usage summary for the user
   */
  getCurrentUsage: protectedProcedure.query(async ({ ctx }) => {
    const usageTracker = new UsageTracker(ctx.db);
    return await usageTracker.getCurrentMonthUsageSummary(ctx.session.user.id);
  }),

  /**
   * Get all available subscription tiers
   */
  getAvailableTiers: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionService = new SubscriptionService(ctx.db);
    return await subscriptionService.getAvailableTiers();
  }),

  /**
   * Cancel the current user's subscription
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        cancelAtPeriodEnd: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptionService = new SubscriptionService(ctx.db);
      return await subscriptionService.cancelSubscription(
        ctx.session.user.id,
        input.cancelAtPeriodEnd,
      );
    }),

  /**
   * Reactivate a canceled subscription
   */
  reactivateSubscription: protectedProcedure
    .input(
      z.object({
        newPeriodEnd: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptionService = new SubscriptionService(ctx.db);
      return await subscriptionService.reactivateSubscription(
        ctx.session.user.id,
        input.newPeriodEnd,
      );
    }),

  /**
   * Create a new subscription (typically called after Stripe checkout)
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        tierType: z.enum(["FREE", "PRO", "ENTERPRISE"]),
        stripeSubscriptionId: z.string().optional(),
        stripeCustomerId: z.string().optional(),
        stripePriceId: z.string().optional(),
        currentPeriodStart: z.date().optional(),
        currentPeriodEnd: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptionService = new SubscriptionService(ctx.db);
      return await subscriptionService.createSubscription(
        ctx.session.user.id,
        input.tierType,
        {
          stripeSubscriptionId: input.stripeSubscriptionId,
          stripeCustomerId: input.stripeCustomerId,
          stripePriceId: input.stripePriceId,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
        },
      );
    }),

  /**
   * Update subscription tier (typically called after Stripe plan change)
   */
  updateSubscriptionTier: protectedProcedure
    .input(
      z.object({
        newTierType: z.enum(["FREE", "PRO", "ENTERPRISE"]),
        stripeSubscriptionId: z.string().optional(),
        stripePriceId: z.string().optional(),
        currentPeriodEnd: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptionService = new SubscriptionService(ctx.db);
      return await subscriptionService.updateSubscriptionTier(
        ctx.session.user.id,
        input.newTierType,
        {
          stripeSubscriptionId: input.stripeSubscriptionId,
          stripePriceId: input.stripePriceId,
          currentPeriodEnd: input.currentPeriodEnd,
        },
      );
    }),

  /**
   * Check if user can perform a specific action (for frontend validation)
   */
  checkActionLimit: protectedProcedure
    .input(
      z.object({
        action: z.enum([
          "RESUME_UPLOAD",
          "JOB_POSTING_IMPORT",
          "RESUME_GENERATION",
          "COVER_LETTER_GENERATION",
          "AI_CHAT_MESSAGE",
          "DOCUMENT_EXPORT",
        ]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const usageTracker = new UsageTracker(ctx.db);
      const canPerform = await usageTracker.checkLimit(
        ctx.session.user.id,
        input.action,
      );

      if (!canPerform) {
        const [limits, currentUsage] = await Promise.all([
          usageTracker.getUserLimits(ctx.session.user.id),
          usageTracker.getCurrentMonthUsage(ctx.session.user.id, input.action),
        ]);

        // Map action to the correct limit field
        let limit: number | null = null;
        switch (input.action) {
          case "RESUME_UPLOAD":
            limit = limits.resumeUpload;
            break;
          case "JOB_POSTING_IMPORT":
            limit = limits.jobPosting;
            break;
          case "RESUME_GENERATION":
            limit = limits.resumeGeneration;
            break;
          case "COVER_LETTER_GENERATION":
            limit = limits.coverLetter;
            break;
          case "AI_CHAT_MESSAGE":
            limit = limits.aiChatMessage;
            break;
          case "DOCUMENT_EXPORT":
            limit = null; // Not limited yet
            break;
        }

        return {
          canPerform: false,
          currentUsage,
          limit,
          tierName: limits.tierName,
        };
      }

      return { canPerform: true };
    }),

  /**
   * Record usage for an action (typically called after successful action completion)
   */
  recordUsage: protectedProcedure
    .input(
      z.object({
        action: z.enum([
          "RESUME_UPLOAD",
          "JOB_POSTING_IMPORT",
          "RESUME_GENERATION",
          "COVER_LETTER_GENERATION",
          "AI_CHAT_MESSAGE",
          "DOCUMENT_EXPORT",
        ]),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usageTracker = new UsageTracker(ctx.db);
      await usageTracker.recordUsage(
        ctx.session.user.id,
        input.action,
        input.metadata,
      );
      return { success: true };
    }),

  /**
   * Check limit and record usage in one call (for atomic operations)
   */
  checkLimitAndRecord: protectedProcedure
    .input(
      z.object({
        action: z.enum([
          "RESUME_UPLOAD",
          "JOB_POSTING_IMPORT",
          "RESUME_GENERATION",
          "COVER_LETTER_GENERATION",
          "AI_CHAT_MESSAGE",
          "DOCUMENT_EXPORT",
        ]),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const usageTracker = new UsageTracker(ctx.db);
      await usageTracker.checkLimitAndRecord(
        ctx.session.user.id,
        input.action,
        input.metadata,
      );
      return { success: true };
    }),

  /**
   * Admin endpoint: Get subscription analytics
   */
  getAnalytics: protectedProcedure
    .input(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // TODO: Add admin role check here
      const subscriptionService = new SubscriptionService(ctx.db);
      const usageTracker = new UsageTracker(ctx.db);

      const startDate =
        input.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = input.endDate ?? new Date();

      const [subscriptionAnalytics, usageAnalytics] = await Promise.all([
        subscriptionService.getSubscriptionAnalytics(),
        usageTracker.getUsageAnalytics(startDate, endDate),
      ]);

      return {
        subscriptions: subscriptionAnalytics,
        usage: usageAnalytics,
      };
    }),

  /**
   * Admin endpoint: Initialize default subscription tiers
   */
  initializeDefaultTiers: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: Add admin role check here
    const subscriptionService = new SubscriptionService(ctx.db);
    await subscriptionService.initializeDefaultTiers();
    return { success: true };
  }),

  /**
   * Webhook endpoint: Update subscription status from Stripe
   */
  updateSubscriptionStatus: protectedProcedure
    .input(
      z.object({
        stripeSubscriptionId: z.string(),
        status: z.enum([
          "ACTIVE",
          "CANCELED",
          "EXPIRED",
          "PAST_DUE",
          "INCOMPLETE",
          "TRIALING",
        ]),
        currentPeriodEnd: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Add webhook authentication here
      const subscriptionService = new SubscriptionService(ctx.db);
      return await subscriptionService.updateSubscriptionStatus(
        input.stripeSubscriptionId,
        input.status,
        input.currentPeriodEnd,
      );
    }),
});
