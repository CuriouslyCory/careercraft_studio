import { type PrismaClient } from "@prisma/client";
import { generateUserResumeData } from "./resume-data-generator";
import { createLLM } from "~/server/langchain/agent";
import { z } from "zod";

// Schema for the generated resume sections
const TailoredResumeSchema = z.object({
  header: z.string().describe("Contact information and relevant links"),
  summary: z
    .string()
    .describe("Professional summary/objective tailored to the job"),
  workExperience: z
    .string()
    .describe(
      "Work experience section with relevant keywords and achievements",
    ),
  skills: z.string().describe("Technical and soft skills relevant to the job"),
  education: z.string().optional().describe("Education section if available"),
  achievements: z
    .string()
    .optional()
    .describe(
      "Awards, speaking engagements, notable achievements if available",
    ),
});

export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

// Schema for the generated cover letter
const TailoredCoverLetterSchema = z.object({
  content: z
    .string()
    .describe("The full cover letter content tailored to the job"),
});

export type TailoredCoverLetter = z.infer<typeof TailoredCoverLetterSchema>;

interface JobPostingData {
  id: string;
  title: string;
  company: string;
  location: string;
  industry: string | null;
  content: string;
  details?: {
    technicalSkills: string[];
    softSkills: string[];
    educationRequirements: string[];
    experienceRequirements: Array<{
      years?: number;
      description: string;
      category: string;
    }>;
    industryKnowledge: string[];
    bonusTechnicalSkills: string[];
    bonusSoftSkills: string[];
    bonusEducationRequirements: string[];
    bonusExperienceRequirements: Array<{
      years?: number;
      description: string;
      category: string;
    }>;
    bonusIndustryKnowledge: string[];
  } | null;
  skillRequirements: Array<{
    id: string;
    isRequired: boolean;
    minimumLevel: string | null;
    yearsRequired: number | null;
    priority: number;
    skill: {
      id: string;
      name: string;
      category: string;
      description: string | null;
    };
  }>;
  experienceRequirements: Array<{
    id: string;
    years: number | null;
    description: string;
    category: string;
    isRequired: boolean;
  }>;
  educationRequirements: Array<{
    id: string;
    level: string;
    field: string | null;
    description: string | null;
    isRequired: boolean;
  }>;
}

export class TailoredResumeGenerator {
  constructor(private db: PrismaClient) {}

  async generateTailoredResume(
    userId: string,
    jobPostingId: string,
  ): Promise<TailoredResume> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!jobPostingId) {
      throw new Error("Job posting ID is required");
    }

    // 1. Fetch user data using the resume data generator
    const userProfileData = await generateUserResumeData(this.db, userId);

    // 2. Fetch job posting data with all requirements
    const jobPostingData = await this.fetchJobPostingData(jobPostingId, userId);

    // 3. Use LLM to generate tailored resume
    const tailoredResume = await this.generateResumeWithLLM(
      userProfileData,
      jobPostingData,
    );

    return tailoredResume;
  }

  private async fetchJobPostingData(
    jobPostingId: string,
    userId: string,
  ): Promise<JobPostingData> {
    const jobPosting = await this.db.jobPosting.findUnique({
      where: {
        id: jobPostingId,
        userId: userId, // Ensure user owns this job posting
      },
      include: {
        details: true,
        skillRequirements: {
          include: {
            skill: true,
          },
        },
        experienceRequirements: true,
        educationRequirements: true,
      },
    });

    if (!jobPosting) {
      throw new Error("Job posting not found or you don't have access to it");
    }

    return {
      id: jobPosting.id,
      title: jobPosting.title,
      company: jobPosting.company,
      location: jobPosting.location,
      industry: jobPosting.industry,
      content: jobPosting.content,
      details: jobPosting.details
        ? {
            technicalSkills: jobPosting.details.technicalSkills,
            softSkills: jobPosting.details.softSkills,
            educationRequirements: jobPosting.details.educationRequirements,
            experienceRequirements: jobPosting.details
              .experienceRequirements as Array<{
              years?: number;
              description: string;
              category: string;
            }>,
            industryKnowledge: jobPosting.details.industryKnowledge,
            bonusTechnicalSkills: jobPosting.details.bonusTechnicalSkills,
            bonusSoftSkills: jobPosting.details.bonusSoftSkills,
            bonusEducationRequirements:
              jobPosting.details.bonusEducationRequirements,
            bonusExperienceRequirements: jobPosting.details
              .bonusExperienceRequirements as Array<{
              years?: number;
              description: string;
              category: string;
            }>,
            bonusIndustryKnowledge: jobPosting.details.bonusIndustryKnowledge,
          }
        : null,
      skillRequirements: jobPosting.skillRequirements.map((req) => ({
        id: req.id,
        isRequired: req.isRequired,
        minimumLevel: req.minimumLevel,
        yearsRequired: req.yearsRequired,
        priority: req.priority,
        skill: {
          id: req.skill.id,
          name: req.skill.name,
          category: req.skill.category,
          description: req.skill.description,
        },
      })),
      experienceRequirements: jobPosting.experienceRequirements.map((req) => ({
        id: req.id,
        years: req.years,
        description: req.description,
        category: req.category,
        isRequired: req.isRequired,
      })),
      educationRequirements: jobPosting.educationRequirements.map((req) => ({
        id: req.id,
        level: req.level,
        field: req.field,
        description: req.description,
        isRequired: req.isRequired,
      })),
    };
  }

  private async generateResumeWithLLM(
    userProfileData: string,
    jobPostingData: JobPostingData,
  ): Promise<TailoredResume> {
    // Create LLM with higher temperature to reduce repetition
    const llm = createLLM(); // Remove temperature parameter until we fix the function signature

    // Simplified, more focused system prompt
    const systemPrompt = `You are an expert resume writer. Create a professional, tailored resume based on the user's data and job requirements.

RULES:
- Only use information from the user profile data provided
- Never fabricate skills, experiences, or qualifications
- Incorporate job-relevant keywords naturally
- Use strong action verbs and quantify achievements
- Keep content concise and ATS-friendly

FORMAT: Return valid JSON with these exact fields:
- header: Contact information
- summary: Brief professional summary (2-3 sentences)
- workExperience: Work history with achievements
- skills: Relevant technical and soft skills
- education: Educational background (empty string if none)
- achievements: Notable accomplishments (empty string if none)`;

    // Simplified user prompt with reduced redundancy
    const userPrompt = `Please generate a tailored resume that:
1. Highlights the user's most relevant experiences for this specific role
2. Incorporates relevant keywords from the job description naturally
3. Emphasizes skills and achievements that align with the job requirements
4. Optimized entries for ATS compatibility
5. Only uses information provided in the user profile data

JOB: ${jobPostingData.title} at ${jobPostingData.company}
LOCATION: ${jobPostingData.location}

JOB DESCRIPTION:
${jobPostingData.content}

USER DATA:
${userProfileData}

Focus on relevant experience and skills. Use markdown formatting within each section.`;

    try {
      // Use structured output with simplified schema
      const llmWithStructuredOutput =
        llm.withStructuredOutput(TailoredResumeSchema);

      const response = await llmWithStructuredOutput.invoke([
        ["system", systemPrompt],
        ["user", userPrompt],
      ]);

      // Validate the response
      const validatedResponse = TailoredResumeSchema.parse(response);

      return validatedResponse;
    } catch (error) {
      console.error("Error generating tailored resume:", error);

      // Fallback: Try without structured output if schema parsing fails
      try {
        console.log("Retrying without structured output...");
        const fallbackResponse = await llm.invoke([
          [
            "system",
            systemPrompt +
              "\n\nIMPORTANT: Return only valid JSON with the required fields.",
          ],
          ["user", userPrompt],
        ]);

        // Extract content and try to parse as JSON
        const content =
          typeof fallbackResponse.content === "string"
            ? fallbackResponse.content
            : JSON.stringify(fallbackResponse.content);

        // Clean up the response to extract JSON
        let jsonStr = content.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedResponse = JSON.parse(jsonStr) as unknown;
        const validatedResponse = TailoredResumeSchema.parse(parsedResponse);

        return validatedResponse;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);

        if (error instanceof Error) {
          throw new Error(
            `Failed to generate tailored resume: ${error.message}`,
          );
        }
        throw new Error(
          "Failed to generate tailored resume due to an unknown error",
        );
      }
    }
  }

  private formatJobRequirements(jobData: JobPostingData): string {
    const requirements: string[] = [];

    // Required skills
    const requiredSkills = jobData.skillRequirements
      .filter((req) => req.isRequired)
      .map(
        (req) =>
          `${req.skill.name} (${req.minimumLevel ?? "Any level"})${req.yearsRequired ? ` - ${req.yearsRequired} years` : ""}`,
      );

    if (requiredSkills.length > 0) {
      requirements.push(
        `**Required Skills:**\n${requiredSkills.map((skill) => `- ${skill}`).join("\n")}`,
      );
    }

    // Preferred skills
    const preferredSkills = jobData.skillRequirements
      .filter((req) => !req.isRequired)
      .map(
        (req) =>
          `${req.skill.name} (${req.minimumLevel ?? "Any level"})${req.yearsRequired ? ` - ${req.yearsRequired} years` : ""}`,
      );

    if (preferredSkills.length > 0) {
      requirements.push(
        `**Preferred Skills:**\n${preferredSkills.map((skill) => `- ${skill}`).join("\n")}`,
      );
    }

    // Experience requirements
    const requiredExperience = jobData.experienceRequirements
      .filter((req) => req.isRequired)
      .map(
        (req) =>
          `${req.description}${req.years ? ` (${req.years} years)` : ""}`,
      );

    if (requiredExperience.length > 0) {
      requirements.push(
        `**Required Experience:**\n${requiredExperience.map((exp) => `- ${exp}`).join("\n")}`,
      );
    }

    // Education requirements
    const requiredEducation = jobData.educationRequirements
      .filter((req) => req.isRequired)
      .map(
        (req) =>
          `${req.level}${req.field ? ` in ${req.field}` : ""}${req.description ? ` - ${req.description}` : ""}`,
      );

    if (requiredEducation.length > 0) {
      requirements.push(
        `**Required Education:**\n${requiredEducation.map((edu) => `- ${edu}`).join("\n")}`,
      );
    }

    // Structured requirements from details
    if (jobData.details) {
      if (jobData.details.technicalSkills.length > 0) {
        requirements.push(
          `**Technical Skills (from posting):**\n${jobData.details.technicalSkills.map((skill) => `- ${skill}`).join("\n")}`,
        );
      }

      if (jobData.details.softSkills.length > 0) {
        requirements.push(
          `**Soft Skills (from posting):**\n${jobData.details.softSkills.map((skill) => `- ${skill}`).join("\n")}`,
        );
      }

      if (jobData.details.industryKnowledge.length > 0) {
        requirements.push(
          `**Industry Knowledge:**\n${jobData.details.industryKnowledge.map((knowledge) => `- ${knowledge}`).join("\n")}`,
        );
      }
    }

    return requirements.join("\n\n");
  }

  async generateTailoredCoverLetter(
    userId: string,
    jobPostingId: string,
  ): Promise<TailoredCoverLetter> {
    if (!userId) {
      throw new Error("User ID is required");
    }
    if (!jobPostingId) {
      throw new Error("Job posting ID is required");
    }

    // 1. Fetch user data using the resume data generator
    const userProfileData = await generateUserResumeData(this.db, userId);

    // 2. Fetch job posting data with all requirements
    const jobPostingData = await this.fetchJobPostingData(jobPostingId, userId);

    // 3. Use LLM to generate tailored cover letter
    const tailoredCoverLetter = await this.generateCoverLetterWithLLM(
      userProfileData,
      jobPostingData,
    );

    return tailoredCoverLetter;
  }

  private async generateCoverLetterWithLLM(
    userProfileData: string,
    jobPostingData: JobPostingData,
  ): Promise<TailoredCoverLetter> {
    const llm = createLLM(); // Remove temperature parameter until we fix the function signature

    const systemPrompt = `You are an expert cover letter writer. Create a professional, tailored cover letter based on the user's data and job requirements.

RULES:
- Only use information from the user profile data provided
- Never fabricate skills, experiences, or qualifications
- Incorporate job-relevant keywords naturally
- Address the specific company and role
- Keep content concise and professional

FORMAT: Return valid JSON with this exact field:
- content: The full cover letter text`;

    const userPrompt = `Please generate a tailored cover letter that:
1. Introduces the user and expresses interest in the specific ${jobPostingData.title} role at ${jobPostingData.company}
2. Highlights the user's most relevant skills and experiences that match the job requirements
3. Demonstrates understanding of the company and role
4. Encourages the reader to review the attached resume
5. Only uses information provided in the user profile data

JOB: ${jobPostingData.title} at ${jobPostingData.company}
LOCATION: ${jobPostingData.location}

JOB DESCRIPTION:
${jobPostingData.content}

USER DATA:
${userProfileData}

Focus on relevance and enthusiasm. Write the full cover letter content.`;

    try {
      const llmWithStructuredOutput = llm.withStructuredOutput(
        TailoredCoverLetterSchema,
      );

      const response = await llmWithStructuredOutput.invoke([
        ["system", systemPrompt],
        ["user", userPrompt],
      ]);

      const validatedResponse = TailoredCoverLetterSchema.parse(response);

      return validatedResponse;
    } catch (error) {
      console.error("Error generating tailored cover letter:", error);

      // Fallback: Try without structured output if schema parsing fails
      try {
        console.log("Retrying cover letter without structured output...");
        const fallbackResponse = await llm.invoke([
          [
            "system",
            systemPrompt +
              "\n\nIMPORTANT: Return only valid JSON with the required 'content' field.",
          ],
          ["user", userPrompt],
        ]);

        const content =
          typeof fallbackResponse.content === "string"
            ? fallbackResponse.content
            : JSON.stringify(fallbackResponse.content);

        // Clean up the response to extract JSON
        let jsonStr = content.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsedResponse = JSON.parse(jsonStr) as unknown;
        const validatedResponse =
          TailoredCoverLetterSchema.parse(parsedResponse);

        return validatedResponse;
      } catch (fallbackError) {
        console.error("Cover letter fallback also failed:", fallbackError);

        if (error instanceof Error) {
          throw new Error(
            `Failed to generate tailored cover letter: ${error.message}`,
          );
        }
        throw new Error(
          "Failed to generate tailored cover letter due to an unknown error",
        );
      }
    }
  }
}

/**
 * Standalone function that can be called from TRPC or agent tools
 */
export async function generateTailoredResume(
  db: PrismaClient,
  userId: string,
  jobPostingId: string,
): Promise<TailoredResume> {
  const generator = new TailoredResumeGenerator(db);
  return generator.generateTailoredResume(userId, jobPostingId);
}

/**
 * Utility function to format the tailored resume as a complete markdown document
 */
export function formatTailoredResumeAsMarkdown(resume: TailoredResume): string {
  const sections: string[] = [];

  // Header
  if (resume.header) {
    sections.push(resume.header);
    sections.push("");
  }

  // Summary
  if (resume.summary) {
    sections.push("## Professional Summary");
    sections.push("");
    sections.push(resume.summary);
    sections.push("");
  }

  // Work Experience
  if (resume.workExperience) {
    sections.push("## Work Experience");
    sections.push("");
    sections.push(resume.workExperience);
    sections.push("");
  }

  // Skills
  if (resume.skills) {
    sections.push("## Skills");
    sections.push("");
    sections.push(resume.skills);
    sections.push("");
  }

  // Education
  if (resume.education && resume.education.trim() !== "") {
    sections.push("## Education");
    sections.push("");
    sections.push(resume.education);
    sections.push("");
  }

  // Achievements
  if (resume.achievements && resume.achievements.trim() !== "") {
    sections.push("## Awards & Achievements");
    sections.push("");
    sections.push(resume.achievements);
    sections.push("");
  }

  return sections.join("\n").trim();
}

/**
 * Standalone function that can be called from TRPC or agent tools
 */
export async function generateTailoredCoverLetter(
  db: PrismaClient,
  userId: string,
  jobPostingId: string,
): Promise<TailoredCoverLetter> {
  const generator = new TailoredResumeGenerator(db);
  return generator.generateTailoredCoverLetter(userId, jobPostingId);
}

/**
 * Utility function to format the tailored cover letter as a complete markdown document (optional)
 */
export function formatTailoredCoverLetterAsMarkdown(
  coverLetter: TailoredCoverLetter,
): string {
  // Since the schema is just a content string, we just return it.
  // Add markdown formatting like headers, lists, etc., if the LLM is instructed to use them.
  return coverLetter.content;
}
