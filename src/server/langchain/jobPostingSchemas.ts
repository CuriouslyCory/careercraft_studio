import { z } from "zod";

// Schema for job posting details that will be extracted by the LLM
export const JobPostingDetailsSchema = z.object({
  responsibilities: z
    .array(z.string())
    .describe(
      "Array of day-to-day responsibilities and duties described in the job posting",
    ),
  qualifications: z
    .array(z.string())
    .describe(
      "Array of required qualifications, skills, education, certifications, and experience",
    ),
  bonusQualifications: z
    .array(z.string())
    .describe(
      "Array of optional, preferred, bonus, or 'nice-to-have' qualifications",
    ),
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
export type JobPostingDetails = z.infer<typeof JobPostingDetailsSchema>;
export type JobPostingData = z.infer<typeof JobPostingDataSchema>;
export type ParsedJobPosting = z.infer<typeof ParsedJobPostingSchema>;
