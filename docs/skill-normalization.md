# Skill Normalization System

## Overview

The skill normalization system solves the problem of skill deduplication while maintaining granularity for ATS (Applicant Tracking System) matching. It intelligently groups detailed skill variants under base skills while preserving the specific details as aliases.

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

   - Parses skill names to extract base skills and details
   - Creates normalized base skills and detailed aliases
   - Handles bulk skill processing efficiently

2. **Skill Database Schema** (Prisma)

   - `Skill` table: Canonical base skills
   - `SkillAlias` table: Alternative names and detailed variants
   - `SkillSimilarity` table: Relationships between skills

3. **API Integration**
   - Updated job posting tools to use normalization
   - Updated work history processing to use normalization
   - New skills router for management and migration

### How It Works

#### 1. Skill Parsing

The system uses pattern matching to identify base skills and extract details:

```typescript
// Input: "React (hooks, context, component architecture)"
// Output:
{
  baseSkill: "React",
  details: "hooks, context, component architecture",
  confidence: 0.9,
  pattern: "parentheses"
}
```

#### 2. Normalization Process

1. Parse the skill name to extract base skill and details
2. Find or create the base skill in the database
3. Create aliases for common variations (ReactJS, React.js, etc.)
4. If details exist, create an alias for the full detailed name
5. Return the base skill ID for database references

#### 3. Database Structure

```
Skill (Base Skills)
├── id: "skill_123"
├── name: "React"
├── category: "FRAMEWORK_LIBRARY"
└── aliases:
    ├── "ReactJS"
    ├── "React.js"
    └── "React (hooks, context, component architecture)"
```

### Benefits

1. **User Experience**: Users see clean, deduplicated skill lists
2. **ATS Compatibility**: Detailed variants are preserved as searchable aliases
3. **Data Consistency**: All references point to canonical base skills
4. **Flexibility**: System handles various input formats automatically

### Usage Examples

#### Job Posting Import

```typescript
const skillNormalizer = new SkillNormalizationService(db);
const normalizedSkills = await skillNormalizer.normalizeSkills([
  "React (hooks, context)",
  "Next.js (SSR/SSG)",
  "TypeScript",
]);

// Results in:
// - Base skill "React" with alias "React (hooks, context)"
// - Base skill "Next.js" with alias "Next.js (SSR/SSG)"
// - Base skill "TypeScript"
```

#### User Skill Management

```typescript
// User adds "React (advanced patterns)"
const normalized = await skillNormalizer.normalizeSkill(
  "React (advanced patterns)",
  "FRAMEWORK_LIBRARY",
);

// Creates:
// - UserSkill linked to base "React" skill
// - Alias "React (advanced patterns)" for ATS matching
```

### Migration

For existing systems, use the migration endpoint:

```typescript
// API call
await trpc.skills.migrateExisting.mutate();

// This will:
// 1. Identify duplicate skills
// 2. Consolidate them under base skills
// 3. Create appropriate aliases
// 4. Update all references
```

### Configuration

#### Skill Patterns

The system includes predefined patterns for popular technologies:

```typescript
{
  pattern: /^React(?:\.js|JS)?\s*\(.*\)$/i,
  baseSkill: "React",
  category: "FRAMEWORK_LIBRARY",
}
```

#### Aliases

Common aliases are automatically created:

```typescript
"React": ["ReactJS", "React.js", "React JS"]
```

### API Endpoints

#### Skills Router (`/api/trpc/skills`)

- `suggestions` - Get skill suggestions for autocomplete
- `normalize` - Normalize a single skill name
- `parseSkillName` - Parse skill name to see normalization result
- `migrateExisting` - Migrate existing skills to normalized format
- `listWithAliases` - Get all skills with their aliases

### Best Practices

1. **Always use normalization** when processing skills from external sources
2. **Batch process** multiple skills for efficiency
3. **Review patterns** regularly and add new ones for emerging technologies
4. **Monitor aliases** to ensure they're meaningful and searchable
5. **Test migration** on a copy of production data first

### Future Enhancements

1. **Machine Learning**: Use ML to identify similar skills automatically
2. **Skill Hierarchies**: Create parent-child relationships between skills
3. **Industry-Specific**: Customize patterns for different industries
4. **User Feedback**: Allow users to suggest skill relationships
5. **Analytics**: Track which aliases are most commonly used

### Troubleshooting

#### Common Issues

1. **Skill not recognized**: Add new patterns to `SKILL_PATTERNS`
2. **Wrong category**: Update pattern category or add manual override
3. **Duplicate aliases**: System handles gracefully, logs warnings
4. **Migration errors**: Check for foreign key constraints

#### Debugging

Use the `parseSkillName` endpoint to test how skills are being parsed:

```typescript
const result = await trpc.skills.parseSkillName.query({
  skillName: "React (hooks, context)",
});
// Returns parsing details for debugging
```
