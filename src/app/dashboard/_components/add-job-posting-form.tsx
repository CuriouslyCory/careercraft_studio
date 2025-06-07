"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Plus } from "lucide-react";

// Field info component for displaying validation errors
function FieldInfo({ field }: { field: AnyFieldApi }) {
  return (
    <>
      {field.state.meta.isTouched && !field.state.meta.isValid ? (
        <div className="mt-1 text-sm text-red-600">
          {field.state.meta.errors.join(", ")}
        </div>
      ) : null}
      {field.state.meta.isValidating ? (
        <div className="mt-1 text-sm text-blue-600">Validating...</div>
      ) : null}
    </>
  );
}

interface AddJobPostingFormProps {
  /**
   * Callback function called when a job posting is successfully added
   * Used to refresh the job postings list
   */
  onJobPostingAdded?: () => void;
}

/**
 * Standalone form component for adding new job postings
 * Includes AI-powered parsing of job posting content and optional metadata fields
 * Uses a dialog modal to prevent page layout deformation
 */
export function AddJobPostingForm({
  onJobPostingAdded,
}: AddJobPostingFormProps) {
  const [open, setOpen] = useState(false);

  // Job posting form for pasting content and AI parsing
  const jobPostingForm = useForm({
    defaultValues: {
      content: "",
      url: "",
      status: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      // Validate required field
      if (!value.content.trim()) {
        toast.error("Job posting content is required");
        return;
      }

      // Only send fields that have values
      const dataToSubmit = Object.fromEntries(
        Object.entries(value).filter(
          ([_, fieldValue]) =>
            typeof fieldValue === "string" && fieldValue.trim() !== "",
        ),
      ) as {
        content: string;
        url?: string;
        status?: string;
        notes?: string;
      };

      parseAndStoreMutation.mutate(dataToSubmit);
    },
  });

  const parseAndStoreMutation =
    api.document.parseAndStoreJobPosting.useMutation({
      onSuccess: (result: {
        success: boolean;
        message: string;
        jobPosting: {
          id: string;
          title: string;
          company: string;
          location: string;
          industry: string | null;
        };
        skillCounts: {
          requiredSkills: number;
          bonusSkills: number;
          educationRequirements: number;
          experienceRequirements: number;
        };
      }) => {
        setOpen(false);
        jobPostingForm.reset();
        toast.success(result.message);
        onJobPostingAdded?.();
      },
      onError: (error: { message: string }) => {
        toast.error(`Failed to parse and store job posting: ${error.message}`);
      },
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:from-blue-700 hover:to-indigo-700">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Job Posting</DialogTitle>
          <DialogDescription>
            Paste the job posting content here. Our AI will automatically
            extract the title, company, location, and requirements.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void jobPostingForm.handleSubmit();
          }}
          className="space-y-4"
        >
          <jobPostingForm.Field
            name="content"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Job posting content is required" : undefined,
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm font-medium"
                >
                  Job Posting Content *
                </label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="min-h-[200px] w-full"
                  placeholder="Paste the job posting content here..."
                />
                <FieldInfo field={field} />
              </div>
            )}
          </jobPostingForm.Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <jobPostingForm.Field name="url">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="mb-1 block text-sm font-medium"
                  >
                    URL (Optional)
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="url"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="https://company.com/jobs/123"
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            </jobPostingForm.Field>
            <jobPostingForm.Field name="status">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="mb-1 block text-sm font-medium"
                  >
                    Status (Optional)
                  </label>
                  <select
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Select status</option>
                    <option value="Saved">Saved</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Offer">Offer</option>
                  </select>
                  <FieldInfo field={field} />
                </div>
              )}
            </jobPostingForm.Field>
          </div>

          <jobPostingForm.Field name="notes">
            {(field) => (
              <div>
                <label
                  htmlFor={field.name}
                  className="mb-1 block text-sm font-medium"
                >
                  Notes (Optional)
                </label>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="min-h-[60px] w-full"
                  placeholder="Your notes about this job posting..."
                />
                <FieldInfo field={field} />
              </div>
            )}
          </jobPostingForm.Field>

          <div className="flex gap-2 pt-4">
            <jobPostingForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || parseAndStoreMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {parseAndStoreMutation.isPending || isSubmitting
                    ? "Processing..."
                    : "Parse & Store Job Posting"}
                </Button>
              )}
            </jobPostingForm.Subscribe>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                jobPostingForm.reset();
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
