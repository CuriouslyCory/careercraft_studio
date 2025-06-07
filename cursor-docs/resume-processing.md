# Resume Processing Architecture

## Overview

The resume processing system handles PDF and text-based resume uploads, extracting structured data using AI and storing it in the database. This document outlines the architecture and key design decisions.

## Core Components

### ResumeParsingService

The centralized service responsible for:

- LLM-based content extraction
- Structured data validation
- Database storage with transaction safety
- Error handling and fallbacks

### Key Design Patterns

#### 1. Two-Phase Processing Architecture

**Problem**: LLM calls within database transactions cause timeout issues in production environments.

**Solution**: Separate LLM processing from database operations:

```typescript
// Phase 1: LLM Processing (outside transaction)
const workExperienceWithMergedAchievements = [];
for (const exp of workExperience) {
  const mergedAchievements = await mergeWorkAchievements(existing, new);
  workExperienceWithMergedAchievements.push({ exp, mergedAchievements });
}

// Phase 2: Database Operations (within transaction)
await db.$transaction(async (tx) => {
  for (const { exp, mergedAchievements } of workExperienceWithMergedAchievements) {
    // Fast database operations only
  }
}, { timeout: 30000 });
```

#### 2. Transaction Timeout Configuration

All database transactions include explicit timeout settings:

- `timeout: 30000` (30 seconds) - Maximum transaction duration
- `maxWait: 5000` (5 seconds) - Maximum wait time to acquire transaction

#### 3. Graceful Error Handling

LLM failures fall back to simple data concatenation rather than failing the entire process:

```typescript
try {
  mergedAchievements = await mergeWorkAchievements(existing, new);
} catch (error) {
  console.error("Error merging achievements with LLM:", error);
  // Fallback to simple concatenation
  mergedAchievements = [...existing, ...new];
}
```

## Production Issues Resolved

### Transaction Timeout Error (P2028)

**Issue**: Resume uploads failing in production with:

```
Transaction not found. Transaction ID is invalid, refers to an old closed transaction
```

**Root Cause**: LLM calls (5-15 seconds) within database transactions exceeded production timeout limits.

**Solution**:

1. Moved all LLM processing outside transactions
2. Added explicit transaction timeouts
3. Implemented fallback mechanisms for LLM failures

### Specific Changes Made

#### 1. Resume Parser (`src/server/services/resume-parser.ts`)

- **Before**: `mergeWorkAchievements()` called inside transaction
- **After**: Pre-process all LLM operations outside transaction, then batch database operations
- **Timeout**: 30 seconds for main transaction

#### 2. Key Achievements (`src/server/api/routers/document/key-achievements.ts`)

- **Before**: `mergeAchievementsWithAI()` called inside transaction
- **After**: Four-phase approach with LLM processing outside transactions
- **Timeout**: 10 seconds for database-only transactions

#### 3. Work History (`src/server/api/routers/document/work-history.ts`)

- **Already Fixed**: LLM processing was already outside transactions
- **Added**: Explicit timeout configuration (10 seconds)

#### 4. Compatibility Migration (`src/server/api/routers/compatibility.ts`)

- **Added**: Timeout configuration (15 seconds for skill migration)

### Performance Optimizations

1. **Batched Operations**: Use `createMany` instead of individual `create` calls
2. **Skill Normalization**: Pre-process skill mappings to reduce database queries
3. **Duplicate Prevention**: Check for existing records before creation
4. **Connection Pool Management**: Short-lived transactions prevent pool exhaustion

## Error Handling Strategy

### Partial Success Model

The system continues processing even if individual components fail:

- Document saving failure doesn't prevent data extraction
- LLM failures fall back to simpler processing
- Individual work experience failures don't stop other records

### Error Categorization

1. **Critical Errors**: User ID missing, database connection failures
2. **Processing Errors**: LLM failures, data validation errors (with fallbacks)
3. **Data Errors**: Individual record failures (logged but not blocking)

## Monitoring and Debugging

### Key Metrics

- Transaction duration (should be < 30 seconds)
- LLM processing time (typically 5-15 seconds)
- Success/failure rates by component
- Fallback usage frequency

### Debug Logging

```typescript
console.log(`Processing resume for user ${userId}, length: ${text.length}`);
console.log(`Found matching work history: ${company} - ${title}`);
console.log(
  `Merging achievements: Existing=${existing.length}, New=${new.length}`,
);
```

## Future Improvements

1. **Async Processing**: Move entire resume processing to background jobs
2. **Caching**: Cache LLM responses for similar content
3. **Incremental Updates**: Only process changed sections
4. **Real-time Progress**: WebSocket updates for long-running operations

## Related Documentation

- [Work Achievement Management](./work-achievement-management.md)
- [Skill Normalization](./skill-normalization.md)
- [Database Schema](./database-schema.md)
