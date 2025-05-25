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

## Key Features of the System

- **Database Transactions**: Batch operations like `replace_work_achievements` and `merge_and_replace_work_achievements` use database transactions. This ensures data consistency: either all changes are applied, or none are, preventing partial updates.
- **User Authentication/Authorization**: All operations implicitly (or explicitly via the agent context) verify that the work history records being modified belong to the authenticated user.
- **AI-Powered Merging**: The use of an LLM for `merge_work_achievements` allows for intelligent combination and deduplication of achievement lists, going beyond simple string matching. This helps users maintain a clean and effective list of accomplishments.
- **Detailed Feedback**: The tools are designed to provide clear success messages upon completion and to handle errors gracefully, informing the user if an operation cannot be performed.
- **ID Tracking**: Operations consistently return achievement IDs. This allows for precise follow-up editing or deletion by the user through subsequent commands.

## Database Interactions

The achievement management tools interact with the database primarily through:

- **`WorkHistory` table/model**: To verify ownership of achievements and to link achievements to the correct job role.
- **`WorkAchievement` table/model**: For all CRUD operations (Create, Read, Update, Delete) on the achievements themselves.
- **Atomic Transactions**: As mentioned, for batch operations to ensure data integrity.
- **Optimistic Concurrency Handling (Assumed)**: While not explicitly stated in the README, robust systems often include mechanisms to handle cases where data might be changed between a read and a write operation, though this might be managed at a higher level by the agent or ORM.

By providing these comprehensive tools, CareerCraft Studio empowers users to meticulously curate the achievements section of their work history, which is often the most critical part of a resume.
