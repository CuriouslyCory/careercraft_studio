"use client";

/**
 * @deprecated This component is deprecated. Use UserSkillsPanel instead.
 * This panel manages legacy WorkSkill records which are being phased out
 * in favor of the new normalized UserSkill system.
 *
 * Migration path:
 * 1. Use UserSkillsPanel from ./user-skills-panel.tsx
 * 2. Migrate existing WorkSkill data using userSkills.migrateLegacySkills API
 * 3. Use the new compatibility analysis features
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "sonner";

type SkillWithCount = {
  name: string;
  count: number;
  entries: {
    id: string;
    jobTitle: string;
    companyName: string;
  }[];
};

export function SkillsPanel() {
  const [selectedSkill, setSelectedSkill] = useState<SkillWithCount | null>(
    null,
  );
  const workHistoryQuery = api.document.listWorkHistory.useQuery();

  // Function to process work history data into a skills summary
  const processSkills = (
    workHistories: Array<{
      id: string;
      companyName: string;
      jobTitle: string;
      skills: Array<{
        id: string;
        name: string;
      }>;
    }>,
  ) => {
    const skillMap = new Map<string, SkillWithCount>();

    // First, collect all skills and their occurrences
    workHistories.forEach((workHistory) => {
      workHistory.skills?.forEach((skill) => {
        const existing = skillMap.get(skill.name);

        if (existing) {
          existing.count++;
          existing.entries.push({
            id: workHistory.id,
            jobTitle: workHistory.jobTitle,
            companyName: workHistory.companyName,
          });
        } else {
          skillMap.set(skill.name, {
            name: skill.name,
            count: 1,
            entries: [
              {
                id: workHistory.id,
                jobTitle: workHistory.jobTitle,
                companyName: workHistory.companyName,
              },
            ],
          });
        }
      });
    });

    // Convert map to array and sort by count (descending)
    return Array.from(skillMap.values()).sort((a, b) => b.count - a.count);
  };

  const handleSkillClick = (skill: SkillWithCount) => {
    setSelectedSkill(skill);
  };

  const closeSkillDetail = () => {
    setSelectedSkill(null);
  };

  if (workHistoryQuery.isLoading) {
    return <div className="p-4 text-center">Loading your skills...</div>;
  }

  if (workHistoryQuery.error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading skills: {workHistoryQuery.error.message}
      </div>
    );
  }

  const workHistories = workHistoryQuery.data ?? [];
  const skillsData = processSkills(workHistories);

  const noSkillsFound = skillsData.length === 0;

  return (
    <div className="h-full">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Skills</h2>
        <p className="text-sm text-gray-600">
          Summary of skills from your work history
        </p>
      </div>

      {noSkillsFound ? (
        <p className="rounded bg-gray-50 p-4 text-center text-gray-500">
          No skills found. Add skills to your work history entries to see them
          here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {skillsData.map((skill) => (
            <div
              key={skill.name}
              onClick={() => handleSkillClick(skill)}
              className="cursor-pointer rounded border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <h3 className="text-lg font-medium">{skill.name}</h3>
              <div className="mt-2 flex items-center justify-between">
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  Used in {skill.count}{" "}
                  {skill.count === 1 ? "position" : "positions"}
                </span>
                <button className="text-xs text-blue-600 hover:underline">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedSkill && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">{selectedSkill.name}</h3>
              <button
                onClick={closeSkillDetail}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-gray-600">
              This skill appears in {selectedSkill.count}{" "}
              {selectedSkill.count === 1 ? "position" : "positions"} on your
              resume.
            </p>
            <div className="space-y-3">
              <h4 className="font-medium">Work History Entries:</h4>
              <ul className="list-inside list-disc space-y-2">
                {selectedSkill.entries.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-medium">{entry.jobTitle}</span> at{" "}
                    <span>{entry.companyName}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 border-t pt-4">
              <h4 className="mb-2 font-medium">Skill Suggestions:</h4>
              <p className="text-sm text-gray-600">
                Consider including more details about how you utilized{" "}
                <span className="font-semibold">{selectedSkill.name}</span> in
                your work descriptions. This can help ATS systems and recruiters
                better understand your expertise.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
