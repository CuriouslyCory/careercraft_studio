"use client";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { CompatibilityReport } from "~/server/services/compatibility-analyzer";

interface CompatibilityReportModalProps {
  jobPostingId: string;
  jobTitle: string;
  onClose: () => void;
}

export function CompatibilityReportModal({
  jobPostingId,
  jobTitle,
  onClose,
}: CompatibilityReportModalProps) {
  const compatibilityQuery = api.compatibility.analyze.useQuery({
    jobPostingId,
  });

  if (compatibilityQuery.isLoading) {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="text-lg font-semibold">Compatibility Analysis</h3>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p>Analyzing your compatibility with this job...</p>
          </div>
        </div>
      </div>
    );
  }

  if (compatibilityQuery.error) {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="max-h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="text-lg font-semibold">Compatibility Analysis</h3>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="p-8 text-center text-red-600">
            <p>
              Error analyzing compatibility: {compatibilityQuery.error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const report = compatibilityQuery.data;
  if (!report) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">
            Compatibility Analysis: {jobTitle}
          </h3>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6">
          {/* Overall Score */}
          <div className="mb-6 text-center">
            <div className="mb-2">
              <span className="text-3xl font-bold text-blue-600">
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
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {report.summary.perfectMatches}
              </div>
              <div className="text-sm text-gray-600">Perfect Matches</div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {report.summary.partialMatches}
              </div>
              <div className="text-sm text-gray-600">Partial Matches</div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {report.summary.missingRequirements}
              </div>
              <div className="text-sm text-gray-600">Missing Requirements</div>
            </div>
          </div>

          {/* Strong Points */}
          {report.summary.strongPoints.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-lg font-semibold text-green-600">
                Your Strong Points
              </h4>
              <ul className="list-inside list-disc space-y-1">
                {report.summary.strongPoints.map((point, index) => (
                  <li key={index} className="text-gray-700">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvement Areas */}
          {report.summary.improvementAreas.length > 0 && (
            <div className="mb-6">
              <h4 className="mb-3 text-lg font-semibold text-orange-600">
                Areas for Improvement
              </h4>
              <ul className="list-inside list-disc space-y-1">
                {report.summary.improvementAreas.map((area, index) => (
                  <li key={index} className="text-gray-700">
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Skills Analysis */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">Skills Analysis</h4>
              <div className="space-y-3">
                {report.skillMatches.map((match, index) => (
                  <SkillMatchCard key={index} match={match} />
                ))}
              </div>
            </div>

            {/* Experience Analysis */}
            <div>
              <h4 className="mb-4 text-lg font-semibold">
                Experience Analysis
              </h4>
              <div className="space-y-3">
                {report.experienceMatches.map((match, index) => (
                  <ExperienceMatchCard key={index} match={match} />
                ))}
              </div>
            </div>
          </div>

          {/* Education Analysis */}
          {report.educationMatches.length > 0 && (
            <div className="mt-6">
              <h4 className="mb-4 text-lg font-semibold">Education Analysis</h4>
              <div className="space-y-3">
                {report.educationMatches.map((match, index) => (
                  <EducationMatchCard key={index} match={match} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillMatchCard({
  match,
}: {
  match: CompatibilityReport["skillMatches"][0];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-3",
        match.compatibility === "perfect"
          ? "border-green-500 bg-green-50"
          : match.compatibility === "partial"
            ? "border-yellow-500 bg-yellow-50"
            : "border-red-500 bg-red-50",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{match.skill.name}</span>
        <span
          className={cn(
            "rounded px-2 py-1 text-xs",
            match.compatibility === "perfect"
              ? "bg-green-100 text-green-800"
              : match.compatibility === "partial"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800",
          )}
        >
          {match.score}%
        </span>
      </div>
      <div className="mb-1 text-sm text-gray-600">
        {match.requirement.isRequired ? "Required" : "Bonus"} • Priority:{" "}
        {match.requirement.priority} • Category: {match.skill.category}
      </div>
      {match.requirement.minimumLevel && (
        <div className="mb-1 text-sm text-gray-600">
          Minimum Level: {match.requirement.minimumLevel}
        </div>
      )}
      {match.userSkill && (
        <div className="mb-1 text-sm text-gray-600">
          Your Level: {match.userSkill.proficiency}
          {match.userSkill.yearsExperience &&
            ` (${match.userSkill.yearsExperience} years)`}
        </div>
      )}
      {match.similarSkill && (
        <div className="mb-1 text-sm text-gray-600">
          Similar Skill: {match.similarSkill.name} (
          {match.similarSkill.proficiency})
        </div>
      )}
      <div className="text-sm text-gray-500 italic">{match.reason}</div>
    </div>
  );
}

function ExperienceMatchCard({
  match,
}: {
  match: CompatibilityReport["experienceMatches"][0];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-3",
        match.compatibility === "perfect"
          ? "border-green-500 bg-green-50"
          : match.compatibility === "partial"
            ? "border-yellow-500 bg-yellow-50"
            : "border-red-500 bg-red-50",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">
          {match.requirement.category} Experience
        </span>
        <span
          className={cn(
            "rounded px-2 py-1 text-xs",
            match.compatibility === "perfect"
              ? "bg-green-100 text-green-800"
              : match.compatibility === "partial"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800",
          )}
        >
          {match.score}%
        </span>
      </div>
      <div className="mb-1 text-sm text-gray-600">
        {match.requirement.isRequired ? "Required" : "Bonus"}
        {match.requirement.years &&
          ` • ${match.requirement.years} years required`}
      </div>
      <div className="mb-1 text-sm text-gray-600">
        {match.requirement.description}
      </div>
      {match.userExperience && (
        <div className="mb-1 text-sm text-gray-600">
          Your Experience: {match.userExperience.totalYears} years total
        </div>
      )}
      <div className="text-sm text-gray-500 italic">{match.reason}</div>
    </div>
  );
}

function EducationMatchCard({
  match,
}: {
  match: CompatibilityReport["educationMatches"][0];
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-3",
        match.compatibility === "perfect"
          ? "border-green-500 bg-green-50"
          : match.compatibility === "partial"
            ? "border-yellow-500 bg-yellow-50"
            : "border-red-500 bg-red-50",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">{match.requirement.level}</span>
        <span
          className={cn(
            "rounded px-2 py-1 text-xs",
            match.compatibility === "perfect"
              ? "bg-green-100 text-green-800"
              : match.compatibility === "partial"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800",
          )}
        >
          {match.score}%
        </span>
      </div>
      <div className="mb-1 text-sm text-gray-600">
        {match.requirement.isRequired ? "Required" : "Bonus"}
        {match.requirement.field && ` • Field: ${match.requirement.field}`}
      </div>
      {match.requirement.description && (
        <div className="mb-1 text-sm text-gray-600">
          {match.requirement.description}
        </div>
      )}
      <div className="text-sm text-gray-500 italic">{match.reason}</div>
    </div>
  );
}
