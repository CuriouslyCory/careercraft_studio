import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

/**
 * Service for managing user subscriptions and tiers
 * Handles subscription lifecycle, tier management, and Stripe integration
 */
export class SubscriptionService {
  constructor(private db: PrismaClient) {}

  /**
   * Get a user's current subscription with tier information
   * @param userId - The user's ID
   * @returns The user's subscription or null if none exists
   */
  async getUserSubscription(userId: string) {
    return await this.db.subscription.findUnique({
      where: { userId },
      include: {
        tier: true,
      },
    });
  }

  /**
   * Check if a user's subscription is currently active
   * @param userId - The user's ID
   * @returns True if subscription is active, false otherwise
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return false;
    }

    const now = new Date();

    // Check if subscription is in an active status
    if (!["ACTIVE", "TRIALING"].includes(subscription.status)) {
      return false;
    }

    // Check if subscription period is still valid
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
      return false;
    }

    // If canceled but still in grace period
    if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd < now) {
      return false;
    }

    return true;
  }

  /**
   * Create a new subscription for a user
   * @param userId - The user's ID
   * @param tierType - The subscription tier type
   * @param stripeData - Optional Stripe integration data
   * @returns The created subscription
   */
  async createSubscription(
    userId: string,
    tierType: "FREE" | "PRO" | "ENTERPRISE",
    stripeData?: {
      stripeSubscriptionId?: string;
      stripeCustomerId?: string;
      stripePriceId?: string;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
    },
  ) {
    // Get the tier
    const tier = await this.db.subscriptionTier.findFirst({
      where: { type: tierType, isActive: true },
    });

    if (!tier) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Subscription tier ${tierType} not found`,
      });
    }

    // Check if user already has a subscription
    const existingSubscription = await this.getUserSubscription(userId);
    if (existingSubscription) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User already has a subscription",
      });
    }

    // Set default period for free tier
    const now = new Date();
    const defaultPeriodEnd = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate(),
    );

    return await this.db.subscription.create({
      data: {
        userId,
        tierId: tier.id,
        status: "ACTIVE",
        currentPeriodStart: stripeData?.currentPeriodStart ?? now,
        currentPeriodEnd: stripeData?.currentPeriodEnd ?? defaultPeriodEnd,
        stripeSubscriptionId: stripeData?.stripeSubscriptionId,
        stripeCustomerId: stripeData?.stripeCustomerId,
        stripePriceId: stripeData?.stripePriceId,
      },
      include: {
        tier: true,
      },
    });
  }

  /**
   * Update a user's subscription tier
   * @param userId - The user's ID
   * @param newTierType - The new subscription tier type
   * @param stripeData - Optional Stripe integration data
   * @returns The updated subscription
   */
  async updateSubscriptionTier(
    userId: string,
    newTierType: "FREE" | "PRO" | "ENTERPRISE",
    stripeData?: {
      stripeSubscriptionId?: string;
      stripePriceId?: string;
      currentPeriodEnd?: Date;
    },
  ) {
    // Get the new tier
    const newTier = await this.db.subscriptionTier.findFirst({
      where: { type: newTierType, isActive: true },
    });

    if (!newTier) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Subscription tier ${newTierType} not found`,
      });
    }

    // Get existing subscription
    const existingSubscription = await this.getUserSubscription(userId);
    if (!existingSubscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User does not have a subscription",
      });
    }

    return await this.db.subscription.update({
      where: { userId },
      data: {
        tierId: newTier.id,
        status: "ACTIVE",
        cancelAtPeriodEnd: false, // Reset cancellation when upgrading
        stripeSubscriptionId:
          stripeData?.stripeSubscriptionId ??
          existingSubscription.stripeSubscriptionId,
        stripePriceId:
          stripeData?.stripePriceId ?? existingSubscription.stripePriceId,
        currentPeriodEnd:
          stripeData?.currentPeriodEnd ?? existingSubscription.currentPeriodEnd,
        updatedAt: new Date(),
      },
      include: {
        tier: true,
      },
    });
  }

  /**
   * Cancel a user's subscription
   * @param userId - The user's ID
   * @param cancelAtPeriodEnd - Whether to cancel immediately or at period end
   * @returns The updated subscription
   */
  async cancelSubscription(userId: string, cancelAtPeriodEnd = true) {
    const existingSubscription = await this.getUserSubscription(userId);
    if (!existingSubscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User does not have a subscription",
      });
    }

    const updateData: {
      cancelAtPeriodEnd: boolean;
      updatedAt: Date;
      tierId?: string;
      status?:
        | "ACTIVE"
        | "CANCELED"
        | "EXPIRED"
        | "PAST_DUE"
        | "INCOMPLETE"
        | "TRIALING";
      canceledAt?: Date;
    } = {
      cancelAtPeriodEnd,
      updatedAt: new Date(),
    };

    if (!cancelAtPeriodEnd) {
      // Cancel immediately - downgrade to free tier
      const freeTier = await this.db.subscriptionTier.findFirst({
        where: { type: "FREE", isActive: true },
      });

      if (freeTier) {
        updateData.tierId = freeTier.id;
        updateData.status = "CANCELED";
        updateData.canceledAt = new Date();
      }
    } else {
      // Cancel at period end
      updateData.status = "CANCELED";
      updateData.canceledAt = new Date();
    }

    return await this.db.subscription.update({
      where: { userId },
      data: updateData,
      include: {
        tier: true,
      },
    });
  }

  /**
   * Reactivate a canceled subscription
   * @param userId - The user's ID
   * @param newPeriodEnd - New period end date
   * @returns The updated subscription
   */
  async reactivateSubscription(userId: string, newPeriodEnd: Date) {
    const existingSubscription = await this.getUserSubscription(userId);
    if (!existingSubscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User does not have a subscription",
      });
    }

    if (existingSubscription.status !== "CANCELED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Subscription is not canceled",
      });
    }

    return await this.db.subscription.update({
      where: { userId },
      data: {
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: newPeriodEnd,
        canceledAt: null,
        updatedAt: new Date(),
      },
      include: {
        tier: true,
      },
    });
  }

  /**
   * Get all available subscription tiers
   * @returns Array of active subscription tiers
   */
  async getAvailableTiers() {
    return await this.db.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceCents: "asc" },
    });
  }

  /**
   * Update subscription status from Stripe webhook
   * @param stripeSubscriptionId - Stripe subscription ID
   * @param status - New subscription status
   * @param currentPeriodEnd - Optional new period end date
   * @returns The updated subscription
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status:
      | "ACTIVE"
      | "CANCELED"
      | "EXPIRED"
      | "PAST_DUE"
      | "INCOMPLETE"
      | "TRIALING",
    currentPeriodEnd?: Date,
  ) {
    const subscription = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId },
      include: { tier: true },
    });

    if (!subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscription not found for Stripe ID",
      });
    }

    const updateData: {
      status:
        | "ACTIVE"
        | "CANCELED"
        | "EXPIRED"
        | "PAST_DUE"
        | "INCOMPLETE"
        | "TRIALING";
      updatedAt: Date;
      currentPeriodEnd?: Date;
      canceledAt?: Date;
      tierId?: string;
    } = {
      status,
      updatedAt: new Date(),
    };

    if (currentPeriodEnd) {
      updateData.currentPeriodEnd = currentPeriodEnd;
    }

    // Handle status-specific logic
    if (status === "CANCELED" || status === "EXPIRED") {
      updateData.canceledAt = new Date();

      // Downgrade to free tier
      const freeTier = await this.db.subscriptionTier.findFirst({
        where: { type: "FREE", isActive: true },
      });

      if (freeTier) {
        updateData.tierId = freeTier.id;
      }
    }

    return await this.db.subscription.update({
      where: { stripeSubscriptionId },
      data: updateData,
      include: {
        tier: true,
      },
    });
  }

  /**
   * Get subscription analytics for admin dashboard
   * @returns Subscription analytics data
   */
  async getSubscriptionAnalytics() {
    const [
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      tierBreakdown,
      recentSubscriptions,
    ] = await Promise.all([
      this.db.subscription.count(),
      this.db.subscription.count({
        where: { status: "ACTIVE" },
      }),
      this.db.subscription.count({
        where: { status: "CANCELED" },
      }),
      this.db.subscription.groupBy({
        by: ["tierId"],
        _count: true,
        where: { status: "ACTIVE" },
      }),
      this.db.subscription.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          tier: true,
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
    ]);

    // Get tier names for breakdown
    const tiers = await this.db.subscriptionTier.findMany();
    const tierMap = new Map(tiers.map((tier) => [tier.id, tier]));

    const tierBreakdownWithNames = tierBreakdown.map((item) => ({
      tier: tierMap.get(item.tierId),
      count: item._count,
    }));

    return {
      totalSubscriptions,
      activeSubscriptions,
      canceledSubscriptions,
      tierBreakdown: tierBreakdownWithNames,
      recentSubscriptions,
    };
  }

  /**
   * Initialize default subscription tiers
   * Creates Free and Pro tiers if they don't exist
   */
  async initializeDefaultTiers() {
    // Create Free tier
    await this.db.subscriptionTier.upsert({
      where: { name: "Free" },
      create: {
        name: "Free",
        type: "FREE",
        description: "Basic features with monthly limits",
        resumeUploadLimit: 1,
        jobPostingLimit: 5,
        resumeGenerationLimit: 5,
        coverLetterLimit: 5,
        aiChatMessageLimit: 50,
        monthlyPriceCents: null,
        yearlyPriceCents: null,
      },
      update: {
        description: "Basic features with monthly limits",
        resumeUploadLimit: 1,
        jobPostingLimit: 5,
        resumeGenerationLimit: 5,
        coverLetterLimit: 5,
        aiChatMessageLimit: 50,
        updatedAt: new Date(),
      },
    });

    // Create Pro tier
    await this.db.subscriptionTier.upsert({
      where: { name: "Pro" },
      create: {
        name: "Pro",
        type: "PRO",
        description: "Unlimited access to all features",
        resumeUploadLimit: null, // Unlimited
        jobPostingLimit: null, // Unlimited
        resumeGenerationLimit: null, // Unlimited
        coverLetterLimit: null, // Unlimited
        aiChatMessageLimit: null, // Unlimited
        monthlyPriceCents: 999, // $9.99
        yearlyPriceCents: 9999, // $99.99
      },
      update: {
        description: "Unlimited access to all features",
        resumeUploadLimit: null, // Unlimited
        jobPostingLimit: null, // Unlimited
        resumeGenerationLimit: null, // Unlimited
        coverLetterLimit: null, // Unlimited
        aiChatMessageLimit: null, // Unlimited
        monthlyPriceCents: 999, // $9.99
        yearlyPriceCents: 9999, // $99.99
        updatedAt: new Date(),
      },
    });
  }
}
