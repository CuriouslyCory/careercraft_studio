"use client";

import { api } from "~/trpc/react";
import { ProfileCompletion } from "./profile-completion";
import { SummaryCards } from "./summary-cards";
import DocumentUpload from "~/app/_components/document-upload";

export function ProfileDashboard() {
  // Fetch all profile data for completion calculation
  const workHistoryQuery = api.document.listWorkHistory.useQuery();
  const educationQuery = api.document.listEducation.useQuery();
  const achievementsQuery = api.document.listKeyAchievements.useQuery();
  const skillsQuery = api.userSkills.list.useQuery();
  const linksQuery = api.document.listUserLinks.useQuery();
  const profileQuery = api.document.getUserProfile.useQuery();

  // Calculate profile completion
  const calculateCompletion = () => {
    const sections = [
      {
        name: "Work History",
        completed: (workHistoryQuery.data?.length ?? 0) > 0,
        count: workHistoryQuery.data?.length ?? 0,
      },
      {
        name: "Contact Info",
        completed: !!(
          profileQuery.data?.firstName &&
          profileQuery.data?.lastName &&
          profileQuery.data?.email
        ),
        count: profileQuery.data ? 1 : 0,
      },
      {
        name: "Key Achievements",
        completed: (achievementsQuery.data?.length ?? 0) > 0,
        count: achievementsQuery.data?.length ?? 0,
      },
      {
        name: "Skills",
        completed: (skillsQuery.data?.length ?? 0) > 0,
        count: skillsQuery.data?.length ?? 0,
      },
      {
        name: "Education",
        completed: (educationQuery.data?.length ?? 0) > 0,
        count: educationQuery.data?.length ?? 0,
      },
      {
        name: "Links",
        completed: (linksQuery.data?.length ?? 0) > 0,
        count: linksQuery.data?.length ?? 0,
      },
    ];

    const completedSections = sections.filter((s) => s.completed).length;
    const percentage = Math.round((completedSections / sections.length) * 100);

    return { percentage, sections };
  };

  const { percentage, sections } = calculateCompletion();

  const isLoading =
    workHistoryQuery.isLoading ||
    educationQuery.isLoading ||
    achievementsQuery.isLoading ||
    skillsQuery.isLoading ||
    linksQuery.isLoading ||
    profileQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Completion Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Profile Completion
          </h2>
          <p className="text-gray-600">
            Complete your profile to maximize your career opportunities
          </p>
        </div>

        <ProfileCompletion percentage={percentage} sections={sections} />
      </div>

      {/* Document Upload Section */}
      <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Quick Start: Upload Your Resume
          </h2>
          <p className="text-gray-600">
            Upload your resume to automatically populate your profile sections
          </p>
        </div>
        <DocumentUpload />
      </div>

      {/* Summary Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Profile Overview
          </h2>
          <p className="text-gray-600">
            Quick overview of your professional information
          </p>
        </div>

        <SummaryCards
          workHistory={workHistoryQuery.data ?? []}
          education={educationQuery.data ?? []}
          achievements={achievementsQuery.data ?? []}
          skills={skillsQuery.data ?? []}
          links={linksQuery.data ?? []}
          profile={profileQuery.data}
        />
      </div>
    </div>
  );
}
