import { createLLM } from "~/server/langchain/agent";
import { HumanMessage } from "@langchain/core/messages";
import { LLMProcessingError, extractContent } from "../types";

// Helper function to detect document type (resume vs job posting)
export async function detectDocumentType(
  content: string,
): Promise<"resume" | "job_posting"> {
  console.log("Detecting document type for content...");

  try {
    const llm = createLLM();

    const prompt = `You are a document type classifier. Your task is to determine if the provided content is a RESUME or a JOB POSTING.

Guidelines:
- RESUME: Contains personal information, work history, education, skills, achievements of an individual seeking employment
- JOB POSTING: Contains job description, requirements, qualifications, responsibilities for a position an employer is trying to fill

Analyze the content and respond with ONLY one word: "resume" or "job_posting"

Content to analyze:
"""
${content.substring(0, 2000)}
"""

Document type:`;

    const response = await llm.invoke([new HumanMessage(prompt)]);
    const result = extractContent(response).toLowerCase().trim();

    console.log("Document type detection result:", result);

    // Return the detected type or default to resume
    if (result.includes("job_posting") || result.includes("job")) {
      return "job_posting";
    } else {
      return "resume";
    }
  } catch (error) {
    console.error("Error detecting document type:", error);

    // Create structured error for monitoring
    const detectionError = new LLMProcessingError(
      "Failed to detect document type using LLM",
      "detectDocumentType",
      error instanceof Error ? error : new Error(String(error)),
      0,
    );
    console.error("Document type detection error:", detectionError);

    // Default to resume if detection fails
    return "resume";
  }
}
