import {
  type PrismaClient,
  type UsageActionType,
  type SubscriptionTierType,
  type SubscriptionTier,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";

/**
 * Service for tracking user usage and enforcing subscription limits
 * Handles both free tier limits and unlimited pro tier access
 */
export class UsageTracker {
  constructor(private db: PrismaClient) {}

  /**
   * Check if a user can perform a specific action based on their subscription limits
   * @param userId - The user's ID
   * @param action - The action type to check
   * @returns Promise<boolean> - Whether the user can perform the action
   */
  async checkLimit(userId: string, action: UsageActionType): Promise<boolean> {
    // Get user's subscription and tier
    const subscription = await this.getUserSubscriptionWithTier(userId);

    // If no subscription exists, treat as free tier
    const tier = subscription?.tier ?? (await this.getFreeTier());

    // Pro tier has unlimited usage
    if (tier.type === "PRO" || tier.type === "ENTERPRISE") {
      return true;
    }

    // Check if subscription is active (for canceled subscriptions with grace period)
    if (subscription && !this.isSubscriptionActive(subscription)) {
      // Subscription expired, fall back to free tier limits
    }

    // Get the limit for this action
    const limit = this.getLimitForAction(tier, action);

    // Null limit means unlimited
    if (limit === null) {
      return true;
    }

    // Count current month's usage
    const currentUsage = await this.getCurrentMonthUsage(userId, action);

    return currentUsage < limit;
  }

  /**
   * Record a usage action for a user
   * @param userId - The user's ID
   * @param action - The action type being performed
   * @param metadata - Optional metadata about the action
   */
  async recordUsage(
    userId: string,
    action: UsageActionType,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    await this.db.usageRecord.create({
      data: {
        userId,
        action,
        timestamp: now,
        year,
        month,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    });
  }

  /**
   * Check limit and record usage in a single transaction
   * Throws an error if the limit is exceeded
   * @param userId - The user's ID
   * @param action - The action type to check and record
   * @param metadata - Optional metadata about the action
   */
  async checkLimitAndRecord(
    userId: string,
    action: UsageActionType,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const canPerformAction = await this.checkLimit(userId, action);

    if (!canPerformAction) {
      const subscription = await this.getUserSubscriptionWithTier(userId);
      const tier = subscription?.tier ?? (await this.getFreeTier());
      const limit = this.getLimitForAction(tier, action);

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Monthly limit of ${limit} ${action.toLowerCase().replace("_", " ")}s exceeded. Upgrade to Pro for unlimited access.`,
      });
    }

    await this.recordUsage(userId, action, metadata);
  }

  /**
   * Get current month's usage for a specific action
   * @param userId - The user's ID
   * @param action - The action type to count
   * @returns Promise<number> - The count of actions this month
   */
  async getCurrentMonthUsage(
    userId: string,
    action: UsageActionType,
  ): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const count = await this.db.usageRecord.count({
      where: {
        userId,
        action,
        year,
        month,
      },
    });

    return count;
  }

  /**
   * Get usage summary for a user for the current month
   * @param userId - The user's ID
   * @returns Promise with usage counts for each action type
   */
  async getCurrentMonthUsageSummary(userId: string) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const usageRecords = await this.db.usageRecord.groupBy({
      by: ["action"],
      where: {
        userId,
        year,
        month,
      },
      _count: {
        action: true,
      },
    });

    // Convert to a more usable format
    const summary: Record<UsageActionType, number> = {
      RESUME_UPLOAD: 0,
      JOB_POSTING_IMPORT: 0,
      RESUME_GENERATION: 0,
      COVER_LETTER_GENERATION: 0,
      AI_CHAT_MESSAGE: 0,
      DOCUMENT_EXPORT: 0,
    };

    usageRecords.forEach((record) => {
      summary[record.action] = record._count.action;
    });

    return summary;
  }

  /**
   * Get usage limits for a user based on their subscription
   * @param userId - The user's ID
   * @returns Promise with the user's limits for each action type
   */
  async getUserLimits(userId: string) {
    const subscription = await this.getUserSubscriptionWithTier(userId);
    const tier = subscription?.tier ?? (await this.getFreeTier());

    return {
      resumeUpload: tier.resumeUploadLimit,
      jobPosting: tier.jobPostingLimit,
      resumeGeneration: tier.resumeGenerationLimit,
      coverLetter: tier.coverLetterLimit,
      aiChatMessage: tier.aiChatMessageLimit,
      isUnlimited: tier.type === "PRO" || tier.type === "ENTERPRISE",
      tierName: tier.name,
      tierType: tier.type,
    };
  }

  /**
   * Get analytics data for usage across all users (admin function)
   * @param startDate - Start date for analytics
   * @param endDate - End date for analytics
   * @returns Promise with aggregated usage data
   */
  async getUsageAnalytics(startDate: Date, endDate: Date) {
    const usageData = await this.db.usageRecord.groupBy({
      by: ["action", "year", "month"],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        action: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { action: "asc" }],
    });

    return usageData;
  }

  /**
   * Private helper to get user's subscription with tier information
   */
  private async getUserSubscriptionWithTier(userId: string) {
    return await this.db.subscription.findUnique({
      where: { userId },
      include: { tier: true },
    });
  }

  /**
   * Private helper to get the free tier
   */
  private async getFreeTier() {
    const freeTier = await this.db.subscriptionTier.findFirst({
      where: { type: "FREE", isActive: true },
    });

    if (!freeTier) {
      throw new Error("Free tier not found in database");
    }

    return freeTier;
  }

  /**
   * Private helper to check if a subscription is currently active
   */
  private isSubscriptionActive(subscription: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
  }): boolean {
    const now = new Date();

    // If subscription is canceled but still in grace period
    if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd > now) {
      return true;
    }

    // Check if subscription is active and not expired
    return (
      subscription.status === "ACTIVE" && subscription.currentPeriodEnd > now
    );
  }

  /**
   * Private helper to get the limit for a specific action from a tier
   */
  private getLimitForAction(
    tier: SubscriptionTier,
    action: UsageActionType,
  ): number | null {
    switch (action) {
      case "RESUME_UPLOAD":
        return tier.resumeUploadLimit;
      case "JOB_POSTING_IMPORT":
        return tier.jobPostingLimit;
      case "RESUME_GENERATION":
        return tier.resumeGenerationLimit;
      case "COVER_LETTER_GENERATION":
        return tier.coverLetterLimit;
      case "AI_CHAT_MESSAGE":
        return tier.aiChatMessageLimit;
      case "DOCUMENT_EXPORT":
        return null; // Not limited yet
      default:
        return null; // Unknown actions are unlimited
    }
  }
}
