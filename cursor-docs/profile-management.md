# Profile Management

This document describes the profile management functionality in CareerCraft Studio, covering the CRUD (Create, Read, Update, Delete) operations for user profile information such as work history, skills, and personal links.

## Overview

Profile management is a core feature that allows users to maintain comprehensive professional profiles including work history, education, skills, achievements, and personal links. This data serves as the foundation for AI-powered resume generation and job compatibility analysis.

**Interface Options**: Profile data can be managed through the modern Dashboard interface at `/dashboard` which provides visual profile completion tracking and dedicated pages for each profile section. See [Dashboard Redesign](./dashboard-redesign-plan.md) for details.

Key profile sections include:

- User Details (Name, Contact Info, Summary/Bio - managed via general profile update tools)
- Work Experience (managed by `store_work_history`, `get_user_profile`, and achievement tools)
- Education History (implicitly managed via `parse_and_store_resume` or general `get_user_profile`)
- Skills (extracted by `parse_and_store_resume` and `store_work_history`, viewed by `get_user_profile`)
- Personal/Professional Links (extracted by `parse_and_store_resume`)
- Work Achievements (detailed in [Work Achievement Management](./work-achievement-management.md))
- User Preferences (managed by `store_user_preference`)

## Agents Involved

- **`Data Manager` Agent**: This agent is primarily responsible for creating, updating, and deleting (CUD) the user's profile data, as well as parsing resumes. It uses its tools to interact with the database based on user instructions.
- **`User Profile` Agent**: This agent is primarily responsible for reading (R) and presenting profile information to the user (e.g., "What jobs do I have listed?").

## Core Profile Data and Tool-Based Operations

Tools mentioned are primarily used by the `Data Manager` agent, unless specified for the `User Profile` agent.

### 1. User Preferences

- **Tool**: `store_user_preference`
  - **Purpose**: Stores user preferences about various aspects like grammar, resume style, etc.
  - **Arguments**: `category` (string), `preference` (string). (Ref: `StoreUserPreferenceSchema` in `agentTeam.ts`)
- **Interactions**:
  - User: "Remember that I prefer to use Oxford commas."
  - Agent: `Data Manager` uses `store_user_preference` with `{ category: "grammar", preference: "use Oxford commas" }`.

### 2. Work Experience & Associated Achievements/Skills

- **Tool**: `store_work_history`
  - **Purpose**: Stores details about previous jobs, including responsibilities, achievements, and skills related to that role.
  - **Arguments**: `jobTitle` (string), `companyName` (string), `startDate` (string, optional), `endDate` (string, optional), `responsibilities` (array of string, optional), `achievements` (array of string, optional). (Ref: `StoreWorkHistorySchema` in `agentTeam.ts`)
  - _Note_: This tool handles adding new work experiences. Updates or deletions of entire work experiences would likely be managed by more general data manipulation tools or a more specific (yet unlisted) tool for that purpose.
- **Work Achievement Tools**: For fine-grained control over achievements _within_ a work experience entry, see [Work Achievement Management](./work-achievement-management.md). Tools include `get_work_achievements`, `add_work_achievement`, etc.
- **Interactions**:
  - User: "Add my role as Product Manager at Innovate Inc. I led product strategy and managed a team of 5."
  - Agent: `Data Manager` uses `store_work_history` with relevant arguments.

### 3. Resume Parsing (Populates Multiple Profile Sections)

- **Tool**: `parse_and_store_resume`
  - **Purpose**: Parses complete resume text provided by the user. It extracts structured information (work experience, education, skills, links, summary) and stores it in the user's profile. It also saves the resume as a document.
  - **Arguments**: Likely takes resume text as input.
- **Interactions**:
  - User: "Please parse this resume I'm pasting..."
  - Agent: `Data Manager` uses `parse_and_store_resume`.
  - _Outcome_: User Details, Work Experience, Education, Skills, and Links sections of the profile are populated or updated.

### 4. Retrieving Profile Information

- **Tool (for both `Data Manager` and `User Profile` agents)**: `get_user_profile`
  - **Purpose**: Retrieves various types of existing user data.
  - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema` in `agentTeam.ts`)
- **Interactions**:
  - User: "Show me my work history."
  - Agent: `User Profile` (or `Data Manager`) uses `get_user_profile` with `{ dataType: "work_history" }`.
  - User: "What skills do I have listed?"
  - Agent: `User Profile` (or `Data Manager`) uses `get_user_profile` with `{ dataType: "skills" }`.

### 5. Key Achievements Deduplication and Merging

- **Tool**: `deduplicate_and_merge_key_achievements`
  - **Purpose**: Removes exact duplicate key achievements and intelligently merges only truly similar/duplicate ones using AI while preserving all important details and keeping distinct achievements separate.
  - **Arguments**: `dryRun` (boolean, optional, default: false). When true, shows a preview without making changes.
- **AI Merging Philosophy**:
  - **Conservative Approach**: Only merges achievements that describe the SAME specific accomplishment or are near-duplicates
  - **Preservation Focus**: NEVER makes up details, preserves all quantifiable metrics, maintains professional language
  - **Diversity Maintenance**: Keeps achievements demonstrating different skills, projects, or impacts as separate items
  - **Quality Standards**: Maintains strong action verbs, specific measurable outcomes, and results-focused language
- **Interactions**:
  - **Via Chat**:
    - User: "Clean up my achievements list" or "Remove duplicate achievements"
    - Agent: `Data Manager` uses `deduplicate_and_merge_key_achievements` with `{ dryRun: true }` to show preview first.
    - User: "Apply those changes" (after seeing preview)
    - Agent: `Data Manager` uses `deduplicate_and_merge_key_achievements` with `{ dryRun: false }` to apply changes.
  - **Via UI Panel**:
    - User clicks "Clean Up" button in Key Achievements Panel
    - System shows preview modal with statistics and cleaned achievements list
    - User can review and either apply changes or cancel
- **Merging Philosophy**:
  - **DO MERGE**: Near-duplicates describing the same specific accomplishment
  - **DO NOT MERGE**: Different achievements in same category, different metrics/contexts, or different skills/competencies
  - **Principle**: Better to keep achievements separate than incorrectly merge distinct accomplishments

### 6. Work Achievements Deduplication and Merging

- **Tool**: `deduplicate_and_merge_work_achievements`
  - **Purpose**: Removes exact duplicate work achievements and intelligently merges only truly similar/duplicate ones for a specific work history using AI while preserving all important details and keeping distinct achievements separate.
  - **Arguments**:
    - `workHistoryId` (string, required): The work history ID to deduplicate achievements for
    - `dryRun` (boolean, optional, default: false): When true, shows a preview without making changes
- **AI Merging Philosophy**: Same conservative approach as key achievements deduplication
  - **Conservative Approach**: Only merges achievements that describe the SAME specific accomplishment or are near-duplicates
  - **Preservation Focus**: NEVER makes up details, preserves all quantifiable metrics, maintains professional language
  - **Diversity Maintenance**: Keeps achievements demonstrating different skills, projects, or impacts as separate items
  - **Quality Standards**: Maintains strong action verbs, specific measurable outcomes, and results-focused language
- **Interactions**:
  - **Via Chat**:
    - User: "Clean up achievements for my Software Engineer role" or "Remove duplicate achievements for this job"
    - Agent: `Data Manager` uses `deduplicate_and_merge_work_achievements` with `{ workHistoryId: "...", dryRun: true }` to show preview first.
    - User: "Apply those changes" (after seeing preview)
    - Agent: `Data Manager` uses `deduplicate_and_merge_work_achievements` with `{ workHistoryId: "...", dryRun: false }` to apply changes.
  - **Via tRPC API**:
    - Available as `document.deduplicateAndMergeWorkAchievements` endpoint
    - Can be integrated into UI panels for specific work history records
- **Merging Philosophy**: Same principles as key achievements
  - **DO MERGE**: Near-duplicates describing the same specific accomplishment
  - **DO NOT MERGE**: Different achievements in same category, different metrics/contexts, or different skills/competencies
  - **Principle**: Better to keep achievements separate than incorrectly merge distinct accomplishments

### 7. General User Details, Education, Skills, Links (Management Notes)

- **User Details (Name, Contact, Summary)**: While no specific tool like `update_user_details` is explicitly listed for the `Data Manager` in `agentTeam.ts`'s system message, these are fundamental pieces of a user profile. They are likely populated initially by `parse_and_store_resume` and could be updated via a more general-purpose profile update tool if one exists but isn't detailed, or through re-parsing sections of an updated resume.
- **Education History**: Primarily populated by `parse_and_store_resume`. Specific tools for adding/updating individual education entries (like `add_education`) are not explicitly listed for the agents in `agentTeam.ts`.
- **Skills**: Populated via `parse_and_store_resume` and potentially when adding work history via `store_work_history` (if it extracts skills). Retrieved via `get_user_profile`. A dedicated `add_skill_to_profile` is not explicitly listed in the `agentTeam.ts` system messages for these agents.
- **Personal/Professional Links**: Primarily populated by `parse_and_store_resume`. Retrieved via `get_user_profile` (under "all" or if a specific data type for links exists but isn't enumerated in the provided `GetUserProfileSchema`). Dedicated tools for adding/updating individual links are not explicitly listed.

## Data Persistence

All profile data is persisted in the application's database. The agents' tools interface with this database (e.g., using Prisma client) to perform their operations.

## Integration with Other Features

- **[Dashboard Redesign](./dashboard-redesign-plan.md)**: The modern dashboard interface providing visual profile completion tracking and dedicated management pages for each profile section.
- **[Resume Import & Parsing](./resume-import.md)**: The `parse_and_store_resume` tool, used by the `Data Manager` agent, is central to this.
- **[Skill Normalization](./skill-normalization.md)**: Applied when skills are extracted and stored.
- **[Work Achievement Management](./work-achievement-management.md)**: A specialized subset of profile management focused on achievements within work experiences.
- **[Resume Generation](./resume-generation.md)** & **[Cover Letter Generation](./cover-letter-generation.md)**: These features heavily rely on the accuracy and completeness of the data managed here, primarily retrieved via `get_user_profile`.
- **[Job Posting Import & Analysis](./job-posting-import.md)**: User skills and experience from the profile are compared against job requirements.

Effective profile management, driven by the tools within the `Data Manager` and `User Profile` agents, is crucial for the overall functionality of CareerCraft Studio.
