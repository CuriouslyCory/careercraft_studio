"use client";

import { notFound } from "next/navigation";
import { api } from "~/trpc/react";
import { JobPostingDetails } from "./job-posting-details";
import { CompatibilitySummary } from "./compatibility-summary";
import { ResumeSection } from "./resume-section";
import { CoverLetterSection } from "./cover-letter-section";
import { JobPostingHeader } from "./job-posting-header";

interface JobPostingDetailLayoutProps {
  jobPostingId: string;
}

export function JobPostingDetailLayout({
  jobPostingId,
}: JobPostingDetailLayoutProps) {
  // Fetch job posting data
  const jobPostingQuery = api.document.getJobPosting.useQuery(
    { id: jobPostingId },
    {
      retry: (failureCount, error) => {
        // Don't retry if it's a 404 - redirect to not found
        if (error.data?.code === "NOT_FOUND") {
          return false;
        }
        return failureCount < 3;
      },
    },
  );

  // Handle loading state
  if (jobPostingQuery.isLoading) {
    return <JobPostingDetailSkeleton />;
  }

  // Handle error and not found
  if (jobPostingQuery.error) {
    if (jobPostingQuery.error.data?.code === "NOT_FOUND") {
      notFound();
    }

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Error Loading Job Posting
          </h2>
          <p className="mt-2 text-gray-600">{jobPostingQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const jobPosting = jobPostingQuery.data;
  if (!jobPosting) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header with breadcrumbs and title */}
      <JobPostingHeader jobPosting={jobPosting} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          {/* Job posting details (editable) */}
          <JobPostingDetails jobPosting={jobPosting} />

          {/* Resume section */}
          <ResumeSection jobPosting={jobPosting} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Compatibility report */}
          <CompatibilitySummary
            jobPostingId={jobPostingId}
            jobTitle={jobPosting.title}
          />

          {/* Cover letter section */}
          <CoverLetterSection jobPosting={jobPosting} />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton component
function JobPostingDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="h-5 w-96 animate-pulse rounded bg-gray-200"></div>
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200"></div>
            <div className="space-y-3">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-gray-200"></div>
            <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200"></div>
            <div className="h-32 w-full animate-pulse rounded bg-gray-200"></div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <div className="mb-4 h-6 w-40 animate-pulse rounded bg-gray-200"></div>
            <div className="h-24 w-full animate-pulse rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
