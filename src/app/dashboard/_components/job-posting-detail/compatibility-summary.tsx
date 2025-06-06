"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { CompatibilityReportContent } from "~/app/dashboard/_components/compatibility-report";

interface CompatibilitySummaryProps {
  jobPostingId: string;
  jobTitle: string;
}

export function CompatibilitySummary({
  jobPostingId,
  jobTitle,
}: CompatibilitySummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const compatibilityQuery = api.compatibility.analyze.useQuery({
    jobPostingId,
  });

  if (compatibilityQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Compatibility Analysis
          </h2>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Analyzing your compatibility...</p>
          </div>
        </div>
      </div>
    );
  }

  if (compatibilityQuery.error) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Compatibility Analysis
          </h2>
        </div>
        <div className="flex h-32 items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p>
              Error analyzing compatibility: {compatibilityQuery.error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const report = compatibilityQuery.data;
  if (!report) {
    return null;
  }

  if (isExpanded) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Compatibility Analysis
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="mr-1 h-4 w-4" />
            Show Summary
          </Button>
        </div>

        {/* Full compatibility report content */}
        <div className="max-h-[600px] overflow-y-auto">
          <CompatibilityReportContent
            jobPostingId={jobPostingId}
            jobTitle={jobTitle}
            onBack={() => setIsExpanded(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Compatibility Analysis
        </h2>
        <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}>
          <ChevronDown className="mr-1 h-4 w-4" />
          View Details
        </Button>
      </div>

      <div className="space-y-4">
        {/* Overall Score */}
        <div className="text-center">
          <div className="mb-2">
            <span className="text-4xl font-bold text-blue-600">
              {report.overallScore}%
            </span>
            <span className="ml-2 text-lg text-gray-600">
              Overall Compatibility
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-gray-200">
            <div
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                report.overallScore >= 80
                  ? "bg-green-500"
                  : report.overallScore >= 60
                    ? "bg-yellow-500"
                    : report.overallScore >= 40
                      ? "bg-orange-500"
                      : "bg-red-500",
              )}
              style={{ width: `${report.overallScore}%` }}
            ></div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center">
              <CheckCircle className="mr-1 h-5 w-5 text-green-600" />
              <span className="text-xl font-bold text-green-600">
                {report.summary.perfectMatches}
              </span>
            </div>
            <div className="text-sm text-gray-600">Perfect Matches</div>
          </div>

          <div className="rounded-lg bg-yellow-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center">
              <TrendingUp className="mr-1 h-5 w-5 text-yellow-600" />
              <span className="text-xl font-bold text-yellow-600">
                {report.summary.partialMatches}
              </span>
            </div>
            <div className="text-sm text-gray-600">Partial Matches</div>
          </div>

          <div className="rounded-lg bg-red-50 p-3 text-center">
            <div className="mb-1 flex items-center justify-center">
              <AlertCircle className="mr-1 h-5 w-5 text-red-600" />
              <span className="text-xl font-bold text-red-600">
                {report.summary.missingRequirements}
              </span>
            </div>
            <div className="text-sm text-gray-600">Missing Skills</div>
          </div>
        </div>

        {/* Quick Summary Points */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Strong Points */}
          {report.summary.strongPoints.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center font-medium text-green-600">
                <CheckCircle className="mr-1 h-4 w-4" />
                Your Strengths
              </h4>
              <ul className="space-y-1">
                {report.summary.strongPoints.slice(0, 3).map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start text-sm text-gray-700"
                  >
                    <span className="mt-2 mr-2 h-1 w-1 flex-shrink-0 rounded-full bg-green-500"></span>
                    {point}
                  </li>
                ))}
                {report.summary.strongPoints.length > 3 && (
                  <li className="text-sm text-gray-500 italic">
                    +{report.summary.strongPoints.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Improvement Areas */}
          {report.summary.improvementAreas.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center font-medium text-orange-600">
                <TrendingUp className="mr-1 h-4 w-4" />
                Areas to Improve
              </h4>
              <ul className="space-y-1">
                {report.summary.improvementAreas
                  .slice(0, 3)
                  .map((area, index) => (
                    <li
                      key={index}
                      className="flex items-start text-sm text-gray-700"
                    >
                      <span className="mt-2 mr-2 h-1 w-1 flex-shrink-0 rounded-full bg-orange-500"></span>
                      {area}
                    </li>
                  ))}
                {report.summary.improvementAreas.length > 3 && (
                  <li className="text-sm text-gray-500 italic">
                    +{report.summary.improvementAreas.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* CTA to view full report */}
        <div className="border-t pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setIsExpanded(true)}
          >
            View Full Compatibility Report
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
