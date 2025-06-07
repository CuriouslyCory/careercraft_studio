import { z } from "zod";

/**
 * Configuration schema for the resume generator service
 */
const ResumeGeneratorConfigSchema = z.object({
  workExperience: z.object({
    /** Number of years to consider for detailed work experience */
    detailedYearsThreshold: z.number().min(1).max(20).default(10),
    /** Minimum keyword length for relevance matching */
    minKeywordLength: z.number().min(2).max(10).default(3),
    /** Maximum number of detailed work experiences to include */
    maxDetailedExperiences: z.number().min(1).max(20).default(10),
    /** Maximum number of brief work experiences to include */
    maxBriefExperiences: z.number().min(0).max(10).default(5),
  }),
  llm: z.object({
    /** Maximum number of retry attempts for LLM calls */
    maxRetries: z.number().min(0).max(5).default(2),
    /** Temperature for LLM generation (0-1) */
    temperature: z.number().min(0).max(1).default(0.7),
    /** Maximum tokens for LLM response */
    maxTokens: z.number().min(100).max(10000).default(4000),
    /** Timeout for LLM calls in milliseconds */
    timeoutMs: z.number().min(1000).max(60000).default(30000),
  }),
  formatting: z.object({
    /** Maximum lines per tool call for file operations */
    maxLinesPerToolCall: z.number().min(50).max(1000).default(250),
    /** Date format for work experience dates */
    dateFormat: z.enum(["short", "long", "iso"]).default("short"),
    /** Whether to include brief work experience section */
    includeBriefExperience: z.boolean().default(true),
  }),
  validation: z.object({
    /** Maximum length for job posting content */
    maxJobPostingLength: z.number().min(100).max(50000).default(20000),
    /** Maximum length for user profile data */
    maxUserProfileLength: z.number().min(100).max(100000).default(50000),
    /** Minimum required sections for a valid resume */
    requiredResumeSections: z
      .array(z.string())
      .default(["header", "summary", "workExperience", "skills"]),
  }),
  performance: z.object({
    /** Enable caching for job posting data */
    enableJobPostingCache: z.boolean().default(true),
    /** Cache TTL in milliseconds */
    cacheTtlMs: z.number().min(1000).max(3600000).default(300000), // 5 minutes
    /** Enable performance monitoring */
    enablePerformanceMonitoring: z.boolean().default(false),
  }),
});

export type ResumeGeneratorConfig = z.infer<typeof ResumeGeneratorConfigSchema>;

/**
 * Default configuration for the resume generator service
 */
export const DEFAULT_RESUME_CONFIG: ResumeGeneratorConfig = {
  workExperience: {
    detailedYearsThreshold: 10,
    minKeywordLength: 3,
    maxDetailedExperiences: 10,
    maxBriefExperiences: 5,
  },
  llm: {
    maxRetries: 2,
    temperature: 0.7,
    maxTokens: 4000,
    timeoutMs: 30000,
  },
  formatting: {
    maxLinesPerToolCall: 250,
    dateFormat: "short",
    includeBriefExperience: true,
  },
  validation: {
    maxJobPostingLength: 20000,
    maxUserProfileLength: 50000,
    requiredResumeSections: ["header", "summary", "workExperience", "skills"],
  },
  performance: {
    enableJobPostingCache: true,
    cacheTtlMs: 300000, // 5 minutes
    enablePerformanceMonitoring: false,
  },
};

/**
 * Environment-based configuration overrides
 */
const getEnvironmentConfig = (): {
  workExperience?: Partial<ResumeGeneratorConfig["workExperience"]>;
  llm?: Partial<ResumeGeneratorConfig["llm"]>;
  performance?: Partial<ResumeGeneratorConfig["performance"]>;
} => {
  const env = process.env;
  const config: {
    workExperience?: Partial<ResumeGeneratorConfig["workExperience"]>;
    llm?: Partial<ResumeGeneratorConfig["llm"]>;
    performance?: Partial<ResumeGeneratorConfig["performance"]>;
  } = {};

  // Work experience overrides
  if (env.RESUME_DETAILED_YEARS_THRESHOLD) {
    const value = parseInt(env.RESUME_DETAILED_YEARS_THRESHOLD, 10);
    if (!isNaN(value)) {
      config.workExperience = { detailedYearsThreshold: value };
    }
  }

  // LLM overrides
  const llmOverrides: Partial<ResumeGeneratorConfig["llm"]> = {};
  if (env.RESUME_LLM_MAX_RETRIES) {
    const value = parseInt(env.RESUME_LLM_MAX_RETRIES, 10);
    if (!isNaN(value)) {
      llmOverrides.maxRetries = value;
    }
  }
  if (env.RESUME_LLM_TEMPERATURE) {
    const value = parseFloat(env.RESUME_LLM_TEMPERATURE);
    if (!isNaN(value)) {
      llmOverrides.temperature = value;
    }
  }
  if (env.RESUME_LLM_TIMEOUT_MS) {
    const value = parseInt(env.RESUME_LLM_TIMEOUT_MS, 10);
    if (!isNaN(value)) {
      llmOverrides.timeoutMs = value;
    }
  }
  if (Object.keys(llmOverrides).length > 0) {
    config.llm = llmOverrides;
  }

  // Performance overrides
  const performanceOverrides: Partial<ResumeGeneratorConfig["performance"]> =
    {};
  if (env.RESUME_ENABLE_CACHE) {
    performanceOverrides.enableJobPostingCache =
      env.RESUME_ENABLE_CACHE === "true";
  }
  if (env.RESUME_ENABLE_MONITORING) {
    performanceOverrides.enablePerformanceMonitoring =
      env.RESUME_ENABLE_MONITORING === "true";
  }
  if (Object.keys(performanceOverrides).length > 0) {
    config.performance = performanceOverrides;
  }

  return config;
};

/**
 * Creates a validated configuration object with environment overrides
 */
export const createResumeGeneratorConfig = (
  overrides: Partial<ResumeGeneratorConfig> = {},
): ResumeGeneratorConfig => {
  const envConfig = getEnvironmentConfig();
  const mergedConfig: ResumeGeneratorConfig = {
    // Start with defaults
    ...DEFAULT_RESUME_CONFIG,
    // Deep merge nested objects
    workExperience: {
      ...DEFAULT_RESUME_CONFIG.workExperience,
      ...envConfig.workExperience,
      ...overrides.workExperience,
    },
    llm: {
      ...DEFAULT_RESUME_CONFIG.llm,
      ...envConfig.llm,
      ...overrides.llm,
    },
    formatting: {
      ...DEFAULT_RESUME_CONFIG.formatting,
      ...overrides.formatting,
    },
    validation: {
      ...DEFAULT_RESUME_CONFIG.validation,
      ...overrides.validation,
    },
    performance: {
      ...DEFAULT_RESUME_CONFIG.performance,
      ...envConfig.performance,
      ...overrides.performance,
    },
  };

  // Validate the merged configuration
  return ResumeGeneratorConfigSchema.parse(mergedConfig);
};

/**
 * Global configuration instance
 */
export const RESUME_CONFIG = createResumeGeneratorConfig();

/**
 * Configuration validation utility
 */
export const validateResumeConfig = (
  config: unknown,
): ResumeGeneratorConfig => {
  return ResumeGeneratorConfigSchema.parse(config);
};

/**
 * Type guard for checking if a value is a valid resume config
 */
export const isValidResumeConfig = (
  config: unknown,
): config is ResumeGeneratorConfig => {
  try {
    ResumeGeneratorConfigSchema.parse(config);
    return true;
  } catch {
    return false;
  }
};
