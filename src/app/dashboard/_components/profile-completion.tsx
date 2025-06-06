"use client";

import { CheckCircle, Circle } from "lucide-react";

interface ProfileSection {
  name: string;
  completed: boolean;
  count: number;
}

interface ProfileCompletionProps {
  percentage: number;
  sections: ProfileSection[];
}

export function ProfileCompletion({
  percentage,
  sections,
}: ProfileCompletionProps) {
  // Calculate the stroke-dasharray for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    if (percentage >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "stroke-green-500";
    if (percentage >= 60) return "stroke-yellow-500";
    if (percentage >= 40) return "stroke-orange-500";
    return "stroke-red-500";
  };

  return (
    <div className="flex flex-col items-center space-y-6 lg:flex-row lg:space-y-0 lg:space-x-8">
      {/* Circular Progress */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg className="h-32 w-32 -rotate-90 transform">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className={`transition-all duration-500 ${getProgressColor(percentage)}`}
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-2xl font-bold ${getCompletionColor(percentage)}`}
            >
              {percentage}%
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">Profile Complete</p>
      </div>

      {/* Section Checklist */}
      <div className="flex-1">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Complete Your Profile
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.name}
              className={`flex items-center space-x-3 rounded-lg p-3 transition-colors ${
                section.completed
                  ? "bg-green-50 text-green-800"
                  : "bg-gray-50 text-gray-600"
              }`}
            >
              {section.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
              <div className="flex-1">
                <span className="font-medium">{section.name}</span>
                {section.completed && section.count > 0 && (
                  <span className="ml-2 text-sm">
                    ({section.count} item{section.count !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
