import { z } from "zod";

/**
 * Zod validation schemas for agent system
 */

/**
 * Schema for routing decisions made by the supervisor agent
 */
export const RouteToAgentSchema = z.object({
  next: z.enum([
    "data_manager",
    "resume_generator",
    "cover_letter_generator",
    "user_profile",
    "job_posting_manager",
    "__end__",
  ]),
});

/**
 * Schema for storing user preferences
 */
export const StoreUserPreferenceSchema = z.object({
  category: z.string().min(1),
  preference: z.string().min(1),
});

/**
 * Schema for storing work history information
 */
export const StoreWorkHistorySchema = z.object({
  jobTitle: z.string().min(1),
  companyName: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
});

/**
 * Schema for retrieving user profile data
 */
export const GetUserProfileSchema = z.object({
  dataType: z.enum([
    "work_history",
    "education",
    "skills",
    "achievements",
    "preferences",
    "all",
  ]),
});

/**
 * Schema for parsing job posting content
 */
export const ParseJobPostingSchema = z.object({
  content: z.string().min(1),
});

/**
 * Schema for completed actions tracking
 */
export const CompletedActionSchema = z.object({
  id: z.string(),
  agentType: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  result: z.string(),
  timestamp: z.number(),
  contentHash: z.string().optional(),
});

/**
 * Schema for clarification options
 */
export const ClarificationOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  action: z.object({
    agentType: z.string(),
    toolName: z.string(),
    args: z.record(z.unknown()),
  }),
});

/**
 * Schema for pending clarifications
 */
export const PendingClarificationSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(ClarificationOptionSchema),
  context: z.record(z.unknown()),
  timestamp: z.number(),
});

// Type exports derived from schemas
export type RouteToAgent = z.infer<typeof RouteToAgentSchema>;
export type StoreUserPreference = z.infer<typeof StoreUserPreferenceSchema>;
export type StoreWorkHistory = z.infer<typeof StoreWorkHistorySchema>;
export type GetUserProfile = z.infer<typeof GetUserProfileSchema>;
export type ParseJobPosting = z.infer<typeof ParseJobPostingSchema>;
export type CompletedAction = z.infer<typeof CompletedActionSchema>;
export type ClarificationOption = z.infer<typeof ClarificationOptionSchema>;
export type PendingClarification = z.infer<typeof PendingClarificationSchema>;
