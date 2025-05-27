# Tailored Resume Generator Service

This service generates tailored resumes based on user profile data and specific job posting requirements using an LLM.

## Overview

The `TailoredResumeGenerator` creates professional, ATS-friendly resumes that are specifically tailored to job postings. It combines comprehensive user data with job requirements to highlight the most relevant experiences and skills.

## Key Features

- **Data-Driven**: Uses existing user profile data (work history, education, skills, achievements)
- **Job-Specific**: Tailors content based on specific job posting requirements
- **ATS-Friendly**: Generates resumes optimized for Applicant Tracking Systems
- **Keyword Integration**: Naturally incorporates relevant keywords from job descriptions
- **Professional Formatting**: Consistent markdown formatting with clear sections
- **Safety**: Never fabricates skills or experiences - only uses provided user data

## Usage

### Direct Function Call

```typescript
import { generateTailoredResume } from "~/server/services/tailored-resume-generator";
import { db } from "~/server/db";

const tailoredResume = await generateTailoredResume(db, userId, jobPostingId);
```

### TRPC Endpoint

```typescript
// Client-side usage
const result = await api.document.generateTailoredResume.mutate({
  jobPostingId: "job123",
  format: "structured", // or "markdown"
});

console.log(result.data); // TailoredResume object or markdown string
```

### Class-Based Usage

```typescript
import { TailoredResumeGenerator } from "~/server/services/tailored-resume-generator";

const generator = new TailoredResumeGenerator(db);
const resume = await generator.generateTailoredResume(userId, jobPostingId);
```

## Data Requirements

### User Profile Data

The service requires comprehensive user data including:

- Personal information (name, email)
- Work history with achievements and skills
- Education background
- Skills with proficiency levels
- User links (LinkedIn, GitHub, etc.)
- Key achievements

### Job Posting Data

The service fetches job posting data including:

- Basic job information (title, company, location)
- Job description content
- Structured requirements (skills, experience, education)
- Bonus/preferred qualifications

## Output Format

### Structured Format (Default)

Returns a `TailoredResume` object with these sections:

```typescript
type TailoredResume = {
  header: string; // Contact information and links
  summary: string; // Professional summary tailored to the job
  workExperience: string; // Chronological work experience with keywords
  skills: string; // Technical and soft skills organized by category
  education?: string; // Education section (if available)
  achievements?: string; // Awards and notable achievements (if available)
};
```

### Markdown Format

Returns a complete markdown document with proper formatting:

```markdown
# John Doe

**Email:** john.doe@example.com | **LinkedIn:** linkedin.com/in/johndoe

## Professional Summary

Experienced Software Engineer with 3+ years...

## Work Experience

### Senior Developer | TechCorp

**January 2022 - Present**

- Led React development team...

## Skills

### Technical Skills

- **Frontend:** React, JavaScript, TypeScript
- **Backend:** Node.js, Python

## Education

### University of Technology

**Bachelor of Science in Computer Science** | May 2020
```

## Work Experience Template

The service uses a consistent template for work experience entries:

```markdown
### [Job Title] | [Company Name]

**[Start Date] - [End Date]**

- [Achievement/responsibility with quantified impact when possible]
- [Achievement/responsibility incorporating relevant keywords]
- [Achievement/responsibility demonstrating skills needed for target job]
```

## LLM Prompt Strategy

The service uses a comprehensive prompt that includes:

1. **System Instructions**: Expert resume writer persona with ATS optimization focus
2. **Critical Rules**: Never fabricate information, only use provided data
3. **Formatting Requirements**: Markdown structure with consistent formatting
4. **Keyword Integration**: Natural incorporation of job description keywords
5. **Section Templates**: Specific formatting for each resume section

## Error Handling

The service includes robust error handling for:

- Missing user ID or job posting ID
- Job posting not found or access denied
- LLM processing errors
- Data validation failures

## Security

- **User Isolation**: Only accesses job postings owned by the requesting user
- **Data Validation**: Validates all inputs using Zod schemas
- **No Data Fabrication**: Strict adherence to provided user data only

## Integration Points

### Database Models Used

- `JobPosting` with related requirements
- `User` profile data via `resume-data-generator`
- `JobPostingDetails` for structured requirements
- `SkillRequirement`, `ExperienceRequirement`, `EducationRequirement`

### Dependencies

- `resume-data-generator`: For comprehensive user data
- `createLLM`: For AI-powered content generation
- Prisma ORM for database access
- Zod for schema validation

## Example Workflow

1. **Data Retrieval**: Fetch user profile and job posting data
2. **Requirement Analysis**: Extract and format job requirements
3. **LLM Generation**: Generate tailored content using structured prompts
4. **Validation**: Ensure output matches expected schema
5. **Formatting**: Return in requested format (structured or markdown)

## Performance Considerations

- Efficient database queries with proper includes
- Single LLM call for complete resume generation
- Structured output for faster processing
- Minimal data transformation overhead

## Future Enhancements

- Multiple resume templates/styles
- Industry-specific optimizations
- A/B testing for different prompt strategies
- Integration with external job boards
- Resume scoring and optimization suggestions
