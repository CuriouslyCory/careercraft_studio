---
description: Subscription tiers and usage tracking system for CareerCraft Studio
globs: src/server/api/routers/subscription.ts, src/server/services/usage-tracker.ts, prisma/schema.prisma
alwaysApply: true
---

# Subscription System & Usage Tracking

This document describes the subscription system and usage tracking implementation for CareerCraft Studio, providing tiered access to features with monthly usage limits for free users and unlimited access for paid subscribers.

## Overview

The subscription system implements a freemium model with:

- **Free Tier**: Limited monthly usage of core features
- **Pro Tier**: Unlimited access to all features
- **Enterprise Tier**: Future expansion for advanced features

## Implementation Status

### ✅ Completed Features

1. **Database Schema** - Complete subscription and usage tracking models
2. **Core Services** - UsageTracker and SubscriptionService implementations
3. **API Layer** - Comprehensive tRPC router with all endpoints
4. **Default Tier Initialization** - Script to set up free and pro tiers
5. **Usage Tracking Integration** - Integrated into all key endpoints
6. **Subscription Panel UI** - Complete user interface for subscription management

### 🔄 Integration Points

The usage tracking has been integrated into the following endpoints:

- **Resume Upload** (`document.upload`) - Tracks `RESUME_UPLOAD` action
- **Job Posting Import** (`document.createJobPosting`) - Tracks `JOB_POSTING_IMPORT` action
- **Resume Generation** (`document.generateTailoredResume`) - Tracks `RESUME_GENERATION` action
- **Cover Letter Generation** (`document.generateTailoredCoverLetter`) - Tracks `COVER_LETTER_GENERATION` action

Each integration includes:

- Limit checking before action execution
- Usage recording with relevant metadata
- Automatic error handling for limit exceeded scenarios

## Free Tier Monthly Limits

- **Resume Uploads**: 1 per month
- **Job Posting Imports**: 5 per month
- **Resume Generations**: 5 per month
- **Cover Letter Generations**: 5 per month
- **AI Chat Messages**: 50 per month (future implementation)

## Pro Tier Benefits

- **Unlimited** access to all features
- **Priority support** (future)
- **Advanced analytics** (future)
- **Multiple resume templates** (future)

## Database Schema

### Core Models

#### SubscriptionTier

```prisma
model SubscriptionTier {
  id          String               @id @default(cuid())
  name        String               @unique
  type        SubscriptionTierType // FREE, PRO, ENTERPRISE
  description String?

  // Monthly limits (null = unlimited)
  resumeUploadLimit     Int?
  jobPostingLimit       Int?
  resumeGenerationLimit Int?
  coverLetterLimit      Int?
  aiChatMessageLimit    Int?

  // Pricing (in cents)
  monthlyPriceCents Int?
  yearlyPriceCents  Int?

  // Stripe integration
  stripeMonthlyPriceId String?
  stripeYearlyPriceId  String?

  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  subscriptions Subscription[]
}
```

#### Subscription

```prisma
model Subscription {
  id     String @id @default(cuid())
  userId String @unique

  tier   SubscriptionTier   @relation(fields: [tierId], references: [id])
  tierId String
  status SubscriptionStatus @default(ACTIVE)

  // Billing cycle
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean @default(false)

  // Stripe integration
  stripeSubscriptionId String? @unique
  stripeCustomerId     String?
  stripePriceId        String?

  canceledAt DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### UsageRecord

```prisma
model UsageRecord {
  id     String          @id @default(cuid())
  userId String
  action UsageActionType

  timestamp DateTime @default(now())
  metadata  Json?

  // Monthly tracking
  year  Int
  month Int

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Enums

```prisma
enum SubscriptionTierType {
  FREE
  PRO
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  CANCELED
  EXPIRED
  PAST_DUE
  INCOMPLETE
  TRIALING
}

enum UsageActionType {
  RESUME_UPLOAD
  JOB_POSTING_IMPORT
  RESUME_GENERATION
  COVER_LETTER_GENERATION
  AI_CHAT_MESSAGE
  DOCUMENT_EXPORT
}
```

## Core Services

### UsageTracker Service

**Location**: `src/server/services/usage-tracker.ts`

**Key Methods**:

- `checkLimit(userId, action)` - Check if user can perform action
- `recordUsage(userId, action, metadata?)` - Record usage after action
- `checkLimitAndRecord(userId, action, metadata?)` - Atomic check and record
- `getCurrentMonthUsage(userId, action)` - Get current month's usage count
- `getCurrentMonthUsageSummary(userId)` - Get all usage for current month
- `getUserLimits(userId)` - Get user's subscription limits

**Usage Pattern**:

```typescript
const usageTracker = new UsageTracker(db);

// Check and record in one atomic operation
await usageTracker.checkLimitAndRecord(userId, "RESUME_UPLOAD", {
  fileName: "resume.pdf",
  fileType: "application/pdf",
});
```

### SubscriptionService

**Location**: `src/server/services/subscription-service.ts`

**Key Methods**:

- `getUserSubscription(userId)` - Get user's current subscription
- `createSubscription(userId, tierType, stripeData?)` - Create new subscription
- `updateSubscriptionTier(userId, newTierType, stripeData?)` - Change subscription tier
- `cancelSubscription(userId, cancelAtPeriodEnd?)` - Cancel subscription
- `reactivateSubscription(userId, newPeriodEnd)` - Reactivate canceled subscription
- `isSubscriptionActive(userId)` - Check if subscription is currently active
- `getAvailableTiers()` - Get all available subscription tiers
- `initializeDefaultTiers()` - Set up default Free and Pro tiers

## API Endpoints

### Subscription Management

**Router**: `src/server/api/routers/subscription.ts`

**Key Endpoints**:

- `subscription.getSubscription` - Get current subscription status
- `subscription.getUsageLimits` - Get usage limits and current usage
- `subscription.getCurrentUsage` - Get current month's usage summary
- `subscription.getAvailableTiers` - Get all subscription tiers
- `subscription.createSubscription` - Create new subscription (post-Stripe)
- `subscription.updateSubscriptionTier` - Update subscription tier
- `subscription.cancelSubscription` - Cancel subscription
- `subscription.reactivateSubscription` - Reactivate subscription

### Usage Tracking

- `subscription.checkActionLimit` - Check if user can perform action
- `subscription.recordUsage` - Record usage after action completion
- `subscription.checkLimitAndRecord` - Atomic check and record operation

### Admin Endpoints

- `subscription.getAnalytics` - Get subscription and usage analytics
- `subscription.initializeDefaultTiers` - Initialize default tiers
- `subscription.updateSubscriptionStatus` - Webhook for Stripe updates

## Usage Patterns

### Frontend Usage Checking

```typescript
// Check if user can upload a resume
const { data: limitCheck } = api.subscription.checkActionLimit.useQuery({
  action: "RESUME_UPLOAD",
});

if (!limitCheck?.canPerform) {
  // Show upgrade prompt
  showUpgradeModal({
    action: "resume upload",
    currentUsage: limitCheck.currentUsage,
    limit: limitCheck.limit,
    tierName: limitCheck.tierName,
  });
  return;
}

// Proceed with upload
```

### Backend Usage Recording

```typescript
// In API endpoint
const usageTracker = new UsageTracker(ctx.db);

// Check limit and record usage atomically
await usageTracker.checkLimitAndRecord(
  ctx.session.user.id,
  "RESUME_GENERATION",
  { jobPostingId: input.jobPostingId },
);

// Continue with the actual operation
```

## Error Handling

### Limit Exceeded Errors

When limits are exceeded, the system throws a `TRPCError` with:

- **Code**: `FORBIDDEN`
- **Message**: Descriptive message with current limit and upgrade suggestion
- **Data**: Additional context about the limit and usage

Example:

```
"Monthly limit of 5 resume generations exceeded. Upgrade to Pro for unlimited access."
```

### Grace Period Handling

Canceled subscriptions continue to work until the end of the current billing period:

- `cancelAtPeriodEnd: true` - Subscription remains active until `currentPeriodEnd`
- `cancelAtPeriodEnd: false` - Subscription ends immediately
- After expiration, users fall back to free tier limits

## Stripe Integration

### Webhook Support

The system includes webhook endpoints for Stripe integration:

- `subscription.updateSubscriptionStatus` - Handle subscription status changes
- Supports all Stripe subscription statuses: `ACTIVE`, `CANCELED`, `EXPIRED`, `PAST_DUE`, `INCOMPLETE`, `TRIALING`

### Price Management

Subscription tiers include Stripe price IDs:

- `stripeMonthlyPriceId` - Monthly billing price ID
- `stripeYearlyPriceId` - Yearly billing price ID
- Pricing stored in cents (e.g., 999 = $9.99)

## Analytics & Monitoring

### Usage Analytics

The system tracks detailed usage analytics:

- **Monthly aggregation** by action type
- **User-level tracking** for individual usage patterns
- **Tier-based analysis** for conversion insights
- **Metadata storage** for detailed action context

### Subscription Analytics

- **Active subscription counts** by tier
- **Churn analysis** with cancellation tracking
- **Revenue metrics** with Stripe integration
- **Usage pattern analysis** for feature optimization

## Security Considerations

### Authentication

- All endpoints require authenticated users (`protectedProcedure`)
- User ID validation in all usage tracking operations
- Subscription ownership verification for all operations

### Data Privacy

- Usage metadata stored as JSON for flexibility
- No sensitive data in usage records
- User data isolation with proper foreign key constraints

### Rate Limiting

- Monthly limits enforced at the database level
- Atomic operations prevent race conditions
- Graceful degradation for limit exceeded scenarios

## Future Enhancements

### Planned Features

1. **AI Chat Message Tracking** - Track and limit AI chat usage
2. **Document Export Limits** - Track PDF/Word export usage
3. **Advanced Analytics Dashboard** - Admin interface for usage insights
4. **Usage Notifications** - Email alerts for approaching limits
5. **Tier-based Feature Flags** - Dynamic feature access control

### Stripe Integration Expansion

1. **Automatic Tier Management** - Sync tier changes from Stripe
2. **Proration Handling** - Handle mid-cycle plan changes
3. **Failed Payment Recovery** - Automated retry logic
4. **Invoice Management** - Custom invoice generation

### Enterprise Features

1. **Team Subscriptions** - Multi-user account management
2. **Custom Limits** - Configurable limits per organization
3. **SSO Integration** - Enterprise authentication
4. **Advanced Reporting** - Custom analytics and exports

## Testing

### Unit Tests

- UsageTracker service methods
- SubscriptionService operations
- Limit calculation logic
- Error handling scenarios

### Integration Tests

- End-to-end usage tracking flows
- Subscription lifecycle management
- Stripe webhook processing
- Database transaction integrity

### Load Testing

- High-volume usage recording
- Concurrent limit checking
- Database performance under load
- API response times

## Deployment

### Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://...
```

### Database Migration

```bash
# Apply schema changes
pnpm db:push

# Initialize default tiers
node scripts/init-subscription-tiers.js
```

### Monitoring

- Usage tracking performance metrics
- Subscription status monitoring
- Error rate tracking for limit exceeded scenarios
- Database query performance for usage calculations

## User Interface

### Subscription Panel

**Location**: `src/app/ai-chat/_components/subscription-panel.tsx`
**Pages**:

- AI Chat Interface: `src/app/ai-chat/subscription/page.tsx`
- Dashboard Interface: `src/app/dashboard/subscription/page.tsx`

The subscription panel provides a comprehensive interface for users to:

- **View Current Subscription**: Display current tier, status, and billing information
- **Monitor Usage**: Real-time usage tracking with visual progress bars
- **Compare Plans**: Side-by-side feature comparison of all available tiers
- **Upgrade/Downgrade**: One-click subscription tier changes
- **Visual Indicators**: Color-coded usage status (green/yellow/red for usage levels)

**Interface Availability**: The subscription panel is available in both the AI Chat interface and the modern Dashboard interface. The dashboard provides the same functionality with a cleaner top navigation layout. See [Dashboard Redesign](./dashboard-redesign-plan.md) for details.

#### Key Features

1. **Current Subscription Status**

   - Displays current tier with appropriate icon (Star/Crown/Building)
   - Shows subscription status badge
   - Tier-specific color coding

2. **Usage Dashboard**

   - Real-time usage tracking for all limited actions
   - Progress bars with percentage indicators
   - Color-coded warnings for approaching limits
   - Clear display of current usage vs. limits

3. **Plan Comparison**

   - Three-column layout for Free, Pro, and Enterprise tiers
   - Feature highlights specific to each tier
   - Pricing display with monthly costs
   - Clear upgrade/downgrade buttons

4. **Interactive Elements**
   - Click to select plans
   - Visual feedback during upgrade process
   - Success/error notifications via toast messages
   - Disabled states for current plan

#### Usage Patterns

```typescript
// The component automatically handles:
// - Fetching current subscription status
// - Loading available tiers
// - Displaying current usage
// - Processing tier changes

// Users can:
// 1. View their current usage and limits
// 2. Compare available plans
// 3. Click upgrade/downgrade buttons
// 4. Receive immediate feedback on changes
```
