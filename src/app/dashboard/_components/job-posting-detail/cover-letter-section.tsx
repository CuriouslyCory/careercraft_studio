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

interface CoverLetterSectionProps {
  jobPosting: JobPosting;
}

export function CoverLetterSection({ jobPosting }: CoverLetterSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch job post document (contains cover letter if exists)
  const jobPostDocQuery = api.document.getJobPostDocument.useQuery({
    jobPostingId: jobPosting.id,
  });

  // Generate tailored cover letter mutation
  const generateCoverLetterMutation =
    api.document.generateTailoredCoverLetter.useMutation({
      onSuccess: () => {
        toast.success("Cover letter generated successfully!");
        void jobPostDocQuery.refetch();
        setIsGenerating(false);
      },
      onError: (error) => {
        toast.error(`Failed to generate cover letter: ${error.message}`);
        setIsGenerating(false);
      },
    });

  const handleGenerateCoverLetter = () => {
    setIsGenerating(true);
    generateCoverLetterMutation.mutate({
      jobPostingId: jobPosting.id,
    });
  };

  if (jobPostDocQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Cover Letter</h2>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Loading cover letter...</p>
          </div>
        </div>
      </div>
    );
  }

  const jobPostDocument = jobPostDocQuery.data;
  const hasCoverLetter = jobPostDocument?.coverLetterContent;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Cover Letter</h2>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateCoverLetter}
            disabled={isGenerating || generateCoverLetterMutation.isPending}
          >
            <Plus className="mr-1 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Cover Letter"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {hasCoverLetter ? (
          <>
            {/* Cover Letter Preview */}
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Cover Letter for {jobPosting.company}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Generated{" "}
                        {new Date(
                          jobPostDocument.coverLetterGeneratedAt!,
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Cover letter content preview */}
                    <div className="max-w-md">
                      <p className="line-clamp-3 text-sm text-gray-700">
                        {jobPostDocument.coverLetterContent!.substring(0, 150)}
                        ...
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button size="sm" asChild>
                    <Link
                      href={`/dashboard/document-editor?jobPostingId=${jobPosting.id}&documentType=coverLetter&jobTitle=${encodeURIComponent(jobPosting.title)}`}
                    >
                      Edit Cover Letter
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Regeneration option */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Want a fresh version?</p>
                  <p>
                    Generate a new cover letter with updated content and
                    approach.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateCoverLetter}
                  disabled={
                    isGenerating || generateCoverLetterMutation.isPending
                  }
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* No cover letter available */
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>

            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Cover Letter Found
            </h3>
            <p className="mx-auto mb-4 max-w-sm text-gray-600">
              Generate a tailored cover letter for this job posting to increase
              your chances of getting noticed.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button
                onClick={handleGenerateCoverLetter}
                disabled={isGenerating || generateCoverLetterMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate Cover Letter"}
              </Button>

              <Button variant="outline" asChild>
                <Link
                  href={`/dashboard/document-editor?jobPostingId=${jobPosting.id}&documentType=coverLetter&jobTitle=${encodeURIComponent(jobPosting.title)}`}
                >
                  Write Manually
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Generation status */}
        {isGenerating && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent"></div>
              <div>
                <p className="text-sm font-medium text-green-900">
                  Generating your tailored cover letter...
                </p>
                <p className="text-xs text-green-700">
                  This may take a few moments as we analyze the job requirements
                  and craft a personalized letter.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
