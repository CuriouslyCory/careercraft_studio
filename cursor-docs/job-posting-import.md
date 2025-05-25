# Job Posting Import & Analysis

This document describes the Job Posting Import and Analysis capabilities within Resume Master, primarily managed by the `Job Posting Manager` agent. This agent and its tools are defined in `src/server/langchain/agentTeam.ts`.

## Overview

The system allows users to import job postings, which are then parsed, stored, and analyzed. A key analysis function is comparing the requirements listed in the job posting against the user's stored skills and profile information. This helps users identify skill gaps and tailor their application materials.

Reference: This feature is primarily handled by the `Job Posting Manager` agent, as outlined in the [AI Chat](./ai-chat.md) documentation.

## Core Functionality & Tools

The `Job Posting Manager` agent is equipped with the following tools (from `getJobPostingTools(userId)` via `agentTeam.ts` system message):

1.  **`parse_job_posting`**

    - **Purpose**: Parses job posting text (e.g., pasted by the user or fetched from a URL if that capability is added) to extract structured information.
    - **Arguments**: `content` (string - the job posting text). (Ref: `ParseJobPostingSchema` in `agentTeam.ts`)
    - **Output**: A structured representation of the job posting (likely JSON), including job title, company, location, required skills, experience level, responsibilities, etc.

2.  **`store_job_posting`**

    - **Purpose**: Stores the parsed job posting data into the database for later retrieval and analysis.
    - **Arguments**: `parsedJobPosting` (string - likely the JSON output from `parse_job_posting`). (Ref: `StoreJobPostingSchema` in `agentTeam.ts`)
    - **Output**: Confirmation of storage, possibly with a job posting ID.
    - _Note_: The `agentTeam.ts` logic for `processJobPostingToolCalls` suggests that if `parse_job_posting` is called and `store_job_posting` is not, an auto-store attempt is made.

3.  **`find_job_postings`**

    - **Purpose**: Retrieves previously stored job postings based on search criteria.
    - **Arguments**: Search criteria such as `title`, `company`, `location`, keywords, etc.
    - **Output**: A list of matching job postings from the database.

4.  **`compare_skills_to_job`**

    - **Purpose**: Compares the user's skills (from their profile) against the requirements of a specific job posting.
    - **Arguments**: Likely `job_posting_id` (to identify the target job) and `user_id` (implicitly handled by the agent context).
    - **Output**: An analysis detailing matching skills, missing skills (gaps), and potentially suggestions for how the user can better align their profile or application.

5.  **`get_user_profile`**
    - **Purpose**: Retrieves user data, particularly skills, needed for comparison against job postings (used by `compare_skills_to_job` or directly by the agent for context).
    - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema` in `agentTeam.ts`)

## Workflow Example: Importing and Analyzing a Job Posting

1.  **User Input**: User pastes a job description into the chat: "Analyze this job posting: [job description text]"
2.  **AI Chat**: The `Supervisor Agent` routes the request to the `Job Posting Manager` agent.
3.  **`Job Posting Manager` Agent Actions**:
    - Calls `parse_job_posting` with the provided text.
    - Receives the structured job data.
    - Calls `store_job_posting` with the structured data to save it to the database.
    - Optionally, if the user also asked for analysis, or as a proactive step, the agent might then call `get_user_profile` to fetch the user's skills.
    - Then, it could call `compare_skills_to_job`, providing the new job posting's ID and the user's skills.
4.  **Response Generation**: The agent synthesizes the results (e.g., confirmation of import, summary of the job, and the skill comparison analysis) into a response.
5.  **Output**: The agent sends this response back to the user via the Supervisor and tRPC router.

## Key Considerations

- **Skill Matching Logic**: The effectiveness of `compare_skills_to_job` relies on robust [Skill Normalization](./skill-normalization.md) for both the user's profile and the parsed job posting skills.
- **Data Extraction Accuracy**: The quality of analysis depends heavily on the `parse_job_posting` tool's ability to accurately extract relevant details from diverse job posting formats.
- **User Interface**: The frontend might offer a dedicated interface for managing imported job postings, allowing users to view, delete, or initiate analysis on them.

This feature empowers users to not only store job postings but also to gain valuable insights into how their qualifications stack up against job requirements, aiding in a more targeted job application process.
