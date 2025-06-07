#!/usr/bin/env node

/**
 * Script to create an Enterprise tier with "COMING_SOON" status
 * Run with: node scripts/create-enterprise-tier.js
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();

  try {
    console.log("🚀 Creating Enterprise tier with 'COMING_SOON' status...");
    
    // Create Enterprise tier with COMING_SOON status
    const enterpriseTier = await db.subscriptionTier.upsert({
      where: { name: "Enterprise" },
      create: {
        name: "Enterprise",
        type: "ENTERPRISE",
        status: "COMING_SOON",
        description: "Advanced features for teams and organizations",
        resumeUploadLimit: null, // Unlimited
        jobPostingLimit: null, // Unlimited
        resumeGenerationLimit: null, // Unlimited
        coverLetterLimit: null, // Unlimited
        aiChatMessageLimit: null, // Unlimited
        monthlyPriceCents: null, // TBD
        yearlyPriceCents: null, // TBD
      },
      update: {
        status: "COMING_SOON",
        description: "Advanced features for teams and organizations",
        resumeUploadLimit: null, // Unlimited
        jobPostingLimit: null, // Unlimited
        resumeGenerationLimit: null, // Unlimited
        coverLetterLimit: null, // Unlimited
        aiChatMessageLimit: null, // Unlimited
        monthlyPriceCents: null, // TBD
        yearlyPriceCents: null, // TBD
        updatedAt: new Date(),
      },
    });
    
    console.log("✅ Successfully created Enterprise tier:");
    console.log(`  - ${enterpriseTier.name} (${enterpriseTier.type}) - Status: ${enterpriseTier.status}`);
    console.log(`    Description: ${enterpriseTier.description}`);
    console.log(`    Resume uploads: ${enterpriseTier.resumeUploadLimit ?? 'Unlimited'}`);
    console.log(`    Job postings: ${enterpriseTier.jobPostingLimit ?? 'Unlimited'}`);
    console.log(`    Resume generations: ${enterpriseTier.resumeGenerationLimit ?? 'Unlimited'}`);
    console.log(`    Cover letters: ${enterpriseTier.coverLetterLimit ?? 'Unlimited'}`);
    console.log(`    Monthly price: ${enterpriseTier.monthlyPriceCents ? `$${enterpriseTier.monthlyPriceCents / 100}` : 'TBD'}`);
    console.log("");
    
    console.log("🎉 Enterprise tier will now appear in the UI as 'Coming Soon'!");
    
  } catch (error) {
    console.error("❌ Error creating Enterprise tier:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
}); 