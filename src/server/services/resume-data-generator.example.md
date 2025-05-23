# Resume Data Generator Service

This service generates comprehensive markdown-formatted user data for resume building LLM consumption.

## Usage

### Direct Function Calls

```typescript
import {
  generateUserResumeData,
  generateUserResumeDataSections,
} from "~/server/services/resume-data-generator";
import { db } from "~/server/db";

// Generate complete user data
const completeData = await generateUserResumeData(db, userId);

// Generate specific sections only
const partialData = await generateUserResumeDataSections(db, userId, [
  "work_history",
  "skills",
]);
```

### TRPC Endpoint

```typescript
// From client code
const result = await api.document.generateResumeData.mutate({
  sections: ["work_history", "education", "skills"], // or ["all"] for everything
});

console.log(result.data); // Markdown formatted string
console.log(result.sectionsGenerated); // Array of sections that were generated
```

### Agent Tool Usage

The service is also available as an agent tool:

```typescript
import { createGenerateResumeDataTool } from "~/server/langchain/tools";

const tool = createGenerateResumeDataTool(userId);
const result = await tool.func({ sections: ["all"] });
```

## Output Format

The service generates a comprehensive markdown document with the following structure:

```markdown
# User Resume Data

This document contains comprehensive user information for resume generation.

## Personal Information

**Name:** John Doe
**Email:** john.doe@example.com

## Work History

### Software Engineer at TechCorp

**Duration:** 1/15/2022 - Present
**Years of Experience:** 2.1 years

**Skills Used:**

- JavaScript - Advanced (3 years)
- React - Intermediate (2 years)
- Node.js - Advanced (4 years)

**Key Achievements:**

- Improved application performance by 40% through code optimization
- Led a team of 3 developers on a major product feature

### Junior Developer at StartupXYZ

**Duration:** 6/1/2020 - 12/31/2021
**Years of Experience:** 1.6 years

**Skills Used:**

- Python - Intermediate (2 years)
- Django - Beginner (1 year)

**Key Achievements:**

- Built the initial MVP for the core product
- Reduced bug reports by 50% through improved testing

## Education

### University of Technology

**Degree/Certification:** B.S. Computer Science
**Type:** Bachelor's Degree
**Completed:** 5/15/2020
**Description:** Focused on software engineering and algorithms

## Skills Overview

### Programming Languages

- **JavaScript:** Advanced (3 years) - Source: Work Experience - Context: Software Engineer at TechCorp
- **Python:** Intermediate (2 years) - Source: Work Experience - Context: Junior Developer at StartupXYZ
- **TypeScript:** Advanced (2 years) - Source: Work Experience

### Frameworks & Libraries

- **React:** Intermediate (2 years) - Source: Work Experience - Context: Software Engineer at TechCorp
- **Django:** Beginner (1 year) - Source: Work Experience - Context: Junior Developer at StartupXYZ

### Soft Skills

- **Team Leadership:** Advanced (1 years) - Source: Work Experience
- **Problem Solving:** Expert (5 years) - Source: Work Experience

## Key Achievements

_Notable achievements outside of specific work experiences:_

- Completed AWS Cloud Practitioner Certification
- Contributed to 5 open source projects
- Won first place in university hackathon

## Additional Information

### Career Goals

- Become a senior software engineer within 2 years
- Lead a development team
- Specialize in cloud architecture

### Strengths

- Strong problem-solving abilities
- Excellent communication skills
- Quick learner

### Work Preferences

- Remote work preferred
- Flexible hours
- Collaborative team environment

## Summary Statistics

**Total Work Experience:** 3.7 years
**Number of Positions:** 2
**Education Entries:** 1
**Total Skills:** 6
**Key Achievements:** 3
**Expert Skills:** 1
**Advanced Skills:** 3
**Intermediate Skills:** 2
**Beginner Skills:** 1
```

## Available Sections

- `work_history`: Work experience with achievements and skills
- `education`: Educational background and certifications
- `skills`: Comprehensive skills overview grouped by category
- `achievements`: Standalone key achievements
- `details`: User preferences, motivations, and additional information
- `all`: Complete user data (default)

## Integration with Resume Builder LLMs

This markdown format is optimized for LLM consumption when building resumes. The structured data includes:

- **Context-rich information**: Skills are linked to specific work experiences
- **Quantified experience**: Years of experience calculated automatically
- **Organized structure**: Clear sections and hierarchies
- **Complete coverage**: All relevant user data in one document
- **Flexible sectioning**: Ability to request specific sections only

The generated markdown can be directly used as context in prompts for resume generation LLMs.
