#!/usr/bin/env node

/**
 * Simple test script to verify subscription system functionality
 */

import { PrismaClient } from "@prisma/client";

async function test() {
  const db = new PrismaClient();
  
  try {
    console.log('🧪 Testing subscription system...');
    
    // Check if tiers exist
    const tiers = await db.subscriptionTier.findMany();
    console.log('✅ Found', tiers.length, 'subscription tiers');
    
    tiers.forEach(tier => {
      console.log(`  - ${tier.name} (${tier.type}): ${tier.monthlyPriceCents ? `$${tier.monthlyPriceCents / 100}/month` : 'Free'}`);
    });
    
    // Check if usage records table is accessible
    const usageCount = await db.usageRecord.count();
    console.log('✅ Usage records table accessible, found', usageCount, 'records');
    
    // Check if subscriptions table is accessible
    const subCount = await db.subscription.count();
    console.log('✅ Subscriptions table accessible, found', subCount, 'subscriptions');
    
    console.log('🎉 Subscription system test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await db.$disconnect();
  }
}

test().catch(console.error); 