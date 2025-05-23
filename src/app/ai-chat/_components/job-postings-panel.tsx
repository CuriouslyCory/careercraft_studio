"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "./markdown-components";
import { CompatibilityReportContent } from "./compatibility-report";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { JsonValue } from "@prisma/client/runtime/library";

interface JobPostingFormData {
  title: string;
  content: string;
  company: string;
  location: string;
  industry: string;
  url: string;
  status: string;
  notes: string;
}

type JobPosting = {
  id: string;
  title: string;
  content: string;
  company: string;
  location: string;
  industry: string | null;
  url: string | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  details: {
    id: string;
    technicalSkills: string[];
    softSkills: string[];
    educationRequirements: string[];
    experienceRequirements: JsonValue[];
    industryKnowledge: string[];
    bonusTechnicalSkills: string[];
    bonusSoftSkills: string[];
    bonusEducationRequirements: string[];
    bonusExperienceRequirements: JsonValue[];
    bonusIndustryKnowledge: string[];
    createdAt: Date;
    updatedAt: Date;
    jobPostingId: string;
  } | null;
};

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

export function JobPostingsPanel() {
  const [editId, setEditId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewContent, setViewContent] = useState<{
    id: string;
    content: string;
    title: string;
  } | null>(null);
  const [compatibilityReport, setCompatibilityReport] = useState<{
    jobPostingId: string;
    jobTitle: string;
  } | null>(null);
  const [generatedResume, setGeneratedResume] = useState<{
    jobPostingId: string;
    jobTitle: string;
    resumeData: string;
    format: "structured" | "markdown";
  } | null>(null);

  const queryClient = api.useUtils();
  const jobPostingsQuery = api.document.listJobPostings.useQuery();

  const migrateMutation = api.compatibility.migrateJobPostings.useMutation({
    onSuccess: (result) => {
      void jobPostingsQuery.refetch();
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(`Migration failed: ${error.message}`);
    },
  });

  const generateResumeMutation =
    api.document.generateTailoredResume.useMutation({
      onSuccess: (result, variables) => {
        const jobPosting = jobPostingsQuery.data?.find(
          (job) => job.id === variables.jobPostingId,
        );
        if (jobPosting && typeof result.data === "string") {
          setGeneratedResume({
            jobPostingId: variables.jobPostingId,
            jobTitle: jobPosting.title,
            resumeData: result.data,
            format: result.format,
          });
          toast.success("Resume generated successfully!");
        }
      },
      onError: (error) => {
        toast.error(`Failed to generate resume: ${error.message}`);
      },
    });

  // Add new job posting form
  const addJobForm = useForm({
    defaultValues: {
      title: "",
      content: "",
      company: "",
      location: "",
      industry: "",
      url: "",
      status: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      // Validate required fields
      if (
        !value.title.trim() ||
        !value.company.trim() ||
        !value.location.trim()
      ) {
        toast.error("Title, Company, and Location are required fields");
        return;
      }

      // Only send fields that have values
      const dataToCreate = Object.fromEntries(
        Object.entries(value).filter(
          ([_, fieldValue]) =>
            typeof fieldValue === "string" && fieldValue.trim() !== "",
        ),
      ) as {
        title: string;
        content: string;
        company: string;
        location: string;
        industry?: string;
        url?: string;
        status?: string;
        notes?: string;
      };

      createMutation.mutate(dataToCreate);
    },
  });

  // Edit job posting form
  const editJobForm = useForm({
    defaultValues: {
      title: "",
      content: "",
      company: "",
      location: "",
      industry: "",
      url: "",
      status: "",
      notes: "",
    },
    onSubmit: async ({ value }) => {
      if (!editId) return;

      // Only send fields that have values
      const dataToUpdate = Object.fromEntries(
        Object.entries(value).filter(
          ([_, fieldValue]) =>
            typeof fieldValue === "string" && fieldValue.trim() !== "",
        ),
      ) as Partial<Omit<JobPostingFormData, "id">>;

      updateMutation.mutate({
        id: editId,
        ...dataToUpdate,
      });
    },
  });

  const updateMutation = api.document.updateJobPosting.useMutation({
    onSuccess: () => {
      void jobPostingsQuery.refetch();
      setEditId(null);
      toast.success("Job posting updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update job posting: ${error.message}`);
    },
  });

  const createMutation = api.document.createJobPosting.useMutation({
    onSuccess: () => {
      void jobPostingsQuery.refetch();
      setShowAddForm(false);
      addJobForm.reset();
      toast.success("Job posting created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create job posting: ${error.message}`);
    },
  });

  const deleteMutation = api.document.deleteJobPosting.useMutation({
    onMutate: async (deleteData) => {
      // Cancel any outgoing refetches
      await queryClient.document.listJobPostings.cancel();

      // Save the current state
      const previousJobPostings = jobPostingsQuery.data ?? [];

      // Optimistically update the UI
      queryClient.document.listJobPostings.setData(undefined, (old) => {
        return old ? old.filter((job) => job.id !== deleteData.id) : [];
      });

      // Return the previous state in case we need to revert
      return { previousJobPostings };
    },
    onError: (err, _deleteData, context) => {
      // If the mutation fails, restore the previous job postings
      if (context?.previousJobPostings) {
        queryClient.document.listJobPostings.setData(
          undefined,
          context.previousJobPostings,
        );
      }
      toast.error(`Failed to delete job posting: ${err.message}`);
    },
    onSettled: (data, error) => {
      // Sync with server
      void queryClient.document.listJobPostings.invalidate();

      // Show success toast if no error
      if (!error) {
        toast.success("Job posting deleted successfully");
      }
    },
  });

  const handleEdit = (jobPosting: JobPosting) => {
    setEditId(jobPosting.id);
    editJobForm.setFieldValue("title", jobPosting.title ?? "");
    editJobForm.setFieldValue("content", jobPosting.content ?? "");
    editJobForm.setFieldValue("company", jobPosting.company ?? "");
    editJobForm.setFieldValue("location", jobPosting.location ?? "");
    editJobForm.setFieldValue("industry", jobPosting.industry ?? "");
    editJobForm.setFieldValue("url", jobPosting.url ?? "");
    editJobForm.setFieldValue("status", jobPosting.status ?? "");
    editJobForm.setFieldValue("notes", jobPosting.notes ?? "");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this job posting?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleViewContent = (id: string, content: string, title: string) => {
    setViewContent({ id, content, title });
  };

  const handleCloseContent = () => {
    setViewContent(null);
  };

  const handleViewCompatibility = (jobPostingId: string, jobTitle: string) => {
    setCompatibilityReport({ jobPostingId, jobTitle });
  };

  const handleCloseCompatibility = () => {
    setCompatibilityReport(null);
  };

  const handleGenerateResume = (jobPostingId: string) => {
    generateResumeMutation.mutate({
      jobPostingId,
      format: "markdown", // Default to markdown format for better readability
    });
  };

  const handleCloseResume = () => {
    setGeneratedResume(null);
  };

  const handleDownloadResume = () => {
    if (!generatedResume) return;

    const blob = new Blob([generatedResume.resumeData], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resume-${generatedResume.jobTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Resume downloaded!");
  };

  if (jobPostingsQuery.isLoading) {
    return <div className="p-4 text-center">Loading your job postings...</div>;
  }

  if (jobPostingsQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading job postings: {jobPostingsQuery.error.message}
      </div>
    );
  }

  const jobPostings = jobPostingsQuery.data ?? [];

  // Show compatibility report if one is selected
  if (compatibilityReport) {
    return (
      <CompatibilityReportContent
        jobPostingId={compatibilityReport.jobPostingId}
        jobTitle={compatibilityReport.jobTitle}
        onBack={handleCloseCompatibility}
      />
    );
  }

  // Show generated resume if one is available
  if (generatedResume) {
    return (
      <div className="h-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Generated Resume for {generatedResume.jobTitle}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadResume}
              className="bg-green-600 hover:bg-green-700"
            >
              Download Resume
            </Button>
            <Button variant="outline" onClick={handleCloseResume}>
              Back to Job Postings
            </Button>
          </div>
        </div>
        <div className="h-full overflow-y-auto rounded-lg border bg-white p-6">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {generatedResume.resumeData}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Content View Modal */}
      {viewContent && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">{viewContent.title}</h3>
              <Button variant="outline" onClick={handleCloseContent}>
                Close
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {viewContent.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Job Postings</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending}
            variant="outline"
            className="text-blue-600 hover:bg-blue-50"
          >
            {migrateMutation.isPending
              ? "Migrating..."
              : "Fix Compatibility Analysis"}
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showAddForm ? "Cancel" : "Add Job Posting"}
          </Button>
        </div>
      </div>

      {/* Add New Job Posting Form */}
      {showAddForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-4 text-lg font-medium">Add New Job Posting</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void addJobForm.handleSubmit();
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <addJobForm.Field
                name="title"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "Title is required" : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Title *
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="Software Engineer"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addJobForm.Field>
              <addJobForm.Field
                name="company"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "Company is required" : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Company *
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="Acme Corp"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addJobForm.Field>
              <addJobForm.Field
                name="location"
                validators={{
                  onChange: ({ value }) =>
                    !value.trim() ? "Location is required" : undefined,
                }}
              >
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Location *
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="San Francisco, CA"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addJobForm.Field>
              <addJobForm.Field name="industry">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Industry
                    </label>
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full rounded border px-3 py-2 text-sm"
                      placeholder="Technology"
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addJobForm.Field>
              <addJobForm.Field name="url">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      URL
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
              </addJobForm.Field>
              <addJobForm.Field name="status">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Status
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
              </addJobForm.Field>
            </div>
            <div className="mt-4">
              <addJobForm.Field name="content">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Content
                    </label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="min-h-[100px] w-full"
                      placeholder="Paste the job posting description here..."
                    />
                    <FieldInfo field={field} />
                  </div>
                )}
              </addJobForm.Field>
            </div>
            <div className="mt-4">
              <addJobForm.Field name="notes">
                {(field) => (
                  <div>
                    <label
                      htmlFor={field.name}
                      className="mb-1 block text-sm font-medium"
                    >
                      Notes
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
              </addJobForm.Field>
            </div>
            <div className="mt-4 flex gap-2">
              <addJobForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    disabled={!canSubmit || createMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {createMutation.isPending || isSubmitting
                      ? "Creating..."
                      : "Create Job Posting"}
                  </Button>
                )}
              </addJobForm.Subscribe>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Job Postings List */}
      {jobPostings.length === 0 ? (
        <p className="text-center text-gray-500">
          No job postings found. Add one to get started.
        </p>
      ) : (
        <div className="overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-left">Company</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Date Added</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobPostings.map((job) => (
                <tr key={job.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">
                    {editId === job.id ? (
                      <editJobForm.Field name="title">
                        {(field) => (
                          <input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border px-2 py-1 text-sm"
                          />
                        )}
                      </editJobForm.Field>
                    ) : (
                      <div className="font-medium">{job.title}</div>
                    )}
                  </td>
                  <td className="p-2">
                    {editId === job.id ? (
                      <editJobForm.Field name="company">
                        {(field) => (
                          <input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border px-2 py-1 text-sm"
                          />
                        )}
                      </editJobForm.Field>
                    ) : (
                      job.company
                    )}
                  </td>
                  <td className="p-2">
                    {editId === job.id ? (
                      <editJobForm.Field name="location">
                        {(field) => (
                          <input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border px-2 py-1 text-sm"
                          />
                        )}
                      </editJobForm.Field>
                    ) : (
                      job.location
                    )}
                  </td>
                  <td className="p-2">
                    {editId === job.id ? (
                      <editJobForm.Field name="status">
                        {(field) => (
                          <select
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full rounded border px-2 py-1 text-sm"
                          >
                            <option value="">Select status</option>
                            <option value="Saved">Saved</option>
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Offer">Offer</option>
                          </select>
                        )}
                      </editJobForm.Field>
                    ) : (
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-xs",
                          job.status === "Applied" &&
                            "bg-blue-100 text-blue-800",
                          job.status === "Interview" &&
                            "bg-yellow-100 text-yellow-800",
                          job.status === "Offer" &&
                            "bg-green-100 text-green-800",
                          job.status === "Rejected" &&
                            "bg-red-100 text-red-800",
                          !job.status && "bg-gray-100 text-gray-800",
                        )}
                      >
                        {job.status ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-sm text-gray-600">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="space-x-2 p-2">
                    {editId === job.id ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void editJobForm.handleSubmit()}
                          disabled={updateMutation.isPending}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(job)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleViewContent(
                              String(job.id),
                              String(job.content),
                              String(job.title),
                            )
                          }
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleViewCompatibility(job.id, job.title)
                          }
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          Compatibility
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateResume(job.id)}
                          disabled={generateResumeMutation.isPending}
                          className="text-green-600 hover:bg-green-50"
                        >
                          {generateResumeMutation.isPending &&
                          generateResumeMutation.variables?.jobPostingId ===
                            job.id
                            ? "Generating..."
                            : "Generate Resume"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(job.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
