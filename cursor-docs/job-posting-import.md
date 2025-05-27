# Job Posting Import & Analysis

This document outlines the job posting import and analysis functionality in CareerCraft Studio.

## Overview

The job posting import system allows users to paste job posting content into the AI chat, which then parses, normalizes, and stores the job posting data for later analysis and comparison against user skills.

## Architecture

### Job Posting Processing Pipeline

1. **Content Parsing** (`src/server/langchain/jobPostingParser.ts`)

   - Uses LangChain with Google Gemini to extract structured data from job posting text
   - Identifies required vs. bonus skills, experience requirements, education requirements
   - Normalizes skill names using the skill normalization service

2. **Skill Normalization** (`src/server/services/skill-normalization.ts`)

   - Maps variant skill names to canonical forms (e.g., "ReactJS" → "React")
   - Creates skill aliases for tracking different naming conventions
   - Ensures consistent skill representation across the system

3. **Database Storage** (`src/server/services/job-posting-processor.ts`)
   - Stores job posting metadata and content
   - Creates normalized skill requirements with proper priority handling
   - **Duplicate Skill Handling**: Prevents unique constraint violations when the same skill appears in both required and bonus categories

### Duplicate Skill Handling

**Problem**: When a skill appears in both required and bonus skill lists (e.g., "React" as both required and nice-to-have), the system would attempt to create duplicate `JobSkillRequirement` records, violating the unique constraint on `(skillId, jobPostingId)`.

**Solution**:

- Collect all skills into a `Map` keyed by `skillId` to ensure uniqueness
- Prioritize required skills over bonus skills (required skills take precedence)
- Use `createMany` with `skipDuplicates: true` for batch insertion
- This prevents transaction failures and ensures data integrity

```typescript
// Collect unique skill requirements to avoid duplicates
const skillRequirements = new Map<
  string,
  {
    skillId: string;
    isRequired: boolean;
    priority: number;
  }
>();

// Process required skills first (higher priority)
for (const skillResult of requiredSkills) {
  skillRequirements.set(skillResult.baseSkillId, {
    skillId: skillResult.baseSkillId,
    isRequired: true,
    priority: 1,
  });
}

// Process bonus skills (only add if not already required)
for (const skillResult of bonusSkills) {
  if (!skillRequirements.has(skillResult.baseSkillId)) {
    skillRequirements.set(skillResult.baseSkillId, {
      skillId: skillResult.baseSkillId,
      isRequired: false,
      priority: 2,
    });
  }
}

// Create all unique skill requirements in a single batch
await tx.jobSkillRequirement.createMany({
  data: skillRequirementData,
  skipDuplicates: true,
});
```

## Database Schema

### Core Tables

- `JobPosting`: Main job posting record with title, company, content
- `JobPostingDetails`: Structured requirements extracted from the posting
- `JobSkillRequirement`: Individual skill requirements with priority and requirement status
- `Skill`: Normalized skill definitions with aliases

### Unique Constraints

- `JobSkillRequirement` has a unique constraint on `(skillId, jobPostingId)` to prevent duplicate skill requirements for the same job posting

## Usage Examples

### Via Job Postings Panel (Recommended)

**AI Parsing Workflow:**

1. User clicks "Add New Job Posting" button
2. User pastes job posting content into the text area
3. User optionally adds URL, status, and notes
4. User clicks "Parse & Store Job Posting"
5. System automatically:
   - Parses content using AI to extract title, company, location, industry
   - Identifies and normalizes required vs. bonus skills
   - Extracts experience and education requirements
   - Stores structured data in the database
6. User receives success message with extracted information summary

**Note**: All job postings must be processed through AI parsing to extract structured data and skills. Manual entry is not supported as the system requires AI analysis to properly categorize skills and requirements.

### Via AI Chat

1. User pastes job posting content in chat
2. AI routes to Job Posting Manager Agent
3. Agent calls `parse_and_store_job_posting` tool
4. System parses, normalizes, and stores the job posting
5. User can then ask for skill comparison analysis

### Direct API Usage

```typescript
const processor = new JobPostingProcessor(db);
const result = await processor.processAndStore(jobPostingContent, userId);
```

## API Endpoints

### `parseAndStoreJobPosting`

- **Input**: `{ content: string, url?: string, status?: string, notes?: string }`
- **Output**: `{ success: boolean, message: string, jobPosting: JobPosting, skillCounts: SkillCounts }`
- **Description**: Parses job posting content using AI and stores structured data

### `createJobPosting` (Deprecated)

- **Input**: `{ title: string, company: string, location: string, content: string, ... }`
- **Output**: `JobPosting`
- **Description**: Creates job posting with manual data entry (deprecated - use parseAndStoreJobPosting instead)

## Error Handling

- **Parsing Errors**: LLM parsing failures are caught and reported with user-friendly messages
- **Skill Normalization Errors**: Unknown skills are created as new entries in the skill database
- **Database Errors**: Transaction failures are handled gracefully with rollback
- **Duplicate Skills**: Handled automatically without user intervention

## Performance Considerations

- Skill normalization is done in parallel for different skill categories
- Batch insertion is used for skill requirements to minimize database round trips
- Transaction timeouts are configurable (default: 30 seconds)

## Related Features

- [Skill Normalization](./skill-normalization.md)
- [Compatibility Analysis](./compatibility-analysis.md)
- [AI Chat System](./ai-chat.md)
