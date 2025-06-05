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
import {
  processUserLinks,
  parseAndValidateUrl,
} from "~/server/api/routers/document/user-links";
import { type EducationType } from "@prisma/client";
import { SkillNormalizationService } from "./skill-normalization";
import { mergeWorkAchievements } from "~/server/api/routers/document/utils/llm-merger";

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

          const linksToCreate: Array<{
            title: string;
            url: string;
            type: string;
            userId: string;
          }> = [];

          // Process each link with URL validation
          for (const link of userLinks) {
            if (!link.url || !link.title) {
              console.log("Skipping incomplete link:", link);
              continue;
            }

            // Parse and validate URL, adding protocol if needed
            let validatedUrl: string;
            try {
              validatedUrl = parseAndValidateUrl(link.url);
            } catch (error: unknown) {
              console.log(
                `Skipping link "${link.title}" due to invalid URL: ${link.url} - ${error instanceof Error ? error.message : "Unknown error"}`,
              );
              continue;
            }

            // Check for duplicates using validated URL
            if (!existingUrls.has(validatedUrl.toLowerCase())) {
              linksToCreate.push({
                title: link.title,
                url: validatedUrl,
                type: link.type ?? "OTHER",
                userId,
              });
            } else {
              console.log(
                `Skipping duplicate link: "${link.title}" - ${validatedUrl}`,
              );
            }
          }

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
    const existingWorkHistory = await tx.workHistory.findMany({
      where: { userId },
      include: {
        achievements: true,
      },
    });

    // Get all existing skills to build a map
    const existingSkills = await tx.skill.findMany({
      select: { id: true, name: true },
    });

    const skillMap = new Map<string, string>();
    for (const skill of existingSkills) {
      skillMap.set(skill.name.toLowerCase(), skill.id);
    }

    let processedCount = 0;

    // Initialize skill normalization service
    const skillNormalizer = new SkillNormalizationService(tx);

    for (const expRaw of workExperience) {
      const exp = expRaw;

      // Check if this work experience matches an existing record
      const matchingRecord = existingWorkHistory.find((existing) =>
        doWorkHistoryRecordsMatch(existing, exp),
      );

      let workHistoryId: string;

      if (matchingRecord) {
        // Update existing record
        console.log(
          `Found matching work history: ${matchingRecord.companyName} - ${matchingRecord.jobTitle}`,
        );

        // Get existing achievements as strings
        const existingAchievements = matchingRecord.achievements.map(
          (a) => a.description,
        );

        // Get new achievements
        const newAchievements = Array.isArray(exp.achievements)
          ? exp.achievements.filter((a): a is string => typeof a === "string")
          : [];

        // Merge achievements using LLM
        const mergedAchievements = await mergeWorkAchievements(
          existingAchievements,
          newAchievements,
        );

        // Update the work history record
        await tx.workHistory.update({
          where: { id: matchingRecord.id },
          data: {
            jobTitle: exp.jobTitle ?? matchingRecord.jobTitle,
            startDate: exp.startDate ?? matchingRecord.startDate,
            endDate: exp.endDate ?? matchingRecord.endDate,
          },
        });

        // Clear existing achievements and add merged ones
        await tx.workAchievement.deleteMany({
          where: { workHistoryId: matchingRecord.id },
        });

        if (mergedAchievements.length > 0) {
          await tx.workAchievement.createMany({
            data: mergedAchievements.map((desc) => ({
              description: desc,
              workHistoryId: matchingRecord.id,
            })),
          });
        }

        workHistoryId = matchingRecord.id;
      } else {
        // Create new work history record
        const wh = await tx.workHistory.create({
          data: {
            companyName: exp.company ?? "",
            jobTitle: exp.jobTitle ?? "",
            startDate: exp.startDate ?? new Date(),
            endDate: exp.endDate,
            user: { connect: { id: userId } },
          },
        });

        // Add achievements for new record
        const achievements = Array.isArray(exp.achievements)
          ? exp.achievements
          : [];
        if (achievements.length > 0) {
          await tx.workAchievement.createMany({
            data: achievements
              .filter((desc): desc is string => typeof desc === "string")
              .map((desc) => ({
                description: desc,
                workHistoryId: wh.id,
              })),
          });
        }

        workHistoryId = wh.id;
      }

      // Process skills using skill normalization service
      const skills = Array.isArray(exp.skills) ? exp.skills : [];
      if (skills.length > 0) {
        // Filter and normalize skills
        const validSkills = skills.filter(
          (s): s is string => typeof s === "string" && s.trim() !== "",
        );

        if (validSkills.length > 0) {
          // Use skill normalization service for proper categorization
          const normalizedSkills =
            await skillNormalizer.normalizeSkills(validSkills);

          // Get existing user skills to avoid duplicates
          const normalizedSkillIds = normalizedSkills.map((s) => s.baseSkillId);
          const existingUserSkills = await tx.userSkill.findMany({
            where: {
              userId,
              skillId: { in: normalizedSkillIds },
            },
          });

          const existingUserSkillIds = new Set(
            existingUserSkills.map((us) => us.skillId),
          );

          // Create user skills for new skills only
          const userSkillsToCreate = normalizedSkills
            .filter(
              (normalizedSkill) =>
                !existingUserSkillIds.has(normalizedSkill.baseSkillId),
            )
            .map((normalizedSkill) => ({
              userId,
              skillId: normalizedSkill.baseSkillId,
              proficiency: "INTERMEDIATE" as const,
              source: "WORK_EXPERIENCE" as const,
              notes: `Used at ${exp.company} - ${exp.jobTitle}${normalizedSkill.detailedVariant ? ` (${normalizedSkill.detailedVariant})` : ""}`,
              workHistoryId,
            }));

          if (userSkillsToCreate.length > 0) {
            await tx.userSkill.createMany({
              data: userSkillsToCreate,
              skipDuplicates: true,
            });
          }
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
