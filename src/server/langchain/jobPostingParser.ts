import { createLLM } from "./agent";
import { HumanMessage } from "@langchain/core/messages";
import {
  ParsedJobPostingSchema,
  type ParsedJobPosting,
} from "./jobPostingSchemas";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Parses job posting content using LLM to extract structured data
 * @param content - The raw job posting content (text)
 * @returns Parsed job posting data matching the schema
 * @throws If parsing or validation fails
 */
export async function parseJobPosting(
  content: string,
): Promise<ParsedJobPosting> {
  try {
    console.log("Job posting parser: Starting to parse content");

    if (!content || content.trim().length === 0) {
      throw new Error("Job posting content cannot be empty");
    }

    // Create LLM instance
    const llm = createLLM();

    // Generate JSON schema for the LLM prompt
    const jobPostingJsonSchema = JSON.stringify(
      zodToJsonSchema(ParsedJobPostingSchema),
      null,
      2,
    );

    const systemPrompt = `You are a job posting analysis expert. Your task is to extract structured information from job posting content.

IMPORTANT INSTRUCTIONS:
1. Extract the job title, company name, location, and industry from the content
2. Identify and categorize responsibilities/duties that describe day-to-day work
3. Separate required qualifications from bonus/optional qualifications
4. Look for keywords like "preferred", "bonus", "nice-to-have", "a plus" for bonus qualifications
5. Include all relevant skills, education, certifications, and experience requirements
6. Return the data as JSON matching this exact schema:

${jobPostingJsonSchema}

If information is missing or unclear, extract what you can and omit optional fields.
For arrays, always return arrays even if empty - never use null or undefined.`;

    const userPrompt = `Please parse the following job posting and extract the structured information:

"""
${content}
"""

Return only the JSON data matching the required schema.`;

    console.log("Job posting parser: Invoking LLM with structured output");

    // Use structured output to ensure proper JSON format
    const structuredLLM = llm.withStructuredOutput(ParsedJobPostingSchema);

    const response = await structuredLLM.invoke([
      ["system", systemPrompt],
      ["user", userPrompt],
    ]);

    console.log("Job posting parser: Received LLM response", {
      hasTitle: !!response?.jobPosting?.title,
      hasCompany: !!response?.jobPosting?.company,
      responsibilitiesCount:
        response?.jobPosting?.details?.responsibilities?.length ?? 0,
      qualificationsCount:
        response?.jobPosting?.details?.qualifications?.length ?? 0,
      bonusQualificationsCount:
        response?.jobPosting?.details?.bonusQualifications?.length ?? 0,
    });

    // Validate the response
    const validationResult = ParsedJobPostingSchema.safeParse(response);

    if (validationResult.success) {
      console.log(
        "Job posting parser: Successfully parsed and validated job posting data",
      );
      return validationResult.data;
    } else {
      console.error(
        "Job posting parser: Failed to validate parsed data:",
        validationResult.error.format(),
      );
      throw new Error(
        "Failed to parse job posting into the expected format. Validation errors: " +
          JSON.stringify(validationResult.error.format()),
      );
    }
  } catch (error) {
    console.error("Job posting parser: Error during parsing:", error);

    if (error instanceof Error) {
      throw new Error(`Job posting parsing failed: ${error.message}`);
    }
    throw new Error("Job posting parsing failed due to an unknown error.");
  }
}
