# Tailored Resume Generator Refactoring Plan

## Overview

This document outlines the comprehensive refactoring plan for the tailored resume generator service to improve code quality, maintainability, and extensibility based on peer review findings.

## Current State

- Single monolithic file: 902 lines (violates 500-line rule)
- Mixed responsibilities in one class
- Hardcoded configuration values
- Limited type safety in some areas
- Difficult to test due to hard dependencies

## Target State

- Modular architecture with focused responsibilities
- Comprehensive type safety with Zod schemas
- Configurable and testable components
- Reusable utilities and clear separation of concerns
- Comprehensive error handling and validation

## Implementation Phases

### Phase 1: Extract Configuration and Types ✅ COMPLETED

**Goal**: Create centralized configuration and improve type safety

#### Tasks:

1. **Create configuration module** ✅ COMPLETED

   - Extract hardcoded values (10-year rule, etc.)
   - Create typed configuration object
   - Add environment-based overrides
   - Status: COMPLETED

2. **Create comprehensive type definitions** ✅ COMPLETED

   - Extract JobPostingData interface to separate file
   - Create WorkExperience types
   - Add Resume and CoverLetter types
   - Create error types
   - Status: COMPLETED

3. **Add Zod schemas for database models** ✅ COMPLETED

   - JobPostingDetails schema
   - WorkHistory schema
   - User profile schema
   - Input validation schemas
   - Status: COMPLETED

4. **Update imports and references** ⚠️ PARTIALLY COMPLETED
   - Update main service to use new types (PARTIALLY DONE - type mapping needed)
   - Update documentation references
   - Status: PARTIALLY COMPLETED - Requires type mapping between database enums and schema types

### Phase 2: Split Work Experience Classification ⏳ IN PROGRESS

**Goal**: Extract work experience logic into focused module

#### Tasks:

1. **Create WorkExperienceClassifier class** ✅ COMPLETED

   - Extract classification logic
   - Add comprehensive tests
   - Status: COMPLETED

2. **Create KeywordExtractor utility** ⏳ PENDING

   - Extract keyword extraction logic
   - Optimize performance with functional approach
   - Status: PENDING

3. **Create RelevanceDetector utility** ⏳ PENDING

   - Extract relevance checking logic
   - Add configurable relevance scoring
   - Status: PENDING

4. **Update main service** ⏳ PENDING
   - Use new classifier
   - Remove old classification code
   - Status: PENDING

### Phase 3: Extract LLM Interaction Logic ⏳ PENDING

**Goal**: Create dedicated LLM service with dependency injection

#### Tasks:

1. **Create LLMProvider interface** ⏳ PENDING

   - Define contract for LLM interactions
   - Add structured output support
   - Status: PENDING

2. **Create ResumePromptBuilder** ⏳ PENDING

   - Extract prompt building logic
   - Add template system
   - Status: PENDING

3. **Create LLMResumeGenerator** ⏳ PENDING

   - Handle LLM interactions
   - Implement retry logic
   - Add fallback mechanisms
   - Status: PENDING

4. **Update main service** ⏳ PENDING
   - Use dependency injection
   - Remove LLM code from main class
   - Status: PENDING

### Phase 4: Create Utility Modules ⏳ PENDING

**Goal**: Extract reusable utilities and formatters

#### Tasks:

1. **Create DateFormatter utility** ⏳ PENDING

   - Extract date formatting logic
   - Add locale support
   - Status: PENDING

2. **Create WorkExperienceFormatter** ⏳ PENDING

   - Extract formatting logic
   - Support multiple output formats
   - Status: PENDING

3. **Create ResumeFormatter** ⏳ PENDING

   - Extract markdown formatting
   - Add template support
   - Status: PENDING

4. **Create ValidationUtils** ⏳ PENDING
   - Common validation functions
   - Input sanitization
   - Status: PENDING

### Phase 5: Error Handling and Validation ⏳ PENDING

**Goal**: Implement comprehensive error handling

#### Tasks:

1. **Create custom error types** ⏳ PENDING

   - ResumeGenerationError
   - LLMProcessingError
   - ValidationError
   - Status: PENDING

2. **Add input validation** ⏳ PENDING

   - Zod schemas for all inputs
   - Comprehensive error messages
   - Status: PENDING

3. **Implement error boundaries** ⏳ PENDING

   - Graceful error handling
   - Proper error propagation
   - Status: PENDING

4. **Add logging and monitoring** ⏳ PENDING
   - Structured logging
   - Performance metrics
   - Status: PENDING

### Phase 6: Testing Infrastructure ⏳ PENDING

**Goal**: Add comprehensive testing support

#### Tasks:

1. **Create test utilities** ⏳ PENDING

   - Mock factories
   - Test data builders
   - Status: PENDING

2. **Add unit tests** ⏳ PENDING

   - Core business logic tests
   - Edge case coverage
   - Status: PENDING

3. **Add integration tests** ⏳ PENDING

   - End-to-end workflow tests
   - Database integration tests
   - Status: PENDING

4. **Add performance tests** ⏳ PENDING
   - LLM response time tests
   - Memory usage tests
   - Status: PENDING

## File Structure (Target)

```
src/server/services/tailored-resume/
├── core/
│   ├── tailored-resume-generator.ts     # Main orchestrator (< 200 lines)
│   ├── work-experience-classifier.ts    # Classification logic
│   ├── job-data-fetcher.ts             # Data fetching
│   └── llm-resume-generator.ts         # LLM interaction
├── utils/
│   ├── keyword-extractor.ts            # Keyword extraction
│   ├── relevance-detector.ts           # Relevance checking
│   ├── date-formatter.ts               # Date utilities
│   ├── work-experience-formatter.ts    # Experience formatting
│   ├── resume-formatter.ts             # Resume formatting
│   └── validation-utils.ts             # Validation helpers
├── types/
│   ├── job-posting.types.ts            # Job posting interfaces
│   ├── work-experience.types.ts        # Work experience types
│   ├── resume.types.ts                 # Resume and cover letter types
│   └── error.types.ts                  # Error definitions
├── config/
│   └── resume-generator.config.ts      # Configuration
├── errors/
│   └── resume-generator.errors.ts      # Custom errors
└── __tests__/
    ├── unit/
    ├── integration/
    └── utils/
```

## Success Criteria

### Phase 1 Success Criteria:

- [ ] Configuration extracted to separate module
- [ ] All hardcoded values removed from main service
- [ ] Comprehensive type definitions created
- [ ] Zod schemas implemented for validation
- [ ] All imports updated and working

### Phase 2 Success Criteria:

- [ ] Work experience classification extracted to separate module
- [ ] Keyword extraction optimized and extracted
- [ ] Relevance detection modularized
- [ ] Main service reduced by ~300 lines
- [ ] All functionality preserved

### Overall Success Criteria:

- [ ] Main service file < 200 lines
- [ ] All modules < 500 lines
- [ ] 100% type safety (no `any` types)
- [ ] Comprehensive error handling
- [ ] Full test coverage for core logic
- [ ] Performance maintained or improved
- [ ] All existing functionality preserved

## Risk Mitigation

1. **Breaking Changes**: Each phase maintains backward compatibility
2. **Performance**: Monitor LLM response times during refactoring
3. **Data Loss**: Comprehensive testing before deployment
4. **Type Safety**: Gradual migration with validation at each step

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 4-5 hours
- **Phase 4**: 2-3 hours
- **Phase 5**: 3-4 hours
- **Phase 6**: 5-6 hours

**Total Estimated Time**: 19-25 hours

## Notes

- Each phase can be completed independently
- Testing should be added incrementally
- Documentation should be updated with each phase
- Performance benchmarks should be established before starting
