# Skill Normalization System

## Overview

The Skill Normalization System intelligently handles skill deduplication and categorization across multiple industries while maintaining granularity for ATS (Applicant Tracking System) matching. It prevents users from managing multiple similar entries while preserving detailed skill variants for better job matching.

## Problem Statement

When importing job postings or resumes, we often encounter skills like:

- `React (hooks, context, component architecture)`
- `Next.js (SSR/SSG, routing, middleware)`
- `Cloudflare technologies (Workers, Cache Rules, CDN optimization)`

These should deduplicate against existing records like:

- `React`
- `Next.js`
- `Cloudflare`

The challenge is maintaining granularity for ATS matching while preventing users from managing multiple similar entries.

## Solution

### Core Components

1. **SkillNormalizationService** (`src/server/services/skill-normalization.ts`)

   - Intelligent skill parsing with regex patterns
   - Multi-industry categorization logic
   - Bulk processing with duplicate prevention
   - Automatic alias creation for common variations

2. **Database Schema** (Prisma)

   - `Skill` - Canonical base skills (e.g., "React")
   - `SkillAlias` - Alternative names (e.g., "ReactJS", "React.js")
   - `SkillSimilarity` - Related skills with similarity scores

3. **API Integration**
   - Job posting imports automatically normalize skills
   - User skill addition uses normalization
   - Compatibility analysis leverages normalized data

## Multi-Industry Support

### Supported Industries

The system now supports skills across multiple industries:

**Technology & Engineering**

- Programming languages, frameworks, databases
- Cloud platforms, DevOps tools, design software
- Examples: "React (hooks, context)" → "React", "AWS (Lambda, S3)" → "AWS"

**Healthcare & Medical**

- Medical procedures, equipment, software systems
- Patient care, diagnostic skills
- Examples: "EMR (Epic, Cerner)" → "EMR", "IV Therapy (peripheral, central)" → "IV Therapy"

**Finance & Business**

- Financial analysis, accounting software, trading platforms
- Risk management, regulatory compliance
- Examples: "Excel (pivot tables, macros)" → "Excel", "QuickBooks (payroll, invoicing)" → "QuickBooks"

**Legal**

- Legal research, software platforms, case management
- Contract law, litigation skills
- Examples: "Westlaw (case research, statutes)" → "Westlaw", "Legal Research (federal, state)" → "Legal Research"

**Sales & Marketing**

- CRM systems, digital marketing, sales techniques
- Market research, content creation
- Examples: "Salesforce (leads, opportunities)" → "Salesforce", "Google Analytics (conversion tracking)" → "Google Analytics"

**Manufacturing & Operations**

- Manufacturing equipment, quality control, supply chain
- Lean methodology, safety protocols
- Examples: "Six Sigma (DMAIC, black belt)" → "Six Sigma", "AutoCAD (2D, 3D modeling)" → "AutoCAD"

**Creative & Media**

- Graphic design software, video/audio editing
- Creative writing, photography equipment
- Examples: "Photoshop (photo editing, compositing)" → "Photoshop", "Final Cut Pro (color grading)" → "Final Cut Pro"

**Education & Training**

- Learning management systems, curriculum development
- Educational technology, assessment methods
- Examples: "Canvas LMS (course design, grading)" → "Canvas", "Curriculum Development (standards-based)" → "Curriculum Development"

### Category Structure

The system uses a flat category structure that scales horizontally:

```typescript
enum SkillCategory {
  // Technology & Engineering
  PROGRAMMING_LANGUAGE,
  FRAMEWORK_LIBRARY,
  DATABASE,
  CLOUD_PLATFORM,
  DEVOPS_TOOLS,
  DESIGN_TOOLS,

  // Healthcare & Medical
  MEDICAL_PROCEDURE,
  MEDICAL_EQUIPMENT,
  DIAGNOSTIC_SKILLS,
  PATIENT_CARE,
  MEDICAL_SOFTWARE,

  // Finance & Business
  FINANCIAL_ANALYSIS,
  ACCOUNTING_SOFTWARE,
  TRADING_PLATFORMS,
  REGULATORY_COMPLIANCE,
  RISK_MANAGEMENT,

  // Legal
  LEGAL_RESEARCH,
  LEGAL_SOFTWARE,
  CASE_MANAGEMENT,
  LITIGATION_SKILLS,
  CONTRACT_LAW,

  // Manufacturing & Operations
  MANUFACTURING_EQUIPMENT,
  QUALITY_CONTROL,
  SUPPLY_CHAIN,
  LEAN_METHODOLOGY,
  SAFETY_PROTOCOLS,

  // Sales & Marketing
  CRM_SYSTEMS,
  DIGITAL_MARKETING,
  SALES_TECHNIQUES,
  MARKET_RESEARCH,
  CONTENT_CREATION,

  // Education & Training
  CURRICULUM_DEVELOPMENT,
  EDUCATIONAL_TECHNOLOGY,
  ASSESSMENT_METHODS,
  CLASSROOM_MANAGEMENT,
  LEARNING_MANAGEMENT_SYSTEMS,

  // Creative & Media
  GRAPHIC_DESIGN_SOFTWARE,
  VIDEO_EDITING,
  AUDIO_PRODUCTION,
  CREATIVE_WRITING,
  PHOTOGRAPHY_EQUIPMENT,

  // Universal Categories
  PROJECT_MANAGEMENT,
  SOFT_SKILLS,
  INDUSTRY_KNOWLEDGE,
  CERTIFICATION,
  METHODOLOGY,
  LANGUAGES,
  OTHER,
}
```

## Intelligent Categorization

The system uses multiple approaches for skill categorization:

### 1. Pattern Matching

Predefined patterns for popular skills:

```typescript
{
  pattern: /^Salesforce\s*\(.*\)$/i,
  baseSkill: "Salesforce",
  category: "CRM_SYSTEMS",
}
```

### 2. Keyword Detection

Context-aware categorization based on skill content:

```typescript
// Healthcare detection
if (/\b(medical|patient|clinical|hospital|nurse|doctor)\b/.test(skillName)) {
  // Further categorization based on specific keywords
}
```

### 3. Fallback Logic

- Pattern match → Keyword detection → Default category → "OTHER"

## Usage Examples

### Healthcare Skills

```typescript
const skillNormalizer = new SkillNormalizationService(db);

const normalizedSkills = await skillNormalizer.normalizeSkills([
  "EMR (Epic systems, patient charting)",
  "IV Therapy (peripheral access, medication administration)",
  "CPR (AHA certified, pediatric advanced life support)",
  "Phlebotomy (venipuncture, specimen collection)",
]);

// Results:
// - Base: "EMR", Alias: "EMR (Epic systems, patient charting)", Category: "MEDICAL_SOFTWARE"
// - Base: "IV Therapy", Alias: "IV Therapy (peripheral access...)", Category: "MEDICAL_PROCEDURE"
```

### Finance Skills

```typescript
const normalizedSkills = await skillNormalizer.normalizeSkills([
  "Excel (financial modeling, pivot tables, VBA)",
  "Financial Modeling (DCF, LBO, comparable company analysis)",
  "Bloomberg Terminal (equity research, bond pricing)",
  "QuickBooks (accounts payable, financial reporting)",
]);

// Results:
// - Base: "Excel", Category: "ACCOUNTING_SOFTWARE"
// - Base: "Financial Modeling", Category: "FINANCIAL_ANALYSIS"
```

### Manufacturing Skills

```typescript
const normalizedSkills = await skillNormalizer.normalizeSkills([
  "Lean Manufacturing (5S, kaizen, value stream mapping)",
  "Six Sigma (DMAIC, statistical process control, black belt)",
  "AutoCAD (mechanical design, 3D modeling, technical drawings)",
  "Quality Control (ISO 9001, inspection procedures, root cause analysis)",
]);
```

## Continuous Improvement Strategy

### 1. Data-Driven Pattern Discovery

**Monitoring New Skills:**

```typescript
// Track frequently imported skills that don't match patterns
const unmatchedSkills = await db.skill.findMany({
  where: {
    category: "OTHER",
    userSkills: { some: {} }, // Has been used by users
  },
  orderBy: { userSkills: { _count: "desc" } },
});
```

**Pattern Analysis:**

- Monitor skill imports from job postings
- Identify common formats not covered by current patterns
- Track user-added skills that need better categorization

### 2. Industry-Specific Expansion

**Adding New Industries:**

1. **Research**: Identify common skills and tools in the target industry
2. **Pattern Development**: Create regex patterns for industry-specific skills
3. **Alias Mapping**: Define common variations and abbreviations
4. **Category Expansion**: Add new categories if needed
5. **Testing**: Validate with real job postings from the industry

**Example: Adding Retail Industry:**

```typescript
// New categories
RETAIL_SOFTWARE, INVENTORY_MANAGEMENT, POINT_OF_SALE, MERCHANDISING, CUSTOMER_SERVICE

// New patterns
{
  pattern: /^POS\s*\(.*\)$/i,
  baseSkill: "Point of Sale",
  category: "POINT_OF_SALE",
}
```

### 3. Machine Learning Enhancement

**Future Improvements:**

- **Skill Embedding Models**: Use semantic similarity for better skill matching
- **Industry Classification**: ML models to automatically detect industry context
- **Similarity Learning**: Automatically discover skill relationships from job data

### 4. Feedback Loop Integration

**User Feedback Collection:**

```typescript
// Track skill normalization accuracy
interface SkillFeedback {
  originalSkill: string;
  suggestedBase: string;
  suggestedCategory: SkillCategory;
  userAccepted: boolean;
  userCorrectedBase?: string;
  userCorrectedCategory?: SkillCategory;
}
```

**Automated Improvements:**

- Monitor skill merge/split requests from users
- Track job matching success rates by skill category
- Analyze compatibility report feedback to identify missing skills

### 5. API Integration Points

**External Skill Databases:**

- Integrate with O\*NET skill taxonomy
- Import from job board skill classifications
- Sync with industry certification bodies

**Real-time Learning:**

```typescript
// Auto-improve patterns based on usage
async function improvePatterns() {
  const frequentSkills = await analyzeSkillUsagePatterns();
  const newPatterns = await generatePatternsFromUsage(frequentSkills);
  await validateAndDeployPatterns(newPatterns);
}
```

## Performance Considerations

### Scaling Strategy

**Horizontal Scaling Benefits:**

- Categories can be added without breaking existing data
- New industries don't require structural changes
- Pattern matching is fast and cacheable

**Optimization Techniques:**

- Cache frequently accessed patterns
- Batch process skill normalization during imports
- Index skills by category for faster searches

### Alternative Architectures

**Hierarchical Taxonomy (Future Option):**

```typescript
interface SkillHierarchy {
  industry: string; // "Healthcare", "Technology"
  domain: string; // "Software", "Procedures"
  category: string; // "EMR", "Patient Care"
  skill: string; // "Epic", "IV Therapy"
}
```

**Benefits of Current Flat Structure:**

- ✅ Simple to understand and maintain
- ✅ Fast queries and compatibility analysis
- ✅ Easy to extend with new categories
- ✅ No complex hierarchy management

**When to Consider Hierarchical:**

- When supporting 50+ industries
- When skill relationships become complex
- When requiring industry-specific skill trees

## Migration and Deployment

### Database Migration

```sql
-- New categories are automatically handled by Prisma enum
-- Existing skills remain categorized as before
-- New skills get intelligent categorization
```

### Rollout Strategy

1. **Phase 1**: Deploy expanded categories and patterns
2. **Phase 2**: Run migration to recategorize existing skills
3. **Phase 3**: Monitor and tune categorization accuracy
4. **Phase 4**: Add ML-powered improvements

## Monitoring and Analytics

### Key Metrics

- **Categorization Accuracy**: % of skills correctly categorized
- **Pattern Coverage**: % of skills matched by patterns vs. keyword detection
- **Industry Distribution**: Skill usage across different industries
- **Alias Effectiveness**: How often aliases are used in job matching

### Success Indicators

- Reduced duplicate skills in user profiles
- Improved job compatibility scoring accuracy
- Higher user satisfaction with skill suggestions
- Better ATS keyword matching rates

This multi-industry approach maintains the system's simplicity while dramatically expanding its applicability across diverse career fields.
