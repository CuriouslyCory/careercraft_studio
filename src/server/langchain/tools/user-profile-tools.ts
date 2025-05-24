import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import {
  userDataTypeSchema,
  type UserDataType,
  type UserWorkHistory,
  type UserEducation,
  type UserSkill,
  type WorkAchievement,
  type UserPreference,
  type UserLink,
} from "./types";
import {
  validateUserId,
  withErrorHandling,
  ResourceNotFoundError,
  formatToolResponse,
} from "./errors";
import { TOOL_CONFIG } from "./config";

// =============================================================================
// USER PROFILE TOOLS
// =============================================================================

/**
 * Creates a user-specific tool for retrieving profile data
 * Uses improved type safety and standardized error handling
 */
export function getUserProfileTool(userId: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_user_profile",
    description:
      "Retrieve details from the user's stored profile including work history, education, skills, achievements, preferences, and user links",
    schema: z.object({
      dataType: userDataTypeSchema,
    }),
    func: withErrorHandling(
      async ({ dataType }: { dataType: UserDataType }): Promise<unknown> => {
        console.log(
          `Retrieving user profile data: ${dataType} for user ID: ${userId}`,
        );

        validateUserId(userId);

        switch (dataType) {
          case "work_history":
            return await getWorkHistory(userId);
          case "education":
            return await getEducation(userId);
          case "skills":
            return await getSkills(userId);
          case "achievements":
            return await getAchievements(userId);
          case "preferences":
            return await getPreferences(userId);
          case "user_links":
            return await getUserLinks(userId);
          case "all":
            return await getAllUserData(userId);
          default:
            // This should never happen due to Zod validation, but TypeScript doesn't know that
            throw new Error(
              `Invalid data type requested: ${dataType as string}`,
            );
        }
      },
      "get_user_profile",
    ),
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getWorkHistory(userId: string): Promise<UserWorkHistory[]> {
  const workHistory = await db.workHistory.findMany({
    where: { userId },
    include: {
      achievements: true,
      userSkills: {
        include: { skill: true },
      },
    },
    orderBy: { startDate: "desc" },
  });

  if (workHistory.length === 0) {
    throw new ResourceNotFoundError("work history");
  }

  return workHistory.map((job) => ({
    id: job.id,
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    startDate: job.startDate,
    endDate: job.endDate,
    achievements: job.achievements.map((a) => ({
      id: a.id,
      description: a.description,
    })),
    skills: job.userSkills.map((us) => ({
      name: us.skill.name,
      proficiency: us.proficiency,
      yearsExperience: us.yearsExperience,
    })),
  }));
}

async function getEducation(userId: string): Promise<UserEducation[]> {
  const education = await db.education.findMany({
    where: { userId },
    orderBy: { dateCompleted: "desc" },
  });

  if (education.length === 0) {
    throw new ResourceNotFoundError("education history");
  }

  return education.map((edu) => ({
    id: edu.id,
    type: edu.type,
    institutionName: edu.institutionName,
    degreeOrCertName: edu.degreeOrCertName,
    description: edu.description,
    dateCompleted: edu.dateCompleted,
  }));
}

async function getSkills(userId: string): Promise<UserSkill[]> {
  const userSkills = await db.userSkill.findMany({
    where: { userId },
    include: { skill: true, workHistory: true },
    orderBy: [{ proficiency: "desc" }, { yearsExperience: "desc" }],
  });

  if (userSkills.length === 0) {
    throw new ResourceNotFoundError("skills");
  }

  return userSkills.map((us) => ({
    id: us.id,
    name: us.skill.name,
    category: us.skill.category,
    proficiency: us.proficiency,
    yearsExperience: us.yearsExperience,
    source: us.source,
    workContext: us.workHistory
      ? `${us.workHistory.jobTitle} at ${us.workHistory.companyName}`
      : null,
    notes: us.notes,
  }));
}

async function getAchievements(userId: string): Promise<WorkAchievement[]> {
  // Get both work achievements and key achievements
  const [workAchievements, keyAchievements] = await Promise.all([
    db.workHistory.findMany({
      where: { userId },
      include: { achievements: true },
    }),
    db.keyAchievement.findMany({
      where: { userId },
    }),
  ]);

  if (workAchievements.length === 0 && keyAchievements.length === 0) {
    throw new ResourceNotFoundError("achievements");
  }

  // Collect work achievements with job context
  const formattedWorkAchievements = workAchievements.flatMap((job) =>
    job.achievements.map((achievement) => ({
      id: achievement.id,
      description: achievement.description,
      context: `${job.jobTitle} at ${job.companyName}`,
    })),
  );

  // Collect key achievements
  const formattedKeyAchievements = keyAchievements.map((achievement) => ({
    id: achievement.id,
    description: achievement.content,
    context: "General achievement",
  }));

  return [...formattedWorkAchievements, ...formattedKeyAchievements];
}

async function getPreferences(userId: string): Promise<UserPreference[]> {
  const userDetails = await db.userDetail.findMany({
    where: { userId },
  });

  if (userDetails.length === 0) {
    throw new ResourceNotFoundError("user preferences or details");
  }

  return userDetails.map((detail) => ({
    id: detail.id,
    category: detail.category,
    content: detail.content,
  }));
}

async function getUserLinks(userId: string): Promise<UserLink[]> {
  const userLinks = await db.userLink.findMany({
    where: { userId },
  });

  if (userLinks.length === 0) {
    throw new ResourceNotFoundError("user links");
  }

  return userLinks.map((link) => ({
    id: link.id,
    title: link.title,
    type: link.type,
    url: link.url,
  }));
}

async function getAllUserData(userId: string) {
  // Fetch all data types in parallel for better performance
  const [
    workHistory,
    education,
    skills,
    keyAchievements,
    userDetails,
    userLinks,
  ] = await Promise.all([
    db.workHistory.findMany({
      where: { userId },
      include: {
        achievements: true,
        userSkills: {
          include: { skill: true },
        },
      },
      orderBy: { startDate: "desc" },
    }),
    db.education.findMany({
      where: { userId },
      orderBy: { dateCompleted: "desc" },
    }),
    db.userSkill.findMany({
      where: { userId },
      include: { skill: true, workHistory: true },
      orderBy: [{ proficiency: "desc" }, { yearsExperience: "desc" }],
    }),
    db.keyAchievement.findMany({
      where: { userId },
    }),
    db.userDetail.findMany({
      where: { userId },
    }),
    db.userLink.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    work_history: workHistory.map((job) => ({
      id: job.id,
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      startDate: job.startDate.toISOString().split("T")[0],
      endDate: job.endDate
        ? job.endDate.toISOString().split("T")[0]
        : "Present",
      achievements: job.achievements.map((a) => a.description),
      skills: job.userSkills.map((us) => ({
        name: us.skill.name,
        proficiency: us.proficiency,
        yearsExperience: us.yearsExperience,
      })),
    })),
    education: education.map((edu) => ({
      id: edu.id,
      type: edu.type,
      institutionName: edu.institutionName,
      degreeOrCertName: edu.degreeOrCertName,
      description: edu.description,
      dateCompleted: edu.dateCompleted
        ? edu.dateCompleted.toISOString().split("T")[0]
        : null,
    })),
    skills: skills.map((us) => ({
      id: us.id,
      name: us.skill.name,
      category: us.skill.category,
      proficiency: us.proficiency,
      yearsExperience: us.yearsExperience,
      source: us.source,
      workContext: us.workHistory
        ? `${us.workHistory.jobTitle} at ${us.workHistory.companyName}`
        : null,
      notes: us.notes,
    })),
    key_achievements: keyAchievements.map((achievement) => ({
      id: achievement.id,
      description: achievement.content,
    })),
    user_details: userDetails.map((detail) => ({
      id: detail.id,
      category: detail.category,
      content: detail.content,
    })),
    user_links: userLinks.map((link) => ({
      id: link.id,
      title: link.title,
      type: link.type,
      url: link.url,
    })),
  };
}
