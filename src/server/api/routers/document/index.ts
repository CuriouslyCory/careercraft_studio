import { createTRPCRouter } from "~/server/api/trpc";
import { documentOpsRouter } from "./document-ops";
import { workHistoryRouter } from "./work-history";
import { educationRouter } from "./education";
import { jobPostingRouter } from "./job-posting";
import { keyAchievementsRouter } from "./key-achievements";

// Main document router that combines all sub-routers
export const documentRouter = createTRPCRouter({
  // Document operations (upload, list, update, delete, truncate)
  upload: documentOpsRouter.upload,
  truncateAllUserData: documentOpsRouter.truncateAllUserData,
  listDocuments: documentOpsRouter.list,
  updateDocument: documentOpsRouter.update,
  deleteDocument: documentOpsRouter.delete,

  // Work History operations
  listWorkHistory: workHistoryRouter.list,
  createWorkHistory: workHistoryRouter.create,
  updateWorkHistory: workHistoryRouter.update,
  deleteWorkHistory: workHistoryRouter.delete,

  // Work Achievement operations
  listWorkAchievements: workHistoryRouter.listAchievements,
  createWorkAchievement: workHistoryRouter.createAchievement,
  updateWorkAchievement: workHistoryRouter.updateAchievement,
  deleteWorkAchievement: workHistoryRouter.deleteAchievement,

  // Work Skill operations
  listWorkSkills: workHistoryRouter.listSkills,
  createWorkSkill: workHistoryRouter.createSkill,
  deleteWorkSkill: workHistoryRouter.deleteSkill,

  // Education operations
  listEducation: educationRouter.list,
  createEducation: educationRouter.create,
  updateEducation: educationRouter.update,
  deleteEducation: educationRouter.delete,

  // Key Achievement operations
  listKeyAchievements: keyAchievementsRouter.list,
  createKeyAchievement: keyAchievementsRouter.create,
  updateKeyAchievement: keyAchievementsRouter.update,
  deleteKeyAchievement: keyAchievementsRouter.delete,

  // Job Posting operations
  listJobPostings: jobPostingRouter.list,
  createJobPosting: jobPostingRouter.create,
  updateJobPosting: jobPostingRouter.update,
  deleteJobPosting: jobPostingRouter.delete,
});

// Export types and utilities for use in other parts of the application
export type {
  DocumentProcessingError,
  TypeValidationError,
  LLMProcessingError,
} from "./types";

export {
  doWorkHistoryRecordsMatch,
  processWorkExperience,
} from "./work-history";

export { processEducation } from "./education";

export { processJobPosting } from "./job-posting";

export { processKeyAchievements } from "./key-achievements";

export {
  extractContentFromPDF,
  extractContentFromText,
} from "./utils/pdf-parser";

export { detectDocumentType } from "./utils/type-detection";

export { mergeWorkAchievements } from "./utils/llm-merger";
