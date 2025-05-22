# LangChain Tools Organization

This directory contains the LangChain agent system and tools for the Resume Master application.

## Files Overview

### `tools.ts` - Centralized Tool Definitions

All agent tools have been consolidated into this file for better organization and to eliminate duplication. This includes:

**User Profile Tools:**

- `createUserProfileTool(userId)` - Retrieves user profile data (work history, education, skills, achievements, preferences)

**Data Storage Tools:**

- `storeUserPreferenceTool` - Stores user preferences (grammar, phrases, resume style)
- `storeWorkHistoryTool` - Stores work history information

**Generation Tools:**

- `generateResumeTool` - Generates formatted resumes
- `generateCoverLetterTool` - Generates tailored cover letters

**Utility Tools:**

- `mergeWorkAchievementsTool` - Merges achievement lists using LLM (for agent use)

**Routing Tools:**

- `supervisorRoutingTool` - Routes between different agents

**Helper Functions:**

- `getDataManagerTools(userId)` - Returns tools for data manager agent
- `getResumeGeneratorTools(userId)` - Returns tools for resume generator agent
- `getCoverLetterGeneratorTools(userId)` - Returns tools for cover letter generator agent
- `getUserProfileTools(userId)` - Returns tools for user profile agent
- `getSupervisorTools()` - Returns tools for supervisor agent
- `getAllTools(userId?)` - Returns all available tools

### `agent.ts` - Basic Agent Functions

Contains the core agent functionality:

- Schema definitions for resume data parsing
- `createLLM()` - LLM initialization
- `createDirectChatAgent()` - Simple chat agent without tools
- `createAgent()` - Tool-enabled agent
- Message conversion utilities

### `agentTeam.ts` - Multi-Agent System

Contains the state graph implementation with specialized agent nodes:

- `supervisorNode` - Routes requests to appropriate agents
- `dataManagerNode` - Handles data storage and retrieval
- `resumeGeneratorNode` - Handles resume generation
- `coverLetterGeneratorNode` - Handles cover letter generation
- `userProfileNode` - Handles profile queries

## Deduplication Summary

### Duplicate Tools Identified and Resolved:

1. **`createUserProfileTool`**:

   - **agent.ts**: Had a stub implementation that just returned "Profile data not implemented"
   - **agentTeam.ts**: Had a full implementation with database access and complete functionality
   - **Resolution**: Kept the full implementation from agentTeam.ts in tools.ts

2. **Other tools** (`storeUserPreferenceTool`, `storeWorkHistoryTool`, `generateResumeTool`, `generateCoverLetterTool`, `supervisorRoutingTool`):
   - Only existed in agentTeam.ts
   - Moved to tools.ts without conflicts

### Non-Conflicting Functions:

- `mergeWorkAchievements` function in `document.ts` - This is a standalone utility function for document processing, separate from the `mergeWorkAchievementsTool` which is for agent use.

## Usage

Import tools from the centralized location:

```typescript
import {
  createUserProfileTool,
  getDataManagerTools,
  getSupervisorTools,
  // ... other tools
} from "~/server/langchain/tools";

// Use in agent nodes:
const llm = model.bindTools(getDataManagerTools(userId));
```

This organization provides:

- **Single source of truth** for all tools
- **Easy maintenance** and updates
- **Consistent tool definitions** across agents
- **Type safety** with proper TypeScript exports
- **Modular organization** by tool category
