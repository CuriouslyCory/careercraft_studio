import { z } from "zod";

/**
 * Zod schemas for database models and input validation
 * for the tailored resume generator service
 */

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * UUID validation schema
 */
export const UuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Non-empty string schema
 */
export const NonEmptyStringSchema = z.string().min(1, "Cannot be empty");

/**
 * Optional non-empty string schema
 */
export const OptionalNonEmptyStringSchema = z
  .string()
  .min(1, "Cannot be empty")
  .optional();

/**
 * Date schema that accepts Date objects or ISO strings
 */
export const DateSchema = z
  .union([z.date(), z.string().datetime("Invalid date format")])
  .transform((val) => (typeof val === "string" ? new Date(val) : val));

/**
 * Optional date schema
 */
export const OptionalDateSchema = z
  .union([z.date(), z.string().datetime("Invalid date format"), z.null()])
  .transform((val) => {
    if (val === null) return null;
    return typeof val === "string" ? new Date(val) : val;
  })
  .optional();

// ============================================================================
// Job Posting Schemas
// ============================================================================

/**
 * Structured experience requirement schema
 */
export const StructuredExperienceRequirementSchema = z.object({
  years: z.number().min(0).max(50).optional(),
  description: NonEmptyStringSchema,
  category: NonEmptyStringSchema,
});

/**
 * Job posting details schema
 */
export const JobPostingDetailsSchema = z.object({
  technicalSkills: z.array(NonEmptyStringSchema).default([]),
  softSkills: z.array(NonEmptyStringSchema).default([]),
  educationRequirements: z.array(NonEmptyStringSchema).default([]),
  experienceRequirements: z
    .array(StructuredExperienceRequirementSchema)
    .default([]),
  industryKnowledge: z.array(NonEmptyStringSchema).default([]),
  bonusTechnicalSkills: z.array(NonEmptyStringSchema).default([]),
  bonusSoftSkills: z.array(NonEmptyStringSchema).default([]),
  bonusEducationRequirements: z.array(NonEmptyStringSchema).default([]),
  bonusExperienceRequirements: z
    .array(StructuredExperienceRequirementSchema)
    .default([]),
  bonusIndustryKnowledge: z.array(NonEmptyStringSchema).default([]),
});

/**
 * Skill schema
 */
export const SkillSchema = z.object({
  id: UuidSchema,
  name: NonEmptyStringSchema,
  category: NonEmptyStringSchema,
  description: OptionalNonEmptyStringSchema,
});

/**
 * Job skill requirement schema
 */
export const JobSkillRequirementSchema = z.object({
  id: UuidSchema,
  isRequired: z.boolean(),
  minimumLevel: OptionalNonEmptyStringSchema,
  yearsRequired: z.number().min(0).max(50).nullable().optional(),
  priority: z.number().min(1).max(10),
  skill: SkillSchema,
});

/**
 * Job experience requirement schema
 */
export const JobExperienceRequirementSchema = z.object({
  id: UuidSchema,
  years: z.number().min(0).max(50).nullable().optional(),
  description: NonEmptyStringSchema,
  category: NonEmptyStringSchema,
  isRequired: z.boolean(),
});

/**
 * Job education requirement schema
 */
export const JobEducationRequirementSchema = z.object({
  id: UuidSchema,
  level: NonEmptyStringSchema,
  field: OptionalNonEmptyStringSchema,
  description: OptionalNonEmptyStringSchema,
  isRequired: z.boolean(),
});

/**
 * Complete job posting data schema
 * Note: Use JobPostingData interface from job-posting.types.ts for type definitions
 */
export const JobPostingDataSchema = z.object({
  id: UuidSchema,
  title: NonEmptyStringSchema,
  company: NonEmptyStringSchema,
  location: NonEmptyStringSchema,
  industry: OptionalNonEmptyStringSchema,
  content: z
    .string()
    .min(10, "Job content must be at least 10 characters")
    .max(50000, "Job content cannot exceed 50,000 characters"),
  details: JobPostingDetailsSchema.nullable().optional(),
  skillRequirements: z.array(JobSkillRequirementSchema).default([]),
  experienceRequirements: z.array(JobExperienceRequirementSchema).default([]),
  educationRequirements: z.array(JobEducationRequirementSchema).default([]),
});

// ============================================================================
// Work Experience Schemas
// ============================================================================

/**
 * Work experience skill schema
 */
export const WorkExperienceSkillSchema = z.object({
  skill: z.object({
    name: NonEmptyStringSchema,
    category: NonEmptyStringSchema,
  }),
  proficiency: z.enum([
    "Beginner",
    "Intermediate",
    "Advanced",
    "Expert",
    "Novice",
    "Proficient",
  ]),
  yearsExperience: z.number().min(0).max(50).nullable().optional(),
});

/**
 * Work experience achievement schema
 */
export const WorkExperienceAchievementSchema = z.object({
  description: z
    .string()
    .min(5, "Achievement description must be at least 5 characters")
    .max(1000, "Achievement description cannot exceed 1000 characters"),
});

/**
 * Base work experience schema
 */
export const BaseWorkExperienceSchema = z.object({
  jobTitle: NonEmptyStringSchema,
  companyName: NonEmptyStringSchema,
  startDate: DateSchema,
  endDate: OptionalDateSchema,
  achievements: z.array(WorkExperienceAchievementSchema).default([]),
  userSkills: z.array(WorkExperienceSkillSchema).default([]),
});

/**
 * Detailed work experience schema
 */
export const DetailedWorkExperienceSchema = BaseWorkExperienceSchema.extend({
  type: z.literal("detailed"),
  relevanceScore: z.number().min(0).max(1).optional(),
  matchedKeywords: z.array(NonEmptyStringSchema).optional(),
});

/**
 * Brief work experience schema
 */
export const BriefWorkExperienceSchema = BaseWorkExperienceSchema.extend({
  type: z.literal("brief"),
  briefSummary: OptionalNonEmptyStringSchema,
});

/**
 * Work experience union schema
 */
export const WorkExperienceSchema = z.union([
  DetailedWorkExperienceSchema,
  BriefWorkExperienceSchema,
]);

/**
 * Classified work experience schema
 */
export const ClassifiedWorkExperienceSchema = z.object({
  detailed: z.array(DetailedWorkExperienceSchema).default([]),
  brief: z.array(BriefWorkExperienceSchema).default([]),
});

/**
 * Database work experience schema (full database record)
 */
export const DatabaseWorkExperienceSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  jobTitle: NonEmptyStringSchema,
  companyName: NonEmptyStringSchema,
  startDate: DateSchema,
  endDate: OptionalDateSchema,
  description: OptionalNonEmptyStringSchema,
  location: OptionalNonEmptyStringSchema,
  industry: OptionalNonEmptyStringSchema,
  createdAt: DateSchema,
  updatedAt: DateSchema,
  achievements: z
    .array(
      z.object({
        id: UuidSchema,
        description: NonEmptyStringSchema,
        workHistoryId: UuidSchema,
      }),
    )
    .default([]),
  userSkills: z
    .array(
      z.object({
        id: UuidSchema,
        proficiency: NonEmptyStringSchema,
        yearsExperience: z.number().min(0).max(50).nullable().optional(),
        skill: SkillSchema,
      }),
    )
    .default([]),
});

// ============================================================================
// Input Validation Schemas
// ============================================================================

/**
 * Resume generation input schema
 */
export const ResumeGenerationInputSchema = z.object({
  userId: UuidSchema,
  jobPostingId: UuidSchema,
  formatOptions: z
    .object({
      format: z.enum(["markdown", "html", "pdf", "json"]).default("markdown"),
      includeOptionalSections: z.boolean().default(true),
      dateFormat: z.enum(["short", "long", "iso"]).default("short"),
    })
    .optional(),
  customPrompt: z
    .string()
    .max(2000, "Custom prompt cannot exceed 2000 characters")
    .optional(),
  includeAnalysis: z.boolean().default(false),
});

/**
 * Cover letter generation input schema
 */
export const CoverLetterGenerationInputSchema = z.object({
  userId: UuidSchema,
  jobPostingId: UuidSchema,
  tone: z
    .enum(["professional", "enthusiastic", "conservative", "creative"])
    .default("professional"),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  customPrompt: z
    .string()
    .max(2000, "Custom prompt cannot exceed 2000 characters")
    .optional(),
});

/**
 * Job posting creation input schema
 */
export const CreateJobPostingInputSchema = z.object({
  title: z
    .string()
    .min(2, "Job title must be at least 2 characters")
    .max(200, "Job title cannot exceed 200 characters"),
  company: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters"),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location cannot exceed 200 characters"),
  industry: z
    .string()
    .min(2, "Industry must be at least 2 characters")
    .max(100, "Industry cannot exceed 100 characters")
    .optional(),
  content: z
    .string()
    .min(50, "Job content must be at least 50 characters")
    .max(50000, "Job content cannot exceed 50,000 characters"),
  userId: UuidSchema,
});

/**
 * Job posting update input schema
 */
export const UpdateJobPostingInputSchema = z.object({
  id: UuidSchema,
  title: z
    .string()
    .min(2, "Job title must be at least 2 characters")
    .max(200, "Job title cannot exceed 200 characters")
    .optional(),
  company: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters")
    .optional(),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location cannot exceed 200 characters")
    .optional(),
  industry: z
    .string()
    .min(2, "Industry must be at least 2 characters")
    .max(100, "Industry cannot exceed 100 characters")
    .optional(),
  content: z
    .string()
    .min(50, "Job content must be at least 50 characters")
    .max(50000, "Job content cannot exceed 50,000 characters")
    .optional(),
});

/**
 * Work experience creation input schema
 */
export const CreateWorkExperienceInputSchema = z.object({
  userId: UuidSchema,
  jobTitle: z
    .string()
    .min(2, "Job title must be at least 2 characters")
    .max(200, "Job title cannot exceed 200 characters"),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters"),
  startDate: DateSchema,
  endDate: OptionalDateSchema,
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  location: z
    .string()
    .max(200, "Location cannot exceed 200 characters")
    .optional(),
  industry: z
    .string()
    .max(100, "Industry cannot exceed 100 characters")
    .optional(),
  achievements: z
    .array(
      z
        .string()
        .min(5, "Achievement must be at least 5 characters")
        .max(1000, "Achievement cannot exceed 1000 characters"),
    )
    .max(20, "Cannot have more than 20 achievements")
    .optional(),
  skills: z
    .array(
      z.object({
        skillId: UuidSchema,
        proficiency: z.enum([
          "Beginner",
          "Intermediate",
          "Advanced",
          "Expert",
          "Novice",
          "Proficient",
        ]),
        yearsExperience: z.number().min(0).max(50).optional(),
      }),
    )
    .max(50, "Cannot have more than 50 skills")
    .optional(),
});

/**
 * Work experience update input schema
 */
export const UpdateWorkExperienceInputSchema = z.object({
  id: UuidSchema,
  jobTitle: z
    .string()
    .min(2, "Job title must be at least 2 characters")
    .max(200, "Job title cannot exceed 200 characters")
    .optional(),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name cannot exceed 200 characters")
    .optional(),
  startDate: DateSchema.optional(),
  endDate: OptionalDateSchema,
  description: z
    .string()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional(),
  location: z
    .string()
    .max(200, "Location cannot exceed 200 characters")
    .optional(),
  industry: z
    .string()
    .max(100, "Industry cannot exceed 100 characters")
    .optional(),
});

/**
 * Search filters schema
 */
export const SearchFiltersSchema = z.object({
  userId: UuidSchema,
  query: z
    .string()
    .max(200, "Search query cannot exceed 200 characters")
    .optional(),
  industry: OptionalNonEmptyStringSchema,
  company: OptionalNonEmptyStringSchema,
  location: OptionalNonEmptyStringSchema,
  skillCategory: OptionalNonEmptyStringSchema,
  startDateAfter: DateSchema.optional(),
  endDateBefore: DateSchema.optional(),
  isCurrent: z.boolean().optional(),
  hasDetails: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
});

// ============================================================================
// User Profile Schemas
// ============================================================================

/**
 * User profile schema (simplified for resume generation)
 */
export const UserProfileSchema = z.object({
  id: UuidSchema,
  email: z.string().email("Invalid email format"),
  firstName: OptionalNonEmptyStringSchema,
  lastName: OptionalNonEmptyStringSchema,
  phone: OptionalNonEmptyStringSchema,
  location: OptionalNonEmptyStringSchema,
  linkedinUrl: z.string().url("Invalid LinkedIn URL").optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional(),
  portfolioUrl: z.string().url("Invalid portfolio URL").optional(),
  summary: z
    .string()
    .max(2000, "Summary cannot exceed 2000 characters")
    .optional(),
});

/**
 * User education schema
 */
export const UserEducationSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  institution: NonEmptyStringSchema,
  degree: NonEmptyStringSchema,
  field: OptionalNonEmptyStringSchema,
  startDate: DateSchema,
  endDate: OptionalDateSchema,
  gpa: z.number().min(0).max(4.0).optional(),
  honors: OptionalNonEmptyStringSchema,
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
});

/**
 * User achievement schema
 */
export const UserAchievementSchema = z.object({
  id: UuidSchema,
  userId: UuidSchema,
  title: NonEmptyStringSchema,
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  date: DateSchema.optional(),
  category: z
    .enum(["award", "certification", "publication", "speaking", "project"])
    .optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

// JobPostingData type is now defined in job-posting.types.ts as the single source of truth
// export type JobPostingData = z.infer<typeof JobPostingDataSchema>;
export type JobPostingDetails = z.infer<typeof JobPostingDetailsSchema>;
export type JobSkillRequirement = z.infer<typeof JobSkillRequirementSchema>;
export type JobExperienceRequirement = z.infer<
  typeof JobExperienceRequirementSchema
>;
export type JobEducationRequirement = z.infer<
  typeof JobEducationRequirementSchema
>;

export type WorkExperienceSkill = z.infer<typeof WorkExperienceSkillSchema>;
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export type DetailedWorkExperience = z.infer<
  typeof DetailedWorkExperienceSchema
>;
export type BriefWorkExperience = z.infer<typeof BriefWorkExperienceSchema>;
export type ClassifiedWorkExperience = z.infer<
  typeof ClassifiedWorkExperienceSchema
>;
export type DatabaseWorkExperience = z.infer<
  typeof DatabaseWorkExperienceSchema
>;

export type ResumeGenerationInput = z.infer<typeof ResumeGenerationInputSchema>;
export type CoverLetterGenerationInput = z.infer<
  typeof CoverLetterGenerationInputSchema
>;
export type CreateJobPostingInput = z.infer<typeof CreateJobPostingInputSchema>;
export type UpdateJobPostingInput = z.infer<typeof UpdateJobPostingInputSchema>;
export type CreateWorkExperienceInput = z.infer<
  typeof CreateWorkExperienceInputSchema
>;
export type UpdateWorkExperienceInput = z.infer<
  typeof UpdateWorkExperienceInputSchema
>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserEducation = z.infer<typeof UserEducationSchema>;
export type UserAchievement = z.infer<typeof UserAchievementSchema>;
