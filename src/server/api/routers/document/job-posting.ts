import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import {
  processJobPosting as processJobPostingService,
  type JobPostingProcessingResult,
} from "~/server/services/job-posting-processor";
import { DocumentProcessingError } from "./types";
import { UsageTracker } from "~/server/services/usage-tracker";

export const jobPostingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.jobPosting.findMany({
      where: { userId: ctx.session.user.id },
      include: {
        details: true,
        document: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const jobPosting = await ctx.db.jobPosting.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          details: true,
          document: true,
        },
      });

      if (!jobPosting) {
        throw new Error("Job posting not found or you don't have access to it");
      }

      return jobPosting;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        company: z.string(),
        location: z.string(),
        industry: z.string().optional(),
        url: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check usage limits and record usage for job posting import
      const usageTracker = new UsageTracker(ctx.db);
      await usageTracker.checkLimitAndRecord(
        ctx.session.user.id,
        "JOB_POSTING_IMPORT",
        {
          title: input.title,
          company: input.company,
          hasContent: input.content.length > 0,
          contentLength: input.content.length,
        },
      );

      return ctx.db.jobPosting.create({
        data: {
          ...input,
          user: { connect: { id: ctx.session.user.id } },
        },
        include: { details: true },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        company: z.string().optional(),
        location: z.string().optional(),
        industry: z.string().optional(),
        url: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.jobPosting.update({
        where: { id, userId: ctx.session.user.id },
        data,
        include: { details: true },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First delete the related JobPostingDetails
      await ctx.db.jobPostingDetails.deleteMany({
        where: { jobPostingId: input.id },
      });

      // Then delete the JobPosting
      return ctx.db.jobPosting.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});

// Helper function to process and store job posting data
// Now uses the centralized JobPostingProcessor service
export async function processJobPosting(
  content: string,
  userId: string,
  db: PrismaClient,
): Promise<JobPostingProcessingResult> {
  console.log("Processing job posting content...");

  try {
    // Use the centralized service with skill normalization
    const result = await processJobPostingService(content, userId, db);

    console.log(
      "Successfully processed job posting:",
      result.jobPosting.title,
      "at",
      result.jobPosting.company,
    );

    return result;
  } catch (error) {
    console.error("Error processing job posting:", error);
    throw new DocumentProcessingError(
      `Failed to process job posting: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : new Error(String(error)),
      "job_posting",
      "processing",
      { contentLength: content.length },
    );
  }
}
