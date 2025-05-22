import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type PrismaClient } from "@prisma/client";
import { parseJobPosting } from "~/server/langchain/jobPostingParser";
import { DocumentProcessingError } from "./types";

export const jobPostingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.jobPosting.findMany({
      where: { userId: ctx.session.user.id },
      include: { details: true },
      orderBy: { createdAt: "desc" },
    });
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
export async function processJobPosting(
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

    // Create the job posting details with structured requirements
    await db.jobPostingDetails.create({
      data: {
        // Required structured requirements
        technicalSkills: jobPosting.details.requirements.technicalSkills,
        softSkills: jobPosting.details.requirements.softSkills,
        educationRequirements:
          jobPosting.details.requirements.educationRequirements,
        experienceRequirements:
          jobPosting.details.requirements.experienceRequirements,
        industryKnowledge: jobPosting.details.requirements.industryKnowledge,

        // Bonus/preferred structured requirements
        bonusTechnicalSkills:
          jobPosting.details.bonusRequirements.technicalSkills,
        bonusSoftSkills: jobPosting.details.bonusRequirements.softSkills,
        bonusEducationRequirements:
          jobPosting.details.bonusRequirements.educationRequirements,
        bonusExperienceRequirements:
          jobPosting.details.bonusRequirements.experienceRequirements,
        bonusIndustryKnowledge:
          jobPosting.details.bonusRequirements.industryKnowledge,

        jobPosting: { connect: { id: createdJobPosting.id } },
      },
    });

    console.log("Successfully stored job posting and details in database");
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
