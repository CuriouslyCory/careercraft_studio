"use client";

import { DocumentsPanel } from "./documents-panel";
import { WorkHistoryPanel } from "./work-history-panel";
import { KeyAchievementsPanel } from "./key-achievements-panel";
import { UserSkillsPanel } from "./user-skills-panel";
import { EducationPanel } from "./education-panel";
import { JobPostingsPanel } from "./job-postings-panel";
import { LinksPanel } from "./links-panel";
import { ConversationsPanel } from "./conversations-panel";

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
      return <UserSkillsPanel />;
    case "education":
      return <EducationPanel />;
    case "jobPostings":
      return <JobPostingsPanel />;
    case "links":
      return <LinksPanel />;
    case "conversations":
      return <ConversationsPanel />;
    default:
      return <div>Select a bio section</div>;
  }
}
