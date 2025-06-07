import type { JobPostingData } from "../types/job-posting.types";

/**
 * Job posting data with all related information for keyword extraction
 * @deprecated Use JobPostingData from job-posting.types.ts instead
 */
export type JobPostingForKeywords = JobPostingData;

/**
 * Configuration for keyword extraction behavior
 */
export type KeywordExtractionConfig = {
  /** Minimum word length to consider as a keyword */
  minWordLength: number;
  /** Maximum number of keywords to extract */
  maxKeywords: number;
  /** Whether to include skill categories as keywords */
  includeSkillCategories: boolean;
  /** Whether to extract keywords from job content */
  extractFromContent: boolean;
  /** Words to exclude from keyword extraction */
  excludeWords: string[];
  /** Whether to normalize keywords to lowercase */
  normalizeCase: boolean;
};

/**
 * Result of keyword extraction with metadata
 */
export type KeywordExtractionResult = {
  /** All extracted keywords */
  keywords: Set<string>;
  /** Keywords categorized by source */
  categorized: {
    skills: string[];
    skillCategories: string[];
    industry: string[];
    jobTitle: string[];
    content: string[];
    requirements: string[];
  };
  /** Statistics about extraction */
  stats: {
    totalKeywords: number;
    uniqueKeywords: number;
    sourceBreakdown: Record<string, number>;
  };
};

/**
 * Utility class for extracting relevant keywords from job postings
 *
 * This class handles all keyword extraction logic, including:
 * - Skills and skill categories
 * - Industry knowledge
 * - Job title analysis
 * - Content parsing
 * - Requirement analysis
 *
 * @example
 * ```typescript
 * const extractor = new KeywordExtractor({
 *   minWordLength: 3,
 *   maxKeywords: 100,
 *   includeSkillCategories: true
 * });
 *
 * const result = extractor.extractKeywords(jobPosting);
 * console.log(result.keywords); // Set of all keywords
 * console.log(result.categorized.skills); // Just skill keywords
 * ```
 */
export class KeywordExtractor {
  private readonly config: KeywordExtractionConfig;

  /**
   * Default configuration for keyword extraction
   */
  private static readonly DEFAULT_CONFIG: KeywordExtractionConfig = {
    minWordLength: 3,
    maxKeywords: 200,
    includeSkillCategories: true,
    extractFromContent: true,
    excludeWords: [
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "up",
      "about",
      "into",
      "through",
      "during",
      "before",
      "after",
      "above",
      "below",
      "between",
      "among",
      "within",
      "without",
      "this",
      "that",
      "these",
      "those",
      "i",
      "me",
      "my",
      "myself",
      "we",
      "our",
      "ours",
      "ourselves",
      "you",
      "your",
      "yours",
      "yourself",
      "yourselves",
      "he",
      "him",
      "his",
      "himself",
      "she",
      "her",
      "hers",
      "herself",
      "it",
      "its",
      "itself",
      "they",
      "them",
      "their",
      "theirs",
      "themselves",
      "what",
      "which",
      "who",
      "whom",
      "whose",
      "where",
      "when",
      "why",
      "how",
      "all",
      "any",
      "both",
      "each",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "can",
      "will",
      "just",
      "should",
      "now",
    ],
    normalizeCase: true,
  };

  /**
   * Create a new KeywordExtractor instance
   *
   * @param config - Configuration options for keyword extraction
   */
  constructor(config: Partial<KeywordExtractionConfig> = {}) {
    this.config = { ...KeywordExtractor.DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract all relevant keywords from a job posting
   *
   * @param jobData - Job posting data to extract keywords from
   * @returns Comprehensive keyword extraction result
   */
  public extractKeywords(
    jobData: JobPostingForKeywords,
  ): KeywordExtractionResult {
    const keywords = new Set<string>();
    const categorized = {
      skills: [] as string[],
      skillCategories: [] as string[],
      industry: [] as string[],
      jobTitle: [] as string[],
      content: [] as string[],
      requirements: [] as string[],
    };

    // Extract from skill requirements
    const skillKeywords = this.extractSkillKeywords(jobData.skillRequirements);
    skillKeywords.skills.forEach((keyword) => {
      keywords.add(keyword);
      categorized.skills.push(keyword);
    });
    skillKeywords.categories.forEach((keyword) => {
      keywords.add(keyword);
      categorized.skillCategories.push(keyword);
    });

    // Extract from structured details
    if (jobData.details) {
      const detailKeywords = this.extractFromDetails(jobData.details);
      detailKeywords.forEach((keyword) => {
        keywords.add(keyword);
        categorized.skills.push(keyword);
      });
    }

    // Extract from industry
    if (jobData.industry) {
      const industryKeywords = this.extractIndustryKeywords(jobData.industry);
      industryKeywords.forEach((keyword) => {
        keywords.add(keyword);
        categorized.industry.push(keyword);
      });
    }

    // Extract from job title
    const titleKeywords = this.extractJobTitleKeywords(jobData.title);
    titleKeywords.forEach((keyword) => {
      keywords.add(keyword);
      categorized.jobTitle.push(keyword);
    });

    // Extract from content if enabled
    if (this.config.extractFromContent) {
      const contentKeywords = this.extractContentKeywords(jobData.content);
      contentKeywords.forEach((keyword) => {
        keywords.add(keyword);
        categorized.content.push(keyword);
      });
    }

    // Extract from requirements
    const requirementKeywords = this.extractRequirementKeywords(
      jobData.experienceRequirements,
      jobData.educationRequirements,
    );
    requirementKeywords.forEach((keyword) => {
      keywords.add(keyword);
      categorized.requirements.push(keyword);
    });

    // Generate statistics
    const stats = {
      totalKeywords: keywords.size,
      uniqueKeywords: keywords.size,
      sourceBreakdown: {
        skills: categorized.skills.length,
        skillCategories: categorized.skillCategories.length,
        industry: categorized.industry.length,
        jobTitle: categorized.jobTitle.length,
        content: categorized.content.length,
        requirements: categorized.requirements.length,
      },
    };

    return {
      keywords,
      categorized,
      stats,
    };
  }

  /**
   * Extract keywords from skill requirements
   *
   * @param skillRequirements - Array of skill requirements
   * @returns Object with skills and categories arrays
   */
  private extractSkillKeywords(
    skillRequirements: JobPostingForKeywords["skillRequirements"],
  ): {
    skills: string[];
    categories: string[];
  } {
    const skills: string[] = [];
    const categories: string[] = [];

    skillRequirements.forEach((req) => {
      // Add skill name
      const skillName = this.normalizeKeyword(req.skill.name);
      if (this.isValidKeyword(skillName)) {
        skills.push(skillName);
      }

      // Add skill category if enabled
      if (this.config.includeSkillCategories) {
        const category = this.normalizeKeyword(req.skill.category);
        if (this.isValidKeyword(category)) {
          categories.push(category);
        }
      }
    });

    return { skills, categories };
  }

  /**
   * Extract keywords from structured job posting details
   *
   * @param details - Job posting details object
   * @returns Array of extracted keywords
   */
  private extractFromDetails(
    details: NonNullable<JobPostingForKeywords["details"]>,
  ): string[] {
    const keywords: string[] = [];

    // Technical skills
    details.technicalSkills.forEach((skill) => {
      const normalized = this.normalizeKeyword(skill);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    // Soft skills
    details.softSkills.forEach((skill) => {
      const normalized = this.normalizeKeyword(skill);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    // Industry knowledge
    details.industryKnowledge.forEach((knowledge) => {
      const normalized = this.normalizeKeyword(knowledge);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    // Bonus skills
    details.bonusTechnicalSkills.forEach((skill) => {
      const normalized = this.normalizeKeyword(skill);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    details.bonusSoftSkills.forEach((skill) => {
      const normalized = this.normalizeKeyword(skill);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    details.bonusIndustryKnowledge.forEach((knowledge) => {
      const normalized = this.normalizeKeyword(knowledge);
      if (this.isValidKeyword(normalized)) {
        keywords.push(normalized);
      }
    });

    return keywords;
  }

  /**
   * Extract keywords from industry information
   *
   * @param industry - Industry string
   * @returns Array of industry-related keywords
   */
  private extractIndustryKeywords(industry: string): string[] {
    const keywords: string[] = [];
    const normalized = this.normalizeKeyword(industry);

    if (this.isValidKeyword(normalized)) {
      keywords.push(normalized);
    }

    // Split industry into words for additional keywords
    const words = normalized.split(/\s+/);
    words.forEach((word) => {
      if (this.isValidKeyword(word)) {
        keywords.push(word);
      }
    });

    return keywords;
  }

  /**
   * Extract keywords from job title
   *
   * @param title - Job title string
   * @returns Array of title-related keywords
   */
  private extractJobTitleKeywords(title: string): string[] {
    const keywords: string[] = [];
    const words = title.toLowerCase().split(/\s+/);

    words.forEach((word) => {
      const cleaned = word.replace(/[^\w]/g, "");
      if (this.isValidKeyword(cleaned)) {
        keywords.push(cleaned);
      }
    });

    return keywords;
  }

  /**
   * Extract keywords from job content using basic text analysis
   *
   * @param content - Job posting content
   * @returns Array of content-derived keywords
   */
  private extractContentKeywords(content: string): string[] {
    const keywords: string[] = [];

    // Simple word extraction - could be enhanced with NLP
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= this.config.minWordLength);

    // Count word frequency and take most common non-excluded words
    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      if (this.isValidKeyword(word)) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // Sort by frequency and take top keywords
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.floor(this.config.maxKeywords * 0.3)) // Limit content keywords to 30% of max
      .map(([word]) => word);

    keywords.push(...sortedWords);
    return keywords;
  }

  /**
   * Extract keywords from experience and education requirements
   *
   * @param experienceReqs - Experience requirements
   * @param educationReqs - Education requirements
   * @returns Array of requirement-related keywords
   */
  private extractRequirementKeywords(
    experienceReqs: JobPostingForKeywords["experienceRequirements"],
    educationReqs: JobPostingForKeywords["educationRequirements"],
  ): string[] {
    const keywords: string[] = [];

    // Experience requirements
    experienceReqs.forEach((req) => {
      const categoryKeyword = this.normalizeKeyword(req.category);
      if (this.isValidKeyword(categoryKeyword)) {
        keywords.push(categoryKeyword);
      }

      // Extract keywords from description
      const descWords = req.description.toLowerCase().split(/\s+/);
      descWords.forEach((word) => {
        const cleaned = word.replace(/[^\w]/g, "");
        if (this.isValidKeyword(cleaned)) {
          keywords.push(cleaned);
        }
      });
    });

    // Education requirements
    educationReqs.forEach((req) => {
      const levelKeyword = this.normalizeKeyword(req.level);
      if (this.isValidKeyword(levelKeyword)) {
        keywords.push(levelKeyword);
      }

      if (req.field) {
        const fieldKeyword = this.normalizeKeyword(req.field);
        if (this.isValidKeyword(fieldKeyword)) {
          keywords.push(fieldKeyword);
        }
      }
    });

    return keywords;
  }

  /**
   * Normalize a keyword according to configuration
   *
   * @param keyword - Raw keyword to normalize
   * @returns Normalized keyword
   */
  private normalizeKeyword(keyword: string): string {
    let normalized = keyword.trim();

    if (this.config.normalizeCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Check if a keyword is valid according to configuration rules
   *
   * @param keyword - Keyword to validate
   * @returns True if keyword is valid
   */
  private isValidKeyword(keyword: string): boolean {
    if (!keyword || keyword.length < this.config.minWordLength) {
      return false;
    }

    if (this.config.excludeWords.includes(keyword.toLowerCase())) {
      return false;
    }

    // Check if it's just numbers
    if (/^\d+$/.test(keyword)) {
      return false;
    }

    return true;
  }

  /**
   * Get a subset of keywords prioritized by relevance
   *
   * @param result - Full keyword extraction result
   * @param maxKeywords - Maximum number of keywords to return
   * @returns Prioritized set of keywords
   */
  public getPrioritizedKeywords(
    result: KeywordExtractionResult,
    maxKeywords = 50,
  ): Set<string> {
    const prioritized = new Set<string>();

    // Priority order: skills > job title > requirements > industry > categories > content
    const priorityOrder = [
      result.categorized.skills,
      result.categorized.jobTitle,
      result.categorized.requirements,
      result.categorized.industry,
      result.categorized.skillCategories,
      result.categorized.content,
    ];

    for (const category of priorityOrder) {
      for (const keyword of category) {
        if (prioritized.size >= maxKeywords) {
          break;
        }
        prioritized.add(keyword);
      }
      if (prioritized.size >= maxKeywords) {
        break;
      }
    }

    return prioritized;
  }
}
