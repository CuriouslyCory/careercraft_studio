"use client";

import { DocumentsPanel } from "./documents-panel";
import { WorkHistoryPanel } from "./work-history-panel";
import { KeyAchievementsPanel } from "./key-achievements-panel";
import { SkillsPanel } from "./skills-panel";
import { EducationPanel } from "./education-panel";
import { JobPostingsPanel } from "./job-postings-panel";

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
