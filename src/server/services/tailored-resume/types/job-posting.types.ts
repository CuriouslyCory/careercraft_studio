/**
 * Job posting related type definitions for the tailored resume generator
 */

/**
 * Skill requirement for a job posting
 */
export interface JobSkillRequirement {
  id: string;
  isRequired: boolean;
  minimumLevel: string | null;
  yearsRequired: number | null;
  priority: number;
  skill: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  };
}

/**
 * Experience requirement for a job posting
 */
export interface JobExperienceRequirement {
  id: string;
  years: number | null;
  description: string;
  category: string;
  isRequired: boolean;
}

/**
 * Education requirement for a job posting
 */
export interface JobEducationRequirement {
  id: string;
  level: string;
  field: string | null;
  description: string | null;
  isRequired: boolean;
}

/**
 * Structured experience requirement from job posting details
 */
export interface StructuredExperienceRequirement {
  years?: number;
  description: string;
  category: string;
}

/**
 * Detailed job posting information extracted from content
 */
export interface JobPostingDetails {
  technicalSkills: string[];
  softSkills: string[];
  educationRequirements: string[];
  experienceRequirements: StructuredExperienceRequirement[];
  industryKnowledge: string[];
  bonusTechnicalSkills: string[];
  bonusSoftSkills: string[];
  bonusEducationRequirements: string[];
  bonusExperienceRequirements: StructuredExperienceRequirement[];
  bonusIndustryKnowledge: string[];
}

/**
 * Complete job posting data structure
 */
export interface JobPostingData {
  id: string;
  title: string;
  company: string;
  location: string;
  industry: string | null;
  content: string;
  details: JobPostingDetails | null;
  skillRequirements: JobSkillRequirement[];
  experienceRequirements: JobExperienceRequirement[];
  educationRequirements: JobEducationRequirement[];
}

/**
 * Minimal job posting information for quick operations
 */
export interface JobPostingSummary {
  id: string;
  title: string;
  company: string;
  location: string;
  industry: string | null;
}

/**
 * Job posting with user ownership information
 */
export interface UserJobPosting extends JobPostingData {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Job posting creation input
 */
export interface CreateJobPostingInput {
  title: string;
  company: string;
  location: string;
  industry?: string;
  content: string;
  userId: string;
}

/**
 * Job posting update input
 */
export interface UpdateJobPostingInput {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  content?: string;
}

/**
 * Job posting search filters
 */
export interface JobPostingFilters {
  userId: string;
  industry?: string;
  company?: string;
  location?: string;
  hasDetails?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Job posting analysis result
 */
export interface JobPostingAnalysis {
  keywordDensity: Record<string, number>;
  requiredSkillsCount: number;
  preferredSkillsCount: number;
  experienceLevel: "entry" | "mid" | "senior" | "executive";
  industryMatch: string[];
  complexityScore: number;
}

/**
 * Type guard to check if an object is a valid JobPostingData
 */
export const isJobPostingData = (obj: unknown): obj is JobPostingData => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "title" in obj &&
    "company" in obj &&
    "location" in obj &&
    "content" in obj &&
    "skillRequirements" in obj &&
    "experienceRequirements" in obj &&
    "educationRequirements" in obj
  );
};

/**
 * Type guard to check if job posting has details
 */
export const hasJobPostingDetails = (
  jobPosting: JobPostingData,
): jobPosting is JobPostingData & { details: JobPostingDetails } => {
  return jobPosting.details !== null;
};
