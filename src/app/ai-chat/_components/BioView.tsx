"use client";

import { DocumentsPanel } from "./DocumentsPanel";
import { WorkHistoryPanel } from "./WorkHistoryPanel";
import { KeyAchievementsPanel } from "./KeyAchievementsPanel";
import { SkillsPanel } from "./SkillsPanel";
import { EducationPanel } from "./EducationPanel";
import { JobPostingsPanel } from "./JobPostingsPanel";

interface BioViewProps {
  view: string;
}

export function BioView({ view }: BioViewProps) {
  switch (view) {
    case "documents":
      return <DocumentsPanel />;
    case "workHistory":
      return <WorkHistoryPanel />;
    case "keyAchievements":
      return <KeyAchievementsPanel />;
    case "skills":
      return <SkillsPanel />;
    case "education":
      return <EducationPanel />;
    case "jobPostings":
      return <JobPostingsPanel />;
    default:
      return <div>Select a bio section</div>;
  }
}
