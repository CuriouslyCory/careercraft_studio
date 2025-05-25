# Job Posting Import & Analysis

This document describes the Job Posting Import and Analysis capabilities within Resume Master, primarily managed by the `Job Posting Manager` agent. This agent and its tools are defined in `src/server/langchain/agentTeam.ts`.

## Overview

The system allows users to import job postings, which are then automatically parsed, stored, and analyzed in a single action. A key analysis function is comparing the requirements listed in the job posting against the user's stored skills and profile information. This helps users identify skill gaps and tailor their application materials.

Reference: This feature is primarily handled by the `Job Posting Manager` agent, as outlined in the [AI Chat](./ai-chat.md) documentation.

## Core Functionality & Tools

The `Job Posting Manager` agent is equipped with the following tools (from `getJobPostingTools(userId)` via `agentTeam.ts` system message):

1.  **`parse_and_store_job_posting`** ✨ **NEW COMBINED TOOL**

    - **Purpose**: Parses job posting text AND automatically stores it in the database in one seamless action.
    - **Arguments**: `content` (string - the job posting text). (Ref: `ParseJobPostingSchema` in `agentTeam.ts`)
    - **Output**: A comprehensive success message with job details, extracted requirements count, and confirmation of storage.
    - **Benefits**:
      - Eliminates the need for separate parse/store actions
      - Provides better user experience with immediate feedback
      - Prevents workflow confusion and supervisor routing errors
      - **Stores normalized, clean skill data** instead of raw extracted skills

2.  **`find_job_postings`**

    - **Purpose**: Retrieves previously stored job postings based on search criteria.
    - **Arguments**: Search criteria such as `title`, `company`, `location`, keywords, etc.
    - **Output**: A list of matching job postings from the database.

3.  **`compare_skills_to_job`**

    - **Purpose**: Compares the user's skills (from their profile) against the requirements of a specific job posting.
    - **Arguments**: Likely `job_posting_id` (to identify the target job) and `user_id` (implicitly handled by the agent context).
    - **Output**: An analysis detailing matching skills, missing skills (gaps), and potentially suggestions for how the user can better align their profile or application.

4.  **`get_user_profile`**
    - **Purpose**: Retrieves user data, particularly skills, needed for comparison against job postings (used by `compare_skills_to_job` or directly by the agent for context).
    - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema` in `agentTeam.ts`)

## Workflow Example: Importing and Analyzing a Job Posting

1.  **User Input**: User pastes a job description into the chat: "Parse this job posting: [job description text]"
2.  **AI Chat**: The `Supervisor Agent` routes the request to the `Job Posting Manager` agent.
3.  **`Job Posting Manager` Agent Actions**:
    - Calls `parse_and_store_job_posting` with the provided text.
    - The tool automatically:
      - Parses the job posting using LLM to extract structured data
      - **Normalizes all extracted skills using the SkillNormalizationService**
      - Stores the original content and **normalized** parsed data in the database
      - Creates normalized skill requirements for compatibility analysis
      - Returns a comprehensive success message with job details
4.  **Response Generation**: The agent provides immediate feedback about the successful parsing and storage, and offers to compare skills.
5.  **Optional Follow-up**: User can then ask for skill comparison, and the agent will call `compare_skills_to_job`.

## Key Improvements

### ✅ Streamlined Workflow

- **Before**: Parse → Ask user what to do → Store (if requested) → Potential confusion
- **After**: Parse and Store automatically → Immediate confirmation → Offer skill comparison

### ✅ Better User Experience

- No more "What would you like me to do next?" interruptions
- Clear, comprehensive feedback about what was extracted and stored
- Immediate readiness for skill comparison analysis

### ✅ Eliminated Edge Cases

- No more supervisor trying to re-parse extracted summaries
- No workflow confusion between parsing and storing
- Consistent behavior regardless of user phrasing

### ✅ **Clean Data Storage** 🆕

- **Skills are normalized BEFORE storage** in `jobPostingDetails`
- **No data duplication** between raw and normalized skills
- **Consistent skill names** across all stored job postings
- **Better compatibility analysis** due to clean, standardized data

## Technical Implementation

The new `parse_and_store_job_posting` tool:

- **Uses centralized `JobPostingProcessor` service** for consistent processing logic
- **Eliminates code duplication** between AI tools and tRPC routers
- Uses the same LLM parsing logic as before
- **Normalizes skills immediately after parsing** using `SkillNormalizationService`
- Stores the original content (not parsed JSON) in the `content` field
- **Creates structured `JobPostingDetails` records with normalized skill names**
- **Intelligently normalizes skills** using the multi-industry `SkillNormalizationService`
- **Automatically categorizes skills** across technology, healthcare, finance, legal, and other industries
- Creates `JobSkillRequirement` records for compatibility analysis using the same normalized skills
- Returns a formatted success message with extracted data counts

### Centralized Processing Architecture

**Shared Service (`JobPostingProcessor`):**

- Located in `src/server/services/job-posting-processor.ts`
- Handles parsing, skill normalization, and storage in one transaction
- Used by both AI tools and tRPC routers for consistency
- Provides structured result with job details and skill counts
- Includes comprehensive error handling and validation

**Usage Points:**

1. **AI Tool**: `parse_and_store_job_posting` tool uses `JobPostingProcessor`
2. **tRPC Router**: `processJobPosting` function uses `JobPostingProcessor`
3. **Future Integrations**: Any new job posting processing can use the same service

### Data Flow Improvements

**Previous Flow (with data duplication):**

1. Parse job posting → Extract raw skills
2. Store raw skills in `jobPostingDetails`
3. Separately normalize skills and store in `jobSkillRequirement`
4. Result: Raw skills in details table, normalized skills in requirements table

**New Flow (clean data):**

1. Parse job posting → Extract raw skills
2. **Normalize skills immediately**
3. Store **normalized skills** in `jobPostingDetails`
4. Store **same normalized skills** in `jobSkillRequirement`
5. Result: Consistent normalized skills across all tables

**Centralized Flow (eliminates duplication):**

1. **Single `JobPostingProcessor.processAndStore()` method**
2. Used by both AI tools and tRPC routers
3. Consistent skill normalization and storage logic
4. **No code duplication** between different entry points
5. Easier maintenance and testing

### Skill Normalization Benefits

The integration with the [Skill Normalization System](./skill-normalization.md) provides:

- **Multi-Industry Support**: Automatically detects and categorizes skills from technology, healthcare, finance, legal, sales, manufacturing, and other industries
- **Intelligent Pattern Matching**: Recognizes detailed skill variants like "React (hooks, context)" and normalizes to "React"
- **Alias Creation**: Automatically creates aliases for common skill variations (e.g., "ReactJS", "React.js" → "React")
- **Consistent Categorization**: Uses keyword detection and pattern matching to assign appropriate categories
- **Deduplication**: Prevents duplicate skills while maintaining granularity for ATS matching
- **Data Consistency**: Same normalized skills stored in both `jobPostingDetails` and `jobSkillRequirement` tables

## Key Considerations

- **Skill Matching Logic**: The effectiveness of `compare_skills_to_job` relies on robust [Skill Normalization](./skill-normalization.md) for both the user's profile and the parsed job posting skills.
- **Data Extraction Accuracy**: The quality of analysis depends heavily on the LLM's ability to accurately extract relevant details from diverse job posting formats.
- **Data Consistency**: All skill data is now normalized before storage, ensuring consistent analysis and comparison results.
- **User Interface**: The frontend might offer a dedicated interface for managing imported job postings, allowing users to view, delete, or initiate analysis on them.

This feature empowers users to seamlessly import job postings and gain valuable insights into how their qualifications stack up against job requirements, aiding in a more targeted job application process.
