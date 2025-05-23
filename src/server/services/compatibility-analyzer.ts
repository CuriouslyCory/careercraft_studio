import { type PrismaClient, type Prisma } from "@prisma/client";
import type {
  ProficiencyLevel,
  SkillCategory,
  ExperienceCategory,
  SkillSource,
} from "@prisma/client";

// Use Prisma-generated types for exact type safety
type JobPostingWithIncludes = Prisma.JobPostingGetPayload<{
  include: {
    skillRequirements: {
      include: {
        skill: {
          include: {
            aliases: true;
            similarSkills: {
              include: {
                relatedSkill: true;
              };
            };
          };
        };
      };
    };
    experienceRequirements: true;
    educationRequirements: true;
  };
}>;

type UserSkillWithIncludes = Prisma.UserSkillGetPayload<{
  include: {
    skill: {
      include: {
        aliases: true;
      };
    };
  };
}>;

type WorkHistoryType = Prisma.WorkHistoryGetPayload<Record<string, never>>;
type EducationType = Prisma.EducationGetPayload<Record<string, never>>;

export type CompatibilityLevel = "perfect" | "partial" | "missing";

export type SkillMatch = {
  skill: {
    id: string;
    name: string;
    category: SkillCategory;
  };
  requirement: {
    id: string;
    isRequired: boolean;
    minimumLevel?: ProficiencyLevel;
    yearsRequired?: number;
    priority: number;
  };
  userSkill?: {
    proficiency: ProficiencyLevel;
    yearsExperience?: number;
  };
  similarSkill?: {
    id: string;
    name: string;
    proficiency: ProficiencyLevel;
    yearsExperience?: number;
    similarityScore: number;
  };
  compatibility: CompatibilityLevel;
  score: number; // 0-100
  reason: string;
};

export type ExperienceMatch = {
  requirement: {
    id: string;
    years?: number;
    description: string;
    category: ExperienceCategory;
    isRequired: boolean;
  };
  userExperience?: {
    totalYears: number;
    relevantPositions: Array<{
      jobTitle: string;
      companyName: string;
      years: number;
    }>;
  };
  compatibility: CompatibilityLevel;
  score: number;
  reason: string;
};

export type EducationMatch = {
  requirement: {
    id: string;
    level: string;
    field?: string;
    description?: string;
    isRequired: boolean;
  };
  userEducation?: Array<{
    type: string;
    degreeOrCertName?: string;
    institutionName: string;
    field?: string;
  }>;
  compatibility: CompatibilityLevel;
  score: number;
  reason: string;
};

export type CompatibilityReport = {
  jobPosting: {
    id: string;
    title: string;
    company: string;
  };
  overallScore: number; // 0-100
  skillMatches: SkillMatch[];
  experienceMatches: ExperienceMatch[];
  educationMatches: EducationMatch[];
  summary: {
    perfectMatches: number;
    partialMatches: number;
    missingRequirements: number;
    strongPoints: string[];
    improvementAreas: string[];
  };
};

export class CompatibilityAnalyzer {
  constructor(private db: PrismaClient) {}

  async analyzeCompatibility(
    userId: string,
    jobPostingId: string,
  ): Promise<CompatibilityReport> {
    // Get job posting with requirements
    const jobPosting = await this.db.jobPosting.findUnique({
      where: { id: jobPostingId },
      include: {
        skillRequirements: {
          include: {
            skill: {
              include: {
                aliases: true,
                similarSkills: {
                  include: {
                    relatedSkill: true,
                  },
                },
              },
            },
          },
        },
        experienceRequirements: true,
        educationRequirements: true,
      },
    });

    if (!jobPosting) {
      throw new Error("Job posting not found");
    }

    // Get user skills, experience, and education
    const [userSkills, workHistory, education] = await Promise.all([
      this.db.userSkill.findMany({
        where: { userId },
        include: {
          skill: {
            include: {
              aliases: true,
            },
          },
        },
      }),
      this.db.workHistory.findMany({
        where: { userId },
        orderBy: { startDate: "desc" },
      }),
      this.db.education.findMany({
        where: { userId },
      }),
    ]);

    // Analyze skill matches
    const skillMatches = await this.analyzeSkillMatches(
      jobPosting.skillRequirements,
      userSkills,
    );

    // Analyze experience matches
    const experienceMatches = this.analyzeExperienceMatches(
      jobPosting.experienceRequirements,
      workHistory,
    );

    // Analyze education matches
    const educationMatches = this.analyzeEducationMatches(
      jobPosting.educationRequirements,
      education,
    );

    // Calculate overall score and summary
    const { overallScore, summary } = this.calculateOverallScore(
      skillMatches,
      experienceMatches,
      educationMatches,
    );

    return {
      jobPosting: {
        id: jobPosting.id,
        title: jobPosting.title,
        company: jobPosting.company,
      },
      overallScore,
      skillMatches,
      experienceMatches,
      educationMatches,
      summary,
    };
  }

  private async analyzeSkillMatches(
    requirements: JobPostingWithIncludes["skillRequirements"],
    userSkills: UserSkillWithIncludes[],
  ): Promise<SkillMatch[]> {
    const matches: SkillMatch[] = [];

    for (const req of requirements) {
      const skill = req.skill;

      // Look for exact skill match
      const exactMatch = userSkills.find((us) => us.skillId === skill.id);

      if (exactMatch) {
        const { compatibility, score, reason } = this.evaluateSkillMatch(
          req,
          exactMatch,
        );

        matches.push({
          skill: {
            id: skill.id,
            name: skill.name,
            category: skill.category,
          },
          requirement: {
            id: req.id,
            isRequired: req.isRequired,
            minimumLevel: req.minimumLevel ?? undefined,
            yearsRequired: req.yearsRequired ?? undefined,
            priority: req.priority,
          },
          userSkill: {
            proficiency: exactMatch.proficiency,
            yearsExperience: exactMatch.yearsExperience ?? undefined,
          },
          compatibility,
          score,
          reason,
        });
        continue;
      }

      // Look for similar skill matches
      const similarMatch = await this.findSimilarSkillMatch(skill, userSkills);

      if (similarMatch) {
        matches.push({
          skill: {
            id: skill.id,
            name: skill.name,
            category: skill.category,
          },
          requirement: {
            id: req.id,
            isRequired: req.isRequired,
            minimumLevel: req.minimumLevel ?? undefined,
            yearsRequired: req.yearsRequired ?? undefined,
            priority: req.priority,
          },
          similarSkill: {
            id: similarMatch.skill.id,
            name: similarMatch.skill.name,
            proficiency: similarMatch.userSkill.proficiency,
            yearsExperience:
              similarMatch.userSkill.yearsExperience ?? undefined,
            similarityScore: similarMatch.similarityScore,
          },
          compatibility: "partial",
          score: Math.round(similarMatch.similarityScore * 70), // Max 70% for similar skills
          reason: `Has similar skill: ${similarMatch.skill.name} (${Math.round(similarMatch.similarityScore * 100)}% similarity)`,
        });
        continue;
      }

      // No match found
      matches.push({
        skill: {
          id: skill.id,
          name: skill.name,
          category: skill.category,
        },
        requirement: {
          id: req.id,
          isRequired: req.isRequired,
          minimumLevel: req.minimumLevel ?? undefined,
          yearsRequired: req.yearsRequired ?? undefined,
          priority: req.priority,
        },
        compatibility: "missing",
        score: 0,
        reason: "Skill not found in user profile",
      });
    }

    return matches;
  }

  private evaluateSkillMatch(
    requirement: {
      minimumLevel?: ProficiencyLevel | null;
      yearsRequired?: number | null;
    },
    userSkill: {
      proficiency: ProficiencyLevel;
      yearsExperience?: number | null;
    },
  ): { compatibility: CompatibilityLevel; score: number; reason: string } {
    let score = 100;
    let compatibility: CompatibilityLevel = "perfect";
    const reasons: string[] = [];

    // Check proficiency level
    if (requirement.minimumLevel) {
      const levelMap = {
        BEGINNER: 1,
        INTERMEDIATE: 2,
        ADVANCED: 3,
        EXPERT: 4,
      };

      const requiredLevel = levelMap[requirement.minimumLevel];
      const userLevel = levelMap[userSkill.proficiency];

      if (userLevel < requiredLevel) {
        score -= 30;
        compatibility = "partial";
        reasons.push(
          `Proficiency below required (${userSkill.proficiency} vs ${requirement.minimumLevel})`,
        );
      } else if (userLevel > requiredLevel) {
        reasons.push(`Exceeds required proficiency`);
      }
    }

    // Check years of experience
    if (requirement.yearsRequired && userSkill.yearsExperience) {
      if (userSkill.yearsExperience < requirement.yearsRequired) {
        const shortfall = requirement.yearsRequired - userSkill.yearsExperience;
        const penalty = Math.min(shortfall * 10, 40); // Max 40% penalty
        score -= penalty;
        compatibility = "partial";
        reasons.push(`${shortfall} years less experience than required`);
      }
    }

    const reason = reasons.length > 0 ? reasons.join(", ") : "Perfect match";

    return { compatibility, score: Math.max(score, 0), reason };
  }

  private async findSimilarSkillMatch(
    requiredSkill: JobPostingWithIncludes["skillRequirements"][0]["skill"],
    userSkills: UserSkillWithIncludes[],
  ): Promise<{
    skill: JobPostingWithIncludes["skillRequirements"][0]["skill"]["similarSkills"][0]["relatedSkill"];
    userSkill: UserSkillWithIncludes;
    similarityScore: number;
  } | null> {
    // Check skill similarities
    for (const similarity of requiredSkill.similarSkills) {
      const relatedSkillId = similarity.relatedSkillId;
      const userSkill = userSkills.find((us) => us.skillId === relatedSkillId);

      if (userSkill) {
        return {
          skill: similarity.relatedSkill,
          userSkill,
          similarityScore: similarity.similarityScore,
        };
      }
    }

    return null;
  }

  private analyzeExperienceMatches(
    requirements: JobPostingWithIncludes["experienceRequirements"],
    workHistory: WorkHistoryType[],
  ): ExperienceMatch[] {
    return requirements.map((req) => {
      const totalYears = this.calculateTotalExperience(workHistory);
      const relevantPositions = workHistory.map((wh) => ({
        jobTitle: wh.jobTitle,
        companyName: wh.companyName,
        years: this.calculateYearsAtPosition(
          wh.startDate,
          wh.endDate ?? undefined,
        ),
      }));

      let compatibility: CompatibilityLevel = "perfect";
      let score = 100;
      let reason = "Experience requirements met";

      if (req.years && totalYears < req.years) {
        const shortfall = req.years - totalYears;
        score = Math.max(0, 100 - shortfall * 20); // 20% penalty per year short
        compatibility = shortfall > 2 ? "missing" : "partial";
        reason = `${shortfall} years short of required experience`;
      }

      return {
        requirement: {
          id: req.id,
          years: req.years ?? undefined,
          description: req.description,
          category: req.category,
          isRequired: req.isRequired,
        },
        userExperience: {
          totalYears,
          relevantPositions: workHistory.map((wh) => ({
            jobTitle: wh.jobTitle,
            companyName: wh.companyName,
            years: this.calculateYearsAtPosition(
              wh.startDate,
              wh.endDate ?? undefined,
            ),
          })),
        },
        compatibility,
        score,
        reason,
      };
    });
  }

  private analyzeEducationMatches(
    requirements: JobPostingWithIncludes["educationRequirements"],
    education: EducationType[],
  ): EducationMatch[] {
    return requirements.map((req) => {
      const matchingEducation = education.filter((edu) =>
        this.educationMatches(edu, req),
      );

      let compatibility: CompatibilityLevel = "missing";
      let score = 0;
      let reason = "Education requirement not met";

      if (matchingEducation.length > 0) {
        compatibility = "perfect";
        score = 100;
        reason = `Meets requirement with ${matchingEducation[0]?.degreeOrCertName}`;
      }

      return {
        requirement: {
          id: req.id,
          level: req.level,
          field: req.field ?? undefined,
          description: req.description ?? undefined,
          isRequired: req.isRequired,
        },
        userEducation: education.map((edu) => ({
          type: edu.type,
          degreeOrCertName: edu.degreeOrCertName ?? undefined,
          institutionName: edu.institutionName,
          field: this.extractFieldFromDegree(edu.degreeOrCertName ?? undefined),
        })),
        compatibility,
        score,
        reason,
      };
    });
  }

  private calculateTotalExperience(workHistory: WorkHistoryType[]): number {
    return workHistory.reduce((total, work) => {
      return (
        total +
        this.calculateYearsAtPosition(work.startDate, work.endDate ?? undefined)
      );
    }, 0);
  }

  private calculateYearsAtPosition(startDate: Date, endDate?: Date): number {
    const end = endDate ?? new Date();
    const diffTime = Math.abs(end.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.round((diffDays / 365) * 10) / 10; // Round to 1 decimal
  }

  private educationMatches(
    education: EducationType,
    requirement: JobPostingWithIncludes["educationRequirements"][0],
  ): boolean {
    // This is a simplified matching logic - can be enhanced
    const educationLevelMap = {
      HIGH_SCHOOL: 1,
      ASSOCIATES: 2,
      BACHELORS: 3,
      MASTERS: 4,
      DOCTORATE: 5,
      CERTIFICATION: 2,
    };

    const userLevel =
      (educationLevelMap as Record<string, number>)[education.type] ?? 0;
    const requiredLevel =
      (educationLevelMap as Record<string, number>)[requirement.level] ?? 0;

    return userLevel >= requiredLevel;
  }

  private extractFieldFromDegree(degree?: string): string | undefined {
    if (!degree) return undefined;
    // Simple extraction - can be enhanced with more sophisticated parsing
    if (degree.toLowerCase().includes("computer science"))
      return "Computer Science";
    if (degree.toLowerCase().includes("engineering")) return "Engineering";
    if (degree.toLowerCase().includes("business")) return "Business";
    return undefined;
  }

  private calculateOverallScore(
    skillMatches: SkillMatch[],
    experienceMatches: ExperienceMatch[],
    educationMatches: EducationMatch[],
  ): {
    overallScore: number;
    summary: {
      perfectMatches: number;
      partialMatches: number;
      missingRequirements: number;
      strongPoints: string[];
      improvementAreas: string[];
    };
  } {
    const allMatches = [
      ...skillMatches,
      ...experienceMatches,
      ...educationMatches,
    ];

    if (allMatches.length === 0) {
      return {
        overallScore: 0,
        summary: {
          perfectMatches: 0,
          partialMatches: 0,
          missingRequirements: 0,
          strongPoints: [],
          improvementAreas: ["No requirements to analyze"],
        },
      };
    }

    // Weight different types of requirements
    const skillWeight = 0.6;
    const experienceWeight = 0.3;
    const educationWeight = 0.1;

    const skillScore = this.calculateCategoryScore(skillMatches);
    const experienceScore = this.calculateCategoryScore(experienceMatches);
    const educationScore = this.calculateCategoryScore(educationMatches);

    const overallScore = Math.round(
      skillScore * skillWeight +
        experienceScore * experienceWeight +
        educationScore * educationWeight,
    );

    const perfectMatches = allMatches.filter(
      (m) => m.compatibility === "perfect",
    ).length;
    const partialMatches = allMatches.filter(
      (m) => m.compatibility === "partial",
    ).length;
    const missingRequirements = allMatches.filter(
      (m) => m.compatibility === "missing",
    ).length;

    const strongPoints = this.generateStrongPoints(allMatches);
    const improvementAreas = this.generateImprovementAreas(allMatches);

    return {
      overallScore,
      summary: {
        perfectMatches,
        partialMatches,
        missingRequirements,
        strongPoints,
        improvementAreas,
      },
    };
  }

  private calculateCategoryScore(
    matches: (SkillMatch | ExperienceMatch | EducationMatch)[],
  ): number {
    if (matches.length === 0) return 100; // No requirements = perfect score

    const totalScore = matches.reduce((sum, match) => sum + match.score, 0);
    return totalScore / matches.length;
  }

  private generateStrongPoints(
    matches: (SkillMatch | ExperienceMatch | EducationMatch)[],
  ): string[] {
    const perfectMatches = matches.filter((m) => m.compatibility === "perfect");
    const strongPoints: string[] = [];

    if (perfectMatches.length > 0) {
      strongPoints.push(
        `Strong match on ${perfectMatches.length} requirements`,
      );
    }

    const highScoreMatches = matches.filter((m) => m.score >= 80);
    if (highScoreMatches.length > perfectMatches.length) {
      strongPoints.push(
        `High compatibility on ${highScoreMatches.length} total requirements`,
      );
    }

    return strongPoints.slice(0, 3); // Limit to top 3
  }

  private generateImprovementAreas(
    matches: (SkillMatch | ExperienceMatch | EducationMatch)[],
  ): string[] {
    const missingMatches = matches.filter((m) => m.compatibility === "missing");
    const improvementAreas: string[] = [];

    if (missingMatches.length > 0) {
      const missingSkills = missingMatches
        .filter((m) => "skill" in m)
        .map((m) => m.skill.name)
        .slice(0, 3);

      if (missingSkills.length > 0) {
        improvementAreas.push(`Consider learning: ${missingSkills.join(", ")}`);
      }
    }

    const partialMatches = matches.filter(
      (m) => m.compatibility === "partial" && m.score < 60,
    );
    if (partialMatches.length > 0) {
      improvementAreas.push(`Strengthen skills in areas with partial matches`);
    }

    return improvementAreas.slice(0, 3); // Limit to top 3
  }
}
