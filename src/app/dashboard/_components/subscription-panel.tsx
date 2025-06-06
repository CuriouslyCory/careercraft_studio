"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Check,
  X,
  Crown,
  Zap,
  Building,
  Star,
  Infinity,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import type { SubscriptionTierType } from "@prisma/client";

interface SubscriptionTier {
  id: string;
  name: string;
  type: SubscriptionTierType;
  description: string | null;
  resumeUploadLimit: number | null;
  jobPostingLimit: number | null;
  resumeGenerationLimit: number | null;
  coverLetterLimit: number | null;
  aiChatMessageLimit: number | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  isActive: boolean;
}

interface CurrentUsage {
  RESUME_UPLOAD: number;
  JOB_POSTING_IMPORT: number;
  RESUME_GENERATION: number;
  COVER_LETTER_GENERATION: number;
  AI_CHAT_MESSAGE: number;
}

const TIER_ICONS = {
  FREE: Star,
  PRO: Crown,
  ENTERPRISE: Building,
} as const;

const TIER_COLORS = {
  FREE: "bg-gray-100 text-gray-800 border-gray-200",
  PRO: "bg-blue-100 text-blue-800 border-blue-200",
  ENTERPRISE: "bg-purple-100 text-purple-800 border-purple-200",
} as const;

const TIER_BUTTON_COLORS = {
  FREE: "bg-gray-600 hover:bg-gray-700",
  PRO: "bg-blue-600 hover:bg-blue-700",
  ENTERPRISE: "bg-purple-600 hover:bg-purple-700",
} as const;

export function SubscriptionPanel() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Queries
  const subscriptionQuery = api.subscription.getSubscription.useQuery();
  const usageLimitsQuery = api.subscription.getUsageLimits.useQuery();
  const availableTiersQuery = api.subscription.getAvailableTiers.useQuery();

  // Mutations
  const createSubscriptionMutation =
    api.subscription.createSubscription.useMutation({
      onSuccess: () => {
        void subscriptionQuery.refetch();
        void usageLimitsQuery.refetch();
        setSelectedTier(null);
        setIsUpgrading(false);
        toast.success("Subscription updated successfully!");
      },
      onError: (error) => {
        toast.error(`Failed to update subscription: ${error.message}`);
        setIsUpgrading(false);
      },
    });

  const updateSubscriptionMutation =
    api.subscription.updateSubscriptionTier.useMutation({
      onSuccess: () => {
        void subscriptionQuery.refetch();
        void usageLimitsQuery.refetch();
        setSelectedTier(null);
        setIsUpgrading(false);
        toast.success("Subscription updated successfully!");
      },
      onError: (error) => {
        toast.error(`Failed to update subscription: ${error.message}`);
        setIsUpgrading(false);
      },
    });

  const handleUpgrade = async (tierType: SubscriptionTierType) => {
    setIsUpgrading(true);

    if (subscriptionQuery.data?.subscription) {
      // Update existing subscription
      updateSubscriptionMutation.mutate({ newTierType: tierType });
    } else {
      // Create new subscription
      createSubscriptionMutation.mutate({ tierType });
    }
  };

  const formatPrice = (cents: number | null) => {
    if (cents === null) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatLimit = (limit: number | null) => {
    if (limit === null) return "Unlimited";
    return limit.toString();
  };

  const renderLimitWithUsage = (limit: number | null, usage: number) => {
    if (limit === null) {
      return (
        <div className="flex items-center gap-1">
          <Infinity className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-600">Unlimited</span>
        </div>
      );
    }

    const percentage = (usage / limit) * 100;
    const isNearLimit = percentage >= 80;
    const isOverLimit = usage >= limit;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>
            {usage} / {limit}
          </span>
          <span
            className={`font-medium ${
              isOverLimit
                ? "text-red-600"
                : isNearLimit
                  ? "text-yellow-600"
                  : "text-green-600"
            }`}
          >
            {percentage.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={`h-2 rounded-full transition-all ${
              isOverLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-yellow-500"
                  : "bg-green-500"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  if (
    subscriptionQuery.isLoading ||
    availableTiersQuery.isLoading ||
    usageLimitsQuery.isLoading
  ) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-800" />
      </div>
    );
  }

  const currentSubscription = subscriptionQuery.data?.subscription;
  const currentTier = currentSubscription?.tier;
  const availableTiers = availableTiersQuery.data ?? [];
  const limits = usageLimitsQuery.data?.limits;
  const currentUsage = usageLimitsQuery.data?.currentUsage as CurrentUsage;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentTier && (
                  <>
                    {(() => {
                      const Icon = TIER_ICONS[currentTier.type];
                      return <Icon className="h-6 w-6" />;
                    })()}
                    <div>
                      <h3 className="font-semibold">{currentTier.name}</h3>
                      <p className="text-sm text-gray-600">
                        {currentTier.description}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <Badge
                className={currentTier ? TIER_COLORS[currentTier.type] : ""}
              >
                {currentSubscription.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Usage */}
      {currentUsage && limits && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Usage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Resume Uploads
                </label>
                {renderLimitWithUsage(
                  limits.resumeUpload,
                  currentUsage.RESUME_UPLOAD,
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Job Posting Imports
                </label>
                {renderLimitWithUsage(
                  limits.jobPosting,
                  currentUsage.JOB_POSTING_IMPORT,
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Resume Generations
                </label>
                {renderLimitWithUsage(
                  limits.resumeGeneration,
                  currentUsage.RESUME_GENERATION,
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">
                  Cover Letter Generations
                </label>
                {renderLimitWithUsage(
                  limits.coverLetter,
                  currentUsage.COVER_LETTER_GENERATION,
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Tiers Comparison */}
      <div>
        <h2 className="mb-4 text-xl font-bold">Choose Your Plan</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {availableTiers.map((tier) => {
            const Icon = TIER_ICONS[tier.type];
            const isCurrentTier = currentTier?.id === tier.id;
            const isSelected = selectedTier === tier.id;

            return (
              <Card
                key={tier.id}
                className={`relative cursor-pointer transition-all ${
                  isSelected ? "shadow-lg ring-2 ring-blue-500" : ""
                } ${isCurrentTier ? "border-green-500 bg-green-50" : ""}`}
                onClick={() => setSelectedTier(tier.id)}
              >
                {isCurrentTier && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                    <Badge className="bg-green-600 text-white">
                      Current Plan
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3 text-center">
                  <div className="mb-2 flex justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <div className="text-2xl font-bold">
                    {formatPrice(tier.monthlyPriceCents)}
                    {tier.monthlyPriceCents && (
                      <span className="text-sm font-normal">/month</span>
                    )}
                  </div>
                  {tier.description && (
                    <p className="text-xs text-gray-600">{tier.description}</p>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Resume Uploads</span>
                      <span className="font-medium">
                        {formatLimit(tier.resumeUploadLimit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Job Posting Imports</span>
                      <span className="font-medium">
                        {formatLimit(tier.jobPostingLimit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Resume Generations</span>
                      <span className="font-medium">
                        {formatLimit(tier.resumeGenerationLimit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Cover Letter Generations</span>
                      <span className="font-medium">
                        {formatLimit(tier.coverLetterLimit)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>AI Chat Messages</span>
                      <span className="font-medium">
                        {formatLimit(tier.aiChatMessageLimit)}
                      </span>
                    </div>
                  </div>

                  {/* Feature highlights */}
                  <div className="border-t pt-3">
                    <div className="space-y-1">
                      {tier.type === "FREE" && (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Basic resume generation</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Job posting analysis</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <X className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-400">
                              Priority support
                            </span>
                          </div>
                        </>
                      )}

                      {tier.type === "PRO" && (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Unlimited everything</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Advanced AI features</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Priority support</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Export to multiple formats</span>
                          </div>
                        </>
                      )}

                      {tier.type === "ENTERPRISE" && (
                        <>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Everything in Pro</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Team collaboration</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Custom integrations</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>Dedicated support</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <Button
                    className={`w-full ${TIER_BUTTON_COLORS[tier.type]}`}
                    disabled={isCurrentTier || isUpgrading}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCurrentTier) {
                        void handleUpgrade(tier.type);
                      }
                    }}
                  >
                    {isUpgrading && selectedTier === tier.id ? (
                      <>
                        <Zap className="mr-2 h-4 w-4 animate-spin" />
                        Upgrading...
                      </>
                    ) : isCurrentTier ? (
                      "Current Plan"
                    ) : tier.type === "FREE" ? (
                      "Downgrade to Free"
                    ) : (
                      `Upgrade to ${tier.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
