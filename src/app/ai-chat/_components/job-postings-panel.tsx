"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { markdownComponents } from "./markdown-components";
import { CompatibilityReportContent } from "./compatibility-report";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { DocumentEditor } from "./document-editor";
import { JobPostingsDataTable } from "./job-postings-data-table";
import { createJobPostingsColumns } from "./job-postings-table-columns";

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

// Use Prisma generated type with includes
type JobPosting = Prisma.JobPostingGetPayload<{
  include: {
    details: true;
    document: true;
  };
}>;

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
  const [viewingDocument, setViewingDocument] = useState<{
    jobPostingId: string;
    jobTitle: string;
    content: string;
    type: "resume" | "coverLetter";
  } | null>(null);

  const [editingDocument, setEditingDocument] = useState<{
    jobPostingId: string;
    jobTitle: string;
    content: string;
    type: "resume" | "coverLetter";
  } | null>(null);

  const queryClient = api.useUtils();
  const jobPostingsQuery = api.document.listJobPostings.useQuery();

  const generateResumeMutation =
    api.document.generateTailoredResume.useMutation({
      onSuccess: (result) => {
        void jobPostingsQuery.refetch();
        toast.success(result.message);
      },
      onError: (error) => {
        toast.error(`Failed to generate resume: ${error.message}`);
      },
    });

  const generateCoverLetterMutation =
    api.document.generateTailoredCoverLetter.useMutation({
      onSuccess: (result: {
        success: boolean;
        message: string;
        jobPostingId: string;
      }) => {
        void jobPostingsQuery.refetch();
        toast.success(result.message);
      },
      onError: (error) => {
        toast.error(`Failed to generate cover letter: ${error.message}`);
      },
    });

  const deleteDocumentMutation = api.document.deleteJobPostDocument.useMutation(
    {
      onSuccess: (result) => {
        void jobPostingsQuery.refetch();
        toast.success(result.message);
        setViewingDocument(null); // Close the viewing modal
      },
      onError: (error) => {
        toast.error(`Failed to delete document: ${error.message}`);
      },
    },
  );

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
    });
  };

  const handleCloseDocument = () => {
    setViewingDocument(null);
  };

  const handleEditDocument = (
    jobPostingId: string,
    jobTitle: string,
    content: string,
    type: "resume" | "coverLetter",
  ) => {
    setEditingDocument({
      jobPostingId,
      jobTitle,
      content,
      type,
    });
  };

  const handleCloseEdit = () => {
    setEditingDocument(null);
    void jobPostingsQuery.refetch(); // Refresh the data after editing
  };

  const handleSaveDocument = () => {
    // Refresh the data but keep the editor open
    void jobPostingsQuery.refetch();
  };

  const handleDownloadDocument = () => {
    if (!viewingDocument) return;

    const blob = new Blob([viewingDocument.content], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${viewingDocument.type}-${viewingDocument.jobTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${viewingDocument.type} downloaded!`);
  };

  const handleDeleteDocument = () => {
    if (!viewingDocument) return;

    const documentName =
      viewingDocument.type === "resume" ? "resume" : "cover letter";
    if (
      confirm(
        `Are you sure you want to delete this ${documentName}? This action cannot be undone.`,
      )
    ) {
      deleteDocumentMutation.mutate({
        jobPostingId: viewingDocument.jobPostingId,
        documentType: viewingDocument.type,
      });
    }
  };

  const handleGenerateCoverLetter = (jobPostingId: string) => {
    generateCoverLetterMutation.mutate({
      jobPostingId,
    });
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

  // Show document editor if one is being edited
  if (editingDocument) {
    return (
      <DocumentEditor
        jobPostingId={editingDocument.jobPostingId}
        jobTitle={editingDocument.jobTitle}
        initialContent={editingDocument.content}
        documentType={editingDocument.type}
        onSave={handleSaveDocument}
        onCancel={handleCloseEdit}
      />
    );
  }

  // Show document if one is being viewed
  if (viewingDocument) {
    return (
      <div className="h-full space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {viewingDocument.type === "resume" ? "Resume" : "Cover Letter"} for{" "}
            {viewingDocument.jobTitle}
          </h2>
          <div className="flex gap-2">
            <Button
              onClick={handleDownloadDocument}
              className="bg-green-600 hover:bg-green-700"
            >
              Download{" "}
              {viewingDocument.type === "resume" ? "Resume" : "Cover Letter"}
            </Button>
            <Button
              onClick={handleDeleteDocument}
              disabled={deleteDocumentMutation.isPending}
              variant="destructive"
            >
              {deleteDocumentMutation.isPending
                ? "Deleting..."
                : `Delete ${viewingDocument.type === "resume" ? "Resume" : "Cover Letter"}`}
            </Button>
            <Button variant="outline" onClick={handleCloseDocument}>
              Back to Job Postings
            </Button>
          </div>
        </div>
        <div className="h-full overflow-y-auto rounded-lg border bg-white p-6">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown components={markdownComponents}>
              {viewingDocument.content}
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

      {/* Edit Job Posting Modal */}
      {editId && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Edit Job Posting</h3>
              <Button variant="outline" onClick={() => setEditId(null)}>
                Cancel
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void editJobForm.handleSubmit();
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <editJobForm.Field name="title">
                    {(field) => (
                      <div>
                        <label
                          htmlFor={field.name}
                          className="mb-1 block text-sm font-medium"
                        >
                          Title
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                  <editJobForm.Field name="company">
                    {(field) => (
                      <div>
                        <label
                          htmlFor={field.name}
                          className="mb-1 block text-sm font-medium"
                        >
                          Company
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                  <editJobForm.Field name="location">
                    {(field) => (
                      <div>
                        <label
                          htmlFor={field.name}
                          className="mb-1 block text-sm font-medium"
                        >
                          Location
                        </label>
                        <input
                          id={field.name}
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full rounded border px-3 py-2 text-sm"
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                  <editJobForm.Field name="industry">
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
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                  <editJobForm.Field name="url">
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
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                  <editJobForm.Field name="status">
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
                  </editJobForm.Field>
                </div>
                <div className="mt-4">
                  <editJobForm.Field name="content">
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
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                </div>
                <div className="mt-4">
                  <editJobForm.Field name="notes">
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
                        />
                        <FieldInfo field={field} />
                      </div>
                    )}
                  </editJobForm.Field>
                </div>
                <div className="mt-6 flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Job{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Postings
          </span>
        </h2>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:from-blue-700 hover:to-indigo-700"
          >
            {showAddForm ? "Cancel" : <Plus />}
          </Button>
        </div>
      </div>

      {/* Add New Job Posting Form */}
      {showAddForm && (
        <div className="mb-6 rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <h3 className="mb-6 text-xl font-bold text-gray-900">
            Add New Job Posting
          </h3>
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
        <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m-8 0V6a2 2 0 00-2 2v6.341"
              />
            </svg>
          </div>
          <p className="font-medium text-gray-600">No job postings found</p>
          <p className="mt-1 text-sm text-gray-500">
            Add a job posting to start tracking your applications.
          </p>
        </div>
      ) : (
        <JobPostingsDataTable
          columns={createJobPostingsColumns(
            handleEdit,
            handleDelete,
            handleViewContent,
            handleViewCompatibility,
            handleGenerateResume,
            handleGenerateCoverLetter,
            handleEditDocument,
            (jobPostingId: string) =>
              generateResumeMutation.isPending &&
              generateResumeMutation.variables?.jobPostingId === jobPostingId,
            (jobPostingId: string) =>
              generateCoverLetterMutation.isPending &&
              generateCoverLetterMutation.variables?.jobPostingId ===
                jobPostingId,
            deleteMutation.isPending,
          )}
          data={jobPostings}
        />
      )}
    </div>
  );
}
