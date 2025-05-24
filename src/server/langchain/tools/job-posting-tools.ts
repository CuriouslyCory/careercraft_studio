import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import { parseJobPosting } from "../jobPostingParser";
import { type ParsedJobPosting } from "../jobPostingSchemas";
import {
  validateUserId,
  withErrorHandling,
  ResourceNotFoundError,
  ValidationError,
  DatabaseError,
  createSuccessMessage,
} from "./errors";
import { TOOL_CONFIG, VALIDATION_LIMITS } from "./config";
import { SkillNormalizationService } from "~/server/services/skill-normalization";

// =============================================================================
// JOB POSTING PARSING TOOLS
// =============================================================================

/**
 * Tool to parse job posting content and extract structured data
 */
export const parseJobPostingTool = new DynamicStructuredTool({
  name: "parse_job_posting",
  description:
    "Parse a job posting text and extract structured information including title, company, location, industry, responsibilities, qualifications, and bonus qualifications",
  schema: z.object({
    content: z
      .string()
      .min(
        VALIDATION_LIMITS.JOB_POSTING_CONTENT.MIN,
        "Job posting content is too short",
      )
      .max(
        VALIDATION_LIMITS.JOB_POSTING_CONTENT.MAX,
        "Job posting content is too long",
      )
      .describe("The raw job posting content/text to parse"),
  }),
  func: withErrorHandling(
    async ({ content }: { content: string }): Promise<string> => {
      console.log("Parsing job posting content using LLM...");

      try {
        const parsedData = await parseJobPosting(content);
        console.log("Successfully parsed job posting data");
        return JSON.stringify(parsedData);
      } catch (error) {
        throw new DatabaseError("parse job posting", error as Error);
      }
    },
    "parse_job_posting",
  ),
});

// =============================================================================
// JOB POSTING STORAGE TOOLS
// =============================================================================

/**
 * Tool to store parsed job posting data in the database
 */
export function createStoreJobPostingTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "store_job_posting",
    description: "Store a parsed job posting in the database with all details",
    schema: z.object({
      parsedJobPosting: z
        .string()
        .min(1, "Parsed job posting data is required")
        .describe("JSON string of the parsed job posting data"),
    }),
    func: withErrorHandling(
      async ({
        parsedJobPosting,
      }: {
        parsedJobPosting: string;
      }): Promise<string> => {
        console.log(`Storing job posting data for user ID: ${userId}`);

        validateUserId(userId);

        // Parse the JSON string with proper type checking
        let jobData: ParsedJobPosting;
        try {
          jobData = JSON.parse(parsedJobPosting) as ParsedJobPosting;
        } catch (parseError) {
          throw new ValidationError("Invalid JSON format for job posting data");
        }

        const { jobPosting } = jobData;

        // Validate required fields
        if (!jobPosting.title || !jobPosting.company) {
          throw new ValidationError("Job posting must have title and company");
        }

        try {
          // Use a transaction with proper timeout for data consistency
          const result = await db.$transaction(
            async (tx) => {
              // Create the job posting record
              const createdJobPosting = await tx.jobPosting.create({
                data: {
                  title: jobPosting.title,
                  content: parsedJobPosting,
                  company: jobPosting.company,
                  location: jobPosting.location,
                  industry: jobPosting.industry ?? undefined,
                  user: { connect: { id: userId } },
                },
              });

              // Create the job posting details
              await tx.jobPostingDetails.create({
                data: {
                  // Required structured requirements
                  technicalSkills:
                    jobPosting.details.requirements.technicalSkills,
                  softSkills: jobPosting.details.requirements.softSkills,
                  educationRequirements:
                    jobPosting.details.requirements.educationRequirements,
                  experienceRequirements:
                    jobPosting.details.requirements.experienceRequirements,
                  industryKnowledge:
                    jobPosting.details.requirements.industryKnowledge,

                  // Bonus/preferred structured requirements
                  bonusTechnicalSkills:
                    jobPosting.details.bonusRequirements.technicalSkills,
                  bonusSoftSkills:
                    jobPosting.details.bonusRequirements.softSkills,
                  bonusEducationRequirements:
                    jobPosting.details.bonusRequirements.educationRequirements,
                  bonusExperienceRequirements:
                    jobPosting.details.bonusRequirements.experienceRequirements,
                  bonusIndustryKnowledge:
                    jobPosting.details.bonusRequirements.industryKnowledge,

                  jobPosting: { connect: { id: createdJobPosting.id } },
                },
              });

              // Create normalized skill requirements for compatibility analysis
              const allRequiredSkills = [
                ...jobPosting.details.requirements.technicalSkills,
                ...jobPosting.details.requirements.softSkills,
              ];

              const allBonusSkills = [
                ...jobPosting.details.bonusRequirements.technicalSkills,
                ...jobPosting.details.bonusRequirements.softSkills,
              ];

              // Initialize skill normalization service for consistent skill handling
              const skillNormalizer = new SkillNormalizationService(tx);

              // Process required skills with normalization
              const requiredSkillResults =
                await skillNormalizer.normalizeSkills(
                  allRequiredSkills,
                  "PROGRAMMING_LANGUAGE", // Default category for required skills
                );

              for (const skillResult of requiredSkillResults) {
                // Create the skill requirement using the normalized base skill
                try {
                  await tx.jobSkillRequirement.create({
                    data: {
                      skillId: skillResult.baseSkillId,
                      jobPostingId: createdJobPosting.id,
                      isRequired: true,
                      priority: 1, // High priority for required skills
                    },
                  });
                } catch (error) {
                  // Skip if already exists (duplicate)
                  console.log(
                    `Skill requirement already exists for ${skillResult.baseSkillName}`,
                  );
                }
              }

              // Process bonus skills with normalization
              const bonusSkillResults = await skillNormalizer.normalizeSkills(
                allBonusSkills,
                "SOFT_SKILLS", // Default category for bonus skills
              );

              for (const skillResult of bonusSkillResults) {
                // Create the skill requirement using the normalized base skill
                try {
                  await tx.jobSkillRequirement.create({
                    data: {
                      skillId: skillResult.baseSkillId,
                      jobPostingId: createdJobPosting.id,
                      isRequired: false,
                      priority: 2, // Medium priority for bonus skills
                    },
                  });
                } catch (error) {
                  // Skip if already exists (duplicate)
                  console.log(
                    `Skill requirement already exists for ${skillResult.baseSkillName}`,
                  );
                }
              }

              return createdJobPosting;
            },
            {
              timeout: TOOL_CONFIG.TRANSACTION_TIMEOUT,
              maxWait: TOOL_CONFIG.TRANSACTION_MAX_WAIT,
            },
          );

          return createSuccessMessage(
            "stored",
            "job posting",
            `"${result.title}" at ${result.company}`,
          );
        } catch (error) {
          throw new DatabaseError("store job posting", error as Error);
        }
      },
      "store_job_posting",
    ),
  });
}

// =============================================================================
// JOB POSTING RETRIEVAL TOOLS
// =============================================================================

/**
 * Tool to find job postings by various criteria
 */
export function createFindJobPostingsTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "find_job_postings",
    description:
      "Find stored job postings by title, company, location, or other criteria",
    schema: z.object({
      title: z
        .string()
        .optional()
        .describe("Job title to search for (partial match)"),
      company: z
        .string()
        .optional()
        .describe("Company name to search for (partial match)"),
      location: z
        .string()
        .optional()
        .describe("Location to search for (partial match)"),
      industry: z
        .string()
        .optional()
        .describe("Industry to search for (partial match)"),
      limit: z
        .number()
        .min(1, "Limit must be at least 1")
        .max(
          TOOL_CONFIG.MAX_QUERY_LIMIT,
          `Limit cannot exceed ${TOOL_CONFIG.MAX_QUERY_LIMIT}`,
        )
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    func: withErrorHandling(
      async ({
        title,
        company,
        location,
        industry,
        limit = 10,
      }: {
        title?: string;
        company?: string;
        location?: string;
        industry?: string;
        limit?: number;
      }): Promise<string> => {
        console.log(
          `Finding job postings for user ID: ${userId} with criteria:`,
          {
            title,
            company,
            location,
            industry,
            limit,
          },
        );

        validateUserId(userId);

        try {
          // Build where clause based on provided criteria
          const whereClause: Record<string, unknown> = { userId };

          if (title) {
            whereClause.title = {
              contains: title,
              mode: "insensitive",
            } as const;
          }
          if (company) {
            whereClause.company = {
              contains: company,
              mode: "insensitive",
            } as const;
          }
          if (location) {
            whereClause.location = {
              contains: location,
              mode: "insensitive",
            } as const;
          }
          if (industry) {
            whereClause.industry = {
              contains: industry,
              mode: "insensitive",
            } as const;
          }

          const jobPostings = await db.jobPosting.findMany({
            where: whereClause,
            include: {
              details: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          });

          if (jobPostings.length === 0) {
            throw new ResourceNotFoundError(
              "job postings matching the specified criteria",
            );
          }

          const formattedJobs = jobPostings.map((job) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            industry: job.industry,
            createdAt: job.createdAt.toISOString(),
            details: job.details
              ? {
                  requiredTechnicalSkills: job.details.technicalSkills,
                  requiredSoftSkills: job.details.softSkills,
                  requiredEducation: job.details.educationRequirements,
                  requiredExperience: job.details.experienceRequirements,
                  requiredIndustryKnowledge: job.details.industryKnowledge,
                  bonusTechnicalSkills: job.details.bonusTechnicalSkills,
                  bonusSoftSkills: job.details.bonusSoftSkills,
                  bonusEducation: job.details.bonusEducationRequirements,
                  bonusExperience: job.details.bonusExperienceRequirements,
                  bonusIndustryKnowledge: job.details.bonusIndustryKnowledge,
                }
              : null,
          }));

          return JSON.stringify(formattedJobs);
        } catch (error) {
          if (error instanceof ResourceNotFoundError) {
            throw error;
          }
          throw new DatabaseError("find job postings", error as Error);
        }
      },
      "find_job_postings",
    ),
  });
}

// =============================================================================
// JOB POSTING ANALYSIS TOOLS
// =============================================================================

/**
 * Tool to compare user skills against job posting requirements
 */
export function createSkillComparisonTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "compare_skills_to_job",
    description:
      "Compare user's skills against a specific job posting's requirements and provide detailed analysis",
    schema: z.object({
      jobPostingId: z
        .string()
        .optional()
        .describe("ID of the job posting to compare against"),
      jobTitle: z
        .string()
        .optional()
        .describe("Title of the job posting to find and compare against"),
      company: z
        .string()
        .optional()
        .describe("Company name to help identify the job posting"),
    }),
    func: withErrorHandling(
      async ({
        jobPostingId,
        jobTitle,
        company,
      }: {
        jobPostingId?: string;
        jobTitle?: string;
        company?: string;
      }): Promise<string> => {
        console.log(`Comparing skills for user ID: ${userId} against job:`, {
          jobPostingId,
          jobTitle,
          company,
        });

        validateUserId(userId);

        try {
          // Find the job posting
          let jobPosting;
          if (jobPostingId) {
            jobPosting = await db.jobPosting.findFirst({
              where: { id: jobPostingId, userId },
            });
          } else if (jobTitle || company) {
            const whereClause: Record<string, unknown> = { userId };
            if (jobTitle) {
              whereClause.title = {
                contains: jobTitle,
                mode: "insensitive",
              } as const;
            }
            if (company) {
              whereClause.company = {
                contains: company,
                mode: "insensitive",
              } as const;
            }

            jobPosting = await db.jobPosting.findFirst({
              where: whereClause,
              orderBy: { createdAt: "desc" },
            });
          } else {
            throw new ValidationError(
              "Please provide either a job posting ID, job title, or company name to identify the job posting.",
            );
          }

          if (!jobPosting) {
            throw new ResourceNotFoundError(
              "job posting matching the specified criteria",
            );
          }

          // Use the CompatibilityAnalyzer for detailed analysis
          const { CompatibilityAnalyzer } = await import(
            "~/server/services/compatibility-analyzer"
          );
          const analyzer = new CompatibilityAnalyzer(db);

          const compatibilityReport = await analyzer.analyzeCompatibility(
            userId,
            jobPosting.id,
          );

          // Format the report for the AI agent
          const formattedReport = {
            jobPosting: {
              title: compatibilityReport.jobPosting.title,
              company: compatibilityReport.jobPosting.company,
            },
            overallScore: compatibilityReport.overallScore,
            summary: compatibilityReport.summary,
            skillsAnalysis: {
              totalSkillRequirements: compatibilityReport.skillMatches.length,
              perfectMatches: compatibilityReport.skillMatches.filter(
                (m) => m.compatibility === "perfect",
              ).length,
              partialMatches: compatibilityReport.skillMatches.filter(
                (m) => m.compatibility === "partial",
              ).length,
              missingSkills: compatibilityReport.skillMatches.filter(
                (m) => m.compatibility === "missing",
              ).length,
              topMissingSkills: compatibilityReport.skillMatches
                .filter(
                  (m) =>
                    m.compatibility === "missing" && m.requirement.isRequired,
                )
                .slice(0, 5)
                .map((m) => m.skill.name),
              strongSkills: compatibilityReport.skillMatches
                .filter((m) => m.compatibility === "perfect" && m.score >= 90)
                .map((m) => m.skill.name),
            },
            experienceAnalysis: {
              totalExperienceRequirements:
                compatibilityReport.experienceMatches.length,
              averageScore: Math.round(
                compatibilityReport.experienceMatches.reduce(
                  (sum, m) => sum + m.score,
                  0,
                ) / Math.max(compatibilityReport.experienceMatches.length, 1),
              ),
            },
            recommendations: {
              overallFit:
                compatibilityReport.overallScore >= 80
                  ? "Excellent match - Strong candidate"
                  : compatibilityReport.overallScore >= 60
                    ? "Good match - Suitable candidate"
                    : compatibilityReport.overallScore >= 40
                      ? "Moderate fit - Some skill development needed"
                      : "Lower compatibility - Consider improving key skills",
              actionItems: [
                ...compatibilityReport.summary.improvementAreas,
                ...(compatibilityReport.summary.strongPoints.length > 0
                  ? [
                      `Emphasize your strengths: ${compatibilityReport.summary.strongPoints.slice(0, 2).join(", ")}`,
                    ]
                  : []),
              ],
            },
          };

          return JSON.stringify(formattedReport, null, 2);
        } catch (error) {
          if (
            error instanceof ResourceNotFoundError ||
            error instanceof ValidationError
          ) {
            throw error;
          }
          throw new DatabaseError("compare skills to job", error as Error);
        }
      },
      "compare_skills_to_job",
    ),
  });
}
