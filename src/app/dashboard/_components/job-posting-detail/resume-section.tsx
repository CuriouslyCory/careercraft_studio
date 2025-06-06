"use client";

import { useState } from "react";
import { FileText, Plus, Eye, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

// Use Prisma generated type with includes
type JobPosting = Prisma.JobPostingGetPayload<{
  include: {
    details: true;
    document: true;
  };
}>;

interface ResumeSectionProps {
  jobPosting: JobPosting;
}

export function ResumeSection({ jobPosting }: ResumeSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch the job post document (resume/cover letter content)
  const jobPostDocumentQuery = api.document.getJobPostDocument.useQuery({
    jobPostingId: jobPosting.id,
  });

  // Generate tailored resume mutation
  const generateResumeMutation =
    api.document.generateTailoredResume.useMutation({
      onSuccess: () => {
        toast.success("Resume generated successfully!");
        setIsGenerating(false);
        // Refetch the job post document to get the updated resume
        void jobPostDocumentQuery.refetch();
      },
      onError: (error) => {
        toast.error(`Failed to generate resume: ${error.message}`);
        setIsGenerating(false);
      },
    });

  const handleGenerateResume = () => {
    setIsGenerating(true);
    generateResumeMutation.mutate({
      jobPostingId: jobPosting.id,
    });
  };

  // Use the document associated with this job posting
  const jobPostDocument = jobPostDocumentQuery.data;
  const hasResume = jobPostDocument?.resumeContent;

  if (jobPostDocumentQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Resume</h2>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Loading resumes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Resume</h2>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateResume}
            disabled={isGenerating || generateResumeMutation.isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Tailored Resume"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {hasResume ? (
          <>
            {/* Resume Preview */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Tailored Resume for {jobPosting.company}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generated{" "}
                        {jobPostDocument?.resumeGeneratedAt
                          ? new Date(
                              jobPostDocument.resumeGeneratedAt,
                            ).toLocaleDateString()
                          : "recently"}
                      </p>
                    </div>

                    {/* Resume content preview */}
                    {jobPostDocument?.resumeContent && (
                      <div className="max-w-md">
                        <p className="line-clamp-3 text-sm text-gray-700">
                          {jobPostDocument.resumeContent.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button size="sm" asChild>
                    <Link
                      href={`/dashboard/document-editor?jobPostingId=${jobPosting.id}&documentType=resume&jobTitle=${encodeURIComponent(jobPosting.title)}`}
                    >
                      Edit Resume
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Regenerate option */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Want to regenerate your resume?
                  </p>
                  <p className="text-xs text-blue-700">
                    This will create a new tailored version based on your latest
                    profile.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateResume}
                  disabled={isGenerating || generateResumeMutation.isPending}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {isGenerating ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No resume available */
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>

            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Resume Found
            </h3>
            <p className="mx-auto mb-4 max-w-sm text-gray-600">
              Generate a tailored resume for this job posting or upload an
              existing resume to get started.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={handleGenerateResume}
                disabled={isGenerating || generateResumeMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Tailored Resume"}
              </Button>

              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/document-editor?jobPostingId=${jobPosting.id}&documentType=resume&jobTitle=${encodeURIComponent(jobPosting.title)}`}
                >
                  Create Resume Manually
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Generation status */}
        {isGenerating && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Generating your tailored resume...
                </p>
                <p className="text-xs text-blue-700">
                  This may take a few moments as we analyze the job requirements
                  and match them with your experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
