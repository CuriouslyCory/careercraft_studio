"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { Prisma } from "@prisma/client";

// Use Prisma generated type with includes
type JobPosting = Prisma.JobPostingGetPayload<{
  include: {
    details: true;
    document: true;
  };
}>;

interface JobPostingHeaderProps {
  jobPosting: JobPosting;
}

export function JobPostingHeader({ jobPosting }: JobPostingHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link
          href="/dashboard/job-postings"
          className="transition-colors hover:text-gray-700"
        >
          Job Postings
        </Link>
        <span>/</span>
        <span className="text-gray-900">{jobPosting.title}</span>
      </nav>

      {/* Header with back button and title */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/job-postings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Job Postings
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {jobPosting.title}
            </h1>
            <div className="flex items-center space-x-4 text-lg text-gray-600">
              <span className="font-semibold">{jobPosting.company}</span>
              {jobPosting.location && (
                <>
                  <span>•</span>
                  <span>{jobPosting.location}</span>
                </>
              )}
              {jobPosting.industry && (
                <>
                  <span>•</span>
                  <span className="text-blue-600">{jobPosting.industry}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          {jobPosting.url && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={jobPosting.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Original
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status and metadata */}
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        {jobPosting.status && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClasses(jobPosting.status)}`}
          >
            {jobPosting.status}
          </span>
        )}
        <span>Added {new Date(jobPosting.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// Helper function for status badge styling
function getStatusBadgeClasses(status: string): string {
  switch (status.toLowerCase()) {
    case "applied":
      return "bg-blue-100 text-blue-800";
    case "interview":
      return "bg-yellow-100 text-yellow-800";
    case "offer":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "saved":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
