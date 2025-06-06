"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ArrowUpDown,
  FileTextIcon,
  MailIcon,
  EditIcon,
  Eye,
  Trash2,
  ExternalLink,
} from "lucide-react";
import type { Prisma } from "@prisma/client";
import { useState } from "react";

// Use Prisma generated type with includes
type JobPosting = Prisma.JobPostingGetPayload<{
  include: {
    details: true;
    document: true;
  };
}>;

/**
 * Available status options for job postings
 */
const STATUS_OPTIONS = [
  { value: "none", label: "No Status" },
  { value: "Saved", label: "Saved" },
  { value: "Applied", label: "Applied" },
  { value: "Interview", label: "Interview" },
  { value: "Rejected", label: "Rejected" },
  { value: "Offer", label: "Offer" },
] as const;

/**
 * Get color classes for status badges
 */
const getStatusColor = (status: string | null) => {
  switch (status) {
    case "Applied":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Interview":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Offer":
      return "bg-green-100 text-green-800 border-green-200";
    case "Rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "Saved":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

/**
 * Inline status dropdown component for editing job posting status
 */
export function InlineStatusDropdown({
  jobId,
  currentStatus,
  onStatusUpdate,
  isUpdating,
}: {
  jobId: string;
  currentStatus: string | null;
  onStatusUpdate: (jobId: string, status: string) => void;
  isUpdating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    // Convert "none" back to empty string for the API
    const statusToSend = newStatus === "none" ? "" : newStatus;
    onStatusUpdate(jobId, statusToSend);
    setIsOpen(false);
  };

  // Convert null/empty to "none" for the Select component
  const selectValue = currentStatus ?? "none";

  return (
    <Select
      value={selectValue}
      onValueChange={handleStatusChange}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={isUpdating}
    >
      <SelectTrigger
        className={`hover:bg-opacity-80 inline-flex h-auto w-auto rounded-full border px-2 py-1 text-xs font-medium ${getStatusColor(currentStatus)} ${
          isUpdating ? "opacity-50" : "cursor-pointer"
        }`}
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering the context menu
          setIsOpen(true);
        }}
      >
        <SelectValue>
          {isUpdating ? "Updating..." : (currentStatus ?? "No Status")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Context menu component for job posting actions
 */
export function JobPostingContextMenu({
  job,
  onEdit,
  onDelete,
  onViewContent,
  onViewCompatibility,
  onGenerateResume,
  onGenerateCoverLetter,
  onEditDocument,
  isGeneratingResume,
  isGeneratingCoverLetter,
  isDeleting,
  onViewDetails,
  children,
}: {
  job: JobPosting;
  onEdit: (job: JobPosting) => void;
  onDelete: (id: string) => void;
  onViewContent: (id: string, content: string, title: string) => void;
  onViewCompatibility: (jobPostingId: string, jobTitle: string) => void;
  onGenerateResume: (jobPostingId: string) => void;
  onGenerateCoverLetter: (jobPostingId: string) => void;
  onEditDocument: (
    jobPostingId: string,
    jobTitle: string,
    content: string,
    type: "resume" | "coverLetter",
  ) => void;
  isGeneratingResume: (jobPostingId: string) => boolean;
  isGeneratingCoverLetter: (jobPostingId: string) => boolean;
  isDeleting: boolean;
  onViewDetails?: (jobPostingId: string) => void;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Regular click opens job posting details
    onViewDetails?.(job.id);
  };

  return (
    <div className="relative">
      <div
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        className="cursor-pointer"
      >
        {children}
      </div>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            onClick={() => onViewDetails?.(job.id)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onEdit(job)}
            className="cursor-pointer"
          >
            <EditIcon className="mr-2 h-4 w-4" />
            Edit Job Posting
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onViewContent(job.id, job.content ?? "", job.title)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View Content
          </DropdownMenuItem>

          {job.url && (
            <DropdownMenuItem asChild>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Job URL
              </a>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onViewCompatibility(job.id, job.title)}
            className="cursor-pointer text-blue-600"
          >
            <FileTextIcon className="mr-2 h-4 w-4" />
            Compatibility Report
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {job.document?.resumeContent ? (
            <DropdownMenuItem
              onClick={() =>
                onEditDocument(
                  job.id,
                  job.title,
                  job.document?.resumeContent ?? "",
                  "resume",
                )
              }
              className="cursor-pointer text-green-600"
            >
              <FileTextIcon className="mr-2 h-4 w-4" />
              View Resume
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onGenerateResume(job.id)}
              disabled={isGeneratingResume(job.id)}
              className="cursor-pointer text-green-600"
            >
              <FileTextIcon className="mr-2 h-4 w-4" />
              {isGeneratingResume(job.id)
                ? "Generating Resume..."
                : "Generate Resume"}
            </DropdownMenuItem>
          )}

          {job.document?.coverLetterContent ? (
            <DropdownMenuItem
              onClick={() =>
                onEditDocument(
                  job.id,
                  job.title,
                  job.document?.coverLetterContent ?? "",
                  "coverLetter",
                )
              }
              className="cursor-pointer text-purple-600"
            >
              <MailIcon className="mr-2 h-4 w-4" />
              View Cover Letter
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => onGenerateCoverLetter(job.id)}
              disabled={isGeneratingCoverLetter(job.id)}
              className="cursor-pointer text-purple-600"
            >
              <MailIcon className="mr-2 h-4 w-4" />
              {isGeneratingCoverLetter(job.id)
                ? "Generating Cover Letter..."
                : "Generate Cover Letter"}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onDelete(job.id)}
            disabled={isDeleting}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Job Posting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Column definitions for the job postings data table
 */
export const createJobPostingsColumns = (
  onEdit: (job: JobPosting) => void,
  onDelete: (id: string) => void,
  onViewContent: (id: string, content: string, title: string) => void,
  onViewCompatibility: (jobPostingId: string, jobTitle: string) => void,
  onGenerateResume: (jobPostingId: string) => void,
  onGenerateCoverLetter: (jobPostingId: string) => void,
  onEditDocument: (
    jobPostingId: string,
    jobTitle: string,
    content: string,
    type: "resume" | "coverLetter",
  ) => void,
  isGeneratingResume: (jobPostingId: string) => boolean,
  isGeneratingCoverLetter: (jobPostingId: string) => boolean,
  isDeleting: boolean,
  onStatusUpdate: (jobId: string, status: string) => void,
  isUpdatingStatus: (jobId: string) => boolean,
  onViewDetails?: (jobPostingId: string) => void,
): ColumnDef<JobPosting>[] => [
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const job = row.original;
      return (
        <JobPostingContextMenu
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewContent={onViewContent}
          onViewCompatibility={onViewCompatibility}
          onGenerateResume={onGenerateResume}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onEditDocument={onEditDocument}
          isGeneratingResume={isGeneratingResume}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          isDeleting={isDeleting}
          onViewDetails={onViewDetails}
        >
          <div className="space-y-1">
            <div className="font-medium text-gray-900">{job.title}</div>
            {job.industry && (
              <div className="text-xs text-gray-500">{job.industry}</div>
            )}
          </div>
        </JobPostingContextMenu>
      );
    },
  },
  {
    accessorKey: "company",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const job = row.original;
      const company = row.getValue("company");
      return (
        <JobPostingContextMenu
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewContent={onViewContent}
          onViewCompatibility={onViewCompatibility}
          onGenerateResume={onGenerateResume}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onEditDocument={onEditDocument}
          isGeneratingResume={isGeneratingResume}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          isDeleting={isDeleting}
          onViewDetails={onViewDetails}
        >
          <div className="font-medium">{company as string}</div>
        </JobPostingContextMenu>
      );
    },
  },
  {
    accessorKey: "location",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const job = row.original;
      const location = row.getValue("location");
      return (
        <JobPostingContextMenu
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewContent={onViewContent}
          onViewCompatibility={onViewCompatibility}
          onGenerateResume={onGenerateResume}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onEditDocument={onEditDocument}
          isGeneratingResume={isGeneratingResume}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          isDeleting={isDeleting}
          onViewDetails={onViewDetails}
        >
          <div className="text-sm">{location as string}</div>
        </JobPostingContextMenu>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const job = row.original;
      const status = row.getValue("status");
      return (
        <InlineStatusDropdown
          jobId={job.id}
          currentStatus={status as string | null}
          onStatusUpdate={onStatusUpdate}
          isUpdating={isUpdatingStatus(job.id)}
        />
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold hover:bg-transparent"
        >
          Date Added
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const job = row.original;
      const date = row.getValue("createdAt");
      return (
        <JobPostingContextMenu
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewContent={onViewContent}
          onViewCompatibility={onViewCompatibility}
          onGenerateResume={onGenerateResume}
          onGenerateCoverLetter={onGenerateCoverLetter}
          onEditDocument={onEditDocument}
          isGeneratingResume={isGeneratingResume}
          isGeneratingCoverLetter={isGeneratingCoverLetter}
          isDeleting={isDeleting}
          onViewDetails={onViewDetails}
        >
          <div className="text-sm text-gray-600">
            {(date as Date).toLocaleDateString()}
          </div>
        </JobPostingContextMenu>
      );
    },
  },
];
