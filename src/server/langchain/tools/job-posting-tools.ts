import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import { JobPostingProcessor } from "~/server/services/job-posting-processor";
import {
  validateUserId,
  withErrorHandling,
  ResourceNotFoundError,
  ValidationError,
  DatabaseError,
} from "./errors";
import { TOOL_CONFIG, VALIDATION_LIMITS } from "./config";

// =============================================================================
// JOB POSTING PARSING TOOLS
// =============================================================================

/**
 * Tool to parse AND store job posting content in one action
 */
export function createParseAndStoreJobPostingTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "parse_and_store_job_posting",
    description:
      "Parse job posting content and automatically store it in the database. This combines parsing and storage into a single action for better user experience.",
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
        .describe("The raw job posting content/text to parse and store"),
    }),
    func: withErrorHandling(
      async ({ content }: { content: string }): Promise<string> => {
        console.log(`Parsing and storing job posting for user ID: ${userId}`);

        validateUserId(userId);

        try {
          // Use the centralized JobPostingProcessor service
          const processor = new JobPostingProcessor(db);
          const result = await processor.processAndStore(content, userId);

          // Return a comprehensive success message
          return `✅ Successfully parsed and stored job posting!

**Job Details:**
- **Title:** ${result.jobPosting.title}
- **Company:** ${result.jobPosting.company}
- **Location:** ${result.jobPosting.location ?? "Not specified"}
- **Industry:** ${result.jobPosting.industry ?? "Not specified"}
- **Job ID:** ${result.jobPosting.id}

**Requirements Extracted:**
- **Required Skills:** ${result.skillCounts.requiredSkills} skills identified
- **Bonus Skills:** ${result.skillCounts.bonusSkills} additional skills identified
- **Education Requirements:** ${result.skillCounts.educationRequirements} requirements
- **Experience Requirements:** ${result.skillCounts.experienceRequirements} requirements

The job posting has been saved to your profile and is ready for skill comparison analysis. You can now ask me to compare your skills against this job posting!

**Next Steps:**
[Check job posting compatibility](@navigate:/ai-chat/job-postings?action=compatibility&jobId=${result.jobPosting.id})`;
        } catch (error) {
          if (error instanceof Error) {
            throw new DatabaseError("parse and store job posting", error);
          }
          throw new DatabaseError(
            "parse and store job posting",
            new Error(String(error)),
          );
        }
      },
      "parse_and_store_job_posting",
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
