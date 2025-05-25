# Work Achievement Management

This document details the system for managing work achievements associated with a user's work history entries in CareerCraft Studio. This functionality is primarily handled by the `Data Manager` agent via specialized tools.

## Overview

CareerCraft Studio allows for fine-grained management of work achievements (often bullet points in a resume detailing accomplishments and responsibilities for a specific role). Users can add, retrieve, update, delete, and even merge achievements using AI-powered tools. This ensures that achievements are accurately captured, well-phrased, and effectively deduplicated.

This functionality is an extension of [Profile Management](./profile-management.md), focusing specifically on the achievements linked to each work experience.

## Key Agent

- **`Data Manager` Agent**: As part of its role in managing user profile data, the `Data Manager` agent is equipped with a suite of tools specifically for handling work achievements. These tools are listed in `src/server/langchain/tools/work-achievement-tools.ts`.

## Achievement Management Tools

The following tools are available to the `Data Manager` agent for managing work achievements:

### Core CRUD Operations

1.  **`get_work_achievements`**

    - **Purpose**: Retrieve all achievements associated with a specific work history record (job role).
    - **Input**: `work_history_id` (ID of the parent work experience).
    - **Output**: A list of achievements, each with its ID and description.
    - **Usage Example**: User asks, "Show me the achievements for my Software Engineer role at Tech Corp."

2.  **`add_work_achievement`**

    - **Purpose**: Add a single new achievement to a specified work history record.
    - **Input**: `work_history_id`, `description` (text of the achievement).
    - **Output**: Details of the newly created achievement, including its ID.
    - **Usage Example**: User says, "For my Tech Corp role, add an achievement: Led a team of 5 developers."

3.  **`update_work_achievement`**

    - **Purpose**: Update the description of a specific, existing achievement.
    - **Input**: `achievement_id`, `new_description`.
    - **Output**: Details of the updated achievement.
    - **Usage Example**: User requests, "Change my first achievement for Tech Corp to: Successfully led a team of 5 developers on a critical project."

4.  **`delete_work_achievement`**
    - **Purpose**: Delete a specific achievement.
    - **Input**: `achievement_id`.
    - **Output**: Confirmation of deletion.
    - **Usage Example**: User says, "Remove the second achievement listed for my role at Innovate LLC."

### Batch and AI-Powered Operations

5.  **`replace_work_achievements`**

    - **Purpose**: Replace all existing achievements for a work history record with a new set of achievements.
    - **Input**: `work_history_id`, `new_achievements` (an array of achievement descriptions).
    - **Output**: Details of the new set of achievements, including their IDs.
    - **Feature**: Uses database transactions to ensure atomicity (all old achievements are deleted and all new ones are added, or the operation fails entirely).
    - **Usage Example**: User states, "Replace all my achievements for the Marketing Manager role with these new bullet points: [lists several new achievements]."

6.  **`merge_and_replace_work_achievements`**

    - **Purpose**: AI-powered merging of a list of new achievements with the existing achievements for a work history record. The merged, deduplicated, and optimized list then replaces the old achievements.
    - **Input**: `work_history_id`, `new_achievements_text` (a string containing new achievements, possibly unformatted).
    - **Output**: The new, merged list of achievement descriptions and their IDs.
    - **Process**: Likely involves calling the `merge_work_achievements` tool internally and then performing a replacement.
    - **Feature**: Uses database transactions.
    - **Usage Example**: User: "I have some more accomplishments for my Project Lead role. Can you merge these with what's already there and update it? Here they are: [pastes new accomplishments]."

7.  **`merge_work_achievements`**
    - **Purpose**: A standalone AI-powered tool to merge two sets of achievement descriptions. It aims to combine them, remove duplicates, and potentially rephrase for clarity or impact.
    - **Input**: `existing_achievements` (array of strings), `new_achievements` (array of strings).
    - **Output**: A single array of merged and optimized achievement descriptions.
    - **Note**: This tool itself doesn't directly modify the database; it provides the merged list that can then be used by other tools (like `replace_work_achievements`) or by the `merge_and_replace_work_achievements` tool.
    - **Usage Example**: This is more of an internal utility for the `merge_and_replace_work_achievements` tool but could theoretically be exposed if a user wanted to preview a merge.

### Advanced Deduplication and Optimization

8.  **`deduplicateAndMergeWorkAchievements`** (tRPC Route)

    - **Purpose**: AI-powered deduplication and optimization of all achievements for a specific work history record. This function removes exact duplicates and intelligently merges similar achievements while optimizing all achievements for resume best practices.
    - **Input**: `work_history_id`, `dry_run` (boolean for preview mode).
    - **Output**: Comprehensive result including original count, final count, duplicates removed, groups merged, and preview of final achievements.
    - **Key Features**:
      - **Two-Phase Process**: First removes exact duplicates, then uses AI to merge similar achievements and optimize all achievements
      - **Resume Optimization**: All achievements are enhanced with strong action verbs, quantifiable results, and ATS-friendly language
      - **Comprehensive Output**: Returns ALL final achievements that should appear in the work history, including both merged entries and individually optimized standalone entries
      - **Preview Mode**: Supports dry-run mode to preview changes before applying them
      - **Optimized Architecture**: AI processing occurs outside of database transactions to prevent timeout issues, with only the final database operations wrapped in a transaction for atomicity
      - **Database Transactions**: Uses minimal, focused transactions only for the actual database operations to ensure atomicity while avoiding timeout issues
    - **Usage Example**: User clicks "Clean Up" button in the work history panel to deduplicate and optimize their achievements.

9.  **`applyApprovedWorkAchievements`** (tRPC Route)
    - **Purpose**: Applies the exact approved achievements from the frontend preview, ensuring consistency by using the exact achievements the user approved rather than re-running AI which could produce different results.
    - **Input**: `work_history_id`, `approved_achievements` (array of exact achievement descriptions from the preview).
    - **Output**: Success confirmation with count of applied achievements.
    - **Key Features**:
      - **Consistency Guarantee**: Uses the exact achievement text that was previewed and approved by the user
      - **No AI Re-processing**: Bypasses AI processing entirely to prevent different results on application
      - **Fast Execution**: Only performs database operations (delete existing, create new) without any AI processing
      - **Atomic Transaction**: Ensures all changes are applied or none are, maintaining data integrity
    - **Usage Example**: User previews deduplication results, approves them, and clicks "Apply Changes" to implement the exact previewed achievements.

### Improved Preview-and-Apply Workflow

The system now implements a two-step workflow for achievement deduplication:

1. **Preview Phase**: `deduplicateAndMergeWorkAchievements` with `dryRun: true` generates and returns the proposed changes without modifying the database
2. **Apply Phase**: `applyApprovedWorkAchievements` takes the exact approved achievements from the preview and applies them to the database

This workflow ensures that:

- Users see exactly what changes will be made before they're applied
- The applied changes match exactly what was previewed (no AI variability)
- Users have full control over what gets applied to their profile
- The system is more predictable and trustworthy for users

## Key Features of the System

- **Optimized Transaction Handling**: The system uses a two-phase approach where AI processing occurs outside of database transactions to prevent timeout issues. Only the final database operations (delete and create) are wrapped in minimal, focused transactions to ensure data consistency.
- **Database Transactions**: Batch operations like `replace_work_achievements`, `merge_and_replace_work_achievements`, and `deduplicateAndMergeWorkAchievements` use database transactions strategically. This ensures data consistency: either all changes are applied, or none are, preventing partial updates while avoiding timeout issues from long-running AI operations.
- **User Authentication/Authorization**: All operations implicitly (or explicitly via the agent context) verify that the work history records being modified belong to the authenticated user.
- **AI-Powered Merging and Optimization**: The use of an LLM for achievement processing allows for:
  - Intelligent combination and deduplication of achievement lists
  - Resume optimization with strong action verbs and quantifiable results
  - ATS-friendly language and formatting
  - Preservation of all important details without making up information
- **Comprehensive Achievement Processing**: The deduplication system ensures that ALL achievements are returned in the final output, including both merged entries and individually optimized standalone entries.
- **Detailed Feedback**: The tools are designed to provide clear success messages upon completion and to handle errors gracefully, informing the user if an operation cannot be performed.
- **ID Tracking**: Operations consistently return achievement IDs. This allows for precise follow-up editing or deletion by the user through subsequent commands.
- **Preview Functionality**: The deduplication system supports preview mode, allowing users to see what changes will be made before applying them.

## Database Interactions

The achievement management tools interact with the database primarily through:

- **`WorkHistory` table/model**: To verify ownership of achievements and to link achievements to the correct job role.
- **`WorkAchievement` table/model**: For all CRUD operations (Create, Read, Update, Delete) on the achievements themselves.
- **Atomic Transactions**: As mentioned, for batch operations to ensure data integrity.
- **Optimistic Concurrency Handling (Assumed)**: While not explicitly stated in the README, robust systems often include mechanisms to handle cases where data might be changed between a read and a write operation, though this might be managed at a higher level by the agent or ORM.

## AI Processing Details

The AI-powered achievement processing follows these principles:

1. **Preservation of Facts**: Preserves all quantifiable metrics, percentages, dollar amounts, timeframes, and headcounts from the original text
2. **Smart Merging**: Only merges achievements that describe the same specific accomplishment or are near-duplicates
3. **Skill Diversity**: Keeps achievements that demonstrate different skills or competencies separate
4. **Professional Optimization**: Enhances language with strong action verbs and professional formatting while preserving factual accuracy
5. **ATS Compatibility**: Maintains clear, keyword-rich language for applicant tracking systems
6. **Comprehensive Output**: Returns every achievement that should appear in the final list, ensuring no achievements are lost in the process
7. **Strict Validation**: Validates that every original achievement is accounted for in the final output through comprehensive index tracking

### Validation Features

The system includes robust validation to ensure data integrity:

- **Complete Coverage**: Validates that every original achievement (1 to N) is referenced in at least one final achievement's originalIndices array
- **Required Fields**: Schema enforces that originalIndices and action fields are provided for every final achievement
- **Index Tracking**: Comprehensive logging and error handling for missing or duplicate achievement references
- **Fallback Protection**: If AI processing fails validation, the system falls back to returning original achievements unchanged

### Optimization Examples

The AI applies professional resume optimization while preserving factual accuracy:

- **Action Verb Enhancement**: "Developed interactive storytelling experiences" → "Developed innovative interactive storytelling experiences leveraging generative AI technology"
- **Impact Emphasis**: "Managed the full development lifecycle" → "Successfully managed complete development lifecycle from conception to deployment"
- **Technical Precision**: "Built a robust and scalable NFT marketplace" → "Architected and built robust, scalable NFT marketplace platform"

### Error Handling

The system includes comprehensive error handling:

- **Missing Achievements**: Throws specific errors when achievements are not accounted for
- **Invalid Structure**: Validates AI response structure and required fields
- **Graceful Degradation**: Falls back to original achievements if processing fails
- **Detailed Logging**: Provides comprehensive logging for debugging and monitoring

By providing these comprehensive tools, CareerCraft Studio empowers users to meticulously curate the achievements section of their work history, which is often the most critical part of a resume.
