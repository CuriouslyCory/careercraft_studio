import type {
  WorkHistory,
  WorkAchievement,
  UserSkill,
  Skill,
  ProficiencyLevel,
  SkillCategory,
} from "@prisma/client";
import type { KeywordExtractionResult } from "./keyword-extractor";

/**
 * Work experience data for relevance analysis
 */
export type WorkExperienceForRelevance = {
  id: string;
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate: Date | null;
  description?: string;
  location?: string;
  industry?: string;
  achievements: WorkAchievement[];
  userSkills: Array<{
    id: string;
    proficiency: ProficiencyLevel;
    yearsExperience: number | null;
    skill: Skill;
  }>;
};

/**
 * Configuration for relevance detection
 */
export type RelevanceDetectionConfig = {
  /** Weight for skill overlap in relevance calculation */
  skillOverlapWeight: number;
  /** Weight for job title similarity in relevance calculation */
  jobTitleWeight: number;
  /** Weight for industry match in relevance calculation */
  industryWeight: number;
  /** Weight for recency in relevance calculation */
  recencyWeight: number;
  /** Weight for achievement keywords in relevance calculation */
  achievementWeight: number;
  /** Minimum relevance score to consider a job relevant */
  relevanceThreshold: number;
  /** Bonus for exact skill name matches */
  exactSkillMatchBonus: number;
  /** Bonus for high proficiency skills */
  highProficiencyBonus: number;
  /** Years to consider for recency bonus */
  recencyYears: number;
};

/**
 * Result of relevance analysis
 */
export type RelevanceAnalysisResult = {
  /** Overall relevance score (0-1) */
  relevanceScore: number;
  /** Whether the experience is considered relevant */
  isRelevant: boolean;
  /** Breakdown of score components */
  scoreBreakdown: {
    skillOverlap: number;
    jobTitleSimilarity: number;
    industryMatch: number;
    recencyBonus: number;
    achievementMatch: number;
  };
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Skills that matched */
  matchedSkills: Array<{
    skillName: string;
    proficiency: ProficiencyLevel;
    isExactMatch: boolean;
    yearsExperience?: number | null;
  }>;
  /** Analysis metadata */
  metadata: {
    totalSkills: number;
    matchedSkillCount: number;
    skillMatchPercentage: number;
    yearsAgo: number;
    hasIndustryMatch: boolean;
  };
};

/**
 * Utility class for detecting relevance between work experience and job postings
 *
 * This class analyzes work experience against job requirements to determine
 * relevance using multiple factors:
 * - Skill overlap and proficiency levels
 * - Job title similarity
 * - Industry alignment
 * - Recency of experience
 * - Achievement keyword matches
 *
 * @example
 * ```typescript
 * const detector = new RelevanceDetector({
 *   skillOverlapWeight: 0.4,
 *   jobTitleWeight: 0.2,
 *   industryWeight: 0.15,
 *   recencyWeight: 0.15,
 *   achievementWeight: 0.1
 * });
 *
 * const result = detector.analyzeRelevance(workExperience, jobKeywords, jobIndustry);
 * console.log(result.relevanceScore); // 0.75
 * console.log(result.isRelevant); // true
 * ```
 */
export class RelevanceDetector {
  private readonly config: RelevanceDetectionConfig;

  /**
   * Default configuration for relevance detection
   */
  private static readonly DEFAULT_CONFIG: RelevanceDetectionConfig = {
    skillOverlapWeight: 0.4,
    jobTitleWeight: 0.2,
    industryWeight: 0.15,
    recencyWeight: 0.15,
    achievementWeight: 0.1,
    relevanceThreshold: 0.3,
    exactSkillMatchBonus: 0.2,
    highProficiencyBonus: 0.1,
    recencyYears: 5,
  };

  /**
   * Create a new RelevanceDetector instance
   *
   * @param config - Configuration options for relevance detection
   */
  constructor(config: Partial<RelevanceDetectionConfig> = {}) {
    this.config = { ...RelevanceDetector.DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze the relevance of work experience to a job posting
   *
   * @param workExperience - Work experience to analyze
   * @param jobKeywords - Keywords extracted from job posting
   * @param jobIndustry - Industry of the job posting
   * @param jobTitle - Title of the job posting
   * @returns Comprehensive relevance analysis result
   */
  public analyzeRelevance(
    workExperience: WorkExperienceForRelevance,
    jobKeywords: KeywordExtractionResult,
    jobIndustry?: string,
    jobTitle?: string,
  ): RelevanceAnalysisResult {
    // Calculate individual score components
    const skillOverlap = this.calculateSkillOverlap(
      workExperience,
      jobKeywords,
    );
    const jobTitleSimilarity = this.calculateJobTitleSimilarity(
      workExperience.jobTitle,
      jobTitle,
      jobKeywords,
    );
    const industryMatch = this.calculateIndustryMatch(
      workExperience.industry,
      jobIndustry,
    );
    const recencyBonus = this.calculateRecencyBonus(workExperience.endDate);
    const achievementMatch = this.calculateAchievementMatch(
      workExperience.achievements,
      jobKeywords,
    );

    // Calculate weighted overall score
    const relevanceScore = Math.min(
      1.0,
      skillOverlap.score * this.config.skillOverlapWeight +
        jobTitleSimilarity.score * this.config.jobTitleWeight +
        industryMatch.score * this.config.industryWeight +
        recencyBonus.score * this.config.recencyWeight +
        achievementMatch.score * this.config.achievementWeight,
    );

    // Determine if relevant
    const isRelevant = relevanceScore >= this.config.relevanceThreshold;

    // Collect all matched keywords
    const matchedKeywords = [
      ...skillOverlap.matchedKeywords,
      ...jobTitleSimilarity.matchedKeywords,
      ...achievementMatch.matchedKeywords,
    ];

    // Calculate metadata
    const yearsAgo = workExperience.endDate
      ? Math.floor(
          (Date.now() - workExperience.endDate.getTime()) /
            (1000 * 60 * 60 * 24 * 365),
        )
      : 0;

    return {
      relevanceScore,
      isRelevant,
      scoreBreakdown: {
        skillOverlap: skillOverlap.score,
        jobTitleSimilarity: jobTitleSimilarity.score,
        industryMatch: industryMatch.score,
        recencyBonus: recencyBonus.score,
        achievementMatch: achievementMatch.score,
      },
      matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
      matchedSkills: skillOverlap.matchedSkills,
      metadata: {
        totalSkills: workExperience.userSkills.length,
        matchedSkillCount: skillOverlap.matchedSkills.length,
        skillMatchPercentage:
          workExperience.userSkills.length > 0
            ? skillOverlap.matchedSkills.length /
              workExperience.userSkills.length
            : 0,
        yearsAgo,
        hasIndustryMatch: industryMatch.score > 0,
      },
    };
  }

  /**
   * Calculate skill overlap between work experience and job requirements
   *
   * @param workExperience - Work experience to analyze
   * @param jobKeywords - Job keywords for comparison
   * @returns Skill overlap analysis result
   */
  private calculateSkillOverlap(
    workExperience: WorkExperienceForRelevance,
    jobKeywords: KeywordExtractionResult,
  ): {
    score: number;
    matchedSkills: Array<{
      skillName: string;
      proficiency: ProficiencyLevel;
      isExactMatch: boolean;
      yearsExperience?: number | null;
    }>;
    matchedKeywords: string[];
  } {
    const matchedSkills: Array<{
      skillName: string;
      proficiency: ProficiencyLevel;
      isExactMatch: boolean;
      yearsExperience?: number | null;
    }> = [];
    const matchedKeywords: string[] = [];

    let totalScore = 0;
    const maxPossibleScore = workExperience.userSkills.length;

    for (const userSkill of workExperience.userSkills) {
      const skillName = userSkill.skill.name.toLowerCase();
      const skillCategory = userSkill.skill.category.toLowerCase();

      // Check for exact skill name match
      const hasExactMatch = jobKeywords.keywords.has(skillName);

      // Check for category match
      const hasCategoryMatch = jobKeywords.keywords.has(skillCategory);

      if (hasExactMatch || hasCategoryMatch) {
        let skillScore = 0.5; // Base score for any match

        if (hasExactMatch) {
          skillScore += this.config.exactSkillMatchBonus;
          matchedKeywords.push(skillName);
        }

        if (hasCategoryMatch) {
          matchedKeywords.push(skillCategory);
        }

        // Bonus for high proficiency
        if (this.isHighProficiency(userSkill.proficiency)) {
          skillScore += this.config.highProficiencyBonus;
        }

        // Bonus for years of experience
        if (userSkill.yearsExperience && userSkill.yearsExperience > 2) {
          skillScore += Math.min(0.1, userSkill.yearsExperience * 0.02);
        }

        totalScore += Math.min(1.0, skillScore);

        matchedSkills.push({
          skillName: userSkill.skill.name,
          proficiency: userSkill.proficiency,
          isExactMatch: hasExactMatch,
          yearsExperience: userSkill.yearsExperience,
        });
      }
    }

    const score = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    return {
      score: Math.min(1.0, score),
      matchedSkills,
      matchedKeywords,
    };
  }

  /**
   * Calculate job title similarity
   *
   * @param workJobTitle - Job title from work experience
   * @param targetJobTitle - Target job title
   * @param jobKeywords - Job keywords for additional matching
   * @returns Job title similarity analysis
   */
  private calculateJobTitleSimilarity(
    workJobTitle: string,
    targetJobTitle?: string,
    jobKeywords?: KeywordExtractionResult,
  ): {
    score: number;
    matchedKeywords: string[];
  } {
    const matchedKeywords: string[] = [];
    let score = 0;

    if (!targetJobTitle && !jobKeywords) {
      return { score: 0, matchedKeywords: [] };
    }

    const workTitleWords = workJobTitle.toLowerCase().split(/\s+/);

    // Direct title comparison if available
    if (targetJobTitle) {
      const targetTitleWords = targetJobTitle.toLowerCase().split(/\s+/);
      const commonWords = workTitleWords.filter(
        (word) => targetTitleWords.includes(word) && word.length > 2,
      );

      if (commonWords.length > 0) {
        score +=
          0.6 *
          (commonWords.length /
            Math.max(workTitleWords.length, targetTitleWords.length));
        matchedKeywords.push(...commonWords);
      }
    }

    // Keyword-based matching
    if (jobKeywords) {
      const titleKeywordMatches = workTitleWords.filter(
        (word) => word.length > 2 && jobKeywords.keywords.has(word),
      );

      if (titleKeywordMatches.length > 0) {
        score += 0.4 * (titleKeywordMatches.length / workTitleWords.length);
        matchedKeywords.push(...titleKeywordMatches);
      }
    }

    return {
      score: Math.min(1.0, score),
      matchedKeywords,
    };
  }

  /**
   * Calculate industry match score
   *
   * @param workIndustry - Industry from work experience
   * @param targetIndustry - Target job industry
   * @returns Industry match score
   */
  private calculateIndustryMatch(
    workIndustry?: string,
    targetIndustry?: string,
  ): {
    score: number;
  } {
    if (!workIndustry || !targetIndustry) {
      return { score: 0 };
    }

    const workInd = workIndustry.toLowerCase();
    const targetInd = targetIndustry.toLowerCase();

    // Exact match
    if (workInd === targetInd) {
      return { score: 1.0 };
    }

    // Partial match (contains)
    if (workInd.includes(targetInd) || targetInd.includes(workInd)) {
      return { score: 0.7 };
    }

    // Word overlap
    const workWords = workInd.split(/\s+/);
    const targetWords = targetInd.split(/\s+/);
    const commonWords = workWords.filter(
      (word) => targetWords.includes(word) && word.length > 3,
    );

    if (commonWords.length > 0) {
      return {
        score:
          0.4 *
          (commonWords.length / Math.max(workWords.length, targetWords.length)),
      };
    }

    return { score: 0 };
  }

  /**
   * Calculate recency bonus based on how recent the work experience is
   *
   * @param endDate - End date of work experience (null if current)
   * @returns Recency bonus score
   */
  private calculateRecencyBonus(endDate: Date | null): {
    score: number;
  } {
    if (!endDate) {
      // Current job gets maximum recency bonus
      return { score: 1.0 };
    }

    const yearsAgo =
      (Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    if (yearsAgo <= this.config.recencyYears) {
      // Linear decay over recency years
      return { score: Math.max(0, 1.0 - yearsAgo / this.config.recencyYears) };
    }

    return { score: 0 };
  }

  /**
   * Calculate achievement match score based on keyword overlap
   *
   * @param achievements - Work achievements
   * @param jobKeywords - Job keywords for matching
   * @returns Achievement match analysis
   */
  private calculateAchievementMatch(
    achievements: WorkAchievement[],
    jobKeywords: KeywordExtractionResult,
  ): {
    score: number;
    matchedKeywords: string[];
  } {
    const matchedKeywords: string[] = [];
    let totalMatches = 0;
    let totalWords = 0;

    for (const achievement of achievements) {
      const words = achievement.description
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2);

      totalWords += words.length;

      for (const word of words) {
        if (jobKeywords.keywords.has(word)) {
          totalMatches++;
          matchedKeywords.push(word);
        }
      }
    }

    const score = totalWords > 0 ? Math.min(1.0, totalMatches / totalWords) : 0;

    return {
      score,
      matchedKeywords,
    };
  }

  /**
   * Check if a proficiency level is considered high
   *
   * @param proficiency - Proficiency level to check
   * @returns True if proficiency is high
   */
  private isHighProficiency(proficiency: ProficiencyLevel): boolean {
    return proficiency === "ADVANCED" || proficiency === "EXPERT";
  }

  /**
   * Batch analyze relevance for multiple work experiences
   *
   * @param workExperiences - Array of work experiences to analyze
   * @param jobKeywords - Job keywords for comparison
   * @param jobIndustry - Job industry
   * @param jobTitle - Job title
   * @returns Array of relevance analysis results
   */
  public batchAnalyzeRelevance(
    workExperiences: WorkExperienceForRelevance[],
    jobKeywords: KeywordExtractionResult,
    jobIndustry?: string,
    jobTitle?: string,
  ): Array<RelevanceAnalysisResult & { workExperienceId: string }> {
    return workExperiences.map((workExp) => ({
      workExperienceId: workExp.id,
      ...this.analyzeRelevance(workExp, jobKeywords, jobIndustry, jobTitle),
    }));
  }

  /**
   * Get the most relevant work experiences sorted by relevance score
   *
   * @param workExperiences - Array of work experiences
   * @param jobKeywords - Job keywords
   * @param jobIndustry - Job industry
   * @param jobTitle - Job title
   * @param limit - Maximum number of results to return
   * @returns Sorted array of most relevant work experiences
   */
  public getMostRelevant(
    workExperiences: WorkExperienceForRelevance[],
    jobKeywords: KeywordExtractionResult,
    jobIndustry?: string,
    jobTitle?: string,
    limit = 5,
  ): Array<{
    workExperience: WorkExperienceForRelevance;
    analysis: RelevanceAnalysisResult;
  }> {
    const analyzed = workExperiences.map((workExp) => ({
      workExperience: workExp,
      analysis: this.analyzeRelevance(
        workExp,
        jobKeywords,
        jobIndustry,
        jobTitle,
      ),
    }));

    return analyzed
      .filter((item) => item.analysis.isRelevant)
      .sort((a, b) => b.analysis.relevanceScore - a.analysis.relevanceScore)
      .slice(0, limit);
  }
}
