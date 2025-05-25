# Work History Merge Utility

## Overview

The Work History Merge Utility allows users to consolidate multiple work history records into a single record. This feature is particularly useful when users have duplicate or overlapping work experiences that should be combined for a cleaner, more professional resume presentation.

## Features

### Two-Step Merge Process

1. **Record Selection**: Users can select multiple work history records to merge, with the ability to designate one as the primary record
2. **Details Configuration**: Users can configure the final details of the merged record, choosing the best values from the selected records

### Smart Data Consolidation

- **Achievements**: All unique achievements from selected records are combined
- **Skills**: Skills are intelligently merged, avoiding duplicates while preserving all relevant skills
- **Date Ranges**: Users can specify the most appropriate date range for the merged position
- **Company/Title**: Users can choose the most accurate company name and job title

## Implementation

### Backend Components

**Merge Endpoint**: `mergeWorkHistory`

- Located in `src/server/api/routers/document/work-history.ts`
- Handles atomic transaction processing
- Ensures data integrity during merge operations

**Core Function**: `mergeWorkHistoryRecords`

- Validates user permissions
- Consolidates achievements and skills
- Removes duplicate data
- Deletes merged records

### Frontend Components

**WorkHistoryDropdown**: Provides access to merge functionality via dropdown menu
**MergeUtilityModal**: Two-step wizard interface for merge process
**WorkHistoryPanel**: Integrates merge functionality with existing work history management

### Database Operations

The merge process uses atomic transactions to ensure data consistency:

1. Update primary record with merged details
2. Transfer unique achievements to primary record
3. Consolidate skills, avoiding duplicates
4. Delete secondary records

## Skill Management System

### Skill Association Logic

The application uses a sophisticated skill management system that balances user experience with data integrity:

#### Adding Skills to Work History

When a user adds a skill to a work history record:

1. **Skill Normalization**: The skill name is processed through the SkillNormalizationService to:

   - Find or create the canonical skill record
   - Handle variations and aliases (e.g., "React.js" → "React")
   - Apply proper categorization based on industry patterns

2. **Existing Skill Check**: The system checks if the user already has this skill:

   - If **new skill**: Creates a new UserSkill record linked to the work history
   - If **existing skill**: Updates the existing UserSkill record to:
     - Link to the current work history (each skill can only be linked to one work history at a time)
     - Upgrade proficiency level if the new level is higher
     - Merge years of experience (taking the maximum)
     - Append notes with new context

3. **Unique Constraint Handling**: The database enforces `@@unique([userId, skillId])`, meaning each user can only have one UserSkill record per skill. The system handles this by updating existing records rather than creating duplicates.

#### Removing Skills from Work History

When a user removes a skill from a work history record:

1. **Simple Deletion**: The UserSkill record is completely removed from the user's profile

   - This is the most straightforward approach given the current database constraints
   - If the user wants to add the skill to another work history, they can do so later

2. **User Feedback**: Provides clear messaging showing which skill was removed

3. **Re-adding Skills**: If users want to use the same skill in multiple work histories:
   - They can add the skill to each work history where it's relevant
   - The system will update the existing UserSkill record to point to the most recent work history
   - This approach works within the current database constraint of one UserSkill per skill per user

#### Database Design

```prisma
model UserSkill {
  id              String           @id @default(cuid())
  proficiency     ProficiencyLevel
  yearsExperience Float?
  source          SkillSource
  notes           String?

  userId  String
  skillId String
  workHistoryId String? // Optional link to one work history

  @@unique([userId, skillId]) // Each user can only have one record per skill
}
```

#### Benefits of This Approach

1. **No Duplicate Skills**: Users can't accidentally create multiple entries for the same skill
2. **Intelligent Merging**: When skills are added to different work histories, the system intelligently updates proficiency and experience
3. **Context Preservation**: Skills maintain their association with relevant work experiences
4. **Clean Removal**: Skills are only fully removed when they're no longer relevant to any work experience

### Error Handling

The system includes robust error handling for edge cases:

- **Race Conditions**: Handles concurrent skill additions with fallback queries
- **Normalization Failures**: Graceful degradation when skill normalization encounters issues
- **Database Constraints**: Proper handling of unique constraint violations

## Usage

### Accessing the Merge Feature

1. Navigate to the Work History panel
2. Click the dropdown menu (⋮) on any work history record
3. Select "Merge" from the dropdown options

### Merge Process

1. **Step 1 - Select Records**:

   - Choose additional work history records to merge
   - The initial record is pre-selected as the primary record
   - Use checkboxes to select secondary records

2. **Step 2 - Configure Details**:

   - Review and edit company name, job title, and date ranges
   - The form is pre-populated with values from the primary record
   - Make adjustments as needed for the final merged record

3. **Complete Merge**:
   - Click "Complete Merge" to execute the operation
   - The system will consolidate all data and remove duplicate records
   - Success notification confirms the merge completion

## Technical Considerations

### Performance

- Uses database transactions for atomic operations
- Optimized queries to minimize database round trips
- Efficient duplicate detection algorithms

### Data Integrity

- Validates user permissions before merge operations
- Ensures all records belong to the requesting user
- Maintains referential integrity during consolidation

### User Experience

- Clear visual feedback during merge process
- Intuitive two-step wizard interface
- Comprehensive error handling and user messaging

## Future Enhancements

Potential improvements to the merge functionality:

1. **Bulk Merge**: Allow merging of more than two records simultaneously
2. **Smart Suggestions**: AI-powered suggestions for records that should be merged
3. **Undo Functionality**: Ability to reverse merge operations
4. **Advanced Filtering**: Better tools for finding related records to merge
