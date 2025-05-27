import { createTRPCRouter } from "~/server/api/trpc";
import { documentOpsRouter } from "./document-ops";
import { workHistoryRouter } from "./work-history";
import { educationRouter } from "./education";
import { jobPostingRouter } from "./job-posting";
import { keyAchievementsRouter } from "./key-achievements";
import { userLinksRouter } from "./user-links";
import { userProfileRouter } from "./user-profile";

// Main document router that combines all sub-routers
export const documentRouter = createTRPCRouter({
  // Document operations (upload, list, update, delete, truncate)
  upload: documentOpsRouter.upload,
  listDocuments: documentOpsRouter.list,
  updateDocument: documentOpsRouter.update,
  deleteDocument: documentOpsRouter.delete,
  generateResumeData: documentOpsRouter.generateResumeData,
  generateTailoredResume: documentOpsRouter.generateTailoredResume,
  generateTailoredCoverLetter: documentOpsRouter.generateTailoredCoverLetter,
  getJobPostDocument: documentOpsRouter.getJobPostDocument,
  updateJobPostDocument: documentOpsRouter.updateJobPostDocument,
  deleteJobPostDocument: documentOpsRouter.deleteJobPostDocument,
  exportToPDF: documentOpsRouter.exportToPDF,

  // Work History operations
  listWorkHistory: workHistoryRouter.list,
  createWorkHistory: workHistoryRouter.create,
  updateWorkHistory: workHistoryRouter.update,
  deleteWorkHistory: workHistoryRouter.delete,
  mergeWorkHistory: workHistoryRouter.mergeWorkHistory,

  // Work Achievement operations
  listWorkAchievements: workHistoryRouter.listAchievements,
  createWorkAchievement: workHistoryRouter.createAchievement,
  updateWorkAchievement: workHistoryRouter.updateAchievement,
  deleteWorkAchievement: workHistoryRouter.deleteAchievement,
  deduplicateAndMergeWorkAchievements:
    workHistoryRouter.deduplicateAndMergeWorkAchievements,
  applyApprovedWorkAchievements:
    workHistoryRouter.applyApprovedWorkAchievements,

  // Modern UserSkill functions for work history context
  listUserSkillsForWork: workHistoryRouter.listUserSkillsForWork,
  addUserSkillToWork: workHistoryRouter.addUserSkillToWork,
  removeUserSkillFromWork: workHistoryRouter.removeUserSkillFromWork,

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
  deduplicateAndMergeKeyAchievements: keyAchievementsRouter.deduplicateAndMerge,

  // Job Posting operations
  listJobPostings: jobPostingRouter.list,
  getJobPosting: jobPostingRouter.get,
  createJobPosting: jobPostingRouter.create,
  updateJobPosting: jobPostingRouter.update,
  deleteJobPosting: jobPostingRouter.delete,

  // User Links operations
  listUserLinks: userLinksRouter.list,
  createUserLink: userLinksRouter.create,
  updateUserLink: userLinksRouter.update,
  deleteUserLink: userLinksRouter.delete,

  // User Profile operations
  getUserProfile: userProfileRouter.get,
  upsertUserProfile: userProfileRouter.upsert,
  deleteUserProfile: userProfileRouter.delete,
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

export { processUserLinks } from "./user-links";

export {
  extractContentFromPDF,
  extractContentFromText,
} from "./utils/pdf-parser";

export { detectDocumentType } from "./utils/type-detection";

export { mergeWorkAchievements } from "./utils/llm-merger";

// Export the centralized key achievements deduplication service
export {
  deduplicateAndMergeKeyAchievements,
  type DeduplicationResult,
  type KeyAchievementRecord,
} from "./key-achievements";

// Export the centralized work achievements deduplication service
export {
  deduplicateAndMergeWorkAchievements,
  applyApprovedWorkAchievements,
  type WorkAchievementDeduplicationResult,
  type WorkAchievementRecord,
} from "./work-history";
