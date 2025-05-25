import { type PrismaClient } from "@prisma/client";
import { parseJobPosting } from "~/server/langchain/jobPostingParser";
import { type ParsedJobPosting } from "~/server/langchain/jobPostingSchemas";
import { SkillNormalizationService } from "./skill-normalization";

export interface JobPostingProcessingResult {
  jobPosting: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    industry: string | null;
  };
  skillCounts: {
    requiredSkills: number;
    bonusSkills: number;
    educationRequirements: number;
    experienceRequirements: number;
  };
}

export interface JobPostingProcessingOptions {
  /** Transaction timeout in milliseconds */
  transactionTimeout?: number;
  /** Transaction max wait time in milliseconds */
  transactionMaxWait?: number;
}

/**
 * Centralized service for processing and storing job postings with skill normalization
 */
export class JobPostingProcessor {
  constructor(private db: PrismaClient) {}

  /**
   * Parse and store a job posting with normalized skills and skill requirements
   */
  async processAndStore(
    content: string,
    userId: string,
    options: JobPostingProcessingOptions = {},
  ): Promise<JobPostingProcessingResult> {
    // Validate inputs
    if (!content || content.trim().length === 0) {
      throw new Error("Job posting content is required");
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error("User ID is required");
    }

    console.log(`Processing job posting for user ID: ${userId}`);

    try {
      // Step 1: Parse the job posting
      const parsedData = await parseJobPosting(content);
      const { jobPosting } = parsedData;

      // Validate required fields
      if (!jobPosting.title || !jobPosting.company) {
        throw new Error("Job posting must have title and company");
      }

      console.log(
        "Successfully parsed job posting:",
        jobPosting.title,
        "at",
        jobPosting.company,
      );

      // Step 2: Normalize skills BEFORE storing
      const skillNormalizer = new SkillNormalizationService(this.db);

      // Normalize all skills first
      const allRequiredTechnicalSkills =
        jobPosting.details.requirements.technicalSkills;
      const allRequiredSoftSkills = jobPosting.details.requirements.softSkills;
      const allBonusTechnicalSkills =
        jobPosting.details.bonusRequirements.technicalSkills;
      const allBonusSoftSkills =
        jobPosting.details.bonusRequirements.softSkills;

      // Normalize each skill category in parallel for better performance
      const [
        normalizedRequiredTechnical,
        normalizedRequiredSoft,
        normalizedBonusTechnical,
        normalizedBonusSoft,
      ] = await Promise.all([
        skillNormalizer.normalizeSkills(allRequiredTechnicalSkills),
        skillNormalizer.normalizeSkills(allRequiredSoftSkills),
        skillNormalizer.normalizeSkills(allBonusTechnicalSkills),
        skillNormalizer.normalizeSkills(allBonusSoftSkills),
      ]);

      // Extract normalized skill names for storage
      const normalizedRequiredTechnicalNames = normalizedRequiredTechnical.map(
        (s) => s.baseSkillName,
      );
      const normalizedRequiredSoftNames = normalizedRequiredSoft.map(
        (s) => s.baseSkillName,
      );
      const normalizedBonusTechnicalNames = normalizedBonusTechnical.map(
        (s) => s.baseSkillName,
      );
      const normalizedBonusSoftNames = normalizedBonusSoft.map(
        (s) => s.baseSkillName,
      );

      console.log("Successfully normalized skills:", {
        requiredTechnical: normalizedRequiredTechnicalNames.length,
        requiredSoft: normalizedRequiredSoftNames.length,
        bonusTechnical: normalizedBonusTechnicalNames.length,
        bonusSoft: normalizedBonusSoftNames.length,
      });

      // Step 3: Store the parsed data with normalized skills
      const result = await this.db.$transaction(
        async (tx) => {
          // Create the job posting record with original content
          const createdJobPosting = await tx.jobPosting.create({
            data: {
              title: jobPosting.title,
              content: content, // Store original content, not parsed JSON
              company: jobPosting.company,
              location: jobPosting.location,
              industry: jobPosting.industry ?? undefined,
              user: { connect: { id: userId } },
            },
          });

          // Create the job posting details with NORMALIZED skills
          await tx.jobPostingDetails.create({
            data: {
              // Required structured requirements - using normalized skill names
              technicalSkills: normalizedRequiredTechnicalNames,
              softSkills: normalizedRequiredSoftNames,
              educationRequirements:
                jobPosting.details.requirements.educationRequirements,
              experienceRequirements:
                jobPosting.details.requirements.experienceRequirements,
              industryKnowledge:
                jobPosting.details.requirements.industryKnowledge,

              // Bonus/preferred structured requirements - using normalized skill names
              bonusTechnicalSkills: normalizedBonusTechnicalNames,
              bonusSoftSkills: normalizedBonusSoftNames,
              bonusEducationRequirements:
                jobPosting.details.bonusRequirements.educationRequirements,
              bonusExperienceRequirements:
                jobPosting.details.bonusRequirements.experienceRequirements,
              bonusIndustryKnowledge:
                jobPosting.details.bonusRequirements.industryKnowledge,

              jobPosting: { connect: { id: createdJobPosting.id } },
            },
          });

          // Create skill requirements - handle duplicates by collecting unique skills first
          const skillRequirements = new Map<
            string,
            {
              skillId: string;
              skillName: string;
              isRequired: boolean;
              priority: number;
            }
          >();

          // Process required skills first (higher priority)
          for (const skillResult of normalizedRequiredTechnical) {
            skillRequirements.set(skillResult.baseSkillId, {
              skillId: skillResult.baseSkillId,
              skillName: skillResult.baseSkillName,
              isRequired: true,
              priority: 1, // High priority for required skills
            });
          }

          for (const skillResult of normalizedRequiredSoft) {
            skillRequirements.set(skillResult.baseSkillId, {
              skillId: skillResult.baseSkillId,
              skillName: skillResult.baseSkillName,
              isRequired: true,
              priority: 1, // High priority for required skills
            });
          }

          // Process bonus skills (only add if not already required)
          for (const skillResult of normalizedBonusTechnical) {
            if (!skillRequirements.has(skillResult.baseSkillId)) {
              skillRequirements.set(skillResult.baseSkillId, {
                skillId: skillResult.baseSkillId,
                skillName: skillResult.baseSkillName,
                isRequired: false,
                priority: 2, // Medium priority for bonus skills
              });
            }
          }

          for (const skillResult of normalizedBonusSoft) {
            if (!skillRequirements.has(skillResult.baseSkillId)) {
              skillRequirements.set(skillResult.baseSkillId, {
                skillId: skillResult.baseSkillId,
                skillName: skillResult.baseSkillName,
                isRequired: false,
                priority: 2, // Medium priority for bonus skills
              });
            }
          }

          // Create all unique skill requirements in a single batch
          const skillRequirementData = Array.from(
            skillRequirements.values(),
          ).map((req) => ({
            skillId: req.skillId,
            jobPostingId: createdJobPosting.id,
            isRequired: req.isRequired,
            priority: req.priority,
          }));

          if (skillRequirementData.length > 0) {
            await tx.jobSkillRequirement.createMany({
              data: skillRequirementData,
              skipDuplicates: true, // This will skip any duplicates instead of failing
            });
          }

          console.log(
            `Created ${skillRequirementData.length} unique skill requirements`,
          );

          return createdJobPosting;
        },
        {
          timeout: options.transactionTimeout ?? 30000, // 30 second default
          maxWait: options.transactionMaxWait ?? 5000, // 5 second default
        },
      );

      console.log("Successfully stored job posting and details in database");

      // Return structured result
      const skillCounts = {
        requiredSkills:
          normalizedRequiredTechnicalNames.length +
          normalizedRequiredSoftNames.length,
        bonusSkills:
          normalizedBonusTechnicalNames.length +
          normalizedBonusSoftNames.length,
        educationRequirements:
          jobPosting.details.requirements.educationRequirements.length,
        experienceRequirements:
          jobPosting.details.requirements.experienceRequirements.length,
      };

      return {
        jobPosting: {
          id: result.id,
          title: result.title,
          company: result.company,
          location: result.location,
          industry: result.industry,
        },
        skillCounts,
      };
    } catch (error) {
      console.error("Error processing job posting:", error);

      if (error instanceof Error) {
        throw new Error(`Failed to process job posting: ${error.message}`);
      }
      throw new Error("Failed to process job posting due to an unknown error");
    }
  }

  /**
   * Parse a job posting without storing it (for preview/validation)
   */
  async parseOnly(content: string): Promise<ParsedJobPosting> {
    if (!content || content.trim().length === 0) {
      throw new Error("Job posting content is required");
    }

    try {
      return await parseJobPosting(content);
    } catch (error) {
      console.error("Error parsing job posting:", error);

      if (error instanceof Error) {
        throw new Error(`Failed to parse job posting: ${error.message}`);
      }
      throw new Error("Failed to parse job posting due to an unknown error");
    }
  }
}

/**
 * Standalone function for processing job postings (for backward compatibility)
 */
export async function processJobPosting(
  content: string,
  userId: string,
  db: PrismaClient,
  options: JobPostingProcessingOptions = {},
): Promise<JobPostingProcessingResult> {
  const processor = new JobPostingProcessor(db);
  return processor.processAndStore(content, userId, options);
}
