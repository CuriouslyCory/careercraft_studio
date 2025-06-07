import { z } from "zod";

/**
 * Resume and cover letter related type definitions for the tailored resume generator
 */

/**
 * Schema for the generated resume sections
 */
export const TailoredResumeSchema = z.object({
  header: z.string().describe("Contact information and relevant links"),
  summary: z
    .string()
    .describe("Professional summary/objective tailored to the job"),
  workExperience: z
    .string()
    .describe(
      "Work experience section with relevant keywords and achievements",
    ),
  skills: z.string().describe("Technical and soft skills relevant to the job"),
  education: z.string().optional().describe("Education section if available"),
  achievements: z
    .string()
    .optional()
    .describe(
      "Awards, speaking engagements, notable achievements if available",
    ),
});

/**
 * Inferred type for tailored resume
 */
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;

/**
 * Schema for the generated cover letter
 */
export const TailoredCoverLetterSchema = z.object({
  content: z
    .string()
    .describe("The full cover letter content tailored to the job"),
});

/**
 * Inferred type for tailored cover letter
 */
export type TailoredCoverLetter = z.infer<typeof TailoredCoverLetterSchema>;

/**
 * Resume section types
 */
export type ResumeSectionType =
  | "header"
  | "summary"
  | "workExperience"
  | "skills"
  | "education"
  | "achievements"
  | "projects"
  | "certifications"
  | "publications"
  | "languages";

/**
 * Resume formatting options
 */
export interface ResumeFormatOptions {
  /** Output format */
  format: "markdown" | "html" | "pdf" | "json";
  /** Include optional sections */
  includeOptionalSections: boolean;
  /** Date format for work experience */
  dateFormat: "short" | "long" | "iso";
  /** Maximum length for each section */
  sectionLimits?: Partial<Record<ResumeSectionType, number>>;
  /** Custom styling options */
  styling?: {
    fontSize?: number;
    fontFamily?: string;
    margins?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  };
}

/**
 * Resume generation request
 */
export interface ResumeGenerationRequest {
  userId: string;
  jobPostingId: string;
  formatOptions?: ResumeFormatOptions;
  customPrompt?: string;
  includeAnalysis?: boolean;
}

/**
 * Resume generation response
 */
export interface ResumeGenerationResponse {
  resume: TailoredResume;
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    wordCount: number;
    sectionsIncluded: ResumeSectionType[];
    keywordsMatched: string[];
  };
  analysis?: ResumeAnalysis;
}

/**
 * Cover letter generation request
 */
export interface CoverLetterGenerationRequest {
  userId: string;
  jobPostingId: string;
  tone?: "professional" | "enthusiastic" | "conservative" | "creative";
  length?: "short" | "medium" | "long";
  customPrompt?: string;
}

/**
 * Cover letter generation response
 */
export interface CoverLetterGenerationResponse {
  coverLetter: TailoredCoverLetter;
  metadata: {
    generatedAt: Date;
    processingTimeMs: number;
    wordCount: number;
    paragraphCount: number;
    keywordsMatched: string[];
  };
}

/**
 * Resume analysis result
 */
export interface ResumeAnalysis {
  /** ATS compatibility score (0-100) */
  atsScore: number;
  /** Keyword density analysis */
  keywordAnalysis: {
    totalKeywords: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    keywordDensity: number;
  };
  /** Section analysis */
  sectionAnalysis: {
    sectionsPresent: ResumeSectionType[];
    sectionLengths: Record<ResumeSectionType, number>;
    recommendedImprovements: string[];
  };
  /** Overall quality score */
  qualityScore: number;
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Resume template configuration
 */
export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  sections: ResumeSectionType[];
  formatting: ResumeFormatOptions;
  targetIndustries: string[];
  experienceLevel: "entry" | "mid" | "senior" | "executive";
}

/**
 * Resume version for tracking changes
 */
export interface ResumeVersion {
  id: string;
  userId: string;
  jobPostingId: string;
  resume: TailoredResume;
  version: number;
  createdAt: Date;
  metadata: {
    generationTimeMs: number;
    keywordsMatched: string[];
    templateUsed?: string;
  };
}

/**
 * Resume comparison result
 */
export interface ResumeComparison {
  version1: ResumeVersion;
  version2: ResumeVersion;
  differences: {
    sectionsChanged: ResumeSectionType[];
    keywordChanges: {
      added: string[];
      removed: string[];
    };
    lengthChanges: Record<
      ResumeSectionType,
      {
        before: number;
        after: number;
        change: number;
      }
    >;
  };
  recommendation: "use_version_1" | "use_version_2" | "needs_review";
}

/**
 * Resume export options
 */
export interface ResumeExportOptions {
  format: "pdf" | "docx" | "html" | "txt" | "json";
  includeMetadata: boolean;
  watermark?: string;
  password?: string;
  customStyling?: {
    template: string;
    colors: {
      primary: string;
      secondary: string;
      text: string;
    };
  };
}

/**
 * Resume sharing configuration
 */
export interface ResumeSharingConfig {
  isPublic: boolean;
  shareableLink?: string;
  expiresAt?: Date;
  allowedDomains?: string[];
  requiresPassword?: boolean;
  trackViews: boolean;
}

/**
 * Type guard to check if a resume is valid
 */
export const isValidTailoredResume = (obj: unknown): obj is TailoredResume => {
  try {
    TailoredResumeSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};

/**
 * Type guard to check if a cover letter is valid
 */
export const isValidTailoredCoverLetter = (
  obj: unknown,
): obj is TailoredCoverLetter => {
  try {
    TailoredCoverLetterSchema.parse(obj);
    return true;
  } catch {
    return false;
  }
};

/**
 * Utility to calculate resume word count
 */
export const calculateResumeWordCount = (resume: TailoredResume): number => {
  const sections = [
    resume.header,
    resume.summary,
    resume.workExperience,
    resume.skills,
    resume.education ?? "",
    resume.achievements ?? "",
  ];

  return sections
    .join(" ")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
};

/**
 * Utility to extract keywords from resume
 */
export const extractResumeKeywords = (resume: TailoredResume): string[] => {
  const text = [resume.summary, resume.workExperience, resume.skills]
    .join(" ")
    .toLowerCase();

  // Simple keyword extraction - could be enhanced with NLP
  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => /^[a-zA-Z]+$/.test(word));

  return [...new Set(words)];
};
