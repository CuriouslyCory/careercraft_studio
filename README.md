# Resume Master

Resume Master is a tool that helps you create resumes and cover letters tailored to your job applications.

## Features

- AI chat with your resume and cover letter
- Resume and cover letter generation
- Job posting analysis
- Resume parsing from text or uploaded files

## AI Chat Features

This application includes a comprehensive AI chat feature powered by a LangChain agent team orchestrated via a tRPC router.

### Architecture

The AI chat functionality follows a clear separation of concerns:

- **Frontend (`src/app/ai-chat/page.tsx`):** Provides the user interface for interacting with the AI. It dynamically renders chat and bio/document views and handles basic UI state.
- **Backend Router (`src/server/api/routers/ai.ts`):** Acts as the API layer using tRPC. It receives user messages, interacts with the LangChain agent team, and streams responses back to the frontend. It also handles persistence of chat messages.
- **LangChain Agent Team (`src/server/langchain/agentTeam.ts`):** Contains the core AI logic. It's structured as a `StateGraph` with a supervisor agent routing tasks to specialized agents.

### LangChain Agent Team

The `agentTeam.ts` file defines the AI's workflow using LangChain's StateGraph. A central **Supervisor Agent** directs incoming user requests to the most appropriate specialized agent.

Key specialized agents include:

- **Data Manager:** Handles storing, retrieving, and managing user profile data (work history, skills, etc.). Can also parse resume text when users paste it in chat.
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
