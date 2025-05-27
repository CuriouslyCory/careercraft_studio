import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { env } from "~/env";
import { AGENT_CONFIG } from "../config/agent-config";
import { LLMError } from "../types/errors";
import { logger } from "./logging";

/**
 * LLM management utilities for creating and configuring language models
 */

/**
 * Creates a specialized LLM instance with appropriate configuration
 * @param agentType - Type of agent (supervisor or regular agent)
 * @param modelOverride - Optional model name override
 * @returns Configured ChatGoogleGenerativeAI instance
 * @throws LLMError if configuration fails
 */
export async function createSpecializedLLM(
  agentType: "supervisor" | "agent",
  modelOverride?: string,
): Promise<ChatGoogleGenerativeAI> {
  try {
    const { GOOGLE_API_KEY } = env;

    if (!GOOGLE_API_KEY) {
      throw new LLMError(
        "GOOGLE_API_KEY is not defined in environment variables",
      );
    }

    // Validate Google API key format
    if (!GOOGLE_API_KEY.startsWith("AI") || GOOGLE_API_KEY.length < 20) {
      throw new LLMError(
        'GOOGLE_API_KEY appears to be invalid. Google API keys typically start with "AI" and are longer than 20 characters',
      );
    }

    const temperature =
      agentType === "supervisor"
        ? AGENT_CONFIG.TEMPERATURE.SUPERVISOR
        : AGENT_CONFIG.TEMPERATURE.AGENTS;

    const modelOptions = {
      apiKey: GOOGLE_API_KEY,
      model: modelOverride ?? AGENT_CONFIG.MODEL,
      temperature,
      // Add basic retry configuration
      maxRetries: 2,
    };

    logger.info(`Initializing ${agentType} LLM model`, {
      model: modelOptions.model,
      temperature: modelOptions.temperature,
      maxRetries: modelOptions.maxRetries,
      apiKey: "[REDACTED]",
    });

    return new ChatGoogleGenerativeAI(modelOptions);
  } catch (error) {
    if (error instanceof LLMError) {
      throw error;
    }
    throw new LLMError(
      `Failed to initialize ${agentType} LLM`,
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Creates a standard LLM instance with custom temperature
 * @param temperature - Temperature setting for the model (defaults to agent temperature)
 * @returns Promise resolving to configured ChatGoogleGenerativeAI instance
 * @throws LLMError if initialization fails
 */
export async function createLLM(
  temperature = AGENT_CONFIG.TEMPERATURE.AGENTS,
): Promise<ChatGoogleGenerativeAI> {
  try {
    const model = await createSpecializedLLM("agent", undefined);

    // Override temperature if specified
    if (temperature !== AGENT_CONFIG.TEMPERATURE.AGENTS) {
      const { GOOGLE_API_KEY } = env;
      return new ChatGoogleGenerativeAI({
        apiKey: GOOGLE_API_KEY,
        model: AGENT_CONFIG.MODEL,
        temperature,
        maxRetries: 2,
      });
    }
    return model;
  } catch (error) {
    logger.error("Error initializing language model", { error });
    throw new LLMError(
      "Failed to initialize language model",
      undefined,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Validates LLM configuration before creating instance
 * @param config - Configuration object to validate
 * @throws LLMError if configuration is invalid
 */
export function validateLLMConfig(config: {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}): void {
  if (!config.apiKey) {
    throw new LLMError("API key is required for LLM configuration");
  }

  if (config.temperature !== undefined) {
    if (config.temperature < 0 || config.temperature > 1) {
      throw new LLMError("Temperature must be between 0 and 1", {
        temperature: config.temperature,
      });
    }
  }

  if (config.maxRetries !== undefined) {
    if (config.maxRetries < 0 || config.maxRetries > 10) {
      throw new LLMError("Max retries must be between 0 and 10", {
        maxRetries: config.maxRetries,
      });
    }
  }
}

/**
 * Creates an LLM instance with custom configuration
 * @param config - Custom configuration for the LLM
 * @returns Configured ChatGoogleGenerativeAI instance
 * @throws LLMError if configuration is invalid
 */
export function createCustomLLM(config: {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}): ChatGoogleGenerativeAI {
  // Use environment API key if not provided
  const apiKey = config.apiKey ?? env.GOOGLE_API_KEY;

  const fullConfig = {
    apiKey,
    model: config.model ?? AGENT_CONFIG.MODEL,
    temperature: config.temperature ?? AGENT_CONFIG.TEMPERATURE.AGENTS,
    maxRetries: config.maxRetries ?? 2,
  };

  validateLLMConfig(fullConfig);

  logger.info("Creating custom LLM instance", {
    model: fullConfig.model,
    temperature: fullConfig.temperature,
    maxRetries: fullConfig.maxRetries,
    apiKey: "[REDACTED]",
  });

  return new ChatGoogleGenerativeAI(fullConfig);
}

/**
 * Gets the default model configuration
 * @returns Default model configuration object
 */
export function getDefaultModelConfig(): {
  model: string;
  temperature: number;
  maxRetries: number;
} {
  return {
    model: AGENT_CONFIG.MODEL,
    temperature: AGENT_CONFIG.TEMPERATURE.AGENTS,
    maxRetries: 2,
  };
}

/**
 * Gets the supervisor model configuration
 * @returns Supervisor model configuration object
 */
export function getSupervisorModelConfig(): {
  model: string;
  temperature: number;
  maxRetries: number;
} {
  return {
    model: AGENT_CONFIG.MODEL,
    temperature: AGENT_CONFIG.TEMPERATURE.SUPERVISOR,
    maxRetries: 2,
  };
}
