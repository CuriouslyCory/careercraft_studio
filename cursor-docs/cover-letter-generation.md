# Cover Letter Generation

This document describes the Cover Letter Generation feature in Resume Master, facilitated by the `Cover Letter Generator` agent within the AI Chat system. The agent and its tools are defined in `src/server/langchain/agentTeam.ts`.

## Overview

Resume Master can generate tailored cover letters for specific job applications. This feature leverages the user's profile data and the details of a target job posting to create a relevant and persuasive cover letter.

Reference: This feature is primarily handled by the `Cover Letter Generator` agent, as outlined in the [AI Chat](./ai-chat.md) documentation.

## Core Functionality & Tools

The `Cover Letter Generator` agent uses the following tools (from `getCoverLetterGeneratorTools(userId)` via `agentTeam.ts` system message):

1.  **`generate_cover_letter`**

    - **Purpose**: Creates tailored cover letters for specific jobs.
    - **Arguments**: While not explicitly detailed in the system message, arguments would logically include:
      - `job_posting_id` (or the full job posting text/details): To understand the requirements and context of the job for which the cover letter is being written.
      - `user_profile_data` (optional, or fetched via `get_user_profile`): Specific aspects of the user's profile to highlight.
      - `points_to_emphasize` (optional, array of strings): Specific skills, experiences, or achievements the user wants to stress.
      - `tone_and_style` (optional): E.g., formal, enthusiastic.
    - **Process**: This tool would synthesize information from the user's profile (obtained via `get_user_profile` or direct data access) and the target job posting. It then crafts a cover letter that aligns the user's qualifications with the job's needs.

2.  **`get_user_profile`**
    - **Purpose**: Retrieves user data needed for cover letter generation. This is the same tool used by other agents.
    - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema` in `agentTeam.ts`)
    - **Process**: Fetches the specified sections of the user's profile from the database, which are then used by `generate_cover_letter`.

## Cover Letter Generation Process

A typical interaction might be:

1.  **User Request**: "Help me write a cover letter for the Product Manager position at Innovate Solutions (Job ID: 12345)."
    - (The user might have previously imported this job posting, or could provide details/link.)
2.  **AI Chat**: The `Supervisor Agent` routes to the `Cover Letter Generator` agent.
3.  **`Cover Letter Generator` Agent Strategy**:
    - The agent will likely first call `get_user_profile` (e.g., with `dataType: "all"`) to gather the user's relevant experiences, skills, and achievements.
    - It will also need details for Job ID: 12345. If not already available to it, it might coordinate with the `Job Posting Manager` agent (via the Supervisor) or ask the user for the job description details.
    - It might prompt for further clarification: "Is there anything specific you'd like me to highlight for this role?"
4.  **Tool Invocation**: The agent calls `generate_cover_letter`, providing the necessary user data and job posting details.
5.  **Output**: The `generate_cover_letter` tool produces the cover letter content.
6.  **Presentation**: The agent presents the generated cover letter in the chat, perhaps with suggestions for review or offering further edits.

## Customization and Advice

As per its system message in `agentTeam.ts`, the `Cover Letter Generator` agent is also responsible for:

- **Editing existing cover letters**: Users could ask for modifications to previously generated letters.
- **Formatting cover letters** according to user preferences.
- **Providing cover letter writing advice**: Offering tips on structure, tone, and content.

This functionality depends on comprehensive [Profile Management](./profile-management.md) data and potentially information from [Job Posting Import & Analysis](./job-posting-import.md).
