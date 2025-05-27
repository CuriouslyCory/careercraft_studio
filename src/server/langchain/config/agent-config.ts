/**
 * Configuration constants for the agent system
 */

/**
 * Base configuration interface
 */
export interface AgentConfigType {
  MODEL: string;
  TEMPERATURE: {
    SUPERVISOR: number;
    AGENTS: number;
  };
  TIMEOUTS: {
    LLM_INVOKE: number;
    TOOL_EXECUTION: number;
  };
  LOOP_LIMITS: {
    MAX_AGENT_SWITCHES: number;
    MAX_TOOL_CALLS_PER_AGENT: number;
    MAX_CLARIFICATION_ROUNDS: number;
    MAX_DUPLICATE_CHECKS: number;
  };
}

/**
 * Main agent configuration object containing all system-wide settings
 */
export const AGENT_CONFIG: AgentConfigType = {
  MODEL: "gemini-2.0-flash",
  TEMPERATURE: {
    SUPERVISOR: 0.0,
    AGENTS: 0.2,
  },
  TIMEOUTS: {
    LLM_INVOKE: 30000,
    TOOL_EXECUTION: 15000,
  },
  LOOP_LIMITS: {
    MAX_AGENT_SWITCHES: 10,
    MAX_TOOL_CALLS_PER_AGENT: 5,
    MAX_CLARIFICATION_ROUNDS: 3,
    MAX_DUPLICATE_CHECKS: 100, // Prevent excessive duplicate checking
  },
};

/**
 * Environment-specific configuration overrides
 */
export const getEnvironmentConfig = (env: string): Partial<AgentConfigType> => {
  switch (env) {
    case "development":
      return {
        TIMEOUTS: {
          LLM_INVOKE: 60000, // Longer timeouts for development
          TOOL_EXECUTION: 30000,
        },
      };
    case "test":
      return {
        TEMPERATURE: {
          SUPERVISOR: 0.0,
          AGENTS: 0.0, // Deterministic for testing
        },
        TIMEOUTS: {
          LLM_INVOKE: 10000, // Shorter timeouts for tests
          TOOL_EXECUTION: 5000,
        },
      };
    case "production":
      return {
        LOOP_LIMITS: {
          MAX_AGENT_SWITCHES: 8, // Slightly more conservative in production
          MAX_TOOL_CALLS_PER_AGENT: 4,
          MAX_CLARIFICATION_ROUNDS: 2,
          MAX_DUPLICATE_CHECKS: 50,
        },
      };
    default:
      return {};
  }
};

/**
 * Merges base configuration with environment-specific overrides
 */
export const getConfig = (env?: string): AgentConfigType => {
  if (!env) {
    return AGENT_CONFIG;
  }

  const envConfig = getEnvironmentConfig(env);
  return {
    ...AGENT_CONFIG,
    ...envConfig,
    TEMPERATURE: {
      ...AGENT_CONFIG.TEMPERATURE,
      ...envConfig.TEMPERATURE,
    },
    TIMEOUTS: {
      ...AGENT_CONFIG.TIMEOUTS,
      ...envConfig.TIMEOUTS,
    },
    LOOP_LIMITS: {
      ...AGENT_CONFIG.LOOP_LIMITS,
      ...envConfig.LOOP_LIMITS,
    },
  };
};

/**
 * Validates configuration values
 */
export const validateConfig = (config: AgentConfigType): void => {
  if (config.TEMPERATURE.SUPERVISOR < 0 || config.TEMPERATURE.SUPERVISOR > 1) {
    throw new Error("Supervisor temperature must be between 0 and 1");
  }

  if (config.TEMPERATURE.AGENTS < 0 || config.TEMPERATURE.AGENTS > 1) {
    throw new Error("Agent temperature must be between 0 and 1");
  }

  if (config.TIMEOUTS.LLM_INVOKE <= 0) {
    throw new Error("LLM invoke timeout must be positive");
  }

  if (config.TIMEOUTS.TOOL_EXECUTION <= 0) {
    throw new Error("Tool execution timeout must be positive");
  }

  if (config.LOOP_LIMITS.MAX_AGENT_SWITCHES <= 0) {
    throw new Error("Max agent switches must be positive");
  }
};
