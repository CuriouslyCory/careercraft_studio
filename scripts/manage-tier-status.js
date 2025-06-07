#!/usr/bin/env node

/**
 * Script to manage subscription tier status
 * Run with: node scripts/manage-tier-status.js <tierName> <newStatus>
 * Example: node scripts/manage-tier-status.js Enterprise ACTIVE
 */

import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  
  const [tierName, newStatus] = process.argv.slice(2);
  
  if (!tierName || !newStatus) {
    console.log("Usage: node scripts/manage-tier-status.js <tierName> <newStatus>");
    console.log("Available statuses: ACTIVE, COMING_SOON, DISABLED");
    console.log("Example: node scripts/manage-tier-status.js Enterprise ACTIVE");
    process.exit(1);
  }
  
  if (!["ACTIVE", "COMING_SOON", "DISABLED"].includes(newStatus)) {
    console.error("❌ Invalid status. Must be one of: ACTIVE, COMING_SOON, DISABLED");
    process.exit(1);
  }

  try {
    console.log(`🚀 Updating ${tierName} tier status to ${newStatus}...`);
    
    // Find the tier
    const tier = await db.subscriptionTier.findUnique({
      where: { name: tierName },
    });
    
    if (!tier) {
      console.error(`❌ Tier '${tierName}' not found`);
      process.exit(1);
    }
    
    // Update the status
    const updatedTier = await db.subscriptionTier.update({
      where: { name: tierName },
      data: { 
        // @ts-ignore
        status: newStatus,
        updatedAt: new Date(),
      },
    });
    
    console.log("✅ Successfully updated tier status:");
    console.log(`  - ${updatedTier.name} (${updatedTier.type})`);
    console.log(`  - Status: ${tier.status} → ${updatedTier.status}`);
    console.log(`  - Description: ${updatedTier.description}`);
    
    // Show what this means for the UI
    switch (newStatus) {
      case "ACTIVE":
        console.log("  🟢 Tier is now available for subscription");
        break;
      case "COMING_SOON":
        console.log("  🟡 Tier will show as 'Coming Soon' in UI");
        break;
      case "DISABLED":
        console.log("  🔴 Tier is now hidden from UI");
        break;
    }
    
  } catch (error) {
    console.error("❌ Error updating tier status:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
}); 