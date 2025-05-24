// =============================================================================
// TOOL CONFIGURATION
// =============================================================================

export const TOOL_CONFIG = {
  // Query limits
  MAX_RESULTS: 10,
  MAX_JOB_POSTINGS: 20,
  MAX_QUERY_LIMIT: 50,

  // Transaction settings
  TRANSACTION_TIMEOUT: 10000, // 10 seconds
  TRANSACTION_MAX_WAIT: 5000, // 5 seconds

  // Resume validation
  MIN_RESUME_LENGTH: 50,
  MAX_RESUME_LENGTH: 50000,

  // Achievement limits
  MAX_ACHIEVEMENTS_PER_JOB: 20,

  // Skill priority levels
  SKILL_PRIORITY: {
    REQUIRED: 1,
    BONUS: 2,
    OPTIONAL: 3,
  } as const,

  // Date formats
  DATE_FORMAT: "YYYY-MM-DD",

  // Default categories
  DEFAULT_SKILL_CATEGORIES: {
    TECHNICAL: "PROGRAMMING_LANGUAGE",
    SOFT: "SOFT_SKILLS",
  } as const,
} as const;

// =============================================================================
// ROUTE MEMBERS
// =============================================================================

export const AGENT_MEMBERS = [
  "data_manager",
  "resume_generator",
  "cover_letter_generator",
  "user_profile",
  "job_posting_manager",
] as const;

export type AgentMember = (typeof AGENT_MEMBERS)[number];

// =============================================================================
// VALIDATION CONSTANTS
// =============================================================================

export const VALIDATION_LIMITS = {
  ACHIEVEMENT_DESCRIPTION: {
    MIN: 10,
    MAX: 500,
  },
  JOB_TITLE: {
    MIN: 2,
    MAX: 100,
  },
  COMPANY_NAME: {
    MIN: 2,
    MAX: 100,
  },
  SKILL_NAME: {
    MIN: 1,
    MAX: 50,
  },
  JOB_POSTING_CONTENT: {
    MIN: 50,
    MAX: 20000,
  },
} as const;
