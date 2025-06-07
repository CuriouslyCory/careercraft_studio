import { type PrismaClient } from "@prisma/client";
import type { ResumeGeneratorConfig } from "../config/resume-generator.config";
import type {
  ClassifiedWorkExperience,
  DetailedWorkExperience,
  BriefWorkExperience,
} from "../types/schemas";
import type { JobPostingData } from "../types/job-posting.types";
import {
  ClassificationError,
  DatabaseError,
  createErrorContext,
  ErrorSeverity,
} from "../types/error.types";

/**
 * Classification criteria for work experience
 */
export interface ClassificationCriteria {
  /** Number of years to consider for detailed experience */
  detailedYearsThreshold: number;
  /** Keywords from the target job posting */
  jobKeywords: Set<string>;
  /** Minimum relevance score for detailed classification */
  minRelevanceScore?: number;
  /** Maximum number of detailed experiences */
  maxDetailedExperiences?: number;
  /** Maximum number of brief experiences */
  maxBriefExperiences?: number;
}

/**
 * Work experience relevance analysis result
 */
export interface RelevanceAnalysis {
  /** Overall relevance score (0-1) */
  score: number;
  /** Keywords that matched */
  matchedKeywords: string[];
  /** Skill overlap with job requirements */
  skillOverlap: number;
  /** Industry relevance */
  industryMatch: boolean;
  /** Recency factor */
  recencyFactor: number;
}

/**
 * Database work experience structure (from Prisma)
 */
interface DatabaseWorkHistory {
  jobTitle: string;
  companyName: string;
  startDate: Date;
  endDate: Date | null;
  achievements: Array<{ description: string }>;
  userSkills: Array<{
    skill: { name: string; category: string };
    proficiency: string;
    yearsExperience: number | null;
  }>;
}

/**
 * Service responsible for classifying work experience into detailed and brief categories
 * based on the 10-year rule and job relevance analysis.
 */
export class WorkExperienceClassifier {
  constructor(
    private db: PrismaClient,
    private config: ResumeGeneratorConfig,
  ) {}

  /**
   * Classify work experience into detailed (recent/relevant) and brief (older/irrelevant) categories
   *
   * @param userId - The user's unique identifier
   * @param jobPostingData - The target job posting data for relevance analysis
   * @returns Promise resolving to classified work experience
   *
   * @example
   * ```typescript
   * const classifier = new WorkExperienceClassifier(db, config);
   * const classified = await classifier.classifyWorkExperience(
   *   "user-123",
   *   jobPostingData
   * );
   * console.log(classified.detailed.length); // Recent/relevant jobs
   * ```
   */
  async classifyWorkExperience(
    userId: string,
    jobPostingData: JobPostingData,
  ): Promise<ClassifiedWorkExperience> {
    try {
      // Fetch user's work history
      const userData = await this.fetchUserWorkHistory(userId);

      if (!userData?.workHistories) {
        return { detailed: [], brief: [] };
      }

      // Create classification criteria
      const criteria = this.createClassificationCriteria(jobPostingData);

      // Classify each work experience
      const detailed: DetailedWorkExperience[] = [];
      const brief: BriefWorkExperience[] = [];

      for (const job of userData.workHistories) {
        const analysis = this.analyzeWorkExperienceRelevance(job, criteria);
        const isWithinThreshold = this.isWithinTimeThreshold(
          job,
          criteria.detailedYearsThreshold,
        );

        // Include in detailed if within threshold OR specifically relevant to the job
        if (
          isWithinThreshold ||
          analysis.score >= (criteria.minRelevanceScore ?? 0.3)
        ) {
          detailed.push(this.createDetailedWorkExperience(job, analysis));
        } else {
          brief.push(this.createBriefWorkExperience(job));
        }
      }

      // Apply limits if configured
      const finalDetailed = this.applyDetailedLimit(
        detailed,
        criteria.maxDetailedExperiences,
      );
      const finalBrief = this.applyBriefLimit(
        brief,
        criteria.maxBriefExperiences,
      );

      return { detailed: finalDetailed, brief: finalBrief };
    } catch (error) {
      const context = createErrorContext(
        "classifyWorkExperience",
        ErrorSeverity.HIGH,
        { userId, jobPostingId: jobPostingData.id },
      );

      if (error instanceof Error) {
        throw new ClassificationError(
          `Failed to classify work experience: ${error.message}`,
          { ...context },
          error,
        );
      }

      throw new ClassificationError(
        "Failed to classify work experience due to unknown error",
        { ...context },
      );
    }
  }

  /**
   * Fetch user's work history from database
   */
  private async fetchUserWorkHistory(userId: string) {
    try {
      return await this.db.user.findUnique({
        where: { id: userId },
        include: {
          workHistories: {
            include: {
              achievements: true,
              userSkills: {
                include: {
                  skill: true,
                },
              },
            },
            orderBy: { startDate: "desc" },
          },
        },
      });
    } catch (error) {
      throw new DatabaseError(
        "Failed to fetch user work history",
        "findUnique",
        "user",
        { userId },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Create classification criteria from job posting data
   */
  private createClassificationCriteria(
    jobData: JobPostingData,
  ): ClassificationCriteria {
    return {
      detailedYearsThreshold: this.config.workExperience.detailedYearsThreshold,
      jobKeywords: this.extractJobKeywords(jobData),
      minRelevanceScore: 0.3, // Could be configurable
      maxDetailedExperiences: this.config.workExperience.maxDetailedExperiences,
      maxBriefExperiences: this.config.workExperience.maxBriefExperiences,
    };
  }

  /**
   * Extract relevant keywords from job posting for relevance checking
   */
  private extractJobKeywords(jobData: JobPostingData): Set<string> {
    const keywords = new Set<string>();

    // Add skills from requirements
    jobData.skillRequirements.forEach((req) => {
      keywords.add(req.skill.name.toLowerCase());
      keywords.add(req.skill.category.toLowerCase());
    });

    // Add keywords from structured details
    if (jobData.details) {
      jobData.details.technicalSkills.forEach((skill) =>
        keywords.add(skill.toLowerCase()),
      );
      jobData.details.softSkills.forEach((skill) =>
        keywords.add(skill.toLowerCase()),
      );
      jobData.details.industryKnowledge.forEach((knowledge) =>
        keywords.add(knowledge.toLowerCase()),
      );
    }

    // Add industry if available
    if (jobData.industry) {
      keywords.add(jobData.industry.toLowerCase());
    }

    // Extract keywords from job title and company
    const titleWords = jobData.title.toLowerCase().split(/\s+/);
    titleWords.forEach((word) => {
      if (word.length > this.config.workExperience.minKeywordLength) {
        keywords.add(word);
      }
    });

    return keywords;
  }

  /**
   * Analyze work experience relevance to the job posting
   */
  private analyzeWorkExperienceRelevance(
    job: DatabaseWorkHistory,
    criteria: ClassificationCriteria,
  ): RelevanceAnalysis {
    const matchedKeywords: string[] = [];
    let skillOverlap = 0;
    const industryMatch = false;

    // Check job title for relevant keywords
    const jobTitleWords = job.jobTitle.toLowerCase().split(/\s+/);
    for (const word of jobTitleWords) {
      if (criteria.jobKeywords.has(word)) {
        matchedKeywords.push(word);
      }
    }

    // Check skills for relevance
    for (const userSkill of job.userSkills) {
      if (
        criteria.jobKeywords.has(userSkill.skill.name.toLowerCase()) ||
        criteria.jobKeywords.has(userSkill.skill.category.toLowerCase())
      ) {
        matchedKeywords.push(userSkill.skill.name.toLowerCase());
        skillOverlap++;
      }
    }

    // Calculate recency factor (more recent = higher score)
    const recencyFactor = this.calculateRecencyFactor(
      job.startDate,
      job.endDate,
    );

    // Calculate overall relevance score
    const keywordScore = Math.min(matchedKeywords.length / 5, 1); // Normalize to 0-1
    const skillScore = Math.min(skillOverlap / 3, 1); // Normalize to 0-1
    const industryScore = industryMatch ? 0.2 : 0;

    const score =
      keywordScore * 0.4 +
      skillScore * 0.4 +
      recencyFactor * 0.15 +
      industryScore;

    return {
      score: Math.min(score, 1),
      matchedKeywords: [...new Set(matchedKeywords)],
      skillOverlap,
      industryMatch,
      recencyFactor,
    };
  }

  /**
   * Calculate recency factor based on work experience dates
   */
  private calculateRecencyFactor(
    startDate: Date,
    endDate: Date | null,
  ): number {
    const now = new Date();
    const end = endDate ?? now;
    const yearsAgo =
      (now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    // Linear decay: 1.0 for current, 0.0 for 10+ years ago
    return Math.max(0, 1 - yearsAgo / 10);
  }

  /**
   * Check if work experience is within the time threshold
   */
  private isWithinTimeThreshold(
    job: DatabaseWorkHistory,
    thresholdYears: number,
  ): boolean {
    const thresholdDate = new Date();
    thresholdDate.setFullYear(thresholdDate.getFullYear() - thresholdYears);

    return (job.endDate ?? new Date()) >= thresholdDate;
  }

  /**
   * Convert database proficiency to schema proficiency
   */
  private convertProficiency(
    proficiency: string,
  ):
    | "Beginner"
    | "Intermediate"
    | "Advanced"
    | "Expert"
    | "Novice"
    | "Proficient" {
    // Handle database enum values that might be uppercase
    const normalized = proficiency.toLowerCase();
    switch (normalized) {
      case "beginner":
        return "Beginner";
      case "intermediate":
        return "Intermediate";
      case "advanced":
        return "Advanced";
      case "expert":
        return "Expert";
      case "novice":
        return "Novice";
      case "proficient":
        return "Proficient";
      default:
        // Default fallback
        return "Intermediate";
    }
  }

  /**
   * Create detailed work experience object
   */
  private createDetailedWorkExperience(
    job: DatabaseWorkHistory,
    analysis: RelevanceAnalysis,
  ): DetailedWorkExperience {
    return {
      type: "detailed",
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      startDate: job.startDate,
      endDate: job.endDate,
      achievements: job.achievements,
      userSkills: job.userSkills.map((us) => ({
        skill: {
          name: us.skill.name,
          category: us.skill.category,
        },
        proficiency: this.convertProficiency(us.proficiency),
        yearsExperience: us.yearsExperience,
      })),
      relevanceScore: analysis.score,
      matchedKeywords: analysis.matchedKeywords,
    };
  }

  /**
   * Create brief work experience object
   */
  private createBriefWorkExperience(
    job: DatabaseWorkHistory,
  ): BriefWorkExperience {
    return {
      type: "brief",
      jobTitle: job.jobTitle,
      companyName: job.companyName,
      startDate: job.startDate,
      endDate: job.endDate,
      achievements: job.achievements,
      userSkills: job.userSkills.map((us) => ({
        skill: {
          name: us.skill.name,
          category: us.skill.category,
        },
        proficiency: this.convertProficiency(us.proficiency),
        yearsExperience: us.yearsExperience,
      })),
    };
  }

  /**
   * Apply limit to detailed work experiences, keeping the most relevant
   */
  private applyDetailedLimit(
    detailed: DetailedWorkExperience[],
    maxCount?: number,
  ): DetailedWorkExperience[] {
    if (!maxCount || detailed.length <= maxCount) {
      return detailed;
    }

    // Sort by relevance score (descending) and take top N
    return detailed
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .slice(0, maxCount);
  }

  /**
   * Apply limit to brief work experiences, keeping the most recent
   */
  private applyBriefLimit(
    brief: BriefWorkExperience[],
    maxCount?: number,
  ): BriefWorkExperience[] {
    if (!maxCount || brief.length <= maxCount) {
      return brief;
    }

    // Sort by end date (most recent first) and take top N
    return brief
      .sort((a, b) => {
        const aDate = a.endDate ?? new Date();
        const bDate = b.endDate ?? new Date();
        return bDate.getTime() - aDate.getTime();
      })
      .slice(0, maxCount);
  }

  /**
   * Get classification statistics for analysis
   */
  async getClassificationStats(
    userId: string,
    jobPostingData: JobPostingData,
  ): Promise<{
    totalExperiences: number;
    detailedCount: number;
    briefCount: number;
    averageRelevanceScore: number;
    keywordMatches: number;
  }> {
    const classified = await this.classifyWorkExperience(
      userId,
      jobPostingData,
    );

    const totalExperiences =
      classified.detailed.length + classified.brief.length;
    const averageRelevanceScore =
      classified.detailed.reduce(
        (sum, exp) => sum + (exp.relevanceScore ?? 0),
        0,
      ) / (classified.detailed.length || 1);

    const keywordMatches = classified.detailed.reduce(
      (sum, exp) => sum + (exp.matchedKeywords?.length ?? 0),
      0,
    );

    return {
      totalExperiences,
      detailedCount: classified.detailed.length,
      briefCount: classified.brief.length,
      averageRelevanceScore,
      keywordMatches,
    };
  }
}
