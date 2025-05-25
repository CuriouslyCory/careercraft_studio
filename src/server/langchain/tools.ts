import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { db } from "~/server/db";
import { createLLM } from "./agent";
import { HumanMessage, type BaseMessage } from "@langchain/core/messages";

// Import from new modular structure
import { getUserProfileTool as getUserProfileToolFromModule } from "./tools/user-profile-tools";
import {
  createGetWorkAchievementsTool as createGetWorkAchievementsToolFromModule,
  createReplaceWorkAchievementsTool as createReplaceWorkAchievementsToolFromModule,
  createMergeAndReplaceWorkAchievementsTool as createMergeAndReplaceWorkAchievementsToolFromModule,
  createAddWorkAchievementTool as createAddWorkAchievementToolFromModule,
  createUpdateWorkAchievementTool as createUpdateWorkAchievementToolFromModule,
  createDeleteWorkAchievementTool as createDeleteWorkAchievementToolFromModule,
} from "./tools/work-achievement-tools";
import {
  createFindJobPostingsTool as createFindJobPostingsToolFromModule,
  createSkillComparisonTool as createSkillComparisonToolFromModule,
  createParseAndStoreJobPostingTool as createParseAndStoreJobPostingToolFromModule,
} from "./tools/job-posting-tools";

// =============================================================================
// USER PROFILE TOOLS
// =============================================================================

/**
 * Creates a user-specific tool for retrieving profile data
 * Re-exported from the modular user-profile-tools module
 */
export function getUserProfileTool(userId: string): DynamicStructuredTool {
  return getUserProfileToolFromModule(userId);
}

// =============================================================================
// WORK ACHIEVEMENT MANAGEMENT TOOLS
// =============================================================================

/**
 * Tool to get achievements for a specific work history record
 * Re-exported from the modular work-achievement-tools module
 */
export function createGetWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return createGetWorkAchievementsToolFromModule(userId);
}

/**
 * Tool to replace all achievements for a work history record with merged ones
 * Re-exported from the modular work-achievement-tools module
 */
export function createReplaceWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return createReplaceWorkAchievementsToolFromModule(userId);
}

/**
 * Tool to merge and replace work achievements using LLM
 * Re-exported from the modular work-achievement-tools module
 */
export function createMergeAndReplaceWorkAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return createMergeAndReplaceWorkAchievementsToolFromModule(userId);
}

/**
 * Tool to add a single achievement to a work history record
 * Re-exported from the modular work-achievement-tools module
 */
export function createAddWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return createAddWorkAchievementToolFromModule(userId);
}

/**
 * Tool to update a specific achievement
 * Re-exported from the modular work-achievement-tools module
 */
export function createUpdateWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return createUpdateWorkAchievementToolFromModule(userId);
}

/**
 * Tool to delete a specific achievement
 * Re-exported from the modular work-achievement-tools module
 */
export function createDeleteWorkAchievementTool(
  userId: string,
): DynamicStructuredTool {
  return createDeleteWorkAchievementToolFromModule(userId);
}

// =============================================================================
// JOB POSTING TOOLS
// =============================================================================

/**
 * Tool to find job postings by various criteria
 * Re-exported from the modular job-posting-tools module
 */
export function createFindJobPostingsTool(
  userId: string,
): DynamicStructuredTool {
  return createFindJobPostingsToolFromModule(userId);
}

/**
 * Tool to compare user skills against job posting requirements
 * Re-exported from the modular job-posting-tools module
 */
export function createSkillComparisonTool(
  userId: string,
): DynamicStructuredTool {
  return createSkillComparisonToolFromModule(userId);
}

/**
 * Tool to parse and store job posting content in one action
 * Re-exported from the modular job-posting-tools module
 */
export function createParseAndStoreJobPostingTool(
  userId: string,
): DynamicStructuredTool {
  return createParseAndStoreJobPostingToolFromModule(userId);
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
// RESUME DATA GENERATION TOOLS
// =============================================================================

/**
 * Tool to generate comprehensive resume data in markdown format for LLM consumption
 */
export function createGenerateResumeDataTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "generate_resume_data",
    description:
      "Generate a comprehensive markdown-formatted document containing all user information (work history, education, skills, achievements) optimized for resume building LLM consumption",
    schema: z.object({
      sections: z
        .array(
          z.enum([
            "work_history",
            "education",
            "skills",
            "achievements",
            "details",
            "links",
            "all",
          ]),
        )
        .default(["all"])
        .describe(
          "Specific sections to include. Use 'all' for complete user data, or specify individual sections like 'work_history', 'education', 'skills', 'achievements', 'details', 'links'",
        ),
    }),
    func: async ({
      sections,
    }: {
      sections: Array<
        | "work_history"
        | "education"
        | "skills"
        | "achievements"
        | "details"
        | "links"
        | "all"
      >;
    }) => {
      console.log(
        `Generating resume data for user ID: ${userId}, sections: ${sections.join(", ")}`,
      );

      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

        const { generateUserResumeData, generateUserResumeDataSections } =
          await import("~/server/services/resume-data-generator");

        // If "all" is requested or sections array includes "all", generate complete data
        if (sections.includes("all")) {
          const resumeData = await generateUserResumeData(db, userId);
          return resumeData;
        } else {
          // Generate only specific sections
          const filteredSections = sections.filter(
            (
              section,
            ): section is
              | "work_history"
              | "education"
              | "skills"
              | "achievements"
              | "details"
              | "links" => section !== "all",
          );

          if (filteredSections.length === 0) {
            return "No valid sections specified. Please choose from: work_history, education, skills, achievements, details, links, or all.";
          }

          const resumeData = await generateUserResumeDataSections(
            db,
            userId,
            filteredSections,
          );
          return resumeData;
        }
      } catch (error) {
        console.error("Error generating resume data:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error generating resume data: ${errorMessage}`;
      }
    },
  });
}

// =============================================================================
// RESUME PARSING TOOLS
// =============================================================================

/**
 * Tool to parse resume text and store structured data
 */
export function createResumeParsingTool(userId: string): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "parse_and_store_resume",
    description:
      "Parse resume text using AI to extract structured information and store it in the user's profile. This processes work experience, education, skills, achievements, and personal links.",
    schema: z.object({
      resumeText: z
        .string()
        .min(50, "Resume text must be at least 50 characters")
        .describe("The complete resume text to parse and process"),
      title: z
        .string()
        .optional()
        .describe(
          "Optional title for the document (defaults to 'Parsed Resume')",
        ),
    }),
    func: async ({
      resumeText,
      title = "Parsed Resume",
    }: {
      resumeText: string;
      title?: string;
    }) => {
      try {
        if (!userId) {
          return "User ID is required but not provided. Please ensure you're logged in.";
        }

        // Use the centralized resume parsing service
        const { parseResumeFromText } = await import(
          "~/server/services/resume-parser"
        );
        return await parseResumeFromText(resumeText, userId, db, title);
      } catch (error) {
        console.error("Error in resume parsing tool:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error parsing resume: ${errorMessage}`;
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
    next: z.enum(["__end__", ...MEMBERS]),
  }),
  func: async ({ next }) => {
    // This tool's function isn't strictly called by LangGraph in this setup,
    // as the supervisor's output is the tool call itself, which LangGraph uses for routing.
    // However, having a func can be useful for direct invocation or testing.
    return `Routing to: ${next}`;
  },
});

// =============================================================================
// CLARIFICATION TOOLS
// =============================================================================

/**
 * Tool for supervisor to request clarification from user
 */
export const requestClarificationTool = new DynamicStructuredTool({
  name: "request_clarification",
  description:
    "Request clarification from the user when their intent is ambiguous",
  schema: z.object({
    question: z
      .string()
      .min(1)
      .describe("The clarification question to ask the user"),
    options: z
      .array(
        z.object({
          id: z.string().describe("Unique identifier for this option"),
          label: z.string().describe("Short label for the option"),
          description: z
            .string()
            .describe("Detailed description of what this option does"),
          action: z.object({
            agentType: z
              .string()
              .describe("Which agent would handle this action"),
            toolName: z.string().describe("Which tool would be called"),
            args: z.record(z.unknown()).describe("Arguments for the tool call"),
          }),
        }),
      )
      .min(2)
      .describe("Available options for the user to choose from"),
    context: z
      .record(z.unknown())
      .optional()
      .describe("Additional context about the request"),
  }),
  func: async ({ question, options, context }) => {
    // Create a clarification ID
    const clarificationId = `clarification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Format the clarification response
    let response = `${question}\n\nPlease choose one of the following options:\n\n`;

    options.forEach((option, index) => {
      response += `**${index + 1}. ${option.label}**\n`;
      response += `   ${option.description}\n\n`;
    });

    response += `Please respond with the number of your choice (1-${options.length}).`;

    // Store clarification in context (this would be handled by the state management)
    const clarificationData = {
      id: clarificationId,
      question,
      options,
      context: context ?? {},
      timestamp: Date.now(),
    };

    return JSON.stringify({
      type: "clarification_request",
      data: clarificationData,
      response,
    });
  },
});

/**
 * Tool for handling clarification responses
 */
export const respondToClarificationTool = new DynamicStructuredTool({
  name: "respond_to_clarification",
  description: "Process user's response to a clarification request",
  schema: z.object({
    clarificationId: z
      .string()
      .min(1)
      .describe("ID of the clarification being responded to"),
    selectedOptionId: z.string().min(1).describe("ID of the selected option"),
  }),
  func: async ({ clarificationId, selectedOptionId }) => {
    // This would typically retrieve the clarification from state and execute the selected action
    return `Processing clarification response: ${clarificationId} -> ${selectedOptionId}`;
  },
});

// =============================================================================
// KEY ACHIEVEMENTS DEDUPLICATION TOOL
// =============================================================================

/**
 * Creates a tool for deduplicating and merging similar key achievements using AI
 */
function createDeduplicateKeyAchievementsTool(
  userId: string,
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "deduplicate_and_merge_key_achievements",
    description:
      "Remove exact duplicate key achievements and intelligently merge similar ones using AI while preserving all important details. This helps clean up your achievements list by combining related accomplishments without losing any information.",
    schema: z.object({
      dryRun: z
        .boolean()
        .default(false)
        .describe(
          "If true, shows a preview of changes without actually applying them",
        ),
    }),
    func: async ({ dryRun = false }: { dryRun?: boolean }): Promise<string> => {
      try {
        console.log(
          `Deduplicating key achievements for user ${userId}, dryRun: ${dryRun}`,
        );

        // Use the centralized service function
        const { deduplicateAndMergeKeyAchievements } = await import(
          "~/server/api/routers/document/key-achievements"
        );

        const result = await deduplicateAndMergeKeyAchievements(
          db,
          userId,
          dryRun,
        );

        // Format the response for the agent
        let response = `## Key Achievements Deduplication ${dryRun ? "(Preview)" : "Complete"}\n\n`;
        response += `${result.message}\n\n`;
        response += `**Summary:**\n`;
        response += `- Original count: ${result.originalCount}\n`;
        response += `- Final count: ${result.finalCount}\n`;
        response += `- Exact duplicates removed: ${result.exactDuplicatesRemoved}\n`;
        response += `- Similar groups merged: ${result.similarGroupsMerged}\n\n`;

        if (result.preview && result.preview.length > 0) {
          response += `**${dryRun ? "Preview of" : "Final"} Achievements:**\n\n`;
          result.preview.forEach(
            (item: { content: string; action: string }, index: number) => {
              response += `${index + 1}. ${item.content}\n`;
            },
          );
        }

        if (dryRun && result.originalCount > result.finalCount) {
          response += `\n*To apply these changes, ask me to "deduplicate my achievements" without the preview.*`;
        }

        return response;
      } catch (error) {
        console.error(
          "Error in deduplicate_and_merge_key_achievements:",
          error,
        );
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return `Error deduplicating achievements: ${errorMessage}. Please try again or contact support if the issue persists.`;
      }
    },
  });
}

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
    getUserProfileTool(userId),
    createResumeParsingTool(userId),
    // Work achievement management tools
    createGetWorkAchievementsTool(userId),
    createReplaceWorkAchievementsTool(userId),
    createMergeAndReplaceWorkAchievementsTool(userId),
    createAddWorkAchievementTool(userId),
    createUpdateWorkAchievementTool(userId),
    createDeleteWorkAchievementTool(userId),
    // Include the standalone merge tool for manual merging
    mergeWorkAchievementsTool,
    // Key achievements deduplication tool
    createDeduplicateKeyAchievementsTool(userId),
  ];
}

/**
 * Get all resume generation tools for the resume generator agent
 */
export function getResumeGeneratorTools(
  userId: string,
): DynamicStructuredTool[] {
  return [
    generateResumeTool,
    getUserProfileTool(userId),
    createGenerateResumeDataTool(userId),
  ];
}

/**
 * Get all cover letter generation tools for the cover letter generator agent
 */
export function getCoverLetterGeneratorTools(
  userId: string,
): DynamicStructuredTool[] {
  return [generateCoverLetterTool, getUserProfileTool(userId)];
}

/**
 * Get all user profile tools for the user profile agent
 */
export function getUserProfileTools(userId: string): DynamicStructuredTool[] {
  return [getUserProfileTool(userId), createGenerateResumeDataTool(userId)];
}

/**
 * Get job posting tools for the job posting manager agent
 */
export function getJobPostingTools(userId: string): DynamicStructuredTool[] {
  return [
    createParseAndStoreJobPostingTool(userId),
    createFindJobPostingsTool(userId),
    createSkillComparisonTool(userId),
    getUserProfileTool(userId),
  ];
}

/**
 * Get supervisor routing tools
 */
export function getSupervisorTools(): DynamicStructuredTool[] {
  return [
    supervisorRoutingTool,
    requestClarificationTool,
    respondToClarificationTool,
  ];
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
    tools.push(getUserProfileTool(userId));
    tools.push(createGenerateResumeDataTool(userId));
  }

  return tools;
}
