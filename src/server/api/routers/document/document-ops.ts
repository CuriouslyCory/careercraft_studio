import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  extractContentFromPDF,
  extractContentFromText,
} from "./utils/pdf-parser";
import { detectDocumentType } from "./utils/type-detection";
import { processJobPosting } from "./job-posting";
import { DocumentProcessingError, LLMProcessingError } from "./types";

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
        // Process as resume using centralized service
        console.log("Processing as resume...");
        try {
          const { parseResume } = await import(
            "~/server/services/resume-parser"
          );
          const result = await parseResume(
            rawContent,
            ctx.session.user.id,
            ctx.db,
            {
              title: title ?? originalName,
              saveDocument: false, // We'll create the document ourselves to maintain existing flow
            },
          );

          if (!result.success) {
            throw new LLMProcessingError(
              result.error ?? "Failed to process resume content",
              "processResume",
              new Error(result.error ?? "Unknown error"),
              0,
            );
          }

          processedContent = result.processedContent ?? "";
          console.log(
            "Resume processed successfully using centralized service",
          );
        } catch (err) {
          throw new LLMProcessingError(
            "Failed to process resume content using centralized service",
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

      // Step 5: For resumes, the centralized service already handled structured data processing
      // We just need to log success since the parsing was done by the service
      if (detectedType === "resume") {
        console.log(
          "Resume structured data processing completed by centralized service",
        );
      }

      return doc;
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

  generateResumeData: protectedProcedure
    .input(
      z.object({
        sections: z
          .array(
            z.enum([
              "work_history",
              "education",
              "skills",
              "achievements",
              "details",
              "links",
              "all",
            ]),
          )
          .default(["all"])
          .describe(
            "Specific sections to include. Use 'all' for complete user data, or specify individual sections like 'work_history', 'education', 'skills', 'achievements', 'details', 'links'",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sections } = input;
      const userId = ctx.session.user.id;

      try {
        const { generateUserResumeData, generateUserResumeDataSections } =
          await import("~/server/services/resume-data-generator");

        // If "all" is requested or sections array includes "all", generate complete data
        if (sections.includes("all")) {
          const resumeData = await generateUserResumeData(ctx.db, userId);
          return {
            success: true,
            data: resumeData,
            sectionsGenerated: ["all"],
          };
        } else {
          // Generate only specific sections
          const filteredSections = sections.filter(
            (
              section,
            ): section is
              | "work_history"
              | "education"
              | "skills"
              | "achievements"
              | "details"
              | "links" => section !== "all",
          );

          if (filteredSections.length === 0) {
            throw new Error(
              "No valid sections specified. Please choose from: work_history, education, skills, achievements, details, links, or all.",
            );
          }

          const resumeData = await generateUserResumeDataSections(
            ctx.db,
            userId,
            filteredSections,
          );

          return {
            success: true,
            data: resumeData,
            sectionsGenerated: filteredSections,
          };
        }
      } catch (error) {
        console.error("Error generating resume data:", error);
        throw new Error(
          `Failed to generate resume data: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  generateTailoredResume: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string().min(1, "Job posting ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { jobPostingId } = input;
      const userId = ctx.session.user.id;

      try {
        const { generateTailoredResume, formatTailoredResumeAsMarkdown } =
          await import("~/server/services/tailored-resume-generator");

        // Verify job posting exists and belongs to user
        const jobPosting = await ctx.db.jobPosting.findUnique({
          where: {
            id: jobPostingId,
            userId: userId,
          },
        });

        if (!jobPosting) {
          throw new Error(
            "Job posting not found or you don't have access to it",
          );
        }

        // Generate the tailored resume
        const tailoredResume = await generateTailoredResume(
          ctx.db,
          userId,
          jobPostingId,
        );

        // Convert to markdown format for storage
        const markdownResume = formatTailoredResumeAsMarkdown(tailoredResume);

        // Save to JobPostDocument table
        await ctx.db.jobPostDocument.upsert({
          where: {
            jobPostingId: jobPostingId,
          },
          update: {
            resumeContent: markdownResume,
            resumeGeneratedAt: new Date(),
          },
          create: {
            jobPostingId: jobPostingId,
            resumeContent: markdownResume,
            resumeGeneratedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Resume generated and saved successfully",
          jobPostingId: jobPostingId,
        };
      } catch (error) {
        console.error("Error generating tailored resume:", error);
        throw new Error(
          `Failed to generate tailored resume: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  generateTailoredCoverLetter: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string().min(1, "Job posting ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { jobPostingId } = input;
      const userId = ctx.session.user.id;

      try {
        const { generateTailoredCoverLetter } = await import(
          "~/server/services/tailored-resume-generator"
        );

        // Verify job posting exists and belongs to user
        const jobPosting = await ctx.db.jobPosting.findUnique({
          where: {
            id: jobPostingId,
            userId: userId,
          },
        });

        if (!jobPosting) {
          throw new Error(
            "Job posting not found or you don't have access to it",
          );
        }

        // Generate the tailored cover letter
        const tailoredCoverLetter = await generateTailoredCoverLetter(
          ctx.db,
          userId,
          jobPostingId,
        );

        // Save to JobPostDocument table
        await ctx.db.jobPostDocument.upsert({
          where: {
            jobPostingId: jobPostingId,
          },
          update: {
            coverLetterContent: tailoredCoverLetter.content,
            coverLetterGeneratedAt: new Date(),
          },
          create: {
            jobPostingId: jobPostingId,
            coverLetterContent: tailoredCoverLetter.content,
            coverLetterGeneratedAt: new Date(),
          },
        });

        return {
          success: true,
          message: "Cover letter generated and saved successfully",
          jobPostingId: jobPostingId,
        };
      } catch (error) {
        console.error("Error generating tailored cover letter:", error);
        throw new Error(
          `Failed to generate tailored cover letter: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),

  getJobPostDocument: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string().min(1, "Job posting ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { jobPostingId } = input;
      const userId = ctx.session.user.id;

      // Verify job posting belongs to user
      const jobPosting = await ctx.db.jobPosting.findUnique({
        where: {
          id: jobPostingId,
          userId: userId,
        },
      });

      if (!jobPosting) {
        throw new Error("Job posting not found or you don't have access to it");
      }

      const document = await ctx.db.jobPostDocument.findUnique({
        where: {
          jobPostingId: jobPostingId,
        },
      });

      return document;
    }),

  deleteJobPostDocument: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string().min(1, "Job posting ID is required"),
        documentType: z.enum(["resume", "coverLetter"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { jobPostingId, documentType } = input;
      const userId = ctx.session.user.id;

      // Verify job posting belongs to user
      const jobPosting = await ctx.db.jobPosting.findUnique({
        where: {
          id: jobPostingId,
          userId: userId,
        },
      });

      if (!jobPosting) {
        throw new Error("Job posting not found or you don't have access to it");
      }

      const updateData =
        documentType === "resume"
          ? {
              resumeContent: null,
              resumeGeneratedAt: null,
            }
          : {
              coverLetterContent: null,
              coverLetterGeneratedAt: null,
            };

      await ctx.db.jobPostDocument.update({
        where: {
          jobPostingId: jobPostingId,
        },
        data: updateData,
      });

      return {
        success: true,
        message: `${documentType === "resume" ? "Resume" : "Cover letter"} deleted successfully`,
      };
    }),

  updateJobPostDocument: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string().min(1, "Job posting ID is required"),
        documentType: z.enum(["resume", "coverLetter"]),
        content: z.string().min(1, "Content is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { jobPostingId, documentType, content } = input;
      const userId = ctx.session.user.id;

      // Verify job posting belongs to user
      const jobPosting = await ctx.db.jobPosting.findUnique({
        where: {
          id: jobPostingId,
          userId: userId,
        },
      });

      if (!jobPosting) {
        throw new Error("Job posting not found or you don't have access to it");
      }

      const updateData =
        documentType === "resume"
          ? {
              resumeContent: content,
              resumeGeneratedAt: new Date(),
            }
          : {
              coverLetterContent: content,
              coverLetterGeneratedAt: new Date(),
            };

      await ctx.db.jobPostDocument.upsert({
        where: {
          jobPostingId: jobPostingId,
        },
        update: updateData,
        create: {
          jobPostingId: jobPostingId,
          ...updateData,
        },
      });

      return {
        success: true,
        message: `${documentType === "resume" ? "Resume" : "Cover letter"} updated successfully`,
      };
    }),

  exportToPDF: protectedProcedure
    .input(
      z.object({
        jobPostingId: z.string(),
        documentType: z.enum(["resume", "coverLetter"]),
        content: z.string(),
        jobTitle: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { content, documentType, jobTitle } = input;

      try {
        // Import Puppeteer dynamically
        const puppeteer = await import("puppeteer");

        // Create HTML content with proper styling
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentType === "resume" ? "Resume" : "Cover Letter"} - ${jobTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #333;
      font-size: 14px;
      background: white;
      margin: 0;
      padding: 40px;
    }
    
    .document-container {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
    }
    
    /* Typography */
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #1a1a1a; }
    h2 { font-size: 20px; font-weight: 600; margin: 24px 0 12px 0; color: #2d2d2d; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
    h3 { font-size: 18px; font-weight: 600; margin: 16px 0 8px 0; color: #374151; }
    h4 { font-size: 16px; font-weight: 500; margin: 12px 0 6px 0; color: #4b5563; }
    h5 { font-size: 14px; font-weight: 500; margin: 8px 0 4px 0; color: #6b7280; }
    h6 { font-size: 13px; font-weight: 500; margin: 6px 0 4px 0; color: #6b7280; }
    
    p { margin-bottom: 12px; }
    
    /* Lists */
    ul, ol {
      margin: 8px 0 16px 20px;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    /* Links */
    a {
      color: #2563eb;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    /* Code */
    code {
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 12px;
    }
    
    pre {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
      overflow-x: auto;
      font-size: 12px;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background: #f9fafb;
      font-weight: 600;
    }
    
    /* Blockquotes */
    blockquote {
      border-left: 4px solid #e5e7eb;
      margin: 16px 0;
      padding: 0 16px;
      color: #6b7280;
      font-style: italic;
    }
    
    /* HR */
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    
    /* Print optimizations */
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
      
      .document-container {
        max-width: none;
      }
      
      /* Prevent page breaks inside important elements */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      p, li {
        page-break-inside: avoid;
      }
      
      /* Ensure black text for printing */
      body, p, li, td, th {
        color: #000 !important;
      }
      
      a {
        color: #000 !important;
        text-decoration: underline !important;
      }
    }
  </style>
</head>
<body>
  <div class="document-container">
    ${await convertMarkdownToHTML(content)}
  </div>
</body>
</html>`;

        // Launch Puppeteer browser
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        // Set content and wait for any dynamic content to load
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        // Generate PDF with optimized settings
        const pdfBuffer = await page.pdf({
          format: "A4",
          margin: {
            top: "0.5in",
            right: "0.5in",
            bottom: "0.5in",
            left: "0.5in",
          },
          printBackground: true,
          preferCSSPageSize: true,
        });

        await browser.close();

        // Convert buffer to base64 for transport
        const base64PDF = Buffer.from(pdfBuffer).toString("base64");

        return {
          success: true,
          pdfBase64: base64PDF,
          filename: `${documentType}-${jobTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`,
        };
      } catch (error) {
        console.error("PDF generation error:", error);
        throw new Error(
          `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),
});

// Helper function to convert markdown to HTML
async function convertMarkdownToHTML(markdown: string): Promise<string> {
  try {
    // Import markdown-it dynamically
    const MarkdownIt = await import("markdown-it");
    const md = new MarkdownIt.default({
      html: true,
      linkify: true,
      typographer: true,
    });

    return md.render(markdown);
  } catch (error) {
    console.error("Markdown conversion error:", error);
    // Fallback: simple HTML escaping and line break conversion
    return markdown
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }
}
