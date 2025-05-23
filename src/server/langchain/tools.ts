import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import { createLLM } from "./agent";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { parseJobPosting } from "./jobPostingParser";
import { type ParsedJobPosting } from "./jobPostingSchemas";

// =============================================================================
// USER PROFILE TOOLS
// =============================================================================

/**
 * Creates a user-specific tool for retrieving profile data
 * Uses the full implementation from agentTeam.ts (more functional than agent.ts stub)
 */
export function createUserProfileTool(userId: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "get_user_profile",
    description:
      "Retrieve details from the user's stored profile including work history, education, skills, achievements, and preferences",
    schema: z.object({
      dataType: z.enum([
        "work_history",
        "education",
        "skills",
        "achievements",
        "preferences",
        "all",
      ]),
    }),
    func: async ({ dataType }) => {
      console.log(
        `Retrieving user profile data: ${dataType} for user ID: ${userId}`,
      );

      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

        // Format the data based on the requested data type
        switch (dataType) {
          case "work_history":
            const workHistory = await db.workHistory.findMany({
              where: { userId },
              include: {
                achievements: true,
                skills: true,
              },
              orderBy: { startDate: "desc" },
            });

            if (workHistory.length === 0) {
              return "No work history found for this user.";
            }

            return JSON.stringify(
              workHistory.map((job) => ({
                id: job.id,
                companyName: job.companyName,
                jobTitle: job.jobTitle,
                startDate: job.startDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
                endDate: job.endDate
                  ? job.endDate.toISOString().split("T")[0]
                  : "Present",
                achievements: job.achievements.map((a) => a.description),
                skills: job.skills.map((s) => s.name),
              })),
            );

          case "education":
            const education = await db.education.findMany({
              where: { userId },
              orderBy: { dateCompleted: "desc" },
            });

            if (education.length === 0) {
              return "No education history found for this user.";
            }

            return JSON.stringify(
              education.map((edu) => ({
                id: edu.id,
                type: edu.type,
                institutionName: edu.institutionName,
                degreeOrCertName: edu.degreeOrCertName,
                description: edu.description,
                dateCompleted: edu.dateCompleted
                  ? edu.dateCompleted.toISOString().split("T")[0]
                  : null,
              })),
            );

          case "skills":
            // For skills, we need to get them from work history
            const workHistoryForSkills = await db.workHistory.findMany({
              where: { userId },
              include: { skills: true },
            });

            if (workHistoryForSkills.length === 0) {
              return "No skills found for this user.";
            }

            // Collect all unique skills
            const skillSet = new Set<string>();
            workHistoryForSkills.forEach((job) => {
              job.skills.forEach((skill) => {
                skillSet.add(skill.name);
              });
            });

            return JSON.stringify(Array.from(skillSet));

          case "achievements":
            // Get both work achievements and key achievements
            const workAchievements = await db.workHistory.findMany({
              where: { userId },
              include: { achievements: true },
            });

            const keyAchievements = await db.keyAchievement.findMany({
              where: { userId },
            });

            if (workAchievements.length === 0 && keyAchievements.length === 0) {
              return "No achievements found for this user.";
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
            const formattedKeyAchievements = keyAchievements.map(
              (achievement) => ({
                id: achievement.id,
                description: achievement.content,
                context: "General achievement",
              }),
            );

            return JSON.stringify([
              ...formattedWorkAchievements,
              ...formattedKeyAchievements,
            ]);

          case "preferences":
            const userDetails = await db.userDetail.findMany({
              where: { userId },
            });

            if (userDetails.length === 0) {
              return "No user preferences or details found.";
            }

            return JSON.stringify(
              userDetails.map((detail) => ({
                id: detail.id,
                category: detail.category,
                content: detail.content,
              })),
            );

          case "all":
            // Fetch all data types and combine them
            const allWorkHistory = await db.workHistory.findMany({
              where: { userId },
              include: {
                achievements: true,
                skills: true,
              },
              orderBy: { startDate: "desc" },
            });

            const allEducation = await db.education.findMany({
              where: { userId },
              orderBy: { dateCompleted: "desc" },
            });

            const allKeyAchievements = await db.keyAchievement.findMany({
              where: { userId },
            });

            const allUserDetails = await db.userDetail.findMany({
              where: { userId },
            });

            // Collect all skills for the complete profile
            const allSkills = new Set<string>();
            allWorkHistory.forEach((job) => {
              job.skills.forEach((skill) => {
                allSkills.add(skill.name);
              });
            });

            return JSON.stringify({
              work_history: allWorkHistory.map((job) => ({
                id: job.id,
                companyName: job.companyName,
                jobTitle: job.jobTitle,
                startDate: job.startDate.toISOString().split("T")[0],
                endDate: job.endDate
                  ? job.endDate.toISOString().split("T")[0]
                  : "Present",
                achievements: job.achievements.map((a) => a.description),
                skills: job.skills.map((s) => s.name),
              })),
              education: allEducation.map((edu) => ({
                id: edu.id,
                type: edu.type,
                institutionName: edu.institutionName,
                degreeOrCertName: edu.degreeOrCertName,
                description: edu.description,
                dateCompleted: edu.dateCompleted
                  ? edu.dateCompleted.toISOString().split("T")[0]
                  : null,
              })),
              skills: Array.from(allSkills),
              key_achievements: allKeyAchievements.map((achievement) => ({
                id: achievement.id,
                description: achievement.content,
              })),
              user_details: allUserDetails.map((detail) => ({
                id: detail.id,
                category: detail.category,
                content: detail.content,
              })),
            });

          default:
            return "Invalid data type requested. Use 'work_history', 'education', 'skills', 'achievements', 'preferences', or 'all'.";
        }
      } catch (error) {
        console.error("Error retrieving user profile data:", error);
        return `Error retrieving profile data: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

// =============================================================================
// DATA STORAGE TOOLS
// =============================================================================

/**
 * Tool to store user preferences
 */
export const storeUserPreferenceTool = new DynamicStructuredTool({
  name: "store_user_preference",
  description:
    "Stores a user preference such as grammar style, phrases, or resume style choices",
  schema: z.object({
    category: z.enum(["grammar", "phrases", "resume_style", "other"]),
    preference: z.string().describe("The preference to store"),
    details: z
      .string()
      .optional()
      .describe("Additional details about the preference"),
  }),
  func: async ({ category, preference, details }) => {
    console.log(`Storing user preference: ${category} - ${preference}`);
    // TODO: Store in database (stub for now)
    return `Successfully stored user preference for ${category}: ${preference}`;
  },
});

/**
 * Tool to store work history
 */
export const storeWorkHistoryTool = new DynamicStructuredTool({
  name: "store_work_history",
  description: "Stores information about a user's work history",
  schema: z.object({
    companyName: z.string(),
    jobTitle: z.string(),
    startDate: z.string().describe("Start date in YYYY-MM-DD format"),
    endDate: z
      .string()
      .optional()
      .describe(
        "End date in YYYY-MM-DD format, or 'present' for current positions",
      ),
    achievements: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  }),
  func: async ({
    companyName,
    jobTitle,
    startDate,
    endDate,
    achievements,
    skills,
  }) => {
    console.log(`Storing work history: ${jobTitle} at ${companyName}`);
    // TODO: Store in database (stub for now)
    return `Successfully stored work history: ${jobTitle} at ${companyName}`;
  },
});

// =============================================================================
// GENERATION TOOLS
// =============================================================================

/**
 * Tool to generate a resume
 */
export const generateResumeTool = new DynamicStructuredTool({
  name: "generate_resume",
  description: "Generate a formatted resume based on the user's information",
  schema: z.object({
    format: z.enum(["PDF", "Word", "Text"]),
    style: z.enum(["Modern", "Traditional", "Creative", "Minimal"]),
    sections: z.array(z.string()).describe("Sections to include in the resume"),
  }),
  func: async ({ format, style, sections }) => {
    console.log(`Generating resume in ${format} format with ${style} style`);
    // TODO: Implement resume generation (stub for now)
    return `Resume generation initiated in ${format} format with ${style} style. Sections: ${sections.join(", ")}`;
  },
});

/**
 * Tool to generate a cover letter
 */
export const generateCoverLetterTool = new DynamicStructuredTool({
  name: "generate_cover_letter",
  description:
    "Generate a cover letter based on user information and job description",
  schema: z.object({
    jobTitle: z.string(),
    company: z.string(),
    style: z.enum(["Formal", "Conversational", "Enthusiastic", "Professional"]),
    keyPoints: z.array(z.string()).optional(),
  }),
  func: async ({ jobTitle, company, style, keyPoints }) => {
    console.log(
      `Generating ${style} cover letter for ${jobTitle} at ${company}`,
    );
    // TODO: Implement cover letter generation (stub for now)
    return `Cover letter generation initiated for ${jobTitle} at ${company} in ${style} style`;
  },
});

// =============================================================================
// UTILITY TOOLS
// =============================================================================

/**
 * Tool to merge achievement lists using an LLM
 * From agent.ts - fully functional implementation
 */
export const mergeWorkAchievementsTool = new DynamicStructuredTool({
  name: "merge_work_achievements",
  description:
    "Merges two lists of work achievements (strings) into a single, concise list. Use this to combine achievements from different sources for the same job.",
  schema: z.object({
    existingAchievements: z
      .array(z.string())
      .describe("List of existing achievement strings."),
    newAchievements: z
      .array(z.string())
      .describe("List of new achievement strings to merge."),
  }),
  func: async ({
    existingAchievements,
    newAchievements,
  }: {
    existingAchievements: string[];
    newAchievements: string[];
  }) => {
    console.log(
      `Merging achievements: Existing count=${existingAchievements.length}, New count=${newAchievements.length}`,
    );

    // Combine the lists and remove duplicates
    const combinedAchievements = [
      ...existingAchievements,
      ...newAchievements,
    ].filter((item, index, self) => self.indexOf(item) === index);

    if (combinedAchievements.length === 0) {
      return JSON.stringify([]); // Return empty array if no achievements
    }

    // Use a lightweight LLM call to refine and merge the list further,
    // ensuring clarity and conciseness.
    try {
      // Create a specific LLM for this task
      const mergeLLM = createLLM();

      const prompt = `You are a text merging assistant. Your task is to review the following list of achievement statements and combine any redundant or very similar items into a single, concise statement. Ensure all unique achievements are retained and clearly stated. Return ONLY the merged list of achievement statements as a JSON array of strings.

Statements to merge:
${JSON.stringify(combinedAchievements)}

Merged list:`;

      const messages: BaseMessage[] = [new HumanMessage(prompt)];

      const response = await mergeLLM.invoke(messages);

      let mergedContent = "";
      if (response && typeof response.content === "string") {
        mergedContent = response.content;
      } else if (
        response &&
        typeof response.content === "object" &&
        response.content !== null
      ) {
        // Handle potential complex content if necessary, though expecting string/JSON
        mergedContent = JSON.stringify(response.content);
      } else {
        console.warn("Merge LLM returned empty or unexpected content.");
        // Fallback to returning the combined achievements without further LLM processing
        return JSON.stringify(combinedAchievements);
      }

      console.log("Raw merge LLM response:", mergedContent);

      // Clean up the response by removing markdown code blocks if present
      let cleanedContent = mergedContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, "");
      }
      if (cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.replace(/```$/, "");
      }

      // Attempt to parse the JSON output from the LLM
      try {
        const finalMergedAchievements = JSON.parse(cleanedContent) as string[];
        console.log(
          "Successfully parsed merged achievements:",
          finalMergedAchievements,
        );
        return JSON.stringify(finalMergedAchievements);
      } catch (parseError) {
        console.error("Failed to parse LLM JSON output:", parseError);
        console.log("Cleaned content that failed to parse:", cleanedContent);
        // Fallback to returning the combined achievements if LLM output is not valid JSON
        return JSON.stringify(combinedAchievements);
      }
    } catch (llmError) {
      console.error("Error during LLM achievement merging:", llmError);
      // Fallback to returning the combined achievements on LLM error
      return JSON.stringify(combinedAchievements);
    }
  },
});

// =============================================================================
// JOB POSTING TOOLS
// =============================================================================

/**
 * Tool to parse job posting content and extract structured data
 */
export const parseJobPostingTool = new DynamicStructuredTool({
  name: "parse_job_posting",
  description:
    "Parse a job posting text and extract structured information including title, company, location, industry, responsibilities, qualifications, and bonus qualifications",
  schema: z.object({
    content: z.string().describe("The raw job posting content/text to parse"),
  }),
  func: async ({ content }) => {
    console.log("Parsing job posting content using LLM...");

    try {
      const parsedData = await parseJobPosting(content);
      console.log("Successfully parsed job posting data");
      return JSON.stringify(parsedData);
    } catch (error) {
      console.error("Error parsing job posting:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error parsing job posting: ${errorMessage}`;
    }
  },
});

/**
 * Tool to store parsed job posting data in the database
 * TODO: This requires Prisma client regeneration after schema changes
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
        .describe("JSON string of the parsed job posting data"),
    }),
    func: async ({ parsedJobPosting }: { parsedJobPosting: string }) => {
      console.log(`Storing job posting data for user ID: ${userId}`);

      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

        // Parse the JSON string with proper type checking
        let jobData: ParsedJobPosting;
        try {
          jobData = JSON.parse(parsedJobPosting) as ParsedJobPosting;
        } catch (parseError) {
          return "Error: Invalid JSON format for job posting data";
        }

        const { jobPosting } = jobData;

        // Create the job posting record
        const createdJobPosting = await db.jobPosting.create({
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
        await db.jobPostingDetails.create({
          data: {
            // Required structured requirements
            technicalSkills: jobPosting.details.requirements.technicalSkills,
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
            bonusSoftSkills: jobPosting.details.bonusRequirements.softSkills,
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

        // Create JobSkillRequirement records for required skills
        for (const skillName of allRequiredSkills) {
          if (skillName.trim()) {
            // Find or create the skill
            let skill = await db.skill.findFirst({
              where: {
                OR: [
                  { name: { equals: skillName, mode: "insensitive" } },
                  {
                    aliases: {
                      some: {
                        alias: { equals: skillName, mode: "insensitive" },
                      },
                    },
                  },
                ],
              },
            });

            if (!skill) {
              // Create new skill with appropriate category
              const category =
                jobPosting.details.requirements.technicalSkills.includes(
                  skillName,
                )
                  ? "PROGRAMMING_LANGUAGE" // Default for technical skills
                  : "SOFT_SKILLS"; // Default for soft skills

              skill = await db.skill.create({
                data: {
                  name: skillName,
                  category,
                },
              });
            }

            // Create the skill requirement
            try {
              await db.jobSkillRequirement.create({
                data: {
                  skillId: skill.id,
                  jobPostingId: createdJobPosting.id,
                  isRequired: true,
                  priority: 1, // High priority for required skills
                },
              });
            } catch (error) {
              // Skip if already exists (duplicate)
              console.log(`Skill requirement already exists for ${skillName}`);
            }
          }
        }

        // Create JobSkillRequirement records for bonus skills
        for (const skillName of allBonusSkills) {
          if (skillName.trim()) {
            // Find or create the skill
            let skill = await db.skill.findFirst({
              where: {
                OR: [
                  { name: { equals: skillName, mode: "insensitive" } },
                  {
                    aliases: {
                      some: {
                        alias: { equals: skillName, mode: "insensitive" },
                      },
                    },
                  },
                ],
              },
            });

            if (!skill) {
              // Create new skill with appropriate category
              const category =
                jobPosting.details.bonusRequirements.technicalSkills.includes(
                  skillName,
                )
                  ? "PROGRAMMING_LANGUAGE" // Default for technical skills
                  : "SOFT_SKILLS"; // Default for soft skills

              skill = await db.skill.create({
                data: {
                  name: skillName,
                  category,
                },
              });
            }

            // Create the skill requirement
            try {
              await db.jobSkillRequirement.create({
                data: {
                  skillId: skill.id,
                  jobPostingId: createdJobPosting.id,
                  isRequired: false,
                  priority: 2, // Medium priority for bonus skills
                },
              });
            } catch (error) {
              // Skip if already exists (duplicate)
              console.log(`Skill requirement already exists for ${skillName}`);
            }
          }
        }

        console.log("Successfully stored job posting and details");
        return `Successfully stored job posting: "${jobPosting.title}" at ${jobPosting.company}`;
      } catch (error) {
        console.error("Error processing job posting:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error processing job posting: ${errorMessage}`;
      }
    },
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
        .default(10)
        .describe("Maximum number of results to return"),
    }),
    func: async ({
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
    }) => {
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

      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

        // Build where clause based on provided criteria
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const whereClause: Record<string, unknown> = { userId };

        if (title) {
          whereClause.title = { contains: title, mode: "insensitive" } as const;
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
          return "No job postings found matching the specified criteria.";
        }

        return JSON.stringify(
          jobPostings.map((job) => ({
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
          })),
        );
      } catch (error) {
        console.error("Error finding job postings:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error finding job postings: ${errorMessage}`;
      }
    },
  });
}

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
    func: async ({
      jobPostingId,
      jobTitle,
      company,
    }: {
      jobPostingId?: string;
      jobTitle?: string;
      company?: string;
    }) => {
      console.log(`Comparing skills for user ID: ${userId} against job:`, {
        jobPostingId,
        jobTitle,
        company,
      });

      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

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
          return "Please provide either a job posting ID, job title, or company name to identify the job posting.";
        }

        if (!jobPosting) {
          return "No job posting found matching the specified criteria.";
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
        console.error("Error comparing skills to job:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error comparing skills to job: ${errorMessage}`;
      }
    },
  });
}

// =============================================================================
// ROUTING TOOLS
// =============================================================================

// Define available agent members for routing
const MEMBERS = [
  "data_manager",
  "resume_generator",
  "cover_letter_generator",
  "user_profile",
  "job_posting_manager",
] as const;

/**
 * Tool for supervisor to route between agents
 */
export const supervisorRoutingTool = new DynamicStructuredTool({
  name: "route_to_agent",
  description: "Select the next agent to act or end the conversation.",
  schema: z.object({
    next: z.enum([END, ...MEMBERS]),
  }),
  func: async ({ next }) => {
    // This tool's function isn't strictly called by LangGraph in this setup,
    // as the supervisor's output is the tool call itself, which LangGraph uses for routing.
    // However, having a func can be useful for direct invocation or testing.
    return `Routing to: ${next}`;
  },
});

// =============================================================================
// TOOL COLLECTIONS
// =============================================================================

/**
 * Get all data management tools for the data manager agent
 */
export function getDataManagerTools(userId: string): DynamicStructuredTool[] {
  return [
    storeUserPreferenceTool,
    storeWorkHistoryTool,
    createUserProfileTool(userId),
  ];
}

/**
 * Get all resume generation tools for the resume generator agent
 */
export function getResumeGeneratorTools(
  userId: string,
): DynamicStructuredTool[] {
  return [generateResumeTool, createUserProfileTool(userId)];
}

/**
 * Get all cover letter generation tools for the cover letter generator agent
 */
export function getCoverLetterGeneratorTools(
  userId: string,
): DynamicStructuredTool[] {
  return [generateCoverLetterTool, createUserProfileTool(userId)];
}

/**
 * Get all user profile tools for the user profile agent
 */
export function getUserProfileTools(userId: string): DynamicStructuredTool[] {
  return [createUserProfileTool(userId)];
}

/**
 * Get job posting tools for the job posting manager agent
 */
export function getJobPostingTools(userId: string): DynamicStructuredTool[] {
  return [
    parseJobPostingTool,
    createStoreJobPostingTool(userId),
    createFindJobPostingsTool(userId),
    createSkillComparisonTool(userId),
    createUserProfileTool(userId),
  ];
}

/**
 * Get supervisor routing tools
 */
export function getSupervisorTools(): DynamicStructuredTool[] {
  return [supervisorRoutingTool];
}

/**
 * Get all available tools (for compatibility with existing code)
 */
export function getAllTools(userId?: string): DynamicStructuredTool[] {
  const tools: DynamicStructuredTool[] = [
    storeUserPreferenceTool,
    storeWorkHistoryTool,
    generateResumeTool,
    generateCoverLetterTool,
    mergeWorkAchievementsTool,
    supervisorRoutingTool,
  ];

  if (userId) {
    tools.push(createUserProfileTool(userId));
  }

  return tools;
}
