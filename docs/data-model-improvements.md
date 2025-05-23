# Data Model Improvements for Skill Matching

## Overview

This document outlines the enhanced data model designed to improve skill matching and compatibility analysis between users and job postings. The new structure reduces dependency on LLMs for basic matching operations and enables more precise compatibility scoring.

## Key Improvements

### 1. Normalized Skill Taxonomy

**New Models:**

- `Skill` - Canonical skill definitions with categories
- `SkillAlias` - Alternative names for skills (React, ReactJS, React.js)
- `SkillSimilarity` - Relationships between similar skills (AWS ↔ Azure)

**Benefits:**

- Eliminates duplicate skills with different names
- Enables fuzzy matching for similar technologies
- Categorizes skills for better grouping and analysis

### 2. Enhanced User Skill Tracking

**New Model: `UserSkill`**

- Proficiency levels (Beginner, Intermediate, Advanced, Expert)
- Years of experience (fractional support)
- Skill source (Work, Education, Certification, etc.)
- Optional verification status
- Links to work history when applicable

**Benefits:**

- Quantifies skill levels for better matching
- Tracks skill acquisition source
- Supports skills from multiple sources (not just work)

### 3. Structured Job Requirements

**New Models:**

- `JobSkillRequirement` - Normalized skill requirements with priority
- `ExperienceRequirement` - Structured experience requirements
- `EducationRequirement` - Normalized education requirements

**Benefits:**

- Eliminates Json arrays for easier querying
- Supports required vs. bonus requirements
- Enables precise matching criteria

## Skill Matching Logic

### Color-Coded Compatibility

**Green (Perfect Match):**

- User has exact skill with adequate proficiency
- User meets or exceeds experience requirements

**Yellow (Partial Match):**

- User has similar skill (via SkillSimilarity relationship)
- User has skill but lower proficiency than required
- User has experience but fewer years than requested

**Red (No Match):**

- User lacks the skill entirely
- No similar skills found

### Example Matching Scenarios

1. **Exact Match (Green):**

   - Job requires: React (Intermediate, 2+ years)
   - User has: React (Advanced, 3 years)

2. **Similar Skill (Yellow):**

   - Job requires: AWS (Intermediate)
   - User has: Azure (Advanced) + SkillSimilarity(AWS↔Azure, 0.8)

3. **Insufficient Experience (Yellow):**

   - Job requires: Node.js (Expert, 5+ years)
   - User has: Node.js (Advanced, 3 years)

4. **No Match (Red):**
   - Job requires: Docker
   - User has: No containerization skills

## Migration Strategy

### Phase 1: Parallel Implementation

- Keep existing `JobPostingDetails` model for backward compatibility
- Add new normalized models alongside existing structure
- Update job posting parser to populate both old and new structures

### Phase 2: Skill Population

- Create migration scripts to:
  - Populate `Skill` table with common skills
  - Create `SkillAlias` entries for common variations
  - Establish `SkillSimilarity` relationships
  - Convert existing `WorkSkill` entries to `UserSkill`

### Phase 3: Interface Updates

- Update job posting view to show normalized requirements
- Implement compatibility scoring UI
- Add user skill management interface

### Phase 4: Cleanup

- Deprecate old string-based requirement fields
- Remove migration code
- Update documentation

## API Implications

### New Endpoints Needed

```typescript
// Skill management
api.skills.list(); // Get all skills with categories
api.skills.search(query); // Search skills by name/alias
api.skills.getSimilar(skillId); // Get similar skills

// User skill tracking
api.userSkills.list(); // Get user's skills
api.userSkills.add(skillData); // Add user skill
api.userSkills.update(id, data); // Update proficiency/experience

// Compatibility analysis
api.compatibility.analyze(jobPostingId); // Get compatibility report
api.compatibility.generateResume(jobPostingId); // Generate tailored resume
```

### Enhanced Queries

```sql
-- Find users with similar skills to job requirements
SELECT DISTINCT u.* FROM users u
JOIN user_skills us ON u.id = us.user_id
JOIN skills s ON us.skill_id = s.id
JOIN skill_similarities ss ON s.id = ss.skill_id
JOIN job_skill_requirements jsr ON ss.related_skill_id = jsr.skill_id
WHERE jsr.job_posting_id = ?

-- Calculate compatibility score
SELECT
  COUNT(CASE WHEN exact_match THEN 1 END) as exact_matches,
  COUNT(CASE WHEN similar_match THEN 1 END) as similar_matches,
  COUNT(*) as total_requirements
FROM job_skill_requirements jsr
LEFT JOIN (/* subquery for user skill matching */) matches
WHERE jsr.job_posting_id = ?
```

## Benefits of New Structure

1. **Reduced LLM Dependency:** Basic skill matching uses database queries instead of AI
2. **Faster Performance:** SQL-based matching vs. API calls for every comparison
3. **More Accurate Matching:** Quantified proficiency and experience levels
4. **Scalable Similarity:** Skill relationships can be crowd-sourced or ML-trained
5. **Better UX:** Real-time compatibility feedback as users update skills
6. **Resume Optimization:** Can generate resumes highlighting relevant skills
7. **Skill Gap Analysis:** Identify missing skills for career development

## Next Steps

1. Run database migration to add new models
2. Create seed data for common skills and relationships
3. Update job posting parser to use new normalized structure
4. Implement compatibility analysis logic
5. Update UI to show color-coded requirements
6. Add user skill management interface

This enhanced data model provides a solid foundation for sophisticated skill matching while maintaining flexibility for future enhancements.
