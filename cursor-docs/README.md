# CareerCraft Studio Feature Documentation

Welcome to the feature documentation for CareerCraft Studio. This collection of documents aims to provide a comprehensive understanding of the application's architecture, features, and functionalities.

CareerCraft Studio is designed to assist users in creating tailored resumes and cover letters by leveraging AI for parsing, generation, and analysis.

## 🚀 Features

### Core Functionality

- **Resume Upload & Parsing**: Upload PDF/text resumes with AI-powered content extraction
- **Job Posting Management**: Import and organize job postings for targeted applications
- **AI-Powered Resume Generation**: Create tailored resumes optimized for specific job postings
- **Cover Letter Generation**: Generate personalized cover letters matching job requirements
- **Document Management**: Organize and track all career documents in one place

### ✅ Subscription System & Usage Tracking

- **Freemium Model**: Free tier with monthly usage limits, Pro tier with unlimited access
- **Usage Tracking**: Comprehensive tracking of all user actions with analytics
- **Stripe Integration Ready**: Complete webhook support and payment processing foundation
- **Flexible Tiers**: Easily configurable subscription tiers and limits
- **Grace Period Handling**: Continued access for canceled subscriptions until renewal date

### Technical Features

- **Modern Stack**: Next.js 14, TypeScript, Prisma, tRPC, Tailwind CSS
- **Authentication**: Secure user authentication with NextAuth.js
- **Database**: PostgreSQL with optimized queries and proper indexing
- **AI Integration**: OpenAI GPT models for content generation and analysis
- **Type Safety**: End-to-end type safety with TypeScript and Zod validation

## Core Features

Below is an index of the documented features. Each link will take you to a more detailed explanation of that feature.

- **[Landing Page](./landing-page.md)**: Documents the design decisions, architecture, and user experience strategy for the main marketing page.
- **[Style Guidelines](./style-guidelines.md)**: Establishes the design system and style guidelines for consistent branding and user experience.
- **[AI Chat](./ai-chat.md)**: Describes the architecture and capabilities of the AI-powered chat interface, including its agent team and available tools.
- **[Job Posting Import & Analysis](./job-posting-import.md)**: Explains how job postings are imported, parsed, stored, and analyzed against user profiles.
- **[Job Posting Data Table](./job-posting-data-table.md)**: Documents the sortable, searchable data table interface for managing job postings with advanced filtering and action capabilities.
- **[Profile Management](./profile-management.md)**: Details the CRUD (Create, Read, Update, Delete) operations for user profile information such as work history, skills, and personal links.
- **[Work History Merge](./work-history-merge.md)**: Describes the utility for merging multiple work history records into a single consolidated record, including skills and achievements consolidation.
- **[Resume Import & Parsing](./resume-import.md)**: Outlines the process of importing resumes (via file upload or text pasting) and the AI-driven parsing into structured data.
- **[Resume Generation](./resume-generation.md)**: Describes the functionality for generating resumes based on user profile data, managed by the `Resume Generator` agent.
- **[Cover Letter Generation](./cover-letter-generation.md)**: Details the process of creating tailored cover letters, managed by the `Cover Letter Generator` agent.
- **[Skill Normalization](./skill-normalization.md)**: Covers the system for deduplicating and categorizing skills across various industries while preserving detailed variants for ATS matching. (Existing document, will be reviewed)
- **[Work Achievement Management](./work-achievement-management.md)**: Details the tools and processes for managing, editing, and merging work achievements, including AI-powered enhancements.
- **[Subscription System & Usage Tracking](./subscription-system.md)**: Describes the tiered subscription model with usage limits, tracking, and Stripe integration for monetization.
- **[Tooling Infrastructure](./tooling-infrastructure.md)**: Describes the shared configuration, error handling, and type definition files for LangChain tools.

## Architectural Guidelines

This documentation adheres to the following principles:

- **Modularity**: Each core feature is documented in its own markdown file.
- **Clarity**: Explanations aim to be clear, concise, and sufficient for a developer or AI agent to understand and potentially replicate the functionality.
- **Up-to-date**: These documents should be updated whenever features are added or significantly modified.

## Contribution

To contribute to or update this documentation, please follow the established structure and style. If a new feature is added, create a corresponding `<feature-name>.md` file and link it in this README.
