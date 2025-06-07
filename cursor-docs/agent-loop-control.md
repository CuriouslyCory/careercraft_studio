---
description: Plan to improve agent loop control, prevent duplicate tool calls, and add clarification mechanisms
globs: src/server/langchain/agentTeam.ts, src/server/langchain/tools/**/*
alwaysApply: false
---

# Agent Loop Control & Duplicate Prevention

This document outlines the plan to improve the agent team's loop control mechanisms, prevent duplicate tool calls, and add clarification capabilities to reduce assumptions.

## Current Issues Identified

### 1. Duplicate Tool Calls ✅ FIXED

- **Problem**: The `processJobPostingToolCalls` function automatically stores parsed job postings even when not explicitly requested, leading to potential duplicates
- **Location**: Lines 1247-1264 in `agentTeam.ts`
- **Impact**: Users may see "Auto-stored: Job posting already exists" messages repeatedly
- **Status**: ✅ RESOLVED - Duplicate detection implemented

### 2. Lack of Clarification ✅ FIXED

- **Problem**: Agents assume user intent instead of asking for clarification when multiple actions are possible
- **Example**: When user posts "Job post: <text>", the system automatically parses and stores instead of asking what the user wants to do
- **Impact**: Poor UX and potential unwanted actions
- **Status**: ✅ RESOLVED - Clarification system implemented

### 3. No Loop Termination Awareness ✅ FIXED

- **Problem**: Agents don't track previous actions in the conversation loop to avoid redundant operations
- **Impact**: Inefficient processing and confusing user experience
- **Status**: ✅ RESOLVED - Loop control implemented

### 4. Job Posting Parse/Store Separation 🔄 NEW ISSUE

- **Problem**: Job posting parsing and storing are separate actions, causing workflow confusion
- **Current Behavior**:
  - `parse_job_posting` extracts data but doesn't store it
  - Returns a message asking user what to do next
  - Supervisor tries to re-parse the extracted summary instead of using original content
- **Expected Behavior**:
  - `parse_job_posting` should extract data AND store it automatically
  - Should return confirmation of both parsing and storage
  - Should eliminate the need for separate `store_job_posting` calls
- **Impact**: Poor UX, workflow confusion, supervisor routing errors

## Proposed Solution Architecture

### Phase 1: Add State Tracking ✅ PLANNED

#### 1.1 Extend Agent State

```typescript
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => "supervisor",
  }),
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
    default: () => "",
  }),
  // NEW: Track completed actions to prevent duplicates
  completedActions: Annotation<CompletedAction[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  // NEW: Track pending clarifications
  pendingClarification: Annotation<PendingClarification | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});
```

#### 1.2 Define Action Tracking Types

```typescript
interface CompletedAction {
  id: string;
  agentType: string;
  toolName: string;
  args: Record<string, unknown>;
  result: string;
  timestamp: number;
  contentHash?: string; // For content-based deduplication
}

interface PendingClarification {
  id: string;
  question: string;
  options: ClarificationOption[];
  context: Record<string, unknown>;
  timestamp: number;
}

interface ClarificationOption {
  id: string;
  label: string;
  description: string;
  action: {
    agentType: string;
    toolName: string;
    args: Record<string, unknown>;
  };
}
```

### Phase 2: Implement Duplicate Detection ✅ PLANNED

#### 2.1 Create Deduplication Utilities

```typescript
// NEW: Utility functions for duplicate detection
function createContentHash(content: string): string;
function isDuplicateAction(
  newAction: Omit<CompletedAction, "id" | "timestamp">,
  completedActions: CompletedAction[],
): CompletedAction | null;
function shouldSkipToolCall(
  toolCall: ValidatedToolCall,
  completedActions: CompletedAction[],
): { skip: boolean; reason?: string; existingAction?: CompletedAction };
```

#### 2.2 Update Tool Call Processing

- Modify `processJobPostingToolCalls` to check for duplicates before execution
- Remove automatic storage logic
- Add duplicate detection for all tool processors

### Phase 3: Add Clarification Mechanism ✅ PLANNED

#### 3.1 Create Clarification Tools

```typescript
// NEW: Supervisor tool for requesting clarification
const requestClarificationTool = {
  name: "request_clarification",
  schema: z.object({
    question: z.string(),
    options: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        description: z.string(),
        agentType: z.string(),
        toolName: z.string(),
        args: z.record(z.unknown()),
      }),
    ),
    context: z.record(z.unknown()).optional(),
  }),
};
```

#### 3.2 Update Supervisor Logic

- Add clarification detection patterns
- Modify routing to request clarification when multiple actions are possible
- Handle clarification responses

### Phase 4: Implement Loop Control ✅ PLANNED

#### 4.1 Add Recursion Limits

```typescript
const AGENT_CONFIG = {
  // ... existing config
  LOOP_LIMITS: {
    MAX_AGENT_SWITCHES: 10,
    MAX_TOOL_CALLS_PER_AGENT: 5,
    MAX_CLARIFICATION_ROUNDS: 3,
  },
} as const;
```

#### 4.2 Track Loop Metrics

- Count agent switches per conversation
- Track tool calls per agent per loop
- Monitor clarification rounds

## Implementation Plan

### ✅ Step 1: Analyze Current State (COMPLETED)

- [x] Review current tool calling and processing logic
- [x] Identify duplicate call patterns
- [x] Document current supervisor routing logic
- [x] Create this planning document

### ✅ Step 2: Extend State Management (COMPLETED)

- [x] Add new state fields to `AgentState`
- [x] Create type definitions for tracking
- [x] Update state initialization
- [x] Update function signatures to support new state
- [x] Add loop control configuration

### ✅ Step 3: Implement Duplicate Detection (COMPLETED)

- [x] Create content hashing utilities
- [x] Add duplicate detection functions
- [x] Update job posting tool call processor
- [x] Remove auto-storage logic
- [x] Update other tool call processors (data manager, user profile)
- [x] Test duplicate detection

### ✅ Step 4: Add Clarification System (COMPLETED)

- [x] Update supervisor system message with clarification patterns
- [x] Create clarification tools (request_clarification, respond_to_clarification)
- [x] Add clarification handling logic
- [x] Test clarification flows

### ✅ Step 5: Implement Loop Control (COMPLETED)

- [x] Add recursion limits configuration
- [x] Implement loop metrics tracking utilities
- [x] Add loop control to agent nodes
- [x] Add termination conditions
- [x] Test loop scenarios

### ✅ Step 6: Testing & Validation (COMPLETED)

- [x] Test duplicate prevention
- [x] Test clarification flows
- [x] Test loop termination
- [x] Performance testing

### ✅ Step 7: Fix Job Posting Workflow (COMPLETED)

- [x] Update `parse_job_posting` tool to automatically store parsed data
- [x] Remove separate `store_job_posting` tool calls from workflow
- [x] Update job posting manager system message
- [x] Update tool call processor to handle combined parse/store
- [x] Test end-to-end job posting workflow
- [x] Update documentation
- [x] **Normalize skills BEFORE storage** to eliminate data duplication
- [x] **Store clean, normalized skill data** in `jobPostingDetails`
- [x] **Ensure data consistency** across all job posting tables
- [x] **Centralize processing logic** in `JobPostingProcessor` service
- [x] **Eliminate code duplication** between AI tools and tRPC routers

## ✅ Implementation Complete

All planned features have been successfully implemented:

1. **Duplicate Detection**: Tool calls are now checked against completed actions to prevent redundant processing
2. **Clarification System**: Supervisor can request clarification when user intent is ambiguous
3. **Loop Control**: Agents track metrics and terminate gracefully when limits are exceeded
4. **State Management**: Extended state tracking for actions, clarifications, and loop metrics
5. **Job Posting Workflow**: Combined parse and store operations for seamless user experience

## Key Features Implemented

### Duplicate Prevention

- Content hashing for job postings and resumes
- Action tracking with timestamps
- Intelligent skipping with user feedback

### Clarification Mechanism

- `request_clarification` tool for supervisor
- `respond_to_clarification` tool for handling responses
- Structured options with clear descriptions

### Loop Control

- Configurable limits for agent switches, tool calls, and clarification rounds
- Graceful termination with helpful suggestions
- Comprehensive metrics tracking

### Enhanced State Management

- `completedActions` array for duplicate detection
- `pendingClarification` for clarification workflows
- `loopMetrics` for termination control

### Streamlined Job Posting Workflow

- `parse_and_store_job_posting` combines parsing and storage
- Eliminates workflow confusion and supervisor routing errors
- Provides immediate feedback with comprehensive job details
- **Intelligent skill normalization** with multi-industry support
- Automatic skill categorization and alias creation
- **Clean data storage** with normalized skills in all tables
- **Eliminates data duplication** between raw and normalized skills
- **Centralized processing logic** shared between AI tools and tRPC routers
- **Consistent behavior** across all job posting entry points

---

**Status**: ✅ COMPLETED
**Priority**: High
**Estimated Effort**: 2-3 weeks
**Actual Effort**: Completed in implementation session
**Dependencies**: None

## Example Scenarios

### Scenario 1: Job Posting Clarification

**User Input**: "Job post: Software Engineer at Google..."

**Current Behavior**:

- Automatically parses and stores the job posting

**New Behavior**:

- Supervisor requests clarification: "I see you've shared a job posting. Would you like me to:
  1. Parse and store it for future reference
  2. Compare it to your skills
  3. Just analyze the requirements
  4. All of the above"

### Scenario 2: Duplicate Prevention

**User Input**: "Parse this job posting again: [same content]"

**Current Behavior**:

- Parses and attempts to store, gets "already exists" error

**New Behavior**:

- Detects duplicate content
- Responds: "I've already parsed this job posting. Would you like me to show you the previous analysis or compare it to your skills?"

### Scenario 3: Loop Control

**User Input**: Multiple rapid requests that could cause loops

**Current Behavior**:

- May process indefinitely or until error

**New Behavior**:

- Tracks loop metrics
- Terminates gracefully when limits reached
- Suggests alternative approaches

## Files to Modify

1. **`src/server/langchain/agentTeam.ts`** - Main agent logic
2. **`src/server/langchain/tools/`** - Tool implementations
3. **`cursor-docs/ai-chat.md`** - Update documentation to reflect dashboard integration
4. **`cursor-docs/job-posting-import.md`** - Update workflow documentation

## Risk Mitigation

1. **Backward Compatibility**: Ensure existing functionality continues to work
2. **Performance**: Monitor impact of state tracking on performance
3. **User Experience**: Ensure clarifications don't become annoying
4. **Testing**: Comprehensive testing of edge cases
