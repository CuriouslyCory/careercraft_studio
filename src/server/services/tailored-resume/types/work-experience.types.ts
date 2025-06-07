/**
 * Work experience related type definitions for the tailored resume generator
 */

import type { WorkExperienceSkill } from "./schemas";

/**
 * Achievement associated with work experience
 */
export interface WorkExperienceAchievement {
  description: string;
}

/**
 * Base work experience interface
 */
export interface BaseWorkExperience {
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate: Date | null;
  achievements: WorkExperienceAchievement[];
  userSkills: WorkExperienceSkill[];
}

/**
 * Detailed work experience (for recent/relevant positions)
 * @deprecated Use DetailedWorkExperience type from schemas.ts (Zod-inferred) instead
 */
export interface DetailedWorkExperience extends BaseWorkExperience {
  /** Indicates this should be shown with full details */
  type: "detailed";
  /** Relevance score for this position (0-1) */
  relevanceScore?: number;
  /** Keywords that matched the job posting */
  matchedKeywords?: string[];
}

/**
 * Brief work experience (for older/less relevant positions)
 * @deprecated Use BriefWorkExperience type from schemas.ts (Zod-inferred) instead
 */
export interface BriefWorkExperience extends BaseWorkExperience {
  /** Indicates this should be shown briefly */
  type: "brief";
  /** Brief summary of the role */
  briefSummary?: string;
}

/**
 * Union type for all work experience types
 */
export type WorkExperience = DetailedWorkExperience | BriefWorkExperience;

/**
 * Classified work experience based on relevance and recency
 * @deprecated Use ClassifiedWorkExperience type from schemas.ts (Zod-inferred) instead
 */
export interface ClassifiedWorkExperience {
  detailed: DetailedWorkExperience[];
  brief: BriefWorkExperience[];
}

/**
 * Work experience with full database information
 */
export interface DatabaseWorkExperience {
  id: string;
  userId: string;
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  location: string | null;
  industry: string | null;
  createdAt: Date;
  updatedAt: Date;
  achievements: Array<{
    id: string;
    description: string;
    workHistoryId: string;
  }>;
  userSkills: Array<{
    id: string;
    proficiency: string;
    yearsExperience: number | null;
    skill: {
      id: string;
      name: string;
      category: string;
      description: string | null;
    };
  }>;
}

/**
 * Work experience creation input
 */
export interface CreateWorkExperienceInput {
  userId: string;
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  location?: string;
  industry?: string;
  achievements?: string[];
  skills?: Array<{
    skillId: string;
    proficiency: string;
    yearsExperience?: number;
  }>;
}

/**
 * Work experience update input
 */
export interface UpdateWorkExperienceInput {
  id: string;
  jobTitle?: string;
  companyName?: string;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  location?: string;
  industry?: string;
}

/**
 * Work experience search filters
 */
export interface WorkExperienceFilters {
  userId: string;
  company?: string;
  industry?: string;
  skillCategory?: string;
  startDateAfter?: Date;
  endDateBefore?: Date;
  isCurrent?: boolean;
}

/**
 * Work experience classification criteria
 */
export interface ClassificationCriteria {
  /** Number of years to consider for detailed experience */
  detailedYearsThreshold: number;
  /** Keywords from the target job posting */
  jobKeywords: Set<string>;
  /** Minimum relevance score for detailed classification */
  minRelevanceScore?: number;
  /** Maximum number of detailed experiences */
  maxDetailedExperiences?: number;
  /** Maximum number of brief experiences */
  maxBriefExperiences?: number;
}

/**
 * Work experience relevance analysis
 */
export interface RelevanceAnalysis {
  /** Overall relevance score (0-1) */
  score: number;
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Skill overlap with job requirements */
  skillOverlap: number;
  /** Industry relevance */
  industryMatch: boolean;
  /** Recency factor */
  recencyFactor: number;
}

/**
 * Work experience formatting options
 */
export interface WorkExperienceFormatOptions {
  /** Date format to use */
  dateFormat: "short" | "long" | "iso";
  /** Whether to include skills section */
  includeSkills: boolean;
  /** Whether to include achievements */
  includeAchievements: boolean;
  /** Maximum number of achievements to show */
  maxAchievements?: number;
  /** Whether to include brief experience section */
  includeBriefExperience: boolean;
}

/**
 * Type guard to check if work experience is detailed
 */
export const isDetailedWorkExperience = (
  experience: WorkExperience,
): experience is DetailedWorkExperience => {
  return experience.type === "detailed";
};

/**
 * Type guard to check if work experience is brief
 */
export const isBriefWorkExperience = (
  experience: WorkExperience,
): experience is BriefWorkExperience => {
  return experience.type === "brief";
};

/**
 * Type guard to check if work experience is current
 */
export const isCurrentWorkExperience = (
  experience: BaseWorkExperience,
): boolean => {
  return experience.endDate === null;
};

/**
 * Utility to calculate work experience duration in months
 */
export const calculateDurationInMonths = (
  startDate: Date,
  endDate: Date | null,
): number => {
  const end = endDate ?? new Date();
  const diffTime = Math.abs(end.getTime() - startDate.getTime());
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
  return diffMonths;
};

/**
 * Utility to format work experience duration
 */
export const formatDuration = (
  startDate: Date,
  endDate: Date | null,
): string => {
  const months = calculateDurationInMonths(startDate, endDate);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  } else if (remainingMonths === 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  } else {
    return `${years} year${years !== 1 ? "s" : ""}, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
  }
};
