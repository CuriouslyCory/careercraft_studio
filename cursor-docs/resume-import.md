# Resume Import & Parsing

This document details the Resume Import and Parsing functionality within Resume Master, primarily handled by the `ResumeParsingService`.

## Overview

The application provides a centralized service for processing resume text, whether from uploaded files or pasted directly into the chat. This service uses AI to extract structured information and stores it in the user's profile.

Reference: `src/server/services/resume-parser.ts`

## Features

- **AI-Powered Parsing**: Leverages Large Language Models (LLMs) to intelligently extract structured information from unstructured resume text. This includes:
  - Work Experience
  - Education History
  - Key Achievements associated with work experiences
  - Personal and Professional Links (e.g., LinkedIn, GitHub, Portfolio)
- **Automated Data Storage**: The parsed information is automatically processed and stored in the relevant database tables, linking it to the user's profile.
- **Flexible Input Methods**:
  - **File Upload**: Users can upload resume files (e.g., PDF, DOCX - specific supported formats should be confirmed from implementation). The `README.md` mentions PDF and text files.
  - **Chat-Based Text Parsing**: Users can paste their resume text directly into the AI chat interface for parsing.
- **Error Handling**: The service is designed with graceful error handling, providing feedback if parsing fails or encounters issues.
- **Database Optimization**: Implements optimized batch operations for creating database records, significantly reducing the number of database calls, especially for resumes with extensive information.

## Key Components

- **`ResumeParsingService`**: This is the main class that orchestrates the entire resume parsing process. It likely encapsulates methods for reading resume content, sending it to an LLM for structuring, and then saving the structured data.
- **`parseResume(resumeText, userId, db, options)`**: A primary method within the service.
  - Takes resume text, user ID, and a database client instance as input.
  - Manages the full parsing workflow, including the creation of a document record (if applicable for file uploads).
  - Supports an `options` object, for instance, to toggle `useBatchedOperations`.
- **`parseResumeFromText()`**: This method is mentioned as a simplified parsing function, likely optimized for direct text input from the chat interface, perhaps bypassing some steps related to file handling.
- **Integration with Data Processing Functions**: The service seamlessly integrates with existing functions or modules responsible for handling work history, education, achievements, and user links, ensuring data consistency and leveraging shared logic.

## Database Operations & Optimization

A significant aspect of the `ResumeParsingService` is its focus on database performance.

- **Batched Operations**:
  - **Key Achievements**: Uses `createMany()` for bulk insertion.
  - **Education**: Batch inserts entries, handling potential duplicates.
  - **User Links**: Efficiently checks for duplicates and batch creates new links.
  - **Work Experience**: Processes work history entries by batching the creation of associated achievements and skills.
  - **Skills**: Intelligently creates skills and maps them to users, minimizing duplicate queries (likely ties into the [Skill Normalization](./skill-normalization.md) service).
- **Performance Benefits**:
  - Substantially reduces the number of database round trips.
  - Employs database transactions to ensure atomicity and data consistency during batch operations.
- **Configurability**:
  - Batched operations are enabled by default.
  - Provides an option (e.g., `useBatchedOperations: false`) to opt-out if necessary.

```typescript
// Example usage (conceptual, based on README.md)
// const resumeParsingService = new ResumeParsingService(dbClient);

// For file uploads or full processing
// const result = await resumeParsingService.parseResume(resumeFileText, userId, db);

// For chat-based input
// const chatParseResult = await resumeParsingService.parseResumeFromText(pastedResumeText, userId, db);

// Opting out of batching
// const nonBatchedResult = await resumeParsingService.parseResume(resumeFileText, userId, db, {
//   useBatchedOperations: false,
// });
```

## Usage Scenarios

1.  **Initial Profile Setup**: A new user uploads their resume. The `ResumeParsingService` processes the file, extracts relevant information, and populates their profile with work experience, education, skills, etc.
2.  **Updating Profile via Chat**: A user pastes a section of their resume (e.g., a new job) into the chat. The AI, likely using the `Data Manager` agent which in turn uses `parseResumeFromText()`, parses this snippet and updates the user's profile.
3.  **Bulk Import (Hypothetical)**: If the system were to support importing multiple resumes for an organization, the batch processing capabilities would be crucial for performance.

## Error Handling and Feedback

- The `README.md` mentions "graceful handling of parsing errors with detailed feedback." This implies that if the LLM cannot parse a section or if data validation fails, the user is informed appropriately rather than the process failing silently.
- Partial success might also be supported, where some parts of the resume are parsed and saved even if others encounter issues.

## Dependencies

- **Database**: For storing parsed resume data.
- **LLM Provider**: An external or internal Large Language Model is used for the AI-powered parsing.
- **[Skill Normalization Service](./skill-normalization.md)**: For processing and normalizing extracted skills.

This service is a critical part of Resume Master, enabling quick and intelligent onboarding of user data, which then powers other features like resume generation and job matching.
