#!/usr/bin/env node

/**
 * Script to initialize default subscription tiers
 * Run with: node scripts/init-subscription-tiers.js
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();

  try {
    console.log("🚀 Initializing default subscription tiers...");
    
    // Create Free tier
    const freeTier = await db.subscriptionTier.upsert({
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
        monthlyPriceCents: null,
        yearlyPriceCents: null,
        updatedAt: new Date(),
      },
    });

    // Create Pro tier
    const proTier = await db.subscriptionTier.upsert({
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
    
    console.log("✅ Successfully initialized subscription tiers:");
    
    const tiers = await db.subscriptionTier.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceCents: 'asc' },
    });
    
    tiers.forEach(tier => {
      console.log(`  - ${tier.name} (${tier.type})`);
      console.log(`    Resume uploads: ${tier.resumeUploadLimit ?? 'Unlimited'}`);
      console.log(`    Job postings: ${tier.jobPostingLimit ?? 'Unlimited'}`);
      console.log(`    Resume generations: ${tier.resumeGenerationLimit ?? 'Unlimited'}`);
      console.log(`    Cover letters: ${tier.coverLetterLimit ?? 'Unlimited'}`);
      console.log(`    Monthly price: ${tier.monthlyPriceCents ? `$${tier.monthlyPriceCents / 100}` : 'Free'}`);
      console.log("");
    });
    
  } catch (error) {
    console.error("❌ Error initializing subscription tiers:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
}); 