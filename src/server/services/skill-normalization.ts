import { type PrismaClient } from "@prisma/client";
import { type SkillCategory } from "@prisma/client";

// =============================================================================
// SKILL NORMALIZATION SERVICE
// =============================================================================

/**
 * Database client interface that works with both PrismaClient and transaction clients
 */
type DatabaseClient = Pick<
  PrismaClient,
  "skill" | "skillAlias" | "userSkill" | "jobSkillRequirement"
> & {
  $transaction?: PrismaClient["$transaction"];
};

/**
 * Interface for normalized skill data
 */
export interface NormalizedSkill {
  baseSkillId: string;
  baseSkillName: string;
  detailedVariant?: string;
  category: SkillCategory;
  isNewBaseSkill: boolean;
  isNewVariant: boolean;
}

/**
 * Interface for skill parsing result
 */
export interface SkillParseResult {
  baseSkill: string;
  details?: string;
  confidence: number;
  pattern: string;
}

/**
 * Skill normalization service that handles intelligent skill deduplication
 * while maintaining granularity for ATS matching
 */
export class SkillNormalizationService {
  constructor(private db: DatabaseClient) {}

  /**
   * Common skill patterns and their base forms
   * Pattern matching for popular technologies
   */
  private readonly SKILL_PATTERNS: Array<{
    pattern: RegExp;
    baseSkill: string;
    category: SkillCategory;
  }> = [
    // React patterns
    {
      pattern: /^React(?:\.js|JS)?\s*\(.*\)$/i,
      baseSkill: "React",
      category: "FRAMEWORK_LIBRARY",
    },
    {
      pattern: /^React(?:\.js|JS)?\s+.+$/i,
      baseSkill: "React",
      category: "FRAMEWORK_LIBRARY",
    },

    // Next.js patterns
    {
      pattern: /^Next(?:\.js)?\s*\(.*\)$/i,
      baseSkill: "Next.js",
      category: "FRAMEWORK_LIBRARY",
    },
    {
      pattern: /^Next(?:\.js)?\s+.+$/i,
      baseSkill: "Next.js",
      category: "FRAMEWORK_LIBRARY",
    },

    // Node.js patterns
    {
      pattern: /^Node(?:\.js)?\s*\(.*\)$/i,
      baseSkill: "Node.js",
      category: "PROGRAMMING_LANGUAGE",
    },
    {
      pattern: /^Node(?:\.js)?\s+.+$/i,
      baseSkill: "Node.js",
      category: "PROGRAMMING_LANGUAGE",
    },

    // Cloud platforms
    {
      pattern: /^AWS\s*\(.*\)$/i,
      baseSkill: "AWS",
      category: "CLOUD_PLATFORM",
    },
    {
      pattern: /^Azure\s*\(.*\)$/i,
      baseSkill: "Azure",
      category: "CLOUD_PLATFORM",
    },
    {
      pattern: /^Cloudflare\s*\(.*\)$/i,
      baseSkill: "Cloudflare",
      category: "CLOUD_PLATFORM",
    },
    {
      pattern: /^Google Cloud\s*\(.*\)$/i,
      baseSkill: "Google Cloud",
      category: "CLOUD_PLATFORM",
    },

    // Databases
    {
      pattern: /^PostgreSQL\s*\(.*\)$/i,
      baseSkill: "PostgreSQL",
      category: "DATABASE",
    },
    {
      pattern: /^MySQL\s*\(.*\)$/i,
      baseSkill: "MySQL",
      category: "DATABASE",
    },
    {
      pattern: /^MongoDB\s*\(.*\)$/i,
      baseSkill: "MongoDB",
      category: "DATABASE",
    },

    // Programming languages
    {
      pattern: /^JavaScript\s*\(.*\)$/i,
      baseSkill: "JavaScript",
      category: "PROGRAMMING_LANGUAGE",
    },
    {
      pattern: /^TypeScript\s*\(.*\)$/i,
      baseSkill: "TypeScript",
      category: "PROGRAMMING_LANGUAGE",
    },
    {
      pattern: /^Python\s*\(.*\)$/i,
      baseSkill: "Python",
      category: "PROGRAMMING_LANGUAGE",
    },

    // Tools and frameworks
    {
      pattern: /^Docker\s*\(.*\)$/i,
      baseSkill: "Docker",
      category: "DEVOPS_TOOLS",
    },
    {
      pattern: /^Kubernetes\s*\(.*\)$/i,
      baseSkill: "Kubernetes",
      category: "DEVOPS_TOOLS",
    },
    {
      pattern: /^Git\s*\(.*\)$/i,
      baseSkill: "Git",
      category: "DEVOPS_TOOLS",
    },
  ];

  /**
   * Common aliases for popular skills
   */
  private readonly SKILL_ALIASES: Record<string, string[]> = {
    React: ["ReactJS", "React.js", "React JS"],
    "Vue.js": ["Vue", "VueJS", "Vue JS"],
    Angular: ["AngularJS", "Angular.js"],
    "Node.js": ["Node", "NodeJS", "Node JS"],
    "Next.js": ["Next", "NextJS", "Next JS"],
    "Express.js": ["Express", "ExpressJS"],
    JavaScript: ["JS", "ECMAScript", "ES6", "ES2015"],
    TypeScript: ["TS"],
    PostgreSQL: ["Postgres", "PSQL"],
    MongoDB: ["Mongo"],
    "Amazon Web Services": ["AWS"],
    "Google Cloud Platform": ["GCP", "Google Cloud"],
    "Microsoft Azure": ["Azure"],
  };

  /**
   * Parse a skill name to extract base skill and details
   */
  public parseSkillName(skillName: string): SkillParseResult {
    const trimmedSkill = skillName.trim();

    // Check against known patterns
    for (const { pattern, baseSkill } of this.SKILL_PATTERNS) {
      if (pattern.test(trimmedSkill)) {
        // Extract details from parentheses or after the base skill
        const detailsMatch =
          /\(([^)]+)\)/.exec(trimmedSkill) ??
          new RegExp(`^${baseSkill}\\s+(.+)`, "i").exec(trimmedSkill);

        return {
          baseSkill,
          details: detailsMatch?.[1],
          confidence: 0.9,
          pattern: pattern.source,
        };
      }
    }

    // Check for parenthetical details without known patterns
    const parenthesesMatch = /^([^(]+)\s*\(([^)]+)\)$/.exec(trimmedSkill);
    if (parenthesesMatch?.[1] && parenthesesMatch[2]) {
      return {
        baseSkill: parenthesesMatch[1].trim(),
        details: parenthesesMatch[2].trim(),
        confidence: 0.7,
        pattern: "parentheses",
      };
    }

    // Check for common separators (comma, dash, etc.)
    const separatorMatch = /^([^,-]+)[,-]\s*(.+)$/.exec(trimmedSkill);
    if (separatorMatch?.[1] && separatorMatch[2]) {
      return {
        baseSkill: separatorMatch[1].trim(),
        details: separatorMatch[2].trim(),
        confidence: 0.6,
        pattern: "separator",
      };
    }

    // Return as-is if no pattern matches
    return {
      baseSkill: trimmedSkill,
      confidence: 1.0,
      pattern: "exact",
    };
  }

  /**
   * Normalize a skill name and return the base skill information
   */
  public async normalizeSkill(
    skillName: string,
    defaultCategory: SkillCategory = "OTHER",
  ): Promise<NormalizedSkill> {
    const parseResult = this.parseSkillName(skillName);
    const { baseSkill, details } = parseResult;

    // Determine category from patterns
    const patternMatch = this.SKILL_PATTERNS.find(
      (p) =>
        p.pattern.test(skillName) ||
        p.baseSkill.toLowerCase() === baseSkill.toLowerCase(),
    );
    const category = patternMatch?.category ?? defaultCategory;

    // Look for existing base skill (by name or alias)
    const existingSkill = await this.findExistingSkill(baseSkill);

    let baseSkillId: string;
    let isNewBaseSkill = false;

    if (existingSkill) {
      baseSkillId = existingSkill.id;
    } else {
      // Create new base skill
      const newSkill = await this.db.skill.create({
        data: {
          name: baseSkill,
          category,
          description: details
            ? `Base skill for ${baseSkill} variants`
            : undefined,
        },
      });
      baseSkillId = newSkill.id;
      isNewBaseSkill = true;

      // Create aliases for the base skill
      await this.createAliasesForSkill(baseSkillId, baseSkill);
    }

    // Handle detailed variant
    let isNewVariant = false;
    if (details && skillName !== baseSkill) {
      // Check if this specific variant already exists as an alias
      const existingAlias = await this.db.skillAlias.findFirst({
        where: {
          alias: { equals: skillName, mode: "insensitive" },
          skillId: baseSkillId,
        },
      });

      if (!existingAlias) {
        // Create alias for the detailed variant
        await this.db.skillAlias.create({
          data: {
            alias: skillName,
            skillId: baseSkillId,
          },
        });
        isNewVariant = true;
      }
    }

    return {
      baseSkillId,
      baseSkillName: baseSkill,
      detailedVariant: details ? skillName : undefined,
      category,
      isNewBaseSkill,
      isNewVariant,
    };
  }

  /**
   * Find existing skill by name or alias
   */
  private async findExistingSkill(skillName: string) {
    return await this.db.skill.findFirst({
      where: {
        OR: [
          { name: { equals: skillName, mode: "insensitive" } },
          {
            aliases: {
              some: {
                alias: { equals: skillName, mode: "insensitive" },
              },
            },
          },
        ],
      },
    });
  }

  /**
   * Create common aliases for a skill
   */
  private async createAliasesForSkill(skillId: string, skillName: string) {
    const aliases = this.SKILL_ALIASES[skillName] ?? [];

    if (aliases.length > 0) {
      // Create aliases, but handle duplicates gracefully
      for (const alias of aliases) {
        try {
          await this.db.skillAlias.create({
            data: {
              alias,
              skillId,
            },
          });
        } catch (error) {
          // Ignore duplicate alias errors
          console.log(`Alias ${alias} already exists for skill ${skillName}`);
        }
      }
    }
  }

  /**
   * Bulk normalize skills for efficient processing
   */
  public async normalizeSkills(
    skillNames: string[],
    defaultCategory: SkillCategory = "OTHER",
  ): Promise<NormalizedSkill[]> {
    const results: NormalizedSkill[] = [];

    // Process skills to avoid duplicates within the batch
    const uniqueSkills = [...new Set(skillNames.filter((s) => s.trim()))];
    const processedBaseSkills = new Set<string>();

    for (const skillName of uniqueSkills) {
      const parseResult = this.parseSkillName(skillName);
      const baseSkillLower = parseResult.baseSkill.toLowerCase();

      // Skip if we've already processed this base skill in this batch
      if (processedBaseSkills.has(baseSkillLower)) {
        // Still need to handle the variant alias
        if (parseResult.details && skillName !== parseResult.baseSkill) {
          const existingSkill = await this.findExistingSkill(
            parseResult.baseSkill,
          );
          if (existingSkill) {
            // Check if alias exists
            const existingAlias = await this.db.skillAlias.findFirst({
              where: {
                alias: { equals: skillName, mode: "insensitive" },
                skillId: existingSkill.id,
              },
            });

            if (!existingAlias) {
              await this.db.skillAlias.create({
                data: {
                  alias: skillName,
                  skillId: existingSkill.id,
                },
              });
            }
          }
        }
        continue;
      }

      const normalized = await this.normalizeSkill(skillName, defaultCategory);
      results.push(normalized);
      processedBaseSkills.add(baseSkillLower);
    }

    return results;
  }

  /**
   * Get skill suggestions for a partial skill name
   */
  public async getSkillSuggestions(
    partialName: string,
    limit = 10,
  ): Promise<Array<{ id: string; name: string; category: SkillCategory }>> {
    const skills = await this.db.skill.findMany({
      where: {
        OR: [
          { name: { contains: partialName, mode: "insensitive" } },
          {
            aliases: {
              some: {
                alias: { contains: partialName, mode: "insensitive" },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
      },
      take: limit,
      orderBy: [{ name: "asc" }],
    });

    return skills;
  }

  /**
   * Migrate existing skills to use normalization
   */
  public async migrateExistingSkills(): Promise<{
    processed: number;
    normalized: number;
    aliasesCreated: number;
  }> {
    if (!this.db.$transaction) {
      throw new Error(
        "Migration requires a full PrismaClient with transaction support",
      );
    }

    const existingSkills = await this.db.skill.findMany({
      select: { id: true, name: true, category: true },
    });

    let normalized = 0;
    let aliasesCreated = 0;

    for (const skill of existingSkills) {
      const parseResult = this.parseSkillName(skill.name);

      // If this skill has details and isn't already the base skill
      if (parseResult.details && parseResult.baseSkill !== skill.name) {
        // Find if the base skill exists
        const baseSkill = await this.findExistingSkill(parseResult.baseSkill);

        if (baseSkill && baseSkill.id !== skill.id) {
          // This skill should become an alias of the base skill
          // First, migrate any references to this skill
          await this.db.$transaction(async (tx) => {
            // Update UserSkill references
            await tx.userSkill.updateMany({
              where: { skillId: skill.id },
              data: { skillId: baseSkill.id },
            });

            // Update JobSkillRequirement references
            await tx.jobSkillRequirement.updateMany({
              where: { skillId: skill.id },
              data: { skillId: baseSkill.id },
            });

            // Create alias for the detailed skill name
            try {
              await tx.skillAlias.create({
                data: {
                  alias: skill.name,
                  skillId: baseSkill.id,
                },
              });
              aliasesCreated++;
            } catch (error) {
              // Alias might already exist
            }

            // Delete the duplicate skill
            await tx.skill.delete({
              where: { id: skill.id },
            });

            normalized++;
          });
        }
      }
    }

    return {
      processed: existingSkills.length,
      normalized,
      aliasesCreated,
    };
  }
}
