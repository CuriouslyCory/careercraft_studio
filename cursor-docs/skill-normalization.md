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
   - **Resume imports now use skill normalization for proper categorization**
   - User skill addition uses normalization
   - Compatibility analysis leverages normalized data

## Recent Fixes

### Resume Import Skill Categorization (Fixed)

**Issue**: Skills imported from resumes were being categorized as "OTHER" instead of using intelligent categorization.

**Root Cause**: The `ResumeParsingService.processWorkExperienceBatched` method was creating skills directly with hardcoded `category: "OTHER"` instead of using the `SkillNormalizationService`.

**Solution**: Updated the resume parser to use the `SkillNormalizationService` for all skill processing, ensuring:

- Skills are properly categorized using pattern matching and keyword detection
- Skill aliases are created automatically
- Duplicate skills are handled correctly
- Detailed skill variants are preserved as aliases

**Files Modified**:

- `src/server/services/resume-parser.ts` - Updated to use skill normalization service
- Skills now get proper categories like `PROGRAMMING_LANGUAGE`, `FRAMEWORK_LIBRARY`, `DATABASE`, etc.

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

This multi-industry approach maintains the system's simplicity while dramatically expanding its applicability across diverse career fields.
