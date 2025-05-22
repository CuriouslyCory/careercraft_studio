// Re-export the modular document router for backward compatibility
export { documentRouter } from "./document/index";

// Re-export types and utilities that might be used elsewhere
export type {
  DocumentProcessingError,
  TypeValidationError,
  LLMProcessingError,
} from "./document/types";

export {
  doWorkHistoryRecordsMatch,
  processWorkExperience,
  processEducation,
  processJobPosting,
  processKeyAchievements,
  extractContentFromPDF,
  extractContentFromText,
  detectDocumentType,
  mergeWorkAchievements,
} from "./document/index";
