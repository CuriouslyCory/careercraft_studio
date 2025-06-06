"use client";

import { useState } from "react";
import { Edit2, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import type { Prisma } from "@prisma/client";

// Use Prisma generated type with includes
type JobPosting = Prisma.JobPostingGetPayload<{
  include: {
    details: true;
    document: true;
  };
}>;

interface JobPostingDetailsProps {
  jobPosting: JobPosting;
}

export function JobPostingDetails({ jobPosting }: JobPostingDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [editedData, setEditedData] = useState({
    title: jobPosting.title,
    company: jobPosting.company,
    location: jobPosting.location ?? "",
    industry: jobPosting.industry ?? "",
    url: jobPosting.url ?? "",
    status: jobPosting.status ?? "",
    notes: jobPosting.notes ?? "",
  });

  const updateMutation = api.document.updateJobPosting.useMutation({
    onSuccess: () => {
      toast.success("Job posting updated successfully!");
      setIsEditing(false);
      // Refresh the query data
      void utils.document.getJobPosting.invalidate({ id: jobPosting.id });
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const utils = api.useUtils();

  const handleSave = () => {
    updateMutation.mutate({
      id: jobPosting.id,
      ...editedData,
    });
  };

  const handleCancel = () => {
    setEditedData({
      title: jobPosting.title,
      company: jobPosting.company,
      location: jobPosting.location ?? "",
      industry: jobPosting.industry ?? "",
      url: jobPosting.url ?? "",
      status: jobPosting.status ?? "",
      notes: jobPosting.notes ?? "",
    });
    setIsEditing(false);
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Job Details</h2>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="mr-1 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Job Title
            </label>
            {isEditing ? (
              <Input
                value={editedData.title}
                onChange={(e) =>
                  setEditedData({ ...editedData, title: e.target.value })
                }
                className="w-full"
              />
            ) : (
              <p className="text-gray-900">{jobPosting.title}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Company
            </label>
            {isEditing ? (
              <Input
                value={editedData.company}
                onChange={(e) =>
                  setEditedData({ ...editedData, company: e.target.value })
                }
                className="w-full"
              />
            ) : (
              <p className="text-gray-900">{jobPosting.company}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Location
            </label>
            {isEditing ? (
              <Input
                value={editedData.location}
                onChange={(e) =>
                  setEditedData({ ...editedData, location: e.target.value })
                }
                className="w-full"
                placeholder="e.g., San Francisco, CA"
              />
            ) : (
              <p className="text-gray-900">
                {jobPosting.location || "Not specified"}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Industry
            </label>
            {isEditing ? (
              <Input
                value={editedData.industry}
                onChange={(e) =>
                  setEditedData({ ...editedData, industry: e.target.value })
                }
                className="w-full"
                placeholder="e.g., Technology, Healthcare"
              />
            ) : (
              <p className="text-gray-900">
                {jobPosting.industry ?? "Not specified"}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Job URL
            </label>
            {isEditing ? (
              <Input
                value={editedData.url}
                onChange={(e) =>
                  setEditedData({ ...editedData, url: e.target.value })
                }
                className="w-full"
                placeholder="https://..."
                type="url"
              />
            ) : (
              <div>
                {jobPosting.url ? (
                  <a
                    href={jobPosting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-blue-600 underline hover:text-blue-800"
                  >
                    {jobPosting.url}
                  </a>
                ) : (
                  <p className="text-gray-500">No URL provided</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Status
            </label>
            {isEditing ? (
              <Select
                value={editedData.status || "none"}
                onValueChange={(value) =>
                  setEditedData({
                    ...editedData,
                    status: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Status</SelectItem>
                  <SelectItem value="Saved">Saved</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Interview">Interview</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Offer">Offer</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-gray-900">
                {jobPosting.status ?? "No status"}
              </p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Notes
          </label>
          {isEditing ? (
            <Textarea
              value={editedData.notes}
              onChange={(e) =>
                setEditedData({ ...editedData, notes: e.target.value })
              }
              className="w-full"
              rows={3}
              placeholder="Add any notes about this job posting..."
            />
          ) : (
            <div>
              {jobPosting.notes ? (
                <p className="whitespace-pre-wrap text-gray-900">
                  {jobPosting.notes}
                </p>
              ) : (
                <p className="text-gray-500 italic">No notes added</p>
              )}
            </div>
          )}
        </div>

        {/* Job Content (Original Posting) */}
        {jobPosting.content && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Original Job Posting
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsContentExpanded(!isContentExpanded)}
              >
                {isContentExpanded ? (
                  <>
                    <ChevronUp className="mr-1 h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-1 h-4 w-4" />
                    Expand
                  </>
                )}
              </Button>
            </div>

            <div
              className={`rounded-lg border bg-gray-50 p-4 ${isContentExpanded ? "" : "relative max-h-32 overflow-hidden"}`}
            >
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {jobPosting.content}
                </ReactMarkdown>
              </div>

              {!isContentExpanded && (
                <div className="absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t from-gray-50 to-transparent"></div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
