# tRPC Router Reorganization Plan

## Overview

This document outlines the plan to reorganize the tRPC routers from the current monolithic structure to a cleaner, feature-focused organization. The goal is to improve maintainability and logical grouping without changing functionality.

## Current Structure

```
src/server/api/routers/
├── ai.ts (26KB, 789 lines) - AI chat functionality
├── compatibility.ts (6.1KB, 211 lines) - Job compatibility analysis
├── user-skills.ts (5.7KB, 209 lines) - User skill management
├── skills.ts (2.5KB, 94 lines) - Skill normalization and suggestions
├── document.ts (551B, 22 lines) - Re-export wrapper
└── document/ (directory)
    ├── index.ts (4.1KB, 115 lines) - Main document router
    ├── document-ops.ts (21KB, 754 lines) - Document operations
    ├── work-history.ts (42KB, 1277 lines) - Work history and achievements
    ├── education.ts (3.8KB, 132 lines) - Education management
    ├── job-posting.ts (3.2KB, 115 lines) - Job posting CRUD
    ├── key-achievements.ts (12KB, 379 lines) - Key achievements
    ├── user-links.ts (7.0KB, 237 lines) - User links
    ├── types.ts (2.6KB, 108 lines) - Shared types
    └── utils/ (directory)
```

## Target Structure

```
src/server/api/routers/
├── chat.ts - AI chat functionality and related features
├── document.ts - Document uploads and Document record management
├── work-history.ts - Work History management including WorkHistoryAchievement
├── skills.ts - UserSkills and non-WorkHistory skill management
├── job-posting.ts - Job posting records and related features (resume/cover letter generation)
├── key-achievements.ts - KeyAchievement records and related features
├── user-links.ts - UserLinks related functions
├── education.ts - Education related functions
└── shared/ (directory)
    ├── types.ts - Shared types across routers
    └── utils/ (directory) - Shared utilities
```

## Migration Plan

### ✅ Phase 1: Analysis and Planning (COMPLETED)

- [x] Analyze current router structure
- [x] Map endpoints to new router organization
- [x] Create detailed migration plan
- [x] Document dependencies and imports

### 🔄 Phase 2: Create New Router Structure (IN PROGRESS)

#### 2.1 Create `chat.ts` router

**Source**: `src/server/api/routers/ai.ts`
**Content**:

- `chat` subscription endpoint
- Chat message management
- AI agent team integration
- Chat-related types and utilities

#### 2.2 Update `document.ts` router

**Source**: `src/server/api/routers/document/document-ops.ts`
**Content**:

- `upload` - Document upload and processing
- `listDocuments` - List user documents
- `updateDocument` - Update document metadata
- `deleteDocument` - Delete documents
- `exportToPDF` - PDF export functionality
- Document parsing utilities

#### 2.3 Create `work-history.ts` router

**Source**: `src/server/api/routers/document/work-history.ts`
**Content**:

- Work history CRUD operations
- Work achievement management
- Work history merging functionality
- Work history skill associations

#### 2.4 Update `skills.ts` router

**Source**: Merge `src/server/api/routers/user-skills.ts` + `src/server/api/routers/skills.ts`
**Content**:

- User skill management (add, update, remove)
- Skill normalization and suggestions
- Skill search and similarity
- Non-work-history skill operations

#### 2.5 Create `job-posting.ts` router

**Source**: `src/server/api/routers/document/job-posting.ts` + `src/server/api/routers/compatibility.ts` + resume/cover letter generation from document-ops
**Content**:

- Job posting CRUD operations
- Job posting processing and analysis
- Compatibility analysis
- Resume generation for job postings
- Cover letter generation for job postings

#### 2.6 Create `key-achievements.ts` router

**Source**: `src/server/api/routers/document/key-achievements.ts`
**Content**:

- Key achievement CRUD operations
- Achievement deduplication and merging

#### 2.7 Create `user-links.ts` router

**Source**: `src/server/api/routers/document/user-links.ts`
**Content**:

- User link CRUD operations
- Link validation and normalization

#### 2.8 Create `education.ts` router

**Source**: `src/server/api/routers/document/education.ts`
**Content**:

- Education CRUD operations
- Education processing utilities

### 📋 Phase 3: Update Root Router and Imports

- [ ] Update `src/server/api/root.ts` with new router structure
- [ ] Update all import statements across the codebase
- [ ] Update frontend API calls to use new router structure

### 🧪 Phase 4: Testing and Validation

- [ ] Test all endpoints work correctly
- [ ] Verify no functionality is broken
- [ ] Update any remaining references

### 📚 Phase 5: Documentation Updates

- [ ] Update cursor-docs with new file references
- [ ] Update API documentation
- [ ] Update development guides

## Detailed Endpoint Mapping

### Current `document` router → New routers

| Current Endpoint                               | New Router         | New Endpoint                      |
| ---------------------------------------------- | ------------------ | --------------------------------- |
| `document.upload`                              | `document`         | `upload`                          |
| `document.listDocuments`                       | `document`         | `list`                            |
| `document.updateDocument`                      | `document`         | `update`                          |
| `document.deleteDocument`                      | `document`         | `delete`                          |
| `document.exportToPDF`                         | `document`         | `exportToPDF`                     |
| `document.generateResumeData`                  | `job-posting`      | `generateResumeData`              |
| `document.generateTailoredResume`              | `job-posting`      | `generateTailoredResume`          |
| `document.generateTailoredCoverLetter`         | `job-posting`      | `generateTailoredCoverLetter`     |
| `document.getJobPostDocument`                  | `job-posting`      | `getJobPostDocument`              |
| `document.updateJobPostDocument`               | `job-posting`      | `updateJobPostDocument`           |
| `document.deleteJobPostDocument`               | `job-posting`      | `deleteJobPostDocument`           |
| `document.listWorkHistory`                     | `work-history`     | `list`                            |
| `document.createWorkHistory`                   | `work-history`     | `create`                          |
| `document.updateWorkHistory`                   | `work-history`     | `update`                          |
| `document.deleteWorkHistory`                   | `work-history`     | `delete`                          |
| `document.mergeWorkHistory`                    | `work-history`     | `merge`                           |
| `document.listWorkAchievements`                | `work-history`     | `listAchievements`                |
| `document.createWorkAchievement`               | `work-history`     | `createAchievement`               |
| `document.updateWorkAchievement`               | `work-history`     | `updateAchievement`               |
| `document.deleteWorkAchievement`               | `work-history`     | `deleteAchievement`               |
| `document.deduplicateAndMergeWorkAchievements` | `work-history`     | `deduplicateAndMergeAchievements` |
| `document.applyApprovedWorkAchievements`       | `work-history`     | `applyApprovedAchievements`       |
| `document.listUserSkillsForWork`               | `work-history`     | `listSkills`                      |
| `document.addUserSkillToWork`                  | `work-history`     | `addSkill`                        |
| `document.removeUserSkillFromWork`             | `work-history`     | `removeSkill`                     |
| `document.listEducation`                       | `education`        | `list`                            |
| `document.createEducation`                     | `education`        | `create`                          |
| `document.updateEducation`                     | `education`        | `update`                          |
| `document.deleteEducation`                     | `education`        | `delete`                          |
| `document.listKeyAchievements`                 | `key-achievements` | `list`                            |
| `document.createKeyAchievement`                | `key-achievements` | `create`                          |
| `document.updateKeyAchievement`                | `key-achievements` | `update`                          |
| `document.deleteKeyAchievement`                | `key-achievements` | `delete`                          |
| `document.deduplicateAndMergeKeyAchievements`  | `key-achievements` | `deduplicateAndMerge`             |
| `document.listJobPostings`                     | `job-posting`      | `list`                            |
| `document.createJobPosting`                    | `job-posting`      | `create`                          |
| `document.updateJobPosting`                    | `job-posting`      | `update`                          |
| `document.deleteJobPosting`                    | `job-posting`      | `delete`                          |
| `document.listUserLinks`                       | `user-links`       | `list`                            |
| `document.createUserLink`                      | `user-links`       | `create`                          |
| `document.updateUserLink`                      | `user-links`       | `update`                          |
| `document.deleteUserLink`                      | `user-links`       | `delete`                          |

### Other router changes

| Current Router  | Current Endpoint         | New Router    | New Endpoint                   |
| --------------- | ------------------------ | ------------- | ------------------------------ |
| `ai`            | `chat`                   | `chat`        | `chat`                         |
| `compatibility` | `analyze`                | `job-posting` | `analyzeCompatibility`         |
| `compatibility` | `analyzeMultiple`        | `job-posting` | `analyzeMultipleCompatibility` |
| `compatibility` | `getCompatibilityScores` | `job-posting` | `getCompatibilityScores`       |
| `compatibility` | `migrateJobPostings`     | `job-posting` | `migrateJobPostings`           |
| `userSkills`    | `list`                   | `skills`      | `listUserSkills`               |
| `userSkills`    | `add`                    | `skills`      | `addUserSkill`                 |
| `userSkills`    | `update`                 | `skills`      | `updateUserSkill`              |
| `userSkills`    | `remove`                 | `skills`      | `removeUserSkill`              |
| `userSkills`    | `searchSkills`           | `skills`      | `search`                       |
| `userSkills`    | `getSimilarSkills`       | `skills`      | `getSimilar`                   |
| `skills`        | `suggestions`            | `skills`      | `suggestions`                  |
| `skills`        | `normalize`              | `skills`      | `normalize`                    |
| `skills`        | `migrateExisting`        | `skills`      | `migrateExisting`              |

## Breaking Changes

### Frontend API Call Updates Required

All frontend code using these APIs will need to be updated:

```typescript
// OLD
api.document.listWorkHistory.useQuery();
api.userSkills.list.useQuery();
api.compatibility.analyze.useQuery();

// NEW
api.workHistory.list.useQuery();
api.skills.listUserSkills.useQuery();
api.jobPosting.analyzeCompatibility.useQuery();
```

### Import Statement Updates

```typescript
// OLD
import { documentRouter } from "~/server/api/routers/document";

// NEW
import { workHistoryRouter } from "~/server/api/routers/work-history";
import { skillsRouter } from "~/server/api/routers/skills";
import { jobPostingRouter } from "~/server/api/routers/job-posting";
```

## Files to Update

### Router Files

- [ ] `src/server/api/routers/chat.ts` (new)
- [ ] `src/server/api/routers/document.ts` (update)
- [ ] `src/server/api/routers/work-history.ts` (new)
- [ ] `src/server/api/routers/skills.ts` (update)
- [ ] `src/server/api/routers/job-posting.ts` (new)
- [ ] `src/server/api/routers/key-achievements.ts` (new)
- [ ] `src/server/api/routers/user-links.ts` (new)
- [ ] `src/server/api/routers/education.ts` (new)
- [ ] `src/server/api/routers/shared/types.ts` (new)
- [ ] `src/server/api/root.ts` (update)

### Frontend Files (API Usage)

- [ ] All files using `api.document.*` calls
- [ ] All files using `api.userSkills.*` calls
- [ ] All files using `api.compatibility.*` calls
- [ ] All files using `api.ai.chat` calls

### Documentation Files

- [ ] `cursor-docs/ai-chat.md` - Update to reflect dashboard integration
- [ ] `cursor-docs/profile-management.md`
