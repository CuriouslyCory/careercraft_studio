import { createLLM } from "~/server/langchain/agent";
import { HumanMessage } from "@langchain/core/messages";
import { LLMProcessingError, DocumentProcessingError } from "../types";

// Helper function to merge work achievements using LLM
export async function mergeWorkAchievements(
  existingAchievements: string[],
  newAchievements: string[],
): Promise<string[]> {
  console.log(
    `Merging achievements: Existing count=${existingAchievements.length}, New count=${newAchievements.length}`,
  );

  // Combine the lists and remove basic duplicates
  const combinedAchievements = [
    ...existingAchievements,
    ...newAchievements,
  ].filter((item, index, self) => self.indexOf(item) === index);

  if (combinedAchievements.length === 0) {
    return []; // Return empty array if no achievements
  }

  // Use LLM to merge similar achievements
  try {
    const mergeLLM = createLLM();

    const prompt = `You are a text merging assistant. Your task is to review the following list of achievement statements and combine any redundant or very similar items into a single, concise statement. Ensure all unique achievements are retained and clearly stated. Return ONLY the merged list of achievement statements as a JSON array of strings.

Statements to merge:
${JSON.stringify(combinedAchievements)}

Merged list:`;

    const response = await mergeLLM.invoke([new HumanMessage(prompt)]);

    let mergedContent = "";
    if (response && typeof response.content === "string") {
      mergedContent = response.content;
    } else if (
      response &&
      typeof response.content === "object" &&
      response.content !== null
    ) {
      mergedContent = JSON.stringify(response.content);
    } else {
      throw new LLMProcessingError(
        "LLM returned empty or unexpected content for achievement merging",
        "mergeAchievements",
        undefined,
        0,
      );
    }

    console.log("Raw merge LLM response:", mergedContent);

    // Clean up the response by removing markdown code blocks if present
    let cleanedContent = mergedContent.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.replace(/^```json\n?/, "");
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.replace(/```$/, "");
    }

    // Attempt to parse the JSON output from the LLM
    try {
      const finalMergedAchievements = JSON.parse(cleanedContent) as string[];

      // Validate the parsed result
      if (!Array.isArray(finalMergedAchievements)) {
        throw new Error("LLM response is not an array");
      }

      if (!finalMergedAchievements.every((item) => typeof item === "string")) {
        throw new Error("LLM response contains non-string items");
      }

      console.log(
        "Successfully parsed merged achievements:",
        finalMergedAchievements,
      );
      return finalMergedAchievements;
    } catch (parseError) {
      throw new LLMProcessingError(
        "Failed to parse LLM JSON output for achievement merging",
        "mergeAchievements",
        parseError instanceof Error
          ? parseError
          : new Error(String(parseError)),
        0,
      );
    }
  } catch (error) {
    if (error instanceof LLMProcessingError) {
      console.error("LLM processing error during achievement merging:", error);
      // Return original combined achievements as fallback
      return combinedAchievements;
    }

    console.error("Unexpected error during LLM achievement merging:", error);
    throw new DocumentProcessingError(
      "Failed to merge work achievements",
      error instanceof Error ? error : new Error(String(error)),
      "resume",
      "processing",
      {
        existingCount: existingAchievements.length,
        newCount: newAchievements.length,
      },
    );
  }
}
