# Chat Workflow Fixes

## Issues Identified and Fixed

### 1. Raw Tool Call Data Visible to Users

**Problem**: Users were seeing internal tool call data like `{"functionCall":{"name":"route_to_agent","args":{"next":"data_manager"}}}` in chat responses.

**Root Cause**: In `src/server/langchain/agentTeam.ts`, the `processSupervisorToolCalls` function was including `tool_calls` in the AIMessage sent to users:

```typescript
// BEFORE (problematic)
return {
  messages: [
    new AIMessage({
      content: contentToString(response.content),
      tool_calls: processedToolCalls, // This exposes internal data!
    }),
  ],
  next: destination,
};

// AFTER (fixed)
return {
  messages: [
    new AIMessage(
      contentToString(response.content) || "I understand your request.",
    ),
  ],
  next: destination,
};
```

**Fix**: Removed `tool_calls` from user-facing AIMessage objects. Tool calls are now purely internal.

### 2. Empty Final Response Content

**Problem**: Users sometimes received empty responses like `{"type":"text","text":""}`.

**Root Cause**: Multiple issues:

- Empty content from supervisor responses
- Inadequate content validation in streaming logic
- Poor handling of non-string content types

**Fixes**:

1. **Enhanced content validation** in `src/server/api/routers/ai.ts`:

   ```typescript
   // Added check for empty strings
   if (
     agentMessage &&
     typeof agentMessage.content === "string" &&
     agentMessage.content.trim() !== "" // NEW: prevent empty strings
   ) {
     // Process content...
   }
   ```

2. **Improved non-string content handling**:

   ```typescript
   // Handle arrays, objects, and other content types
   else if (agentMessage?.content) {
     let content = "";

     if (Array.isArray(agentMessage.content)) {
       content = agentMessage.content
         .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
         .join(" ");
     } else if (typeof agentMessage.content === "object") {
       try {
         content = JSON.stringify(agentMessage.content);
       } catch {
         content = "[Complex Content]";
       }
     } else {
       content = String(agentMessage.content);
     }

     if (content.trim()) {
       emit.next(content);
       finalResponse = content;
       hasEmittedContent = true;
     }
   }
   ```

3. **Better supervisor responses**: Updated supervisor system message to provide meaningful acknowledgments when routing:
   ```
   ROUTING RESPONSE FORMAT:
   When you route to another agent, provide a brief acknowledgment in your response content, such as:
   - "I'll look up your skills data for you." (when routing to data_manager)
   - "Let me help you with your resume." (when routing to resume_generator)
   ```

### 3. Improved Skills Data Formatting

**Problem**: Skills data was returned as raw JSON, not user-friendly markdown as requested.

**Fix**: Enhanced `processDataManagerToolCalls` in `src/server/langchain/agentTeam.ts` to format skills data in organized markdown:

```typescript
if (args.dataType === "skills") {
  try {
    const skillsData = JSON.parse(result) as Array<{...}>;

    if (skillsData.length === 0) {
      toolCallSummary += `No skills found in your profile yet.`;
    } else {
      toolCallSummary += `## Your Skills\n\n`;

      // Group by proficiency level
      const expertSkills = skillsData.filter(s => s.proficiency === "EXPERT");
      const advancedSkills = skillsData.filter(s => s.proficiency === "ADVANCED");
      // ... etc

      if (expertSkills.length > 0) {
        toolCallSummary += `### Expert Level\n`;
        expertSkills.forEach(skill => {
          toolCallSummary += `- **${skill.name}**`;
          if (skill.workContext) {
            toolCallSummary += ` _(${skill.workContext})_`;
          }
          toolCallSummary += `\n`;
        });
      }
      // ... other levels

      toolCallSummary += `\n_Total: ${skillsData.length} skills in your profile_\n\n`;
    }
  } catch (parseError) {
    // Fallback to JSON format
  }
}
```

### 4. Message Persistence Issues

**Problem**: When chat cache invalidates, only database-stored messages appear, not streaming intermediates.

**Current Behavior**:

- Streaming content is shown in real-time during the session
- Only the final response is saved to the database
- When page refreshes, only saved messages are loaded

**This is actually correct behavior** - the streaming intermediates (like tool call details and routing messages) should not be persisted as they're internal workflow steps. Only the final, meaningful responses should be saved.

### 5. Enhanced Logging and Debugging

**Added comprehensive logging** to help debug future issues:

```typescript
console.log(`Processing ${agentType} message:`, {
  hasContent: !!agentMessage?.content,
  contentType: typeof agentMessage?.content,
  contentPreview:
    typeof agentMessage?.content === "string"
      ? agentMessage.content.substring(0, 100) + "..."
      : JSON.stringify(agentMessage?.content).substring(0, 100) + "...",
});
```

## Expected User Experience After Fixes

### Before:

```
User: Please fetch the skills from my profile.
AI: {"functionCall":{"name":"route_to_agent","args":{"next":"data_manager"}}}I've processed your request:
• Retrieved skills data:

[raw JSON array with 39 skill objects...]

{"functionCall":{"name":"get_user_profile","args":{"dataType":"skills"}}}{"type":"text","text":""}
```

### After:

```
User: Please look up my skills and return them in markdown format.
AI: I'll look up your skills data for you.

## Your Skills

### Expert Level
- **TypeScript** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Next.js** _(CEO & Lead Developer at Curiously Cory Corp)_
- **React** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Node.js** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Solidity** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Web3.js** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Agile** _(Principal Full Stack Engineer (Frontend Lead) at Sudorandom Labs)_

### Advanced Level
- **PostgreSQL** _(CEO & Lead Developer at Curiously Cory Corp)_
- **IPFS** _(CEO & Lead Developer at Curiously Cory Corp)_
- **RESTful APIs** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Serverless** _(CEO & Lead Developer at Curiously Cory Corp)_
- **Tailwind CSS** _(Principal Full Stack Engineer | Blockchain Development Lead at Sudorandom)_

[... continues with Intermediate levels ...]

_Total: 39 skills in your profile_
```

## Testing Recommendations

1. **Test skills retrieval** with various requests:

   - "Show me my skills"
   - "List my technical skills in markdown"
   - "What programming languages do I know?"

2. **Test routing behavior** with different request types:

   - Data retrieval requests
   - Resume generation requests
   - Job posting analysis requests

3. **Test error scenarios**:

   - Empty user profiles
   - Network timeouts
   - Invalid data formats

4. **Verify message persistence**:
   - Check that only final responses are saved to database
   - Confirm proper chat history loading after page refresh
