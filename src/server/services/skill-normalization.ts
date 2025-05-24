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
   * Pattern matching for popular technologies and industry skills
   */
  private readonly SKILL_PATTERNS: Array<{
    pattern: RegExp;
    baseSkill: string;
    category: SkillCategory;
  }> = [
    // =============================================================================
    // TECHNOLOGY & ENGINEERING
    // =============================================================================

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

    // =============================================================================
    // HEALTHCARE & MEDICAL
    // =============================================================================

    {
      pattern: /^EMR\s*\(.*\)$/i,
      baseSkill: "EMR",
      category: "MEDICAL_SOFTWARE",
    },
    {
      pattern: /^Electronic Medical Records?\s*\(.*\)$/i,
      baseSkill: "EMR",
      category: "MEDICAL_SOFTWARE",
    },
    {
      pattern: /^Epic\s*\(.*\)$/i,
      baseSkill: "Epic",
      category: "MEDICAL_SOFTWARE",
    },
    {
      pattern: /^Cerner\s*\(.*\)$/i,
      baseSkill: "Cerner",
      category: "MEDICAL_SOFTWARE",
    },
    {
      pattern: /^IV Therapy\s*\(.*\)$/i,
      baseSkill: "IV Therapy",
      category: "MEDICAL_PROCEDURE",
    },
    {
      pattern: /^Phlebotomy\s*\(.*\)$/i,
      baseSkill: "Phlebotomy",
      category: "MEDICAL_PROCEDURE",
    },
    {
      pattern: /^CPR\s*\(.*\)$/i,
      baseSkill: "CPR",
      category: "MEDICAL_PROCEDURE",
    },

    // =============================================================================
    // FINANCE & BUSINESS
    // =============================================================================

    {
      pattern: /^Excel\s*\(.*\)$/i,
      baseSkill: "Excel",
      category: "ACCOUNTING_SOFTWARE",
    },
    {
      pattern: /^QuickBooks\s*\(.*\)$/i,
      baseSkill: "QuickBooks",
      category: "ACCOUNTING_SOFTWARE",
    },
    {
      pattern: /^SAP\s*\(.*\)$/i,
      baseSkill: "SAP",
      category: "ACCOUNTING_SOFTWARE",
    },
    {
      pattern: /^Financial Modeling\s*\(.*\)$/i,
      baseSkill: "Financial Modeling",
      category: "FINANCIAL_ANALYSIS",
    },
    {
      pattern: /^Bloomberg Terminal\s*\(.*\)$/i,
      baseSkill: "Bloomberg Terminal",
      category: "TRADING_PLATFORMS",
    },

    // =============================================================================
    // SALES & MARKETING
    // =============================================================================

    {
      pattern: /^Salesforce\s*\(.*\)$/i,
      baseSkill: "Salesforce",
      category: "CRM_SYSTEMS",
    },
    {
      pattern: /^HubSpot\s*\(.*\)$/i,
      baseSkill: "HubSpot",
      category: "CRM_SYSTEMS",
    },
    {
      pattern: /^Google Analytics\s*\(.*\)$/i,
      baseSkill: "Google Analytics",
      category: "DIGITAL_MARKETING",
    },
    {
      pattern: /^Facebook Ads\s*\(.*\)$/i,
      baseSkill: "Facebook Ads",
      category: "DIGITAL_MARKETING",
    },
    {
      pattern: /^Google Ads\s*\(.*\)$/i,
      baseSkill: "Google Ads",
      category: "DIGITAL_MARKETING",
    },

    // =============================================================================
    // CREATIVE & MEDIA
    // =============================================================================

    {
      pattern: /^Photoshop\s*\(.*\)$/i,
      baseSkill: "Photoshop",
      category: "GRAPHIC_DESIGN_SOFTWARE",
    },
    {
      pattern: /^Adobe Creative Suite\s*\(.*\)$/i,
      baseSkill: "Adobe Creative Suite",
      category: "GRAPHIC_DESIGN_SOFTWARE",
    },
    {
      pattern: /^Final Cut Pro\s*\(.*\)$/i,
      baseSkill: "Final Cut Pro",
      category: "VIDEO_EDITING",
    },
    {
      pattern: /^Premiere Pro\s*\(.*\)$/i,
      baseSkill: "Premiere Pro",
      category: "VIDEO_EDITING",
    },

    // =============================================================================
    // MANUFACTURING & OPERATIONS
    // =============================================================================

    {
      pattern: /^Lean Manufacturing\s*\(.*\)$/i,
      baseSkill: "Lean Manufacturing",
      category: "LEAN_METHODOLOGY",
    },
    {
      pattern: /^Six Sigma\s*\(.*\)$/i,
      baseSkill: "Six Sigma",
      category: "QUALITY_CONTROL",
    },
    {
      pattern: /^AutoCAD\s*\(.*\)$/i,
      baseSkill: "AutoCAD",
      category: "DESIGN_TOOLS",
    },
    {
      pattern: /^SolidWorks\s*\(.*\)$/i,
      baseSkill: "SolidWorks",
      category: "DESIGN_TOOLS",
    },

    // =============================================================================
    // LEGAL
    // =============================================================================

    {
      pattern: /^Westlaw\s*\(.*\)$/i,
      baseSkill: "Westlaw",
      category: "LEGAL_SOFTWARE",
    },
    {
      pattern: /^LexisNexis\s*\(.*\)$/i,
      baseSkill: "LexisNexis",
      category: "LEGAL_SOFTWARE",
    },
    {
      pattern: /^Legal Research\s*\(.*\)$/i,
      baseSkill: "Legal Research",
      category: "LEGAL_RESEARCH",
    },

    // =============================================================================
    // EDUCATION & TRAINING
    // =============================================================================

    {
      pattern: /^Learning Management System\s*\(.*\)$/i,
      baseSkill: "Learning Management System",
      category: "LEARNING_MANAGEMENT_SYSTEMS",
    },
    {
      pattern: /^LMS\s*\(.*\)$/i,
      baseSkill: "Learning Management System",
      category: "LEARNING_MANAGEMENT_SYSTEMS",
    },
    {
      pattern: /^Moodle\s*\(.*\)$/i,
      baseSkill: "Moodle",
      category: "LEARNING_MANAGEMENT_SYSTEMS",
    },
    {
      pattern: /^Canvas\s*\(.*\)$/i,
      baseSkill: "Canvas",
      category: "LEARNING_MANAGEMENT_SYSTEMS",
    },
  ];

  /**
   * Common aliases for popular skills across industries
   */
  private readonly SKILL_ALIASES: Record<string, string[]> = {
    // Technology & Engineering
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

    // Healthcare & Medical
    EMR: ["Electronic Medical Records", "Electronic Health Records", "EHR"],
    "IV Therapy": ["Intravenous Therapy", "IV Administration"],
    Phlebotomy: ["Blood Draw", "Venipuncture"],
    CPR: ["Cardiopulmonary Resuscitation", "Basic Life Support", "BLS"],
    "Patient Care": ["Patient Assessment", "Patient Monitoring"],
    Epic: ["Epic Systems", "Epic EMR"],
    Cerner: ["Cerner EMR", "Cerner PowerChart"],

    // Finance & Business
    Excel: ["Microsoft Excel", "MS Excel", "Spreadsheets"],
    QuickBooks: ["QB", "QuickBooks Pro", "QuickBooks Online"],
    SAP: ["SAP ERP", "SAP S/4HANA"],
    "Financial Modeling": ["Financial Analysis", "Valuation Models"],
    "Bloomberg Terminal": ["Bloomberg", "BBG Terminal"],
    "Risk Management": ["Risk Assessment", "Risk Analysis"],

    // Sales & Marketing
    Salesforce: ["SFDC", "Salesforce CRM"],
    HubSpot: ["HubSpot CRM", "HubSpot Marketing Hub"],
    "Google Analytics": ["GA", "Google Analytics 4", "GA4"],
    "Facebook Ads": ["Meta Ads", "FB Ads"],
    "Google Ads": ["AdWords", "Google AdWords"],
    "CRM Systems": ["Customer Relationship Management", "CRM"],

    // Creative & Media
    Photoshop: ["Adobe Photoshop", "PS"],
    "Adobe Creative Suite": ["Creative Cloud", "Adobe CC"],
    "Final Cut Pro": ["FCP", "Final Cut"],
    "Premiere Pro": ["Adobe Premiere", "Premiere"],
    "After Effects": ["AE", "Adobe After Effects"],

    // Manufacturing & Operations
    "Lean Manufacturing": [
      "Lean Production",
      "Toyota Production System",
      "TPS",
    ],
    "Six Sigma": ["6 Sigma", "Six Sigma Black Belt", "Lean Six Sigma"],
    AutoCAD: ["CAD", "Computer-Aided Design"],
    SolidWorks: ["SW", "SolidWorks CAD"],
    "Quality Control": ["QC", "Quality Assurance", "QA"],

    // Legal
    Westlaw: ["West Law", "Westlaw Edge"],
    LexisNexis: ["Lexis Nexis", "Lexis"],
    "Legal Research": ["Case Law Research", "Statutory Research"],
    "Contract Law": ["Contract Review", "Contract Drafting"],

    // Education & Training
    "Learning Management System": ["LMS", "eLearning Platform"],
    Moodle: ["Moodle LMS"],
    Canvas: ["Canvas LMS", "Instructure Canvas"],
    "Curriculum Development": ["Instructional Design", "Course Design"],

    // Universal Categories
    "Project Management": ["PM", "Project Planning", "Program Management"],
    "Data Analysis": ["Analytics", "Statistical Analysis"],
    Communication: ["Verbal Communication", "Written Communication"],
    Leadership: ["Team Leadership", "People Management"],
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
   * Intelligently detect the most appropriate category for a skill
   * based on keywords and context
   */
  private detectSkillCategory(skillName: string): SkillCategory {
    const lowerSkill = skillName.toLowerCase();

    // Healthcare & Medical keywords
    if (
      /\b(medical|patient|clinical|hospital|nurse|doctor|therapy|diagnosis|emr|epic|cerner|healthcare|pharmaceutical|surgery|treatment)\b/.test(
        lowerSkill,
      )
    ) {
      if (/\b(emr|epic|cerner|software|system|platform)\b/.test(lowerSkill)) {
        return "MEDICAL_SOFTWARE";
      }
      if (
        /\b(iv|cpr|phlebotomy|injection|procedure|surgery)\b/.test(lowerSkill)
      ) {
        return "MEDICAL_PROCEDURE";
      }
      if (/\b(patient care|nursing|bedside)\b/.test(lowerSkill)) {
        return "PATIENT_CARE";
      }
      return "MEDICAL_EQUIPMENT";
    }

    // Finance & Business keywords
    if (
      /\b(financial|accounting|finance|budget|trading|investment|banking|audit|tax|compliance|risk)\b/.test(
        lowerSkill,
      )
    ) {
      if (
        /\b(quickbooks|sap|excel|software|system|platform)\b/.test(lowerSkill)
      ) {
        return "ACCOUNTING_SOFTWARE";
      }
      if (/\b(modeling|analysis|valuation|forecasting)\b/.test(lowerSkill)) {
        return "FINANCIAL_ANALYSIS";
      }
      if (/\b(bloomberg|trading|platform|terminal)\b/.test(lowerSkill)) {
        return "TRADING_PLATFORMS";
      }
      if (/\b(compliance|regulatory|risk)\b/.test(lowerSkill)) {
        return "REGULATORY_COMPLIANCE";
      }
      return "FINANCIAL_ANALYSIS";
    }

    // Legal keywords
    if (
      /\b(legal|law|attorney|lawyer|litigation|court|case|contract|westlaw|lexis)\b/.test(
        lowerSkill,
      )
    ) {
      if (/\b(westlaw|lexis|software|platform|system)\b/.test(lowerSkill)) {
        return "LEGAL_SOFTWARE";
      }
      if (/\b(research|case law|statutory)\b/.test(lowerSkill)) {
        return "LEGAL_RESEARCH";
      }
      if (/\b(contract|drafting|review)\b/.test(lowerSkill)) {
        return "CONTRACT_LAW";
      }
      return "LEGAL_RESEARCH";
    }

    // Sales & Marketing keywords
    if (
      /\b(sales|marketing|crm|salesforce|hubspot|ads|analytics|campaign|lead)\b/.test(
        lowerSkill,
      )
    ) {
      if (/\b(salesforce|hubspot|crm|system|platform)\b/.test(lowerSkill)) {
        return "CRM_SYSTEMS";
      }
      if (
        /\b(digital|online|google|facebook|ads|seo|sem|analytics)\b/.test(
          lowerSkill,
        )
      ) {
        return "DIGITAL_MARKETING";
      }
      if (/\b(research|market|analysis|survey)\b/.test(lowerSkill)) {
        return "MARKET_RESEARCH";
      }
      return "SALES_TECHNIQUES";
    }

    // Creative & Media keywords
    if (
      /\b(design|creative|photoshop|adobe|video|audio|photo|art|graphics)\b/.test(
        lowerSkill,
      )
    ) {
      if (
        /\b(photoshop|illustrator|indesign|adobe|design|graphics)\b/.test(
          lowerSkill,
        )
      ) {
        return "GRAPHIC_DESIGN_SOFTWARE";
      }
      if (
        /\b(video|editing|premiere|final cut|after effects)\b/.test(lowerSkill)
      ) {
        return "VIDEO_EDITING";
      }
      if (/\b(audio|sound|music|recording)\b/.test(lowerSkill)) {
        return "AUDIO_PRODUCTION";
      }
      if (/\b(writing|content|copy|blog|article)\b/.test(lowerSkill)) {
        return "CREATIVE_WRITING";
      }
      return "DESIGN_TOOLS";
    }

    // Manufacturing & Operations keywords
    if (
      /\b(manufacturing|production|lean|six sigma|quality|autocad|solidworks|assembly|factory)\b/.test(
        lowerSkill,
      )
    ) {
      if (/\b(lean|toyota|methodology|kaizen)\b/.test(lowerSkill)) {
        return "LEAN_METHODOLOGY";
      }
      if (
        /\b(quality|control|assurance|inspection|testing)\b/.test(lowerSkill)
      ) {
        return "QUALITY_CONTROL";
      }
      if (/\b(autocad|solidworks|cad|design|engineering)\b/.test(lowerSkill)) {
        return "DESIGN_TOOLS";
      }
      if (/\b(supply|chain|logistics|procurement)\b/.test(lowerSkill)) {
        return "SUPPLY_CHAIN";
      }
      return "MANUFACTURING_EQUIPMENT";
    }

    // Education & Training keywords
    if (
      /\b(education|teaching|training|curriculum|lms|moodle|canvas|instruction|learning)\b/.test(
        lowerSkill,
      )
    ) {
      if (
        /\b(lms|moodle|canvas|platform|system|blackboard)\b/.test(lowerSkill)
      ) {
        return "LEARNING_MANAGEMENT_SYSTEMS";
      }
      if (/\b(curriculum|instructional|course|program)\b/.test(lowerSkill)) {
        return "CURRICULUM_DEVELOPMENT";
      }
      if (/\b(assessment|testing|evaluation|grading)\b/.test(lowerSkill)) {
        return "ASSESSMENT_METHODS";
      }
      return "EDUCATIONAL_TECHNOLOGY";
    }

    // Technology keywords (keep existing logic)
    if (
      /\b(react|vue|angular|javascript|typescript|python|java|c\+\+|php|ruby|go|rust)\b/.test(
        lowerSkill,
      )
    ) {
      return "PROGRAMMING_LANGUAGE";
    }
    if (
      /\b(framework|library|next|express|django|flask|spring|rails)\b/.test(
        lowerSkill,
      )
    ) {
      return "FRAMEWORK_LIBRARY";
    }
    if (
      /\b(database|sql|mysql|postgresql|mongodb|redis|cassandra)\b/.test(
        lowerSkill,
      )
    ) {
      return "DATABASE";
    }
    if (
      /\b(aws|azure|gcp|cloud|docker|kubernetes|devops|ci\/cd|jenkins)\b/.test(
        lowerSkill,
      )
    ) {
      return "CLOUD_PLATFORM";
    }

    // Soft skills keywords
    if (
      /\b(communication|leadership|teamwork|management|collaboration|presentation|negotiation)\b/.test(
        lowerSkill,
      )
    ) {
      return "SOFT_SKILLS";
    }

    // Languages
    if (
      /\b(english|spanish|french|german|chinese|japanese|language|bilingual|multilingual)\b/.test(
        lowerSkill,
      )
    ) {
      return "LANGUAGES";
    }

    // Default fallback
    return "OTHER";
  }

  /**
   * Normalize a skill name and return the base skill information
   */
  public async normalizeSkill(
    skillName: string,
    defaultCategory?: SkillCategory,
  ): Promise<NormalizedSkill> {
    const parseResult = this.parseSkillName(skillName);
    const { baseSkill, details } = parseResult;

    // Determine category using intelligent detection or patterns
    const patternMatch = this.SKILL_PATTERNS.find(
      (p) =>
        p.pattern.test(skillName) ||
        p.baseSkill.toLowerCase() === baseSkill.toLowerCase(),
    );

    const category =
      patternMatch?.category ??
      this.detectSkillCategory(baseSkill) ??
      defaultCategory ??
      "OTHER";

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
    const uniqueSkills = Array.from(
      new Set(skillNames.filter((s) => s.trim())),
    );
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
