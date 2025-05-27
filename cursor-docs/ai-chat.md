# AI Chat Functionality

This document outlines the architecture and components of the AI Chat feature in CareerCraft Studio.

## Overview

The AI chat is a core interactive feature, enabling users to communicate with an AI assistant to manage their resume data, generate documents, analyze job postings, and get information about their profile. It is powered by a LangChain agent team orchestrated via a tRPC router (`src/server/api/routers/ai.ts`).

## Architecture

The AI chat system is designed with a clear separation of concerns across three main layers:

1.  **Frontend (AI Chat Layout & Sub-routes)**:

    - Provides the User Interface (UI) for chat interactions across all sub-routes.
    - The chat interface is persistent across all `/ai-chat/*` routes via the shared layout.
    - Dynamically renders chat messages alongside different panel views (documents, work history, etc.).
    - Manages basic UI state (e.g., input fields, message lists).
    - Communicates with the backend tRPC router to send user messages and receive AI responses.

2.  **Backend tRPC Router (`src/server/api/routers/ai.ts`)**:

    - Acts as the API layer between the frontend and the LangChain agent team.
    - Uses tRPC for type-safe API calls.
    - Receives user messages from the frontend.
    - Interacts with the LangChain `agentTeam` to process the messages.
    - Streams AI-generated responses back to the frontend for a real-time chat experience.
    - Handles persistence of chat messages to a database.

3.  **LangChain Agent Team (`src/server/langchain/agentTeam.ts`)**:
    - Contains the core AI logic and workflow orchestration.
    - Implemented as a `StateGraph` (a LangChain concept for creating cyclical and complex agent interactions).
    - Features a central **Supervisor Agent** that routes tasks to appropriate specialized agents.

## LangChain Agent Team (`agentTeam.ts`)

The heart of the AI chat is the `agentTeam`, which manages the conversation flow and delegates tasks to specialized agents.

```mermaid
graph TD
    UserInteraction[User Interaction via Frontend] --> TRPCRouter[tRPC Router (`ai.ts`)]
    TRPCRouter -- User Message --> AgentTeam[LangChain Agent Team (`agentTeam.ts`)]
    AgentTeam -- Task --> SupervisorAgent[Supervisor Agent]
    SupervisorAgent -- Routes to --> DataManagerAgent[Data Manager Agent]
    SupervisorAgent -- Routes to --> ResumeGeneratorAgent[Resume Generator Agent]
    SupervisorAgent -- Routes to --> CoverLetterAgent[Cover Letter Generator Agent]
    SupervisorAgent -- Routes to --> UserProfileAgent[User Profile Agent]
    SupervisorAgent -- Routes to --> JobPostingAgent[Job Posting Manager Agent]

    DataManagerAgent -- Interacts with --> Database[(Database)]
    ResumeGeneratorAgent -- Accesses --> UserProfileData[User Profile Data]
    CoverLetterAgent -- Accesses --> UserProfileData
    CoverLetterAgent -- Accesses --> JobPostingDetails[Job Posting Details]
    UserProfileAgent -- Accesses --> UserProfileData
    JobPostingAgent -- Interacts with --> Database
    JobPostingAgent -- Uses --> SkillNormalization[Skill Normalization Service]

    DataManagerAgent -- Response --> SupervisorAgent
    ResumeGeneratorAgent -- Response --> SupervisorAgent
    CoverLetterAgent -- Response --> SupervisorAgent
    UserProfileAgent -- Response --> SupervisorAgent
    JobPostingAgent -- Response --> SupervisorAgent

    SupervisorAgent -- Aggregated Response --> AgentTeam
    AgentTeam -- Streams Response --> TRPCRouter
    TRPCRouter -- Streams to --> UserInteraction

    %% Links to other documentation
    click DataManagerAgent "./profile-management.md" "Profile Management Details"
    click DataManagerAgent "./work-achievement-management.md" "Work Achievement Details"
    click JobPostingAgent "./job-posting-import.md" "Job Posting Details"
    click SkillNormalization "./skill-normalization.md" "Skill Normalization Details"
    click ResumeGeneratorAgent "./resume-generation.md" "Resume Generation Details"
    click CoverLetterAgent "./cover-letter-generation.md" "Cover Letter Generation Details"
```

### Supervisor Agent

- Acts as the orchestrator or router within the `StateGraph`.
- Receives incoming user requests (via the `agentTeam`).
- Analyzes the request to determine the user's intent.
- Directs the task to the most appropriate specialized agent or ends the interaction.
- Aggregates responses from specialized agents to form a coherent reply to the user.
- **Tools Used** (from `getSupervisorTools()` via `agentTeam.ts`):
  - `route_to_agent`: Determines the next agent to handle the task or to end the interaction.
    - **Arguments**: `next` (enum: "data_manager", "resume_generator", "cover_letter_generator", "user_profile", "job_posting_manager", "\_\_end\_\_").

### Specialized Agents & Their Tools

Each specialized agent is equipped with a set of tools (functions they can call) to perform its tasks. These tools often interact with the application's database, external APIs, or other backend services. Tool implementations are typically found in `src/server/langchain/tools.ts` and fetched by functions like `getDataManagerTools(userId)`.

1.  **Data Manager Agent**

    - **Purpose**: Handles storing, retrieving, and managing user profile data, including parsing resumes.
    - **Key Responsibilities**:
      - CRUD operations for work history, education, skills, links. (See [Profile Management](./profile-management.md))
      - Managing work achievements, including AI-powered merging. (See [Work Achievement Management](./work-achievement-management.md))
      - Parsing resume text when users provide it (e.g., paste it in chat).
    - **Tools Used** (from `getDataManagerTools(userId)` via `agentTeam.ts` system message):
      - `store_user_preference`: Stores user preferences (e.g., grammar, resume style).
        - **Arguments**: `category` (string), `preference` (string). (Ref: `StoreUserPreferenceSchema`)
      - `store_work_history`: Stores details about previous jobs.
        - **Arguments**: `jobTitle` (string), `companyName` (string), `startDate` (string, optional), `endDate` (string, optional), `responsibilities` (array of string, optional), `achievements` (array of string, optional). (Ref: `StoreWorkHistorySchema`)
      - `get_user_profile`: Retrieves existing user data.
        - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema`)
      - `parse_and_store_resume`: Parses resume text, extracts structured information, stores it, and saves the resume as a document.
        - **Arguments**: Likely takes resume text as input.
      - Work Achievement Tools (see [Work Achievement Management](./work-achievement-management.md) for details):
        - `get_work_achievements`
        - `add_work_achievement`
        - `update_work_achievement`
        - `delete_work_achievement`
        - `replace_work_achievements`
        - `merge_and_replace_work_achievements`
        - `merge_work_achievements`
      - _Note_: The `add_skill_to_profile` and link management tools mentioned previously in this document are part of the broader capabilities of `store_work_history`, `parse_and_store_resume`, or handled by general profile updates rather than standalone tools based on `agentTeam.ts`.

2.  **Resume Generator Agent**

    - **Purpose**: Creates and helps refine resumes based on the user's stored profile data.
    - **Key Responsibilities**:
      - Generating a full resume document.
      - Formatting resumes according to standards and preferences.
      - Providing resume writing advice and editing.
    - **Tools Used** (from `getResumeGeneratorTools(userId)` via `agentTeam.ts` system message):
      - `generate_resume`: Creates formatted resumes in different styles.
        - **Arguments**: Likely includes parameters for template choice or specific sections to include/emphasize.
      - `get_user_profile`: Retrieves user data needed for resume generation (same as Data Manager's tool).
        - **Arguments**: `dataType`.
    - _Document_: [Resume Generation](./resume-generation.md)

3.  **Cover Letter Generator Agent**

    - **Purpose**: Generates and tailors cover letters for specific job applications.
    - **Key Responsibilities**:
      - Creating cover letters based on user profile and a target job posting.
      - Editing and formatting cover letters.
      - Providing cover letter writing advice.
    - **Tools Used** (from `getCoverLetterGeneratorTools(userId)` via `agentTeam.ts` system message):
      - `generate_cover_letter`: Creates tailored cover letters for specific jobs.
        - **Arguments**: Likely includes `job_posting_id` and specific points to include.
      - `get_user_profile`: Retrieves user data needed for cover letter generation.
        - **Arguments**: `dataType`.
    - _Document_: [Cover Letter Generation](./cover-letter-generation.md)

4.  **User Profile Agent**

    - **Purpose**: Provides information _to the user_ about their stored data and how it's used.
    - **Key Responsibilities**:
      - Answering questions about stored profile information.
      - Explaining data usage.
    - **Tools Used** (from `getUserProfileTools(userId)` via `agentTeam.ts` system message):
      - `get_user_profile`: Retrieves different types of user data.
        - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema`)

5.  **Job Posting Manager Agent**
    - **Purpose**: Parses, stores, analyzes job postings, and compares them to user skills.
    - **Key Responsibilities**: See [Job Posting Import & Analysis](./job-posting-import.md) for full details.
    - **Tools Used** (from `getJobPostingTools(userId)` via `agentTeam.ts` system message):
      - `parse_and_store_job_posting`: Parses job posting text and automatically stores it in the database.
        - **Arguments**: `content` (string). (Ref: `ParseJobPostingSchema`)
        - **Note**: Handles duplicate skills by prioritizing required skills over bonus skills and using batch creation with `skipDuplicates` to prevent unique constraint violations.
      - `find_job_postings`: Finds stored job postings by title, company, location, etc.
        - **Arguments**: Search criteria.
      - `compare_skills_to_job`: Compares user skills against job requirements.
        - **Arguments**: Likely `job_posting_id` and `user_id` (implicitly).
      - `get_user_profile`: Retrieves user data including skills.
        - **Arguments**: `dataType` (typically "skills" or "all" for this context).

### Tooling Infrastructure

- **Tool Configuration (`src/server/langchain/tools/config.ts`)**: Contains shared configurations for tools.
- **Error Handling (`src/server/langchain/tools/errors.ts`)**: Defines custom errors for tools.
- **Shared Types (`src/server/langchain/tools/types.ts`)**: Common TypeScript types and Zod schemas for tools.
- Details: [Tooling Infrastructure](./tooling-infrastructure.md)

## Chat Interaction Flow Example

1.  **User**: "Add a new work experience: Software Engineer at Tech Corp from Jan 2020 to Dec 2022. I developed a new feature using React."
2.  **Frontend**: Sends this message to the tRPC router (`src/server/api/routers/ai.ts`).
3.  **tRPC Router**: Passes the message to the LangChain `agentTeam`.
4.  **Supervisor Agent**: Analyzes the message. Decides to route to `Data Manager Agent` using `route_to_agent` tool.
5.  **Data Manager Agent**:
    - Receives the task.
    - Uses `store_work_history` tool with arguments: `{ jobTitle: "Software Engineer", companyName: "Tech Corp", startDate: "2020-01-01", endDate: "2022-12-31", achievements: ["developed a new feature using React"] }`.
    - The `store_work_history` tool might internally also identify "React" as a skill and associate it, or a separate process/tool call to `add_skill_to_profile` (if it exists as a distinct tool or is part of `parse_and_store_resume`'s broader capabilities when handling free-form text) might be invoked by the agent if prompted or designed to do so. More directly, `parse_and_store_resume` would handle skill extraction from broader text.
    - Confirms operations with the database.
6.  **Data Manager Agent**: Returns a success message (e.g., "Okay, I've added Software Engineer at Tech Corp to your work history, including the achievement about React development.") to the Supervisor.
7.  **Supervisor Agent**: Receives confirmation. May decide the task is complete and route to `__end__` using `route_to_agent`, or await further user input. The AI's response is passed back.
8.  **tRPC Router**: Streams the response back to the frontend.
9.  **Frontend**: Displays the AI's response.

This AI chat system provides a flexible and powerful way for users to interact with CareerCraft Studio, leveraging specialized AI capabilities for a variety of tasks.

## Recent Fixes

### Job Posting Duplicate Detection (Fixed)

**Issue**: When a user submitted a job posting to chat, it correctly confirmed what the user wanted to do with it. When a user opted to parse and save it, it succeeded. However, if a user then posted another job posting into the same chat session, it would tell them that it had parsed and saved it, even though it did not actually process the duplicate content.

**Root Cause**: The system had comprehensive duplicate detection logic but two critical issues:

1. **Missing Action Tracking**: The `handleAgentToolCalls` function was not actually recording completed actions in the state, so the `completedActions` array was always empty, making duplicate detection ineffective.
2. **Misleading Success Messages**: The `processJobPostingToolCalls` function always started with "I've processed your job posting request:" even when tool calls were skipped due to duplicates.

**Fix Applied**:

1. **Implemented Completed Actions Tracking**: Updated `handleAgentToolCalls` to create and return `CompletedAction` objects when tools are executed, including content hashes for content-based tools like job posting parsing.
2. **Improved Response Messages**: Modified `processJobPostingToolCalls` to track whether any actual processing occurred and adjust the response message accordingly:
   - "I've processed your job posting request:" when actual processing occurs
   - "I reviewed your job posting request:" when all actions are skipped due to duplicates

**Technical Details**:

- Content-based tools (like `parse_and_store_job_posting`) now generate content hashes for duplicate detection
- Duplicate detection only skips if content hashes match AND the action is recent (within 5 minutes)
- Different job posting content will be processed normally
- Completed actions are properly tracked across the conversation session

This ensures that:

- Different job postings are always processed
- Identical job postings submitted recently are skipped with clear messaging
- Users receive accurate feedback about what actions were actually performed
