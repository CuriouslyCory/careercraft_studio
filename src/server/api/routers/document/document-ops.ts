import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { ResumeDataSchema } from "~/server/langchain/agent";
import { createLLM } from "~/server/langchain/agent";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  extractContentFromPDF,
  extractContentFromText,
} from "./utils/pdf-parser";
import { detectDocumentType } from "./utils/type-detection";
import { processJobPosting } from "./job-posting";
import { processWorkExperience } from "./work-history";
import { processEducation } from "./education";
import { processKeyAchievements } from "./key-achievements";
import {
  DocumentProcessingError,
  LLMProcessingError,
  extractContent,
} from "./types";

export const documentOpsRouter = createTRPCRouter({
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

      // Step 1: Extract raw content from the file
      try {
        if (fileType === "application/pdf") {
          rawContent = await extractContentFromPDF(
            fileBase64,
            originalName,
            fileType,
          );
        } else if (fileType === "text/plain") {
          rawContent = extractContentFromText(fileBase64);
        } else {
          throw new DocumentProcessingError(
            "Unsupported file type",
            undefined,
            type,
            "validation",
            { fileType, originalName },
          );
        }
      } catch (error) {
        if (
          error instanceof DocumentProcessingError ||
          error instanceof LLMProcessingError
        ) {
          throw error;
        }
        throw new DocumentProcessingError(
          "Failed to extract content from file",
          error instanceof Error ? error : new Error(String(error)),
          type,
          "parsing",
          { fileType, originalName },
        );
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
          throw new DocumentProcessingError(
            "Failed to process job posting",
            error instanceof Error ? error : new Error(String(error)),
            "job_posting",
            "processing",
            { contentLength: rawContent.length },
          );
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
          throw new LLMProcessingError(
            "Failed to process resume content using LLM",
            "processResume",
            err instanceof Error ? err : new Error(String(err)),
            0,
          );
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

          // Process work experience
          const workExperience = Array.isArray(parsed.work_experience)
            ? parsed.work_experience
            : [];
          await processWorkExperience(workExperience, userId, ctx);

          // Process education
          const educationArr = Array.isArray(parsed.education)
            ? parsed.education
            : [];
          await processEducation(educationArr, userId, ctx);

          // Process key achievements
          const keyAchievements = Array.isArray(parsed.key_achievements)
            ? parsed.key_achievements
            : [];
          await processKeyAchievements(keyAchievements, userId, ctx);
        } catch (err) {
          // Log the error but don't throw to allow document creation to succeed
          console.error("Error parsing or inserting related records:", err);

          // Create a more structured error for monitoring/debugging
          const structuredError = new DocumentProcessingError(
            "Failed to parse or store structured resume data",
            err instanceof Error ? err : new Error(String(err)),
            "resume",
            "storing",
            {
              documentId: doc.id,
              processedContentLength: processedContent.length,
            },
          );

          // In a production environment, you might want to send this to an error tracking service
          console.error("Structured error for monitoring:", structuredError);
        }
      }

      return doc;
    }),

  truncateAllUserData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    // Delete in order of dependencies
    await ctx.db.userSkill.deleteMany({ where: { userId } });
    await ctx.db.workAchievement.deleteMany({
      where: { workHistory: { userId } },
    });
    await ctx.db.workHistory.deleteMany({ where: { userId } });
    await ctx.db.education.deleteMany({ where: { userId } });
    await ctx.db.keyAchievement.deleteMany({ where: { userId } });
    await ctx.db.document.deleteMany({ where: { userId } });
    return { success: true };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.document.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  update: protectedProcedure
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

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.document.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});
