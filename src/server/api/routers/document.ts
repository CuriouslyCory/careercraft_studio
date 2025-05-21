import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import PDFParser from "pdf2json";
import { Buffer } from "buffer";
import { createAgent, ResumeDataSchema } from "~/server/langchain/agent";
import { createLLM } from "~/server/langchain/agent";

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
      let content = "";
      let agentOutput: string | undefined = undefined;
      let pdfBuffer: Buffer | undefined = undefined;

      if (fileType === "application/pdf") {
        // Parse PDF using pdf2json
        content = await new Promise<string>((resolve, reject) => {
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
        // If no text was extracted, treat as image-based and use direct LLM call
        if (!content?.trim()) {
          try {
            const llm = createLLM();
            llm.withStructuredOutput(ResumeDataSchema);
            const llmResponse = await llm.invoke([
              [
                "system",
                "Please extract all relevant resume or document data from the file and return it as structured JSON.",
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
                    text: "Please extract all relevant resume or document data from the file and return it as structured JSON.",
                  },
                ],
              ],
            ]);
            agentOutput = extractContent(llmResponse);
            content = agentOutput;
            console.log("LLM output (image-based PDF):", agentOutput);
          } catch (err) {
            console.error("Error in LLM (image-based PDF):", err);
            content = "[Error: Could not extract content from image-based PDF]";
          }
        } else {
          // If text was extracted, use direct LLM call for further extraction/structuring
          try {
            const llm = createLLM();
            llm.withStructuredOutput(ResumeDataSchema);
            const llmResponse = await llm.invoke([
              [
                "system",
                "Please parse the following resume text and return the structured data.",
              ],
              ["user", `Resume text: """${content}"""`],
            ]);
            agentOutput = extractContent(llmResponse);
            content = agentOutput;
            console.log("LLM output (text-based PDF):", agentOutput);
          } catch (err) {
            // If LLM fails, fallback to raw extracted text
            console.error("Error in LLM (text-based PDF):", err);
          }
        }
      } else if (fileType === "text/plain") {
        // Decode base64 to string and run direct LLM for extraction
        content = Buffer.from(fileBase64, "base64").toString("utf-8");
        try {
          const llm = createLLM();
          llm.withStructuredOutput(ResumeDataSchema);
          const llmResponse = await llm.invoke([
            [
              "system",
              "Please parse the following resume text and return the structured data.",
            ],
            ["user", `Resume text: """${content}"""`],
          ]);
          agentOutput = extractContent(llmResponse);
          content = agentOutput;
          console.log("LLM output (plain text):", agentOutput);
        } catch (err) {
          // If LLM fails, fallback to raw extracted text
          console.error("Error in LLM (plain text):", err);
        }
      } else {
        throw new Error("Unsupported file type");
      }

      // Save to database (content is now just the extracted string)
      const doc = await ctx.db.document.create({
        data: {
          title: title ?? originalName,
          content,
          type,
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // --- Parse content and insert related records ---
      try {
        // Remove code block markers if present
        let clean = content.trim();
        if (clean.startsWith("```json"))
          clean = clean.replace(/^```json\n?/, "");
        if (clean.endsWith("```")) clean = clean.replace(/```$/, "");
        const parsed = ResumeDataSchema.parse(JSON.parse(clean));
        const userId = ctx.session.user.id;

        // WorkHistory, WorkAchievement, WorkSkill
        const workExperience = Array.isArray(parsed.work_experience)
          ? parsed.work_experience
          : [];
        for (const expRaw of workExperience) {
          // Safe due to schema enforcement
          const exp = expRaw;
          const wh = await ctx.db.workHistory.create({
            data: {
              companyName: typeof exp.company === "string" ? exp.company : "",
              jobTitle: typeof exp.jobTitle === "string" ? exp.jobTitle : "",
              startDate:
                typeof exp.startDate === "string"
                  ? new Date(exp.startDate)
                  : new Date(),
              endDate:
                typeof exp.endDate === "string" ? new Date(exp.endDate) : null,
              user: { connect: { id: userId } },
            },
          });
          // Achievements
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
          // Skills
          const skills = Array.isArray(exp.skills) ? exp.skills : [];
          for (const skill of skills) {
            if (typeof skill === "string") {
              await ctx.db.workSkill.create({
                data: {
                  name: skill,
                  workHistory: { connect: { id: wh.id } },
                },
              });
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
              type: "OTHER", // Could be improved with mapping
              institutionName:
                typeof edu.institution === "string" ? edu.institution : "",
              degreeOrCertName:
                typeof edu.degree === "string" ? edu.degree : "",
              description:
                typeof edu.fieldOfStudy === "string" ? edu.fieldOfStudy : "",
              dateCompleted:
                typeof edu.graduationDate === "string"
                  ? new Date(edu.graduationDate)
                  : null,
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

      return doc;
    }),
});
