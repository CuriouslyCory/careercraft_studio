# Resume Generation

This document describes the Resume Generation feature within CareerCraft Studio, primarily facilitated by the `Resume Generator` agent in the AI Chat system. The agent and its tools are defined in `src/server/langchain/agentTeam.ts`, with tool implementations in `src/server/langchain/tools.ts` and supporting services like `src/server/services/tailored-resume-generator.ts`.

## Overview

CareerCraft Studio can generate complete resume documents based on the user's stored profile information. This feature aims to simplify the resume creation process, allowing users to quickly produce a well-structured resume that can be further refined or tailored, potentially for specific job applications.

Reference: This feature is primarily handled by the `Resume Generator` agent, as outlined in the [AI Chat](./ai-chat.md) documentation.

## Core Functionality & Tools

The `Resume Generator` agent primarily uses the following tools, as defined in `getResumeGeneratorTools(userId)` in `src/server/langchain/tools.ts` and referenced in its `agentTeam.ts` system message:

1.  **`generate_resume_data`** (from `createGenerateResumeDataTool`)

    - **Purpose**: Generates a comprehensive markdown-formatted document containing all relevant user information (work history, education, skills, achievements, details, links). This data is optimized for consumption by an LLM to build a resume.
    - **Arguments**:
      - `sections`: An array specifying which sections to include (e.g., `["work_history", "skills", "all"]`). Defaults to `["all"]`.
    - **Process**: Fetches data from the user's profile (via `db` access, orchestrated by `generateUserResumeData` or `generateUserResumeDataSections` from `resume-data-generator.ts`) and formats it into a structured markdown string.
    - **Significance**: This tool is a crucial preparatory step, ensuring the agent has all necessary, well-structured user data before attempting to generate or tailor a resume.

2.  **`generate_resume`** (reflects `generateResumeTool` from `tools.ts`)

    - **Purpose**: Creates formatted resumes. It uses the comprehensive data (often from `generate_resume_data`) to construct the actual resume document.
    - **Arguments** (from `generateResumeTool` schema in `tools.ts`):
      - `format`: Enum (`"PDF"`, `"Word"`, `"Text"`) - The desired output format of the resume.
      - `style`: Enum (`"Modern"`, `"Traditional"`, `"Creative"`, `"Minimal"`) - The visual style of the resume.
      - `sections`: Array of strings (e.g., `["summary", "workExperience", "skills"]`) - Specific sections to include in this particular resume generation attempt.
    - **Process**: This tool takes the user data (ideally the rich markdown from `generate_resume_data`) and, guided by the format, style, and section arguments, generates the resume. For tailoring to a specific job, the agent would provide the LLM (which this tool invokes) with the job description alongside the user data. The logic within `src/server/services/tailored-resume-generator.ts` (like `generateTailoredResume` and `generateResumeWithLLM`) is a prime example of how this tailoring process is implemented, focusing on keyword incorporation and ATS-friendliness.

3.  **`get_user_profile`**
    - **Purpose**: Retrieves specific parts of user data. While `generate_resume_data` is more comprehensive for resume building, this tool can be used for quick checks or to fetch specific pieces of information if needed by the agent during the generation or refinement process.
    - **Arguments**: `dataType` (enum: "work_history", "education", "skills", "achievements", "preferences", "all"). (Ref: `GetUserProfileSchema` in `agentTeam.ts`)
    - **Process**: Fetches the specified sections of the user's profile from the database.

## Resume Generation Process

A typical resume generation interaction, especially for a tailored resume, might involve:

1.  **User Request**: "Generate a resume for me for the Software Engineer job at Tech Solutions (Job ID: 67890)."
2.  **AI Chat**: The `Supervisor Agent` routes to the `Resume Generator` agent.
3.  **`Resume Generator` Agent Strategy**:
    - The agent first calls `generate_resume_data` (likely with `sections: ["all"]`) to get a full markdown representation of the user's profile.
    - It would also need the details for Job ID: 67890. This might involve the user providing it, or coordination with the `Job Posting Manager` agent.
    - It might then prompt the user: "Okay, I have your profile data and the job details. What format (PDF, Word, Text) and style (Modern, Traditional) would you like?"
4.  **Tool Invocation**: Based on the collected data and user preferences, the agent invokes the `generate_resume` tool, providing the user data, job details (as context to the underlying LLM), and the chosen format/style.
5.  **Output**: The `generate_resume` tool produces the resume content, potentially leveraging services like `TailoredResumeGenerator` internally for the AI-driven content creation and formatting.
6.  **Presentation**: The agent presents the generated resume to the user (e.g., as text/Markdown in chat, or a link for PDF/Word download), possibly offering options for refinement.

## Customization and Advice

Beyond initial generation, the `Resume Generator` agent (as described in its system message in `agentTeam.ts` and supported by the underlying tool capabilities) is also responsible for:

- **Formatting resumes**: Handled by the `generate_resume` tool's `format` and `style` arguments.
- **Providing resume writing advice**: The agent can use its LLM capabilities to offer suggestions, using the user's data (from `generate_resume_data` or `get_user_profile`) and potentially job descriptions as context.
- **Editing existing resumes**: This would involve the agent recalling the user's data (or a previous resume's content), understanding the requested changes, and then re-invoking `generate_resume` with modified parameters or by providing specific instructions to its LLM for content modification.

This feature relies heavily on well-structured and comprehensive data in the user's [Profile Management](./profile-management.md) sections, made accessible and LLM-ready via the `generate_resume_data` tool.

## Key Agent & Tools

- **`Resume Generator` Agent**:

  - A specialized agent within the LangChain `agentTeam.ts`.
  - Responsible for all tasks related to creating and modifying resume documents.
  - Receives tasks from the Supervisor Agent based on user requests like "Generate my resume" or "Help me improve my resume for this job."

- **Potential Tools for `Resume Generator` Agent** (as conceptualized in `ai-chat.md`):
  - `generate_resume_from_profile (template_choice?)`:
    - **Purpose**: The core tool to assemble the resume from the user's profile data.
    - **Input**: Optionally, a template choice if multiple resume styles are supported.
    - **Output**: The generated resume document (e.g., as a string in a specific format, or a link to a generated file).
  - `suggest_resume_improvements (resume_section?, job_description?)`:
    - **Purpose**: Provides AI-driven suggestions to enhance the resume, either generally or for a specific section or job.
    - **Input**: Optionally, the resume section to focus on (e.g., "summary", "work_experience_id"), and/or a job description for targeted advice.
    - **Output**: A list of suggestions.
  - `customize_resume_section (section_name_or_id, content_to_add_or_modify, instructions?)`:
    - **Purpose**: Allows users to make specific changes to a resume section (e.g., rephrase summary, add a bullet point to a job).
    - **Input**: Identifier for the section, the new content, and any specific instructions for how to incorporate it.
    - **Output**: Confirmation or the updated section view.
  - `change_resume_template (template_name)`:
    - **Purpose**: If multiple templates are supported, this tool would allow the user to switch the visual style/layout of their resume.
    - **Input**: The name or ID of the desired template.
    - **Output**: Confirmation, and potentially a re-generated resume in the new template.
  - `tailor_resume_for_job (job_posting_id)`:
    - **Purpose**: Specifically adapts the current resume draft to better match the requirements of a stored job posting.
    - **Input**: The ID of the job posting (retrieved via `Job Posting Manager` agent).
    - **Output**: Suggestions for changes, or a new version of the resume tailored for that job.

## Workflow Example: Generating a Resume

1.  **User Profile Populated**: The user has already populated their profile either manually via chat or by importing a previous resume (see [Resume Import & Parsing](./resume-import.md)).
2.  **User Request**: User types, "Generate my resume."
3.  **Routing**: The Supervisor Agent directs the request to the `Resume Generator` Agent.
4.  **Generation**: The `Resume Generator` Agent uses its `generate_resume_from_profile` tool.
    - The tool fetches all relevant data from the user's profile (work history, education, skills, etc.) from the database.
    - It assembles this data into a structured resume format, potentially applying a default template.
5.  **Output**: The agent presents the generated resume to the user. This could be displayed directly in the chat (for text-based formats like Markdown) or provided as a downloadable file.
6.  **Refinement (Optional)**: The user might follow up with: "Can you make my summary more impactful?" or "Rephrase the first bullet point under my Tech Corp job."
    - The `Resume Generator` Agent would use tools like `suggest_resume_improvements` or `customize_resume_section` to handle these requests.

## Considerations

- **Templating**: The quality and flexibility of resume generation heavily depend on the underlying templating system. Robust templating would allow for various styles and easy customization.
- **Output Formats**: Supporting multiple common output formats (PDF, DOCX) is crucial for practical use.
- **Iterative Process**: Resume writing is often iterative. The tools should support this by allowing users to easily make changes, see previews, and revert if necessary.

By automating the initial draft and providing AI-assisted refinement, the Resume Generation feature significantly speeds up the process of creating a professional and effective resume.
