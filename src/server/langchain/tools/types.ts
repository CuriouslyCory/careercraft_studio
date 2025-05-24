import { z } from "zod";

// =============================================================================
// SHARED SCHEMAS
// =============================================================================

export const userDataTypeSchema = z.enum([
  "work_history",
  "education",
  "skills",
  "achievements",
  "preferences",
  "user_links",
  "all",
]);

export const resumeSectionSchema = z.enum([
  "work_history",
  "education",
  "skills",
  "achievements",
  "details",
  "links",
  "all",
]);

export const resumeFormatSchema = z.enum(["PDF", "Word", "Text"]);
export const resumeStyleSchema = z.enum([
  "Modern",
  "Traditional",
  "Creative",
  "Minimal",
]);
export const coverLetterStyleSchema = z.enum([
  "Formal",
  "Conversational",
  "Enthusiastic",
  "Professional",
]);

// =============================================================================
// DATABASE QUERY TYPES
// =============================================================================

export interface JobPostingSearchCriteria {
  userId: string;
  title?: { contains: string; mode: "insensitive" };
  company?: { contains: string; mode: "insensitive" };
  location?: { contains: string; mode: "insensitive" };
  industry?: { contains: string; mode: "insensitive" };
}

export interface UserWorkHistory {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: Date;
  endDate: Date | null;
  achievements: Array<{ id: string; description: string }>;
  skills: Array<{
    name: string;
    proficiency: string; // This is an enum in the database
    yearsExperience: number | null;
  }>;
}

export interface UserEducation {
  id: string;
  type: string;
  institutionName: string;
  degreeOrCertName: string | null;
  description: string | null;
  dateCompleted: Date | null;
}

export interface UserSkill {
  id: string;
  name: string;
  category: string;
  proficiency: string; // This is an enum in the database
  yearsExperience: number | null;
  source: string | null;
  workContext: string | null;
  notes: string | null;
}

export interface WorkAchievement {
  id: string;
  description: string;
  context: string;
}

export interface UserPreference {
  id: string;
  category: string;
  content: string;
}

export interface UserLink {
  id: string;
  title: string;
  type: string;
  url: string;
}

// =============================================================================
// TOOL INPUT TYPES
// =============================================================================

export type UserDataType = z.infer<typeof userDataTypeSchema>;
export type ResumeSection = z.infer<typeof resumeSectionSchema>;
export type ResumeFormat = z.infer<typeof resumeFormatSchema>;
export type ResumeStyle = z.infer<typeof resumeStyleSchema>;
export type CoverLetterStyle = z.infer<typeof coverLetterStyleSchema>;

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface ToolResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface WorkHistoryResponse {
  workHistory: {
    id: string;
    jobTitle: string;
    companyName: string;
    startDate: string;
    endDate: string;
  };
  achievements: Array<{
    id: string;
    description: string;
    createdAt: string;
  }>;
}
