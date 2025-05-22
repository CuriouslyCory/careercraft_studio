import { createLLM } from "./agent";
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

    const systemPrompt = `You are a job posting analysis expert. Your task is to extract structured information from job posting content for compatibility analysis.

IMPORTANT INSTRUCTIONS:
1. Extract the job title, company name, location, and industry from the content
2. Identify and categorize responsibilities/duties that describe day-to-day work
3. Separate required qualifications from bonus/optional qualifications
4. Look for keywords like "preferred", "bonus", "nice-to-have", "a plus" for bonus qualifications

DETAILED REQUIREMENT EXTRACTION:
For both required and bonus requirements, extract:

- **Technical Skills**: Programming languages (JavaScript, Python, React, etc.), frameworks, tools, platforms, software, databases, cloud services (AWS, Azure), methodologies (Agile, DevOps), etc.
- **Soft Skills**: Communication, leadership, teamwork, problem-solving, analytical thinking, creativity, time management, etc.
- **Education Requirements**: Degree level (Bachelor's, Master's, PhD), field of study (Computer Science, Engineering), professional certifications, licenses, industry credentials (PMP, AWS Certified, etc.), specific programs or schools
- **Experience Requirements**: Years of experience with specific context (e.g., "5+ years managing teams", "10+ years in B2B products")
  - Extract both the number of years and description
  - Categorize as 'management', 'technical', 'industry', 'general', etc.
- **Industry Knowledge**: Domain-specific expertise, regulatory knowledge, business understanding

PARSING GUIDELINES:
- Be specific with technical skills (extract "React" not just "front-end frameworks")
- Include version numbers or specificity when mentioned (e.g., "React 18", "Node.js 16+")
- For experience, always try to extract years as numbers when mentioned
- Separate general skills from domain-specific knowledge
- If a requirement appears in both required and bonus, prioritize the required section

Return the data as JSON matching this exact schema:

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
      technicalSkillsCount:
        response?.jobPosting?.details?.requirements?.technicalSkills?.length ??
        0,
      educationRequirementsCount:
        response?.jobPosting?.details?.requirements?.educationRequirements
          ?.length ?? 0,
      experienceRequirementsCount:
        response?.jobPosting?.details?.requirements?.experienceRequirements
          ?.length ?? 0,
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
