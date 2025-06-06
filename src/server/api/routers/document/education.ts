import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { EducationType, type PrismaClient } from "@prisma/client";
import { DocumentProcessingError, validateEducationType } from "./types";

export const educationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.education.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { dateCompleted: "desc" },
    });
  }),

  create: protectedProcedure
    .input(
      z
        .object({
          type: z.nativeEnum(EducationType),
          institutionName: z.string(),
          degreeOrCertName: z.string().optional(),
          description: z.string().optional(),
          dateCompleted: z.string().optional(),
        })
        .refine(
          (data) => {
            // Institution name is required unless it's CPD or OTHER
            if (
              data.type !== "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
              data.type !== "OTHER" &&
              !data.institutionName.trim()
            ) {
              return false;
            }
            return true;
          },
          {
            message: "Institution name is required",
            path: ["institutionName"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate education type
        const validatedType = validateEducationType(input.type, "type");

        return ctx.db.education.create({
          data: {
            ...input,
            type: validatedType,
            dateCompleted: input.dateCompleted?.trim()
              ? new Date(input.dateCompleted)
              : null,
            user: { connect: { id: ctx.session.user.id } },
          },
        });
      } catch (error) {
        if (error instanceof DocumentProcessingError) {
          throw new DocumentProcessingError(
            `Invalid education type provided: ${error.message}`,
            error,
            "education",
            "validation",
            { providedType: input.type },
          );
        }
        throw error;
      }
    }),

  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string(),
          type: z.nativeEnum(EducationType).optional(),
          institutionName: z.string().optional(),
          degreeOrCertName: z.string().optional(),
          description: z.string().optional(),
          dateCompleted: z.string().optional(),
        })
        .refine(
          (data) => {
            // Institution name is required unless it's CPD or OTHER (only validate if both type and institutionName are provided)
            if (data.type && data.institutionName !== undefined) {
              if (
                data.type !== "CONTINUOUS_PROFESSIONAL_DEVELOPMENT" &&
                data.type !== "OTHER" &&
                !data.institutionName.trim()
              ) {
                return false;
              }
            }
            return true;
          },
          {
            message: "Institution name is required",
            path: ["institutionName"],
          },
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      try {
        // Validate education type if provided
        const validatedType = data.type
          ? validateEducationType(data.type, "type")
          : undefined;

        return ctx.db.education.update({
          where: { id, userId: ctx.session.user.id },
          data: {
            ...data,
            ...(validatedType ? { type: validatedType } : {}),
            // Only set dateCompleted if it's a non-empty string
            dateCompleted: data.dateCompleted?.trim()
              ? new Date(data.dateCompleted)
              : null,
          },
        });
      } catch (error) {
        if (error instanceof DocumentProcessingError) {
          throw new DocumentProcessingError(
            `Invalid education type provided: ${error.message}`,
            error,
            "education",
            "validation",
            { educationId: id, providedType: data.type },
          );
        }
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.education.delete({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});

// Helper function for processing education from parsed resumes
export async function processEducation(
  educationData: Array<{
    type?: string;
    institutionName?: string;
    degreeOrCertName?: string;
    description?: string;
    dateCompleted?: Date;
  }>,
  userId: string,
  ctx: { db: PrismaClient },
) {
  for (const eduRaw of educationData) {
    const edu = eduRaw;
    await ctx.db.education.create({
      data: {
        type: (edu.type as EducationType) ?? "OTHER",
        institutionName: edu.institutionName ?? "",
        degreeOrCertName: edu.degreeOrCertName,
        description: edu.description ?? "",
        dateCompleted: edu.dateCompleted,
        user: { connect: { id: userId } },
      },
    });
  }
}
