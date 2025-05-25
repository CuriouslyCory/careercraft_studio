import { type PrismaClient, type Prisma } from "@prisma/client";
import type {
  ProficiencyLevel,
  SkillCategory,
  EducationType,
  UserDetailCategory,
} from "@prisma/client";

// Comprehensive user data type for resume generation
type UserResumeData = Prisma.UserGetPayload<{
  include: {
    workHistories: {
      include: {
        achievements: true;
        userSkills: {
          include: {
            skill: true;
          };
        };
      };
    };
    educations: true;
    keyAchievements: true;
    userDetails: true;
    userSkills: {
      include: {
        skill: true;
        workHistory: true;
      };
    };
    userLinks: {
      orderBy: { createdAt: "desc" };
    };
  };
}>;

export class ResumeDataGenerator {
  constructor(private db: PrismaClient) {}

  /**
   * Generate a comprehensive markdown-formatted string with all user information
   * for resume building LLM consumption
   */
  async generateResumeData(userId: string): Promise<string> {
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Fetch all user data in a single query
    const userData = await this.db.user.findUnique({
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
        educations: {
          orderBy: { dateCompleted: "desc" },
        },
        keyAchievements: {
          orderBy: { createdAt: "desc" },
        },
        userDetails: {
          orderBy: { category: "asc" },
        },
        userSkills: {
          include: {
            skill: true,
            workHistory: true,
          },
          orderBy: [{ proficiency: "desc" }, { yearsExperience: "desc" }],
        },
        userLinks: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!userData) {
      throw new Error("User not found");
    }

    return this.formatUserDataAsMarkdown(userData);
  }

  /**
   * Generate a focused markdown string for specific sections only
   */
  async generateResumeDataSections(
    userId: string,
    sections: Array<
      | "work_history"
      | "education"
      | "skills"
      | "achievements"
      | "details"
      | "links"
    >,
  ): Promise<string> {
    const fullData = await this.generateResumeData(userId);

    // Parse the full markdown and extract only requested sections
    const sectionMap = this.parseMarkdownSections(fullData);

    let result = "# User Resume Data\n\n";

    for (const section of sections) {
      if (sectionMap[section]) {
        result += sectionMap[section] + "\n\n";
      }
    }

    return result.trim();
  }

  private formatUserDataAsMarkdown(userData: UserResumeData): string {
    const sections: string[] = [];

    // Header
    sections.push("# User Resume Data");
    sections.push("");
    sections.push(
      "This document contains comprehensive user information for resume generation.",
    );
    sections.push("");

    // Personal Information
    if (userData.name || userData.email) {
      sections.push("## Personal Information");
      sections.push("");
      if (userData.name) {
        sections.push(`**Name:** ${userData.name}`);
      }
      if (userData.email) {
        sections.push(`**Email:** ${userData.email}`);
      }
      sections.push("");
    }

    // User Links
    if (userData.userLinks.length > 0) {
      sections.push("## User Links");
      sections.push("");

      for (const link of userData.userLinks) {
        const typeDisplay =
          link.type && link.type !== "OTHER" ? ` (${link.type})` : "";
        sections.push(`- **${link.title}${typeDisplay}:** ${link.url}`);
      }
      sections.push("");
    }

    // Work History
    if (userData.workHistories.length > 0) {
      sections.push("## Work History");
      sections.push("");

      for (const job of userData.workHistories) {
        sections.push(`### ${job.jobTitle} at ${job.companyName}`);
        sections.push("");

        const startDate = job.startDate.toLocaleDateString();
        const endDate = job.endDate
          ? job.endDate.toLocaleDateString()
          : "Present";
        sections.push(`**Duration:** ${startDate} - ${endDate}`);

        // Calculate years of experience
        const years = this.calculateYearsOfExperience(
          job.startDate,
          job.endDate,
        );
        sections.push(`**Years of Experience:** ${years} years`);
        sections.push("");

        // Job-specific skills
        const jobSkills = job.userSkills;
        if (jobSkills.length > 0) {
          sections.push("**Skills Used:**");
          for (const userSkill of jobSkills) {
            const proficiencyDisplay = this.formatProficiency(
              userSkill.proficiency,
            );
            const experienceDisplay = userSkill.yearsExperience
              ? ` (${userSkill.yearsExperience} years)`
              : "";
            sections.push(
              `- ${userSkill.skill.name} - ${proficiencyDisplay}${experienceDisplay}`,
            );
          }
          sections.push("");
        }

        // Achievements
        if (job.achievements.length > 0) {
          sections.push("**Key Achievements:**");
          for (const achievement of job.achievements) {
            sections.push(`- ${achievement.description}`);
          }
          sections.push("");
        }
      }
    }

    // Education
    if (userData.educations.length > 0) {
      sections.push("## Education");
      sections.push("");

      for (const education of userData.educations) {
        sections.push(`### ${education.institutionName}`);
        sections.push("");

        if (education.degreeOrCertName) {
          sections.push(
            `**Degree/Certification:** ${education.degreeOrCertName}`,
          );
        }

        sections.push(`**Type:** ${this.formatEducationType(education.type)}`);

        if (education.dateCompleted) {
          sections.push(
            `**Completed:** ${education.dateCompleted.toLocaleDateString()}`,
          );
        }

        if (education.description) {
          sections.push(`**Description:** ${education.description}`);
        }

        sections.push("");
      }
    }

    // All Skills (comprehensive view)
    if (userData.userSkills.length > 0) {
      sections.push("## Skills Overview");
      sections.push("");

      // Group skills by category
      const skillsByCategory = this.groupSkillsByCategory(userData.userSkills);

      for (const [category, skills] of Object.entries(skillsByCategory)) {
        if (skills.length > 0) {
          sections.push(
            `### ${this.formatSkillCategory(category as SkillCategory)}`,
          );
          sections.push("");

          for (const userSkill of skills) {
            const proficiencyDisplay = this.formatProficiency(
              userSkill.proficiency,
            );
            const experienceDisplay = userSkill.yearsExperience
              ? ` (${userSkill.yearsExperience} years)`
              : "";
            const sourceDisplay = userSkill.source
              ? ` - Source: ${this.formatSkillSource(userSkill.source)}`
              : "";
            const contextDisplay = userSkill.workHistory
              ? ` - Context: ${userSkill.workHistory.jobTitle} at ${userSkill.workHistory.companyName}`
              : "";

            sections.push(
              `- **${userSkill.skill.name}:** ${proficiencyDisplay}${experienceDisplay}${sourceDisplay}${contextDisplay}`,
            );

            if (userSkill.notes) {
              sections.push(`  - Notes: ${userSkill.notes}`);
            }
          }
          sections.push("");
        }
      }
    }

    // Key Achievements (standalone achievements)
    if (userData.keyAchievements.length > 0) {
      sections.push("## Key Achievements");
      sections.push("");
      sections.push(
        "*Notable achievements outside of specific work experiences:*",
      );
      sections.push("");

      for (const achievement of userData.keyAchievements) {
        sections.push(`- ${achievement.content}`);
      }
      sections.push("");
    }

    // User Details (preferences, motivations, etc.)
    if (userData.userDetails.length > 0) {
      sections.push("## Additional Information");
      sections.push("");

      // Group by category
      const detailsByCategory = this.groupDetailsByCategory(
        userData.userDetails,
      );

      for (const [category, details] of Object.entries(detailsByCategory)) {
        if (details.length > 0) {
          sections.push(
            `### ${this.formatUserDetailCategory(category as UserDetailCategory)}`,
          );
          sections.push("");

          for (const detail of details) {
            sections.push(`- ${detail.content}`);
          }
          sections.push("");
        }
      }
    }

    // Summary Statistics
    sections.push("## Summary Statistics");
    sections.push("");

    const totalExperience = this.calculateTotalExperience(
      userData.workHistories,
    );
    sections.push(`**Total Work Experience:** ${totalExperience} years`);
    sections.push(`**Number of Positions:** ${userData.workHistories.length}`);
    sections.push(`**Education Entries:** ${userData.educations.length}`);
    sections.push(`**Total Skills:** ${userData.userSkills.length}`);
    sections.push(`**Key Achievements:** ${userData.keyAchievements.length}`);

    // Skills breakdown
    const skillsByProficiency = this.groupSkillsByProficiency(
      userData.userSkills,
    );
    for (const [proficiency, count] of Object.entries(skillsByProficiency)) {
      if (count > 0) {
        sections.push(
          `**${this.formatProficiency(proficiency as ProficiencyLevel)} Skills:** ${count}`,
        );
      }
    }

    return sections.join("\n");
  }

  private parseMarkdownSections(markdown: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = markdown.split("\n");

    let currentSection = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        // Save previous section
        if (currentSection) {
          const sectionKey = this.getSectionKey(currentSection);
          if (sectionKey) {
            sections[sectionKey] = currentContent.join("\n");
          }
        }

        // Start new section
        currentSection = line.replace("## ", "");
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      const sectionKey = this.getSectionKey(currentSection);
      if (sectionKey) {
        sections[sectionKey] = currentContent.join("\n");
      }
    }

    return sections;
  }

  private getSectionKey(sectionTitle: string): string | null {
    const mapping: Record<string, string> = {
      "Work History": "work_history",
      Education: "education",
      "Skills Overview": "skills",
      "Key Achievements": "achievements",
      "Additional Information": "details",
      "User Links": "links",
    };

    return mapping[sectionTitle] ?? null;
  }

  private calculateYearsOfExperience(
    startDate: Date,
    endDate?: Date | null,
  ): number {
    const end = endDate ?? new Date();
    const diffInMs = end.getTime() - startDate.getTime();
    const years = diffInMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.round(years * 10) / 10; // Round to 1 decimal place
  }

  private calculateTotalExperience(
    workHistories: UserResumeData["workHistories"],
  ): number {
    let totalYears = 0;

    for (const job of workHistories) {
      totalYears += this.calculateYearsOfExperience(job.startDate, job.endDate);
    }

    return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
  }

  private groupSkillsByCategory(userSkills: UserResumeData["userSkills"]) {
    const grouped: Record<SkillCategory, typeof userSkills> = {
      // Technology & Engineering
      PROGRAMMING_LANGUAGE: [],
      FRAMEWORK_LIBRARY: [],
      DATABASE: [],
      CLOUD_PLATFORM: [],
      DEVOPS_TOOLS: [],
      DESIGN_TOOLS: [],

      // Healthcare & Medical
      MEDICAL_PROCEDURE: [],
      MEDICAL_EQUIPMENT: [],
      DIAGNOSTIC_SKILLS: [],
      PATIENT_CARE: [],
      MEDICAL_SOFTWARE: [],

      // Finance & Business
      FINANCIAL_ANALYSIS: [],
      ACCOUNTING_SOFTWARE: [],
      TRADING_PLATFORMS: [],
      REGULATORY_COMPLIANCE: [],
      RISK_MANAGEMENT: [],

      // Legal
      LEGAL_RESEARCH: [],
      LEGAL_SOFTWARE: [],
      CASE_MANAGEMENT: [],
      LITIGATION_SKILLS: [],
      CONTRACT_LAW: [],

      // Manufacturing & Operations
      MANUFACTURING_EQUIPMENT: [],
      QUALITY_CONTROL: [],
      SUPPLY_CHAIN: [],
      LEAN_METHODOLOGY: [],
      SAFETY_PROTOCOLS: [],

      // Sales & Marketing
      CRM_SYSTEMS: [],
      DIGITAL_MARKETING: [],
      SALES_TECHNIQUES: [],
      MARKET_RESEARCH: [],
      CONTENT_CREATION: [],

      // Education & Training
      CURRICULUM_DEVELOPMENT: [],
      EDUCATIONAL_TECHNOLOGY: [],
      ASSESSMENT_METHODS: [],
      CLASSROOM_MANAGEMENT: [],
      LEARNING_MANAGEMENT_SYSTEMS: [],

      // Creative & Media
      GRAPHIC_DESIGN_SOFTWARE: [],
      VIDEO_EDITING: [],
      AUDIO_PRODUCTION: [],
      CREATIVE_WRITING: [],
      PHOTOGRAPHY_EQUIPMENT: [],

      // Universal Categories
      PROJECT_MANAGEMENT: [],
      SOFT_SKILLS: [],
      INDUSTRY_KNOWLEDGE: [],
      CERTIFICATION: [],
      METHODOLOGY: [],
      LANGUAGES: [],
      OTHER: [],
    };

    for (const userSkill of userSkills) {
      grouped[userSkill.skill.category].push(userSkill);
    }

    return grouped;
  }

  private groupSkillsByProficiency(userSkills: UserResumeData["userSkills"]) {
    const grouped: Record<ProficiencyLevel, number> = {
      BEGINNER: 0,
      INTERMEDIATE: 0,
      ADVANCED: 0,
      EXPERT: 0,
    };

    for (const userSkill of userSkills) {
      grouped[userSkill.proficiency]++;
    }

    return grouped;
  }

  private groupDetailsByCategory(userDetails: UserResumeData["userDetails"]) {
    const grouped: Record<UserDetailCategory, typeof userDetails> = {
      MOTIVATION: [],
      INTEREST: [],
      CAREER_GOAL: [],
      STRENGTH: [],
      WEAKNESS: [],
      WORK_PREFERENCE: [],
      OTHER: [],
    };

    for (const detail of userDetails) {
      grouped[detail.category].push(detail);
    }

    return grouped;
  }

  private formatProficiency(proficiency: ProficiencyLevel): string {
    const mapping: Record<ProficiencyLevel, string> = {
      BEGINNER: "Beginner",
      INTERMEDIATE: "Intermediate",
      ADVANCED: "Advanced",
      EXPERT: "Expert",
    };
    return mapping[proficiency];
  }

  private formatEducationType(type: EducationType): string {
    const mapping: Record<EducationType, string> = {
      HIGH_SCHOOL: "High School",
      GED: "GED",
      ASSOCIATES: "Associate's Degree",
      BACHELORS: "Bachelor's Degree",
      MASTERS: "Master's Degree",
      DOCTORATE: "Doctorate",
      CERTIFICATION: "Certification",
      OTHER: "Other",
    };
    return mapping[type];
  }

  private formatSkillCategory(category: SkillCategory): string {
    const mapping: Record<SkillCategory, string> = {
      PROGRAMMING_LANGUAGE: "Programming Languages",
      FRAMEWORK_LIBRARY: "Frameworks & Libraries",
      DATABASE: "Databases",
      CLOUD_PLATFORM: "Cloud Platforms",
      DEVOPS_TOOLS: "DevOps Tools",
      DESIGN_TOOLS: "Design Tools",
      MEDICAL_PROCEDURE: "Medical Procedures",
      MEDICAL_EQUIPMENT: "Medical Equipment",
      DIAGNOSTIC_SKILLS: "Diagnostic Skills",
      PATIENT_CARE: "Patient Care",
      MEDICAL_SOFTWARE: "Medical Software",
      FINANCIAL_ANALYSIS: "Financial Analysis",
      ACCOUNTING_SOFTWARE: "Accounting Software",
      TRADING_PLATFORMS: "Trading Platforms",
      REGULATORY_COMPLIANCE: "Regulatory Compliance",
      RISK_MANAGEMENT: "Risk Management",
      LEGAL_RESEARCH: "Legal Research",
      LEGAL_SOFTWARE: "Legal Software",
      CASE_MANAGEMENT: "Case Management",
      LITIGATION_SKILLS: "Litigation Skills",
      CONTRACT_LAW: "Contract Law",
      MANUFACTURING_EQUIPMENT: "Manufacturing Equipment",
      QUALITY_CONTROL: "Quality Control",
      SUPPLY_CHAIN: "Supply Chain",
      LEAN_METHODOLOGY: "Lean Methodology",
      SAFETY_PROTOCOLS: "Safety Protocols",
      CRM_SYSTEMS: "CRM Systems",
      DIGITAL_MARKETING: "Digital Marketing",
      SALES_TECHNIQUES: "Sales Techniques",
      MARKET_RESEARCH: "Market Research",
      CONTENT_CREATION: "Content Creation",
      CURRICULUM_DEVELOPMENT: "Curriculum Development",
      EDUCATIONAL_TECHNOLOGY: "Educational Technology",
      ASSESSMENT_METHODS: "Assessment Methods",
      CLASSROOM_MANAGEMENT: "Classroom Management",
      LEARNING_MANAGEMENT_SYSTEMS: "Learning Management Systems",
      GRAPHIC_DESIGN_SOFTWARE: "Graphic Design Software",
      VIDEO_EDITING: "Video Editing",
      AUDIO_PRODUCTION: "Audio Production",
      CREATIVE_WRITING: "Creative Writing",
      PHOTOGRAPHY_EQUIPMENT: "Photography Equipment",
      PROJECT_MANAGEMENT: "Project Management",
      SOFT_SKILLS: "Soft Skills",
      INDUSTRY_KNOWLEDGE: "Industry Knowledge",
      CERTIFICATION: "Certifications",
      METHODOLOGY: "Methodologies",
      LANGUAGES: "Languages",
      OTHER: "Other Skills",
    };
    return mapping[category];
  }

  private formatUserDetailCategory(category: UserDetailCategory): string {
    const mapping: Record<UserDetailCategory, string> = {
      MOTIVATION: "Motivations",
      INTEREST: "Interests",
      CAREER_GOAL: "Career Goals",
      STRENGTH: "Strengths",
      WEAKNESS: "Areas for Improvement",
      WORK_PREFERENCE: "Work Preferences",
      OTHER: "Other Information",
    };
    return mapping[category];
  }

  private formatSkillSource(source: string): string {
    const mapping: Record<string, string> = {
      WORK_EXPERIENCE: "Work Experience",
      EDUCATION: "Education",
      CERTIFICATION: "Certification",
      PERSONAL_PROJECT: "Personal Project",
      TRAINING: "Training",
      OTHER: "Other",
    };
    return mapping[source] ?? source;
  }
}

/**
 * Standalone function that can be called from TRPC or agent tools
 */
export async function generateUserResumeData(
  db: PrismaClient,
  userId: string,
): Promise<string> {
  const generator = new ResumeDataGenerator(db);
  return generator.generateResumeData(userId);
}

/**
 * Generate specific sections only
 */
export async function generateUserResumeDataSections(
  db: PrismaClient,
  userId: string,
  sections: Array<
    | "work_history"
    | "education"
    | "skills"
    | "achievements"
    | "details"
    | "links"
  >,
): Promise<string> {
  const generator = new ResumeDataGenerator(db);
  return generator.generateResumeDataSections(userId, sections);
}
