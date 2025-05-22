import { z } from "zod";

// Schema for job posting details that will be extracted by the LLM
// Note: We completely inline all structures to avoid any $ref issues with Google AI
export const JobPostingDetailsSchema = z.object({
  // Structured requirements for compatibility analysis
  requirements: z
    .object({
      // Technical skills extracted from the posting
      technicalSkills: z
        .array(z.string())
        .describe(
          "Specific technical skills, programming languages, frameworks, tools, and technologies mentioned",
        ),

      // Soft skills and general competencies
      softSkills: z
        .array(z.string())
        .describe(
          "Soft skills like communication, leadership, problem-solving, teamwork, etc.",
        ),

      // Education and certification requirements combined
      educationRequirements: z
        .array(z.string())
        .describe(
          "Education requirements including degree level, field of study, professional certifications, licenses, and credentials",
        ),

      // Experience requirements with years and context (completely inlined)
      experienceRequirements: z
        .array(
          z.object({
            years: z.number().optional().describe("Number of years required"),
            description: z
              .string()
              .describe("Description of the experience requirement"),
            category: z
              .string()
              .optional()
              .describe("Category like 'management', 'technical', 'industry'"),
          }),
        )
        .describe("Experience requirements broken down by years and type"),

      // Industry-specific requirements
      industryKnowledge: z
        .array(z.string())
        .describe(
          "Industry-specific knowledge, domain expertise, or regulatory requirements",
        ),
    })
    .describe(
      "Detailed breakdown of job requirements for compatibility analysis",
    ),

  // Bonus/preferred requirements using same structure (completely inlined to avoid $ref)
  bonusRequirements: z
    .object({
      // Technical skills extracted from the posting
      technicalSkills: z
        .array(z.string())
        .describe(
          "Specific technical skills, programming languages, frameworks, tools, and technologies mentioned",
        ),

      // Soft skills and general competencies
      softSkills: z
        .array(z.string())
        .describe(
          "Soft skills like communication, leadership, problem-solving, teamwork, etc.",
        ),

      // Education and certification requirements combined
      educationRequirements: z
        .array(z.string())
        .describe(
          "Education requirements including degree level, field of study, professional certifications, licenses, and credentials",
        ),

      // Experience requirements with years and context (completely inlined)
      experienceRequirements: z
        .array(
          z.object({
            years: z.number().optional().describe("Number of years required"),
            description: z
              .string()
              .describe("Description of the experience requirement"),
            category: z
              .string()
              .optional()
              .describe("Category like 'management', 'technical', 'industry'"),
          }),
        )
        .describe("Experience requirements broken down by years and type"),

      // Industry-specific requirements
      industryKnowledge: z
        .array(z.string())
        .describe(
          "Industry-specific knowledge, domain expertise, or regulatory requirements",
        ),
    })
    .describe("Detailed breakdown of bonus/preferred requirements"),
});

// Schema for the main job posting data
export const JobPostingDataSchema = z.object({
  title: z.string().describe("Job title or position name"),
  company: z.string().describe("Company or organization name"),
  location: z.string().describe("Job location (city, state, remote, etc.)"),
  industry: z
    .string()
    .optional()
    .describe(
      "Industry sector (e.g., Technology, Healthcare, Finance, Manufacturing, etc.)",
    ),
  details: JobPostingDetailsSchema.describe(
    "Detailed breakdown of job requirements and responsibilities",
  ),
});

// Combined schema for complete job posting parsing
export const ParsedJobPostingSchema = z.object({
  jobPosting: JobPostingDataSchema,
});

// Infer types from schemas
export type ExperienceRequirement = {
  years?: number;
  description: string;
  category?: string;
};
export type JobPostingDetails = z.infer<typeof JobPostingDetailsSchema>;
export type JobPostingData = z.infer<typeof JobPostingDataSchema>;
export type ParsedJobPosting = z.infer<typeof ParsedJobPostingSchema>;

// Legacy type for backward compatibility
export type JobRequirements = JobPostingDetails["requirements"];
