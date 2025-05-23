# Resume Master

Resume Master is a tool that helps you create resumes and cover letters tailored to your job applications.

## Features

- AI chat with your resume and cover letter
- Resume and cover letter generation
- Job posting analysis

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

- **Data Manager:** Handles storing, retrieving, and managing user profile data (work history, skills, etc.).
- **Resume Generator:** Creates and helps refine resumes based on user data.
- **Cover Letter Generator:** Generates and tailors cover letters for specific job applications.
- **User Profile:** Provides information to the user about their stored data.
- **Job Posting Manager:** Parses, stores, and analyzes job postings, including comparing job requirements to user skills.

Each specialized agent has access to specific tools enabling it to perform its function, interacting with the application's database and other backend services. The supervisor ensures smooth transitions between agents based on the conversation flow.
