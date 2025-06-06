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
    router.push("/ai-chat/job-postings");
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

  // Show error state if job posting not found or missing parameters
  if (
    !jobPostingId ||
    !documentType ||
    !jobTitle ||
    jobPostingQuery.error ||
    !jobPostingQuery.data
  ) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Document Not Found
          </h2>
          <p className="mt-2 text-gray-600">
            {!jobPostingId || !documentType || !jobTitle
              ? "Missing required parameters to load the document."
              : "The requested document could not be found."}
          </p>
        </div>
        <Button onClick={handleCancel} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Postings
        </Button>
      </div>
    );
  }

  const jobPosting = jobPostingQuery.data;
  const documentContent =
    documentType === "resume"
      ? jobPosting.document?.resumeContent
      : jobPosting.document?.coverLetterContent;

  // Show message if document content doesn't exist yet
  if (!documentContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            No {documentType === "resume" ? "Resume" : "Cover Letter"} Found
          </h2>
          <p className="mt-2 text-gray-600">
            No {documentType === "resume" ? "resume" : "cover letter"} has been
            generated for this job posting yet.
          </p>
        </div>
        <Button onClick={handleCancel} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Postings
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {documentType === "resume" ? "Resume" : "Cover Letter"} Editor
          </h1>
          <p className="text-gray-600">
            Editing {documentType === "resume" ? "resume" : "cover letter"} for{" "}
            <span className="font-medium">{jobTitle}</span>
          </p>
        </div>
        <Button onClick={handleCancel} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Job Postings
        </Button>
      </div>

      {/* Document Editor */}
      <DocumentEditor
        jobPostingId={jobPostingId}
        jobTitle={jobTitle}
        documentType={documentType}
        initialContent={documentContent}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
