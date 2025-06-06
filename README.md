# CareerCraft Studio

CareerCraft Studio is a tool that helps you create resumes and cover letters tailored to your job applications. Finally get human eyeballs on your resume and cover letter.

## Features

- AI chat with your resume and cover letter
- Resume and cover letter generation
- Job posting analysis
- Resume parsing from text or uploaded files

## AI Chat Features

This application includes a comprehensive AI chat feature powered by a LangChain agent team orchestrated via a tRPC router.

### Architecture

The AI chat functionality follows a clear separation of concerns:

- **Frontend (AI Chat Layout & Sub-routes):** Provides the user interface for interacting with the AI across all `/ai-chat/*` routes. The chat interface is persistent across all sub-routes via the shared layout, dynamically rendering chat messages alongside different panel views (documents, work history, etc.).
- **Backend Router (`src/server/api/routers/ai.ts`):** Acts as the API layer using tRPC. It receives user messages, interacts with the LangChain agent team, and streams responses back to the frontend. It also handles persistence of chat messages.
- **LangChain Agent Team (`src/server/langchain/agentTeam.ts`):** Contains the core AI logic. It's structured as a `StateGraph` with a supervisor agent routing tasks to specialized agents.

### LangChain Agent Team

The `agentTeam.ts` file defines the AI's workflow using LangChain's StateGraph. A central **Supervisor Agent** directs incoming user requests to the most appropriate specialized agent.

Key specialized agents include:

- **Data Manager:** Handles storing, retrieving, and managing user profile data (work history, skills, etc.). Can also parse resume text when users paste it in chat. Now includes comprehensive work achievement management capabilities.
- **Resume Generator:** Creates and helps refine resumes based on user data.
- **Cover Letter Generator:** Generates and tailors cover letters for specific job applications.
- **User Profile:** Provides information to the user about their stored data.
- **Job Posting Manager:** Parses, stores, and analyzes job postings, including comparing job requirements to user skills.

Each specialized agent has access to specific tools enabling it to perform its function, interacting with the application's database and other backend services. The supervisor ensures smooth transitions between agents based on the conversation flow.

## Resume Parsing Service

The application includes a centralized resume parsing service (`src/server/services/resume-parser.ts`) that processes resume text using AI and stores structured data in the user's profile.

### Features

- **AI-Powered Parsing:** Uses LLM to extract structured information from resume text
- **Data Storage:** Automatically processes and stores work experience, education, achievements, and links
- **Flexible Usage:** Can be used both for file uploads and chat-based text parsing
- **Error Handling:** Graceful handling of parsing errors with detailed feedback

### Usage

The service can be used in multiple ways:

1. **File Upload:** When users upload PDF or text files through the document upload feature
2. **Chat Parsing:** When users paste resume text directly in the AI chat interface
3. **Programmatic:** Direct API calls for custom integrations

### Key Components

- `ResumeParsingService`: Main class that orchestrates the parsing process
- `parseResume()`: Full-featured parsing with document creation
- `parseResumeFromText()`: Simplified parsing optimized for chat usage
- Automatic integration with existing data processing functions for work history, education, achievements, and user links

### Database Optimization

The resume parsing service now includes optimized batch operations to significantly reduce database calls:

**Batched Operations Include:**

- **Key Achievements:** Uses `createMany()` to insert all achievements in a single operation
- **Education:** Batch inserts education entries with duplicate handling
- **User Links:** Efficient duplicate checking and batch creation of new links
- **Work Experience:** Optimized processing that batches achievements and skills within each work history entry
- **Skills:** Intelligent skill creation and user-skill mapping with minimal duplicate queries

**Performance Benefits:**

- Reduces database round trips from potentially hundreds to dozens for large resumes
- Uses database transactions to ensure data consistency
- Maintains backward compatibility with non-batched operations
- Includes proper error handling and partial success support

**Usage:**

```typescript
// Default behavior uses batched operations
const result = await parseResume(resumeText, userId, db);

// Opt out of batching if needed
const result = await parseResume(resumeText, userId, db, {
  useBatchedOperations: false,
});
```

## Detailed Feature Documentation

For a more in-depth understanding of the application's features, architecture, and agent capabilities, please refer to the [Feature Documentation](./cursor-docs/README.md).

## Work Achievement Management

The Data Manager agent now includes comprehensive tools for managing work achievements, allowing for fine-grained editing and AI-powered merging of achievement data.

### Achievement Management Tools

The following tools are available for managing work achievements:

#### Core Operations

- **`get_work_achievements`:** Retrieve all achievements for a specific work history record
- **`add_work_achievement`:** Add a single new achievement to a work history record
- **`update_work_achievement`:** Update the description of a specific achievement
- **`delete_work_achievement`:** Delete a specific achievement

#### Batch Operations

- **`replace_work_achievements`:** Replace all achievements for a work history with new ones
- **`merge_and_replace_work_achievements`:** Merge existing achievements with new ones using AI, then replace

#### AI-Powered Merging

- **`merge_work_achievements`:** Standalone tool to merge two sets of achievements using LLM for deduplication and optimization

### Usage Examples

**Get achievements for a specific job:**

```
"Show me the achievements for my Software Engineer role at Tech Corp"
```

**Merge achievements:**

```
"I have some new achievements for my previous job. Can you merge them with the existing ones?"
```

**Replace all achievements:**

```
"Replace all my achievements for the Marketing Manager role with these new bullet points..."
```

### Features

- **Database Transactions:** All replacement operations use transactions to ensure data consistency
- **User Authentication:** All operations verify that work history records belong to the authenticated user
- **AI-Powered Merging:** Uses LLM to intelligently combine and deduplicate achievement lists
- **Detailed Feedback:** Provides clear success messages and handles errors gracefully
- **ID Tracking:** All operations provide achievement IDs for precise editing

### Database Operations

The achievement management tools interact directly with the database through:

- **WorkHistory** records to verify ownership and get context
- **WorkAchievement** records for all CRUD operations
- **Atomic transactions** for batch operations to ensure consistency
- **Optimistic handling** of concurrent edits and missing records

```

```

### Development

To install a compatable chromium browser for puppeteer, run the following command:

`npx puppeteer browsers install chromium@latest --path /tmp/localChromium`

Then set the `LOCAL_CHROME_EXECUTABLE_PATH` environment variable to the path of the installed browser.

`LOCAL_CHROME_EXECUTABLE_PATH=/tmp/localChromium/chrome-linux/chrome`
