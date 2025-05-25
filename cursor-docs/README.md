# Resume Master Feature Documentation

Welcome to the feature documentation for Resume Master. This collection of documents aims to provide a comprehensive understanding of the application's architecture, features, and functionalities.

Resume Master is designed to assist users in creating tailored resumes and cover letters by leveraging AI for parsing, generation, and analysis.

## Core Features

Below is an index of the documented features. Each link will take you to a more detailed explanation of that feature.

- **[Landing Page](./landing-page.md)**: Documents the design decisions, architecture, and user experience strategy for the main marketing page.
- **[Style Guidelines](./style-guidelines.md)**: Establishes the design system and style guidelines for consistent branding and user experience.
- **[AI Chat](./ai-chat.md)**: Describes the architecture and capabilities of the AI-powered chat interface, including its agent team and available tools.
- **[Job Posting Import & Analysis](./job-posting-import.md)**: Explains how job postings are imported, parsed, stored, and analyzed against user profiles.
- **[Profile Management](./profile-management.md)**: Details the CRUD (Create, Read, Update, Delete) operations for user profile information such as work history, skills, and personal links.
- **[Resume Import & Parsing](./resume-import.md)**: Outlines the process of importing resumes (via file upload or text pasting) and the AI-driven parsing into structured data.
- **[Resume Generation](./resume-generation.md)**: Describes the functionality for generating resumes based on user profile data, managed by the `Resume Generator` agent.
- **[Cover Letter Generation](./cover-letter-generation.md)**: Details the process of creating tailored cover letters, managed by the `Cover Letter Generator` agent.
- **[Skill Normalization](./skill-normalization.md)**: Covers the system for deduplicating and categorizing skills across various industries while preserving detailed variants for ATS matching. (Existing document, will be reviewed)
- **[Work Achievement Management](./work-achievement-management.md)**: Details the tools and processes for managing, editing, and merging work achievements, including AI-powered enhancements.
- **[Tooling Infrastructure](./tooling-infrastructure.md)**: Describes the shared configuration, error handling, and type definition files for LangChain tools.

## Architectural Guidelines

This documentation adheres to the following principles:

- **Modularity**: Each core feature is documented in its own markdown file.
- **Clarity**: Explanations aim to be clear, concise, and sufficient for a developer or AI agent to understand and potentially replicate the functionality.
- **Up-to-date**: These documents should be updated whenever features are added or significantly modified.

## Contribution

To contribute to or update this documentation, please follow the established structure and style. If a new feature is added, create a corresponding `<feature-name>.md` file and link it in this README.
