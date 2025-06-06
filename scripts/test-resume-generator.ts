#!/usr/bin/env tsx

/**
 * Test script to view resume data generator output for a specific user
 * Usage: npx tsx scripts/test-resume-generator.ts [userId]
 */

import { PrismaClient } from "@prisma/client";
import { generateUserResumeData } from "../src/server/services/resume-data-generator";

async function testResumeGenerator() {
  const db = new PrismaClient();

  try {
    console.log("🧪 Testing Resume Data Generator...\n");

    // Get user ID from command line args or use the first available user
    let userId = process.argv[2];

    if (!userId) {
      console.log("🔍 No user ID provided, finding first available user...");
      const users = await db.user.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (users.length === 0) {
        throw new Error("No users found in database");
      }

      console.log("📋 Available users:");
      users.forEach((user, index) => {
        console.log(
          `  ${index + 1}. ${user.name ?? user.email} (ID: ${user.id})`,
        );
      });

      const firstUser = users[0]!;
      userId = firstUser.id;
      console.log(
        `\n🎯 Using first user: ${firstUser.name ?? firstUser.email} (${userId})\n`,
      );
    }

    // Test the resume data generator
    console.log("🚀 Generating resume data...");
    const resumeData = await generateUserResumeData(db, userId);

    console.log("✅ Resume data generated successfully!\n");
    console.log("📄 Generated Resume Data:");
    console.log("=".repeat(80));
    console.log(resumeData);
    console.log("=".repeat(80));

    // Show some stats
    const lines = resumeData.split("\n").length;
    const chars = resumeData.length;
    console.log(`\n📊 Stats: ${lines} lines, ${chars} characters`);
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error instanceof Error ? error.message : String(error),
    );

    if (error instanceof Error && error.message === "User not found") {
      console.log("\n💡 Tip: Make sure the user ID exists in the database");
      console.log("Usage: npx tsx scripts/test-resume-generator.ts <userId>");
    }
  } finally {
    await db.$disconnect();
  }
}

testResumeGenerator().catch(console.error);
