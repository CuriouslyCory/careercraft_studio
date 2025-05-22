# Document Router - Modular Architecture

This directory contains a refactored, modular version of the document router that was previously a single 951-line file. The modular structure improves maintainability, testability, and developer experience.

## File Structure

```
src/server/api/routers/document/
├── index.ts                  # Main router exports
├── types.ts                  # Shared types and error classes
├── document-ops.ts           # Document CRUD operations & upload
├── work-history.ts          # Work history operations
├── education.ts             # Education operations
├── job-posting.ts           # Job posting operations
├── key-achievements.ts      # Key achievements operations
└── utils/
    ├── pdf-parser.ts        # PDF parsing utilities
    ├── llm-merger.ts        # LLM-based achievement merging
    └── type-detection.ts    # Document type detection
```

## Key Benefits

### ✅ Single Responsibility Principle

- Each module handles one specific domain (work history, education, etc.)
- Utilities are separated into focused helper functions
- Clear separation of concerns

### ✅ Improved Type Safety

- Structured error classes with proper context
- Type guards for validation
- Eliminated unsafe type assertions

### ✅ Better Error Handling

- `DocumentProcessingError` - for general document processing issues
- `TypeValidationError` - for type validation failures
- `LLMProcessingError` - for LLM-specific failures
- Contextual error information for debugging

### ✅ Enhanced Maintainability

- Smaller, focused files (50-200 lines vs 951 lines)
- Easier to test individual components
- Clearer import/export structure
- Better code navigation

## Usage

The modular router maintains backward compatibility. All existing endpoints work exactly as before:

```typescript
// All these endpoints remain unchanged
api.document.upload.mutate(...)
api.document.listWorkHistory.query()
api.document.createEducation.mutate(...)
// etc.
```

## Exported Utilities

The new structure also exports utilities for use in other parts of the application:

```typescript
import {
  DocumentProcessingError,
  processWorkExperience,
  extractContentFromPDF,
  mergeWorkAchievements,
} from "~/server/api/routers/document";
```

## Error Handling

The new error classes provide structured error information:

```typescript
try {
  await processDocument(content);
} catch (error) {
  if (error instanceof DocumentProcessingError) {
    console.log("Error stage:", error.stage);
    console.log("Document type:", error.documentType);
    console.log("Context:", error.context);
  }
}
```

## Testing

Each module can now be tested independently:

```typescript
// Example test structure
describe("work-history", () => {
  test("doWorkHistoryRecordsMatch", () => {
    // Test the matching logic
  });

  test("processWorkExperience", () => {
    // Test work experience processing
  });
});
```

## Migration Notes

- No breaking changes to existing API endpoints
- All function signatures remain the same
- Error handling is enhanced but backward compatible
- Import paths for the main router remain unchanged

## Future Improvements

This modular structure enables:

- Individual module testing
- Easier addition of new document types
- Better performance monitoring per operation type
- Potential for background processing of specific operations
- Clear separation for implementing caching strategies
