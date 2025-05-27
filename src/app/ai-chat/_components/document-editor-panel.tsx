"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { DocumentEditor } from "./document-editor";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Document Editor Panel that handles editing documents based on URL parameters
 * Expected URL params: jobPostingId, documentType, jobTitle
 */
export function DocumentEditorPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const jobPostingId = searchParams.get("jobPostingId");
  const documentType = searchParams.get("documentType") as
    | "resume"
    | "coverLetter";
  const jobTitle = searchParams.get("jobTitle");

  // Fetch the job posting to get the document content
  const jobPostingQuery = api.document.getJobPosting.useQuery(
    { id: jobPostingId! },
    { enabled: !!jobPostingId },
  );

  const handleSave = () => {
    // Refresh the job posting data
    void jobPostingQuery.refetch();
  };

  const handleCancel = () => {
    // Navigate back to job postings
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete("jobPostingId");
    params.delete("documentType");
    params.delete("jobTitle");
    params.set("bio", "jobPostings");
    router.push(`?${params.toString()}`);
  };

  // Show loading state while fetching job posting
  if (jobPostingQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Show error state if job posting not found
  if (jobPostingQuery.error || !jobPostingQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">
            {jobPostingQuery.error?.message || "Document not found"}
          </p>
          <Button onClick={handleCancel} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Postings
          </Button>
        </div>
      </div>
    );
  }

  // Validate required parameters
  if (!jobPostingId || !documentType || !jobTitle) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">Missing required parameters</p>
          <Button onClick={handleCancel} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Postings
          </Button>
        </div>
      </div>
    );
  }

  const jobPosting = jobPostingQuery.data;
  const documentContent =
    documentType === "resume"
      ? jobPosting.document?.resumeContent
      : jobPosting.document?.coverLetterContent;

  // Show message if document doesn't exist
  if (!documentContent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">
            No {documentType === "resume" ? "resume" : "cover letter"} found for
            this job posting
          </p>
          <Button onClick={handleCancel} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Postings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DocumentEditor
      jobPostingId={jobPostingId}
      jobTitle={jobTitle}
      initialContent={documentContent}
      documentType={documentType}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
