import { type PrismaClient } from "@prisma/client";
import { ResumeDataSchema } from "~/server/langchain/agent";
import { createLLM } from "~/server/langchain/agent";
import { zodToJsonSchema } from "zod-to-json-schema";
import { extractContent } from "~/server/api/routers/document/types";
import {
  doWorkHistoryRecordsMatch,
  processWorkExperience,
} from "~/server/api/routers/document/work-history";
import { processEducation } from "~/server/api/routers/document/education";
import { processKeyAchievements } from "~/server/api/routers/document/key-achievements";
import { processUserLinks } from "~/server/api/routers/document/user-links";
import { type EducationType } from "@prisma/client";

export interface ResumeParsingResult {
  success: boolean;
  documentId?: string;
  processedContent?: string;
  summary: string;
  counts: {
    workExperience: number;
    education: number;
    achievements: number;
    links: number;
  };
  error?: string;
}

export interface ResumeParsingOptions {
  title?: string;
  saveDocument?: boolean;
  useBatchedOperations?: boolean;
}

/**
 * Centralized resume parsing service that can be used by document upload and AI tools
 */
export class ResumeParsingService {
  constructor(private db: PrismaClient) {}

  /**
   * Parse resume text and optionally store it in the database
   */
  async parseResume(
    resumeText: string,
    userId: string,
    options: ResumeParsingOptions = {},
  ): Promise<ResumeParsingResult> {
    const {
      title = "Parsed Resume",
      saveDocument = true,
      useBatchedOperations = true,
    } = options;

    console.log(
      `Parsing resume for user ID: ${userId}, text length: ${resumeText.length}`,
    );

    try {
      if (!userId) {
        return {
          success: false,
          summary: "User ID is required but not provided",
          counts: {
            workExperience: 0,
            education: 0,
            achievements: 0,
            links: 0,
          },
          error: "User ID is required but not provided",
        };
      }

      // Step 1: Parse resume using LLM
      const processedContent = await this.parseResumeWithLLM(resumeText);

      // Step 2: Save to database (if requested)
      let docId: string | undefined;
      if (saveDocument) {
        try {
          const doc = await this.db.document.create({
            data: {
              title,
              content: processedContent,
              type: "resume",
              userId,
            },
          });
          docId = doc.id;
          console.log("Saved resume document to database:", doc.id);
        } catch (err) {
          console.error("Error saving document:", err);
          return {
            success: false,
            summary: `Error saving document: ${err instanceof Error ? err.message : String(err)}`,
            counts: {
              workExperience: 0,
              education: 0,
              achievements: 0,
              links: 0,
            },
            error: `Error saving document: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      // Step 3: Parse and store structured data
      const counts = await this.storeStructuredData(
        processedContent,
        userId,
        useBatchedOperations,
      );

      // Step 4: Generate summary
      const summary = this.generateSummary(title, docId, counts);

      return {
        success: true,
        documentId: docId,
        processedContent,
        summary,
        counts,
      };
    } catch (error) {
      console.error("Error in resume parsing:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        summary: `Error parsing resume: ${errorMessage}`,
        counts: { workExperience: 0, education: 0, achievements: 0, links: 0 },
        error: errorMessage,
      };
    }
  }

  /**
   * Parse resume text using LLM to extract structured data
   */
  private async parseResumeWithLLM(resumeText: string): Promise<string> {
    try {
      const resumeJsonSchema = JSON.stringify(
        zodToJsonSchema(ResumeDataSchema),
        null,
        2,
      );
      const schemaDescription = `\nReturn the data as JSON matching this schema exactly (do not add, remove, or rename fields):\n\n${resumeJsonSchema}\nIf a value is missing, use an empty string or omit the field (if optional). For date fields, either provide a valid ISO 8601 date string or omit the field entirely - never use null. All arrays must be arrays, not objects. Do not add, remove, or rename any fields.\n`;

      const llm = createLLM();
      const llmResponse = await llm.invoke([
        [
          "system",
          `Please parse the following resume text and return the structured data. ${schemaDescription}`,
        ],
        ["user", `Resume text: """${resumeText}"""`],
      ]);

      const processedContent = extractContent(llmResponse);
      console.log("LLM processed resume content successfully");
      return processedContent;
    } catch (err) {
      console.error("Error processing resume with LLM:", err);
      throw new Error(
        `Error processing resume with AI: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Store structured data extracted from resume using optimized batch operations
   */
  private async storeStructuredDataBatched(
    processedContent: string,
    userId: string,
  ): Promise<{
    workExperience: number;
    education: number;
    achievements: number;
    links: number;
  }> {
    let workExperienceCount = 0;
    let educationCount = 0;
    let achievementsCount = 0;
    let linksCount = 0;

    try {
      // Remove code block markers if present
      let clean = processedContent.trim();
      if (clean.startsWith("```json")) {
        clean = clean.replace(/^```json\n?/, "");
      }
      if (clean.endsWith("```")) {
        clean = clean.replace(/```$/, "");
      }

      const parsed = ResumeDataSchema.parse(JSON.parse(clean));

      // Batch all database operations in a transaction
      await this.db.$transaction(async (tx) => {
        // Process key achievements - simple batch insert
        const keyAchievements = Array.isArray(parsed.key_achievements)
          ? parsed.key_achievements
          : [];
        if (keyAchievements.length > 0) {
          await tx.keyAchievement.createMany({
            data: keyAchievements.map((content) => ({
              content,
              userId,
            })),
            skipDuplicates: true,
          });
          achievementsCount = keyAchievements.length;
        }

        // Process education - batch insert
        const educationArr = Array.isArray(parsed.education)
          ? parsed.education
          : [];
        if (educationArr.length > 0) {
          await tx.education.createMany({
            data: educationArr.map((edu) => ({
              type: (edu.type as EducationType) ?? "OTHER",
              institutionName: edu.institutionName ?? "",
              degreeOrCertName: edu.degreeOrCertName,
              description: edu.description ?? "",
              dateCompleted: edu.dateCompleted,
              userId,
            })),
            skipDuplicates: true,
          });
          educationCount = educationArr.length;
        }

        // Process user links - batch with duplicate checking
        const userLinks = Array.isArray(parsed.user_links)
          ? parsed.user_links
          : [];
        if (userLinks.length > 0) {
          // Get existing links first to avoid duplicates
          const existingLinks = await tx.userLink.findMany({
            where: { userId },
            select: { url: true },
          });
          const existingUrls = new Set(
            existingLinks.map((link) => link.url.toLowerCase()),
          );

          const linksToCreate = userLinks
            .filter(
              (link): link is { title: string; url: string; type?: string } =>
                Boolean(link.url && link.title),
            )
            .filter((link) => !existingUrls.has(link.url.toLowerCase()))
            .map((link) => ({
              title: link.title,
              url: link.url,
              type: link.type ?? "OTHER",
              userId,
            }));

          if (linksToCreate.length > 0) {
            await tx.userLink.createMany({
              data: linksToCreate,
              skipDuplicates: true,
            });
          }
          linksCount = linksToCreate.length;
        }

        // Process work experience - requires complex logic, keep individual processing
        // but batch the achievements and skills within each work history entry
        const workExperience = Array.isArray(parsed.work_experience)
          ? parsed.work_experience
          : [];

        if (workExperience.length > 0) {
          workExperienceCount = await this.processWorkExperienceBatched(
            workExperience,
            userId,
            tx,
          );
        }
      });

      console.log(
        "Successfully processed all resume sections with batched operations",
      );
    } catch (err) {
      console.error("Error parsing or storing structured data:", err);
      // Continue execution - partial success is still useful
    }

    return {
      workExperience: workExperienceCount,
      education: educationCount,
      achievements: achievementsCount,
      links: linksCount,
    };
  }

  /**
   * Optimized work experience processing with batched operations
   */
  private async processWorkExperienceBatched(
    workExperience: Array<{
      company?: string;
      jobTitle?: string;
      startDate?: Date;
      endDate?: Date;
      achievements?: string[];
      skills?: string[];
    }>,
    userId: string,
    tx: Omit<
      PrismaClient,
      "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
    >,
  ): Promise<number> {
    // Get all existing work history and skills for the user
    const [existingWorkHistory, existingSkills] = await Promise.all([
      tx.workHistory.findMany({
        where: { userId },
        include: { achievements: true },
      }),
      tx.skill.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const skillMap = new Map(
      existingSkills.map((skill) => [skill.name.toLowerCase(), skill.id]),
    );
    let processedCount = 0;

    for (const exp of workExperience) {
      if (!exp.company && !exp.jobTitle) continue;

      // Check for existing work history using the matching function
      const existingEntry = existingWorkHistory.find((existing) =>
        doWorkHistoryRecordsMatch(existing, exp),
      );

      let workHistoryId: string;

      if (existingEntry) {
        // Update existing entry
        await tx.workHistory.update({
          where: { id: existingEntry.id },
          data: {
            jobTitle: exp.jobTitle ?? existingEntry.jobTitle,
            startDate: exp.startDate ?? existingEntry.startDate,
            endDate: exp.endDate ?? existingEntry.endDate,
          },
        });
        workHistoryId = existingEntry.id;
      } else {
        // Create new work history entry
        const newEntry = await tx.workHistory.create({
          data: {
            companyName: exp.company ?? "",
            jobTitle: exp.jobTitle ?? "",
            startDate: exp.startDate ?? new Date(),
            endDate: exp.endDate,
            userId,
          },
        });
        workHistoryId = newEntry.id;
      }

      // Batch create achievements
      const achievements = Array.isArray(exp.achievements)
        ? exp.achievements
        : [];
      if (achievements.length > 0) {
        await tx.workAchievement.createMany({
          data: achievements
            .filter((desc): desc is string => typeof desc === "string")
            .map((description) => ({
              description,
              workHistoryId,
            })),
        });
      }

      // Process skills with batched operations
      const skills = Array.isArray(exp.skills) ? exp.skills : [];
      if (skills.length > 0) {
        // Create any new skills that don't exist yet
        const newSkills = skills.filter(
          (skillName) => !skillMap.has(skillName.toLowerCase()),
        );

        if (newSkills.length > 0) {
          const createdSkills = await Promise.all(
            newSkills.map(async (skillName) => {
              const skill = await tx.skill.create({
                data: {
                  name: skillName,
                  category: "OTHER",
                },
              });
              skillMap.set(skillName.toLowerCase(), skill.id);
              return skill;
            }),
          );
        }

        // Get existing user skills to avoid duplicates
        const skillIds = skills
          .map((name) => skillMap.get(name.toLowerCase()))
          .filter((id): id is string => id !== undefined);

        const existingUserSkills = await tx.userSkill.findMany({
          where: {
            userId,
            skillId: { in: skillIds },
          },
        });

        const existingUserSkillIds = new Set(
          existingUserSkills.map((us) => us.skillId),
        );

        // Create user skills for new skills only
        const userSkillsToCreate = skills
          .map((skillName) => skillMap.get(skillName.toLowerCase()))
          .filter(
            (skillId): skillId is string =>
              skillId !== undefined && !existingUserSkillIds.has(skillId),
          )
          .map((skillId) => ({
            userId,
            skillId,
            proficiency: "INTERMEDIATE" as const,
            source: "WORK_EXPERIENCE" as const,
            notes: `Used at ${exp.company} - ${exp.jobTitle}`,
            workHistoryId,
          }));

        if (userSkillsToCreate.length > 0) {
          await tx.userSkill.createMany({
            data: userSkillsToCreate,
            skipDuplicates: true,
          });
        }
      }

      processedCount++;
    }

    return processedCount;
  }

  /**
   * Store structured data extracted from resume (with option for batched operations)
   */
  private async storeStructuredData(
    processedContent: string,
    userId: string,
    useBatching = true,
  ): Promise<{
    workExperience: number;
    education: number;
    achievements: number;
    links: number;
  }> {
    if (useBatching) {
      return this.storeStructuredDataBatched(processedContent, userId);
    }

    // Fallback to original implementation
    let workExperienceCount = 0;
    let educationCount = 0;
    let achievementsCount = 0;
    let linksCount = 0;

    try {
      // Remove code block markers if present
      let clean = processedContent.trim();
      if (clean.startsWith("```json")) {
        clean = clean.replace(/^```json\n?/, "");
      }
      if (clean.endsWith("```")) {
        clean = clean.replace(/```$/, "");
      }

      const parsed = ResumeDataSchema.parse(JSON.parse(clean));

      // Create a context object for the processing functions
      const ctx = { db: this.db };

      // Process work experience
      const workExperience = Array.isArray(parsed.work_experience)
        ? parsed.work_experience
        : [];
      if (workExperience.length > 0) {
        await processWorkExperience(workExperience, userId, ctx);
        workExperienceCount = workExperience.length;
      }

      // Process education
      const educationArr = Array.isArray(parsed.education)
        ? parsed.education
        : [];
      if (educationArr.length > 0) {
        await processEducation(educationArr, userId, ctx);
        educationCount = educationArr.length;
      }

      // Process key achievements
      const keyAchievements = Array.isArray(parsed.key_achievements)
        ? parsed.key_achievements
        : [];
      if (keyAchievements.length > 0) {
        await processKeyAchievements(keyAchievements, userId, ctx);
        achievementsCount = keyAchievements.length;
      }

      // Process user links
      const userLinks = Array.isArray(parsed.user_links)
        ? parsed.user_links
        : [];
      if (userLinks.length > 0) {
        await processUserLinks(userLinks, userId, ctx);
        linksCount = userLinks.length;
      }

      console.log("Successfully processed all resume sections");
    } catch (err) {
      console.error("Error parsing or storing structured data:", err);
      // Continue execution - partial success is still useful
    }

    return {
      workExperience: workExperienceCount,
      education: educationCount,
      achievements: achievementsCount,
      links: linksCount,
    };
  }

  /**
   * Generate a formatted summary of the parsing results
   */
  private generateSummary(
    title: string,
    docId: string | undefined,
    counts: {
      workExperience: number;
      education: number;
      achievements: number;
      links: number;
    },
  ): string {
    let summary = `Resume successfully parsed and processed!\n\n`;

    if (docId) {
      summary += `**Document Saved:**\n`;
      summary += `- Title: ${title}\n`;
      summary += `- Document ID: ${docId}\n\n`;
    }

    summary += `**Data Processed:**\n`;
    summary += `- Work Experience: ${counts.workExperience} positions\n`;
    summary += `- Education: ${counts.education} entries\n`;
    summary += `- Achievements: ${counts.achievements} items\n`;
    summary += `- Links/Profiles: ${counts.links} items\n\n`;
    summary += `The resume has been analyzed and your profile data has been updated with the extracted information. You can now use this data to generate tailored resumes and cover letters.`;

    return summary;
  }
}

/**
 * Convenience function for parsing a resume (maintains backward compatibility)
 */
export async function parseResume(
  resumeText: string,
  userId: string,
  db: PrismaClient,
  options: ResumeParsingOptions = {},
): Promise<ResumeParsingResult> {
  const service = new ResumeParsingService(db);
  return service.parseResume(resumeText, userId, options);
}

/**
 * Simple function to parse resume text from a chat message
 * This is optimized for AI tool usage where we want immediate processing
 */
export async function parseResumeFromText(
  resumeText: string,
  userId: string,
  db: PrismaClient,
  title = "Chat Resume",
): Promise<string> {
  try {
    const result = await parseResume(resumeText, userId, db, { title });
    return result.summary;
  } catch (error) {
    console.error("Error parsing resume from text:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error parsing resume: ${errorMessage}`;
  }
}
