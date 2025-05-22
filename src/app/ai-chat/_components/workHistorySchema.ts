import { z } from "zod";

// Work history form schema for data validation
export const workHistoryFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().default(""),
  isCurrent: z.boolean().default(false),
});

// Infer TypeScript type from the schema
export type WorkHistoryFormValues = z.infer<typeof workHistoryFormSchema>;

// Refinement schema for API validation
export const workHistorySchema = workHistoryFormSchema.refine(
  (data) => {
    // If not current job, end date should be provided
    if (!data.isCurrent && !data.endDate) {
      return false;
    }

    // If start date and end date are provided, ensure start date is before end date
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }

    return true;
  },
  {
    message: "End date must be after start date or select 'Current position'",
    path: ["endDate"],
  },
);
