import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import PDFParser from "pdf2json";
import { Buffer } from "buffer";
import { ResumeDataSchema } from "~/server/langchain/agent";
import { createLLM } from "~/server/langchain/agent";
import { zodToJsonSchema } from "zod-to-json-schema";
import { EducationType } from "@prisma/client";
import { HumanMessage } from "@langchain/core/messages";
import { parseJobPosting } from "~/server/langchain/jobPostingParser";
import { type PrismaClient } from "@prisma/client";

// Minimal types for pdf2json output
interface PDFTextBlock {
  R: { T: string }[];
}
interface PDFPage {
  Texts: PDFTextBlock[];
}
interface PDFData {
  formImage?: { Pages?: PDFPage[] };
}

// Helper to extract content from LLM response
function extractContent(llmResponse: unknown): string {
  if (typeof llmResponse === "string") return llmResponse;
  if (
    typeof llmResponse === "object" &&
    llmResponse !== null &&
    "kwargs" in llmResponse &&
    typeof (llmResponse as { kwargs?: unknown }).kwargs === "object" &&
    (llmResponse as { kwargs: { content?: unknown } }).kwargs?.content
  ) {
    return String(
      (llmResponse as { kwargs: { content: unknown } }).kwargs.content,
    );
  }
  if (
    typeof llmResponse === "object" &&
    llmResponse !== null &&
    "content" in llmResponse
  ) {
    return String((llmResponse as { content: unknown }).content);
  }
  return JSON.stringify(llmResponse);
}

// Helper function to merge work achievements using LLM
async function mergeWorkAchievements(
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
      console.warn("Merge LLM returned empty or unexpected content.");
      return combinedAchievements;
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
      console.log(
        "Successfully parsed merged achievements:",
        finalMergedAchievements,
      );
      return finalMergedAchievements;
    } catch (parseError) {
      console.error("Failed to parse LLM JSON output:", parseError);
      console.log("Cleaned content that failed to parse:", cleanedContent);
      return combinedAchievements;
    }
  } catch (llmError) {
    console.error("Error during LLM achievement merging:", llmError);
    return combinedAchievements;
  }
}

// Helper function to detect document type (resume vs job posting)
async function detectDocumentType(
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
    // Default to resume if detection fails
    return "resume";
  }
}

// Helper function to check if two work history records match
function doWorkHistoryRecordsMatch(
  existing: {
    companyName: string;
    startDate: Date;
    endDate: Date | null;
  },
  newRecord: {
    company?: string;
    startDate?: Date;
    endDate?: Date;
  },
): boolean {
  // Company name must match (case insensitive)
  const existingCompany = existing.companyName.toLowerCase().trim();
  const newCompany = (newRecord.company ?? "").toLowerCase().trim();

  if (existingCompany !== newCompany) {
    return false;
  }

  // Start dates must match (within the same month)
  const existingStart = existing.startDate;
  const newStart = newRecord.startDate;

  if (!newStart) return false;

  const existingStartMonth =
    existingStart.getFullYear() * 12 + existingStart.getMonth();
  const newStartMonth = newStart.getFullYear() * 12 + newStart.getMonth();

  if (existingStartMonth !== newStartMonth) {
    return false;
  }

  // End dates must match (within the same month, or both be null/undefined)
  const existingEnd = existing.endDate;
  const newEnd = newRecord.endDate ?? null;

  if (!existingEnd && !newEnd) {
    return true; // Both are current positions
  }

  if (!existingEnd || !newEnd) {
    return false; // One is current, other is not
  }

  const existingEndMonth =
    existingEnd.getFullYear() * 12 + existingEnd.getMonth();
  const newEndMonth = newEnd.getFullYear() * 12 + newEnd.getMonth();

  return existingEndMonth === newEndMonth;
}

// Helper function to process and store job posting data
async function processJobPosting(
  content: string,
  userId: string,
  db: PrismaClient,
): Promise<void> {
  console.log("Processing job posting content...");

  try {
    // Parse the job posting using our parser
    const parsedJobPosting = await parseJobPosting(content);
    const { jobPosting } = parsedJobPosting;

    console.log(
      "Successfully parsed job posting:",
      jobPosting.title,
      "at",
      jobPosting.company,
    );

    // Create the job posting record
    const createdJobPosting = await db.jobPosting.create({
      data: {
        title: jobPosting.title,
        content: JSON.stringify(parsedJobPosting), // Store the full parsed content as JSON
        company: jobPosting.company,
        location: jobPosting.location,
        industry: jobPosting.industry ?? undefined,
        user: { connect: { id: userId } },
      },
    });

    // Create the job posting details
    await db.jobPostingDetails.create({
      data: {
        responsibilities: jobPosting.details.responsibilities,
        qualifications: jobPosting.details.qualifications,
        bonusQualifications: jobPosting.details.bonusQualifications,
        jobPosting: { connect: { id: createdJobPosting.id } },
      },
    });

    console.log("Successfully stored job posting and details in database");
  } catch (error) {
    console.error("Error processing job posting:", error);
    throw new Error(
      `Failed to process job posting: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const documentRouter = createTRPCRouter({
  upload: protectedProcedure
    .input(
      z.object({
        fileBase64: z.string().min(1, "File data is required"),
        fileType: z.enum(["application/pdf", "text/plain"]),
        originalName: z.string(),
        title: z.string().optional(),
        type: z.string().min(1, "Document type is required"), // e.g., 'resume', 'cover_letter'
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fileBase64, fileType, originalName, title, type } = input;
      let rawContent = "";
      let processedContent = "";
      let detectedType: "resume" | "job_posting" = "resume";
      let pdfBuffer: Buffer | undefined = undefined;

      // Step 1: Extract raw content from the file
      if (fileType === "application/pdf") {
        // Parse PDF using pdf2json to extract raw text
        rawContent = await new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser();
          pdfParser.on("pdfParser_dataError", (errData: unknown) => {
            let message = "Failed to parse PDF";
            if (
              typeof errData === "object" &&
              errData !== null &&
              "parserError" in errData &&
              typeof (errData as { parserError: unknown }).parserError ===
                "string"
            ) {
              message +=
                ": " + (errData as { parserError: string }).parserError;
            }
            reject(new Error(message));
          });
          pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
            try {
              const pages = (pdfData as PDFData)?.formImage?.Pages ?? [];
              const text = pages
                .map((page) =>
                  page.Texts.map((t) =>
                    t.R.map((r) => decodeURIComponent(r.T)).join(""),
                  ).join(" "),
                )
                .join("\n\n");
              resolve(text);
            } catch (e) {
              reject(new Error("Failed to extract text from PDF"));
            }
          });
          pdfBuffer = Buffer.from(fileBase64, "base64");
          pdfParser.parseBuffer(pdfBuffer);
        });

        // If no text was extracted from PDF, try to extract using LLM for image-based PDFs
        if (!rawContent?.trim()) {
          try {
            const llm = createLLM();
            const llmResponse = await llm.invoke([
              [
                "system",
                "Please extract all text content from this document. Return only the extracted text without any formatting or structure.",
              ],
              [
                "user",
                [
                  {
                    type: "application/pdf",
                    data: fileBase64,
                  },
                  {
                    type: "text",
                    text: "Please extract all text content from this PDF file.",
                  },
                ],
              ],
            ]);
            rawContent = extractContent(llmResponse);
            console.log("LLM extracted content from image-based PDF");
          } catch (err) {
            console.error(
              "Error extracting content from image-based PDF:",
              err,
            );
            rawContent =
              "[Error: Could not extract content from image-based PDF]";
          }
        }
      } else if (fileType === "text/plain") {
        // Decode base64 to string for text files
        rawContent = Buffer.from(fileBase64, "base64").toString("utf-8");
        console.log("Extracted content from plain text file");
      } else {
        throw new Error("Unsupported file type");
      }

      // Step 2: Detect document type (resume vs job posting)
      console.log("Detecting document type...");
      detectedType = await detectDocumentType(rawContent);
      console.log("Detected document type:", detectedType);

      // Step 3: Process content based on detected type
      if (detectedType === "job_posting") {
        // Process as job posting
        console.log("Processing as job posting...");
        try {
          await processJobPosting(rawContent, ctx.session.user.id, ctx.db);
          processedContent = JSON.stringify({
            type: "job_posting",
            message: "Job posting processed successfully",
            content: rawContent.substring(0, 500) + "...",
          });
        } catch (error) {
          console.error("Error processing job posting:", error);
          processedContent = `Error processing job posting: ${error instanceof Error ? error.message : String(error)}`;
        }
      } else {
        // Process as resume (existing logic)
        console.log("Processing as resume...");
        try {
          const resumeJsonSchema = JSON.stringify(
            zodToJsonSchema(ResumeDataSchema),
            null,
            2,
          );
          const schemaDescription = `\nReturn the data as JSON matching this schema exactly (do not add, remove, or rename fields):\n\n${resumeJsonSchema}\nIf a value is missing, use an empty string or omit the field (if optional). For date fields, either provide a valid ISO 8601 date string or omit the field entirely - never use null. All arrays must be arrays, not objects. Do not add, remove, or rename any fields.\n`;

          const llm = createLLM();
          llm.withStructuredOutput(ResumeDataSchema);
          const llmResponse = await llm.invoke([
            [
              "system",
              `Please parse the following resume text and return the structured data. ${schemaDescription}`,
            ],
            ["user", `Resume text: """${rawContent}"""`],
          ]);
          processedContent = extractContent(llmResponse);
          console.log("LLM processed resume content");
        } catch (err) {
          console.error("Error processing resume content:", err);
          processedContent = rawContent; // Fallback to raw content
        }
      }

      // Step 4: Save to database
      const doc = await ctx.db.document.create({
        data: {
          title: title ?? originalName,
          content: processedContent,
          type: detectedType, // Use detected type instead of input type
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // Step 5: Parse and store structured data (only for resumes)
      if (detectedType === "resume") {
        try {
          // Remove code block markers if present
          let clean = processedContent.trim();
          if (clean.startsWith("```json"))
            clean = clean.replace(/^```json\n?/, "");
          if (clean.endsWith("```")) clean = clean.replace(/```$/, "");
          const parsed = ResumeDataSchema.parse(JSON.parse(clean));
          const userId = ctx.session.user.id;

          // WorkHistory, WorkAchievement, WorkSkill with deduplication
          const workExperience = Array.isArray(parsed.work_experience)
            ? parsed.work_experience
            : [];

          // First, get all existing work history for the user
          const existingWorkHistory = await ctx.db.workHistory.findMany({
            where: { userId },
            include: {
              achievements: true,
              skills: true,
            },
          });

          for (const expRaw of workExperience) {
            // Safe due to schema enforcement
            const exp = expRaw;

            // Check if this work experience matches an existing record
            const matchingRecord = existingWorkHistory.find((existing) =>
              doWorkHistoryRecordsMatch(existing, exp),
            );

            let workHistoryId: string;

            if (matchingRecord) {
              // Update existing record - merge achievements and upsert skills
              console.log(
                `Found matching work history: ${matchingRecord.companyName} - ${matchingRecord.jobTitle}`,
              );

              // Get existing achievements as strings
              const existingAchievements = matchingRecord.achievements.map(
                (a) => a.description,
              );

              // Get new achievements
              const newAchievements = Array.isArray(exp.achievements)
                ? exp.achievements.filter(
                    (a): a is string => typeof a === "string",
                  )
                : [];

              // Merge achievements using LLM
              const mergedAchievements = await mergeWorkAchievements(
                existingAchievements,
                newAchievements,
              );

              // Update the work history record (in case job title or other details changed)
              await ctx.db.workHistory.update({
                where: { id: matchingRecord.id },
                data: {
                  jobTitle: exp.jobTitle ?? matchingRecord.jobTitle,
                  // Keep the original dates but allow updates if more specific
                  startDate: exp.startDate ?? matchingRecord.startDate,
                  endDate: exp.endDate ?? matchingRecord.endDate,
                },
              });

              // Delete existing achievements and replace with merged ones
              await ctx.db.workAchievement.deleteMany({
                where: { workHistoryId: matchingRecord.id },
              });

              for (const desc of mergedAchievements) {
                await ctx.db.workAchievement.create({
                  data: {
                    description: desc,
                    workHistory: { connect: { id: matchingRecord.id } },
                  },
                });
              }

              workHistoryId = matchingRecord.id;
            } else {
              // Create new work history record
              const wh = await ctx.db.workHistory.create({
                data: {
                  companyName: exp.company ?? "",
                  jobTitle: exp.jobTitle ?? "",
                  startDate: exp.startDate ?? new Date(),
                  endDate: exp.endDate,
                  user: { connect: { id: userId } },
                },
              });

              // Add achievements for new record
              const responsibilities = Array.isArray(exp.achievements)
                ? exp.achievements
                : [];
              for (const desc of responsibilities) {
                if (typeof desc === "string") {
                  await ctx.db.workAchievement.create({
                    data: {
                      description: desc,
                      workHistory: { connect: { id: wh.id } },
                    },
                  });
                }
              }

              workHistoryId = wh.id;
            }

            // Upsert skills to avoid duplicates
            const skills = Array.isArray(exp.skills) ? exp.skills : [];
            for (const skill of skills) {
              if (typeof skill === "string") {
                // Check if skill already exists for this work history
                const existingSkill = await ctx.db.workSkill.findFirst({
                  where: {
                    workHistoryId,
                    name: skill,
                  },
                });

                if (!existingSkill) {
                  await ctx.db.workSkill.create({
                    data: {
                      name: skill,
                      workHistory: { connect: { id: workHistoryId } },
                    },
                  });
                }
              }
            }
          }
          // Education
          const educationArr = Array.isArray(parsed.education)
            ? parsed.education
            : [];
          for (const eduRaw of educationArr) {
            // Safe due to schema enforcement
            const edu = eduRaw;
            await ctx.db.education.create({
              data: {
                type: edu.type ?? "OTHER",
                institutionName: edu.institutionName ?? "",
                degreeOrCertName: edu.degreeOrCertName,
                description: edu.description ?? "",
                dateCompleted: edu.dateCompleted,
                user: { connect: { id: userId } },
              },
            });
          }
          // KeyAchievements
          const keyAchievements = Array.isArray(parsed.key_achievements)
            ? parsed.key_achievements
            : [];
          for (const ach of keyAchievements) {
            if (typeof ach === "string") {
              await ctx.db.keyAchievement.create({
                data: {
                  content: ach,
                  user: { connect: { id: userId } },
                },
              });
            }
          }
        } catch (err) {
          console.error("Error parsing or inserting related records:", err);
          // Do not throw, just log
        }
      }

      return doc;
    }),
  truncateAllUserData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Delete in order of dependencies
    await ctx.db.workSkill.deleteMany({ where: { workHistory: { userId } } });
    await ctx.db.workAchievement.deleteMany({
      where: { workHistory: { userId } },
    });
    await ctx.db.workHistory.deleteMany({ where: { userId } });
    await ctx.db.education.deleteMany({ where: { userId } });
    await ctx.db.keyAchievement.deleteMany({ where: { userId } });
    await ctx.db.document.deleteMany({ where: { userId } });
    return { success: true };
  }),
  listDocuments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.document.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  updateDocument: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.document.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }),
  deleteDocument: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
  // WorkHistory CRUD
  listWorkHistory: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.workHistory.findMany({
      where: { userId: ctx.session.user.id },
      include: { achievements: true, skills: true },
      orderBy: { startDate: "desc" },
    });
  }),
  createWorkHistory: protectedProcedure
    .input(
      z.object({
        companyName: z.string(),
        jobTitle: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workHistory.create({
        data: {
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
  updateWorkHistory: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        companyName: z.string().optional(),
        jobTitle: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.workHistory.update({
        where: { id, userId: ctx.session.user.id },
        data: {
          ...data,
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        },
      });
    }),
  deleteWorkHistory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workHistory.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  // WorkAchievement CRUD (by WorkHistory)
  listWorkAchievements: protectedProcedure
    .input(z.object({ workHistoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workAchievement.findMany({
        where: { workHistoryId: input.workHistoryId },
        orderBy: { createdAt: "asc" },
      });
    }),
  createWorkAchievement: protectedProcedure
    .input(
      z.object({
        workHistoryId: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.create({
        data: input,
      });
    }),
  updateWorkAchievement: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.update({
        where: { id: input.id },
        data: { description: input.description },
      });
    }),
  deleteWorkAchievement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workAchievement.delete({
        where: { id: input.id },
      });
    }),

  // WorkSkill CRUD (by WorkHistory)
  listWorkSkills: protectedProcedure
    .input(z.object({ workHistoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workSkill.findMany({
        where: { workHistoryId: input.workHistoryId },
        orderBy: { createdAt: "asc" },
      });
    }),
  createWorkSkill: protectedProcedure
    .input(
      z.object({
        workHistoryId: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workSkill.create({
        data: input,
      });
    }),
  deleteWorkSkill: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.workSkill.delete({
        where: { id: input.id },
      });
    }),

  // KeyAchievement CRUD
  listKeyAchievements: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.keyAchievement.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  createKeyAchievement: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.create({
        data: {
          content: input.content,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
  updateKeyAchievement: protectedProcedure
    .input(z.object({ id: z.string(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { content: input.content },
      });
    }),
  deleteKeyAchievement: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.keyAchievement.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),

  // Education CRUD
  listEducation: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.education.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { dateCompleted: "desc" },
    });
  }),
  createEducation: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(EducationType),
        institutionName: z.string(),
        degreeOrCertName: z.string().optional(),
        description: z.string(),
        dateCompleted: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.education.create({
        data: {
          ...input,
          type: input.type as EducationType,
          dateCompleted: input.dateCompleted
            ? new Date(input.dateCompleted)
            : undefined,
          user: { connect: { id: ctx.session.user.id } },
        },
      });
    }),
  updateEducation: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.nativeEnum(EducationType).optional(),
        institutionName: z.string().optional(),
        degreeOrCertName: z.string().optional(),
        description: z.string().optional(),
        dateCompleted: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.education.update({
        where: { id, userId: ctx.session.user.id },
        data: {
          ...data,
          ...(data.type ? { type: data.type as EducationType } : {}),
          ...(data.dateCompleted
            ? { dateCompleted: new Date(data.dateCompleted) }
            : {}),
        },
      });
    }),
  deleteEducation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.education.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});
