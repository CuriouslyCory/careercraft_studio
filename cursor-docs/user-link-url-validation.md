# User Link URL Validation Enhancement

## Overview

Enhanced URL validation for UserLinks to automatically add HTTP(S) protocols when missing, preventing insertion errors and improving user experience.

## Problem Solved

Previously, UserLinks would fail to insert into the database if URLs were provided without the protocol (e.g., `github.com/user` instead of `https://github.com/user`). This was particularly problematic when:

1. Users manually entered URLs without protocols in the frontend
2. Resume parsing extracted URLs without protocols from documents
3. AI chat tools tried to create links with protocol-less URLs

## Implementation

### Core Function: `parseAndValidateUrl`

**Location**: `src/server/api/routers/document/user-links.ts`

```typescript
/**
 * Parses and validates a URL, adding http(s) protocol if missing
 * @param url - The URL string to parse and validate
 * @returns A fully formed URL string with protocol
 * @throws Error if the URL cannot be made valid
 */
function parseAndValidateUrl(url: string): string;
```

**Logic Flow**:

1. Trim whitespace from input URL
2. Try to parse URL as-is first (handles URLs that already have protocols)
3. If parsing fails, try adding `https://` prefix
4. If HTTPS fails, try adding `http://` prefix
5. Validate that hostname contains at least one dot (basic domain validation)
6. Throw descriptive error if URL cannot be made valid

**Examples**:

- `github.com/user/repo` → `https://github.com/user/repo`
- `linkedin.com/in/user` → `https://linkedin.com/in/user`
- `https://google.com` → `https://google.com/` (unchanged)
- `portfolio.me` → `https://portfolio.me/`
- `invalid-without-domain` → Error: "Invalid URL format..."

### Integration Points

The URL validation is integrated at all UserLink insertion points:

#### 1. Manual TRPC Creation (`userLinksRouter.create`)

- **File**: `src/server/api/routers/document/user-links.ts`
- **Change**: Replaced Zod `.url()` validation with custom `parseAndValidateUrl()`
- **Behavior**: URLs without protocols are automatically fixed before database insertion

#### 2. Manual TRPC Updates (`userLinksRouter.update`)

- **File**: `src/server/api/routers/document/user-links.ts`
- **Change**: Added URL validation when URL field is being updated
- **Behavior**: Updated URLs are validated and fixed if needed

#### 3. Resume Parsing Batch Creation

- **File**: `src/server/services/resume-parser.ts`
- **Change**: Added URL validation in the batch processing loop
- **Behavior**: Invalid URLs are logged and skipped rather than causing batch failures

#### 4. Individual Resume Processing (`processUserLinks`)

- **File**: `src/server/api/routers/document/user-links.ts`
- **Change**: Added URL validation in the processing loop
- **Behavior**: URLs are validated before comparison and insertion

## Error Handling

### Graceful Degradation

- **Frontend**: Invalid URLs show user-friendly error messages
- **Resume Parsing**: Invalid URLs are logged and skipped, processing continues
- **Batch Operations**: Individual URL failures don't break entire batches

### Error Messages

- `"URL cannot be empty"` - For empty/whitespace-only inputs
- `"Invalid domain format"` - For URLs without proper domain structure
- `"Invalid URL format - could not create a valid URL with or without protocol"` - For completely malformed URLs

## Benefits

1. **Improved UX**: Users can enter URLs without protocols (more natural)
2. **Robust Resume Parsing**: URLs extracted from documents work regardless of format
3. **Better AI Integration**: AI tools can create links without worrying about protocol formatting
4. **Backward Compatibility**: Existing URLs with protocols continue to work unchanged
5. **Data Consistency**: All stored URLs have proper protocol formatting

## Testing

Tested with various URL formats:

- ✅ `github.com/user/repo` → `https://github.com/user/repo`
- ✅ `linkedin.com/in/user` → `https://linkedin.com/in/user`
- ✅ `https://google.com` → `https://google.com/` (unchanged)
- ✅ `www.google.com` → `https://www.google.com/`
- ✅ `portfolio.me` → `https://portfolio.me/`
- ❌ `invalid-url-without-domain` → Error (correctly rejected)
- ❌ Empty string → Error (correctly rejected)

## Future Enhancements

- Could add URL reachability checking for enhanced validation
- Could implement URL normalization for better duplicate detection
- Could add specific handling for known domains (auto-detect GitHub, LinkedIn, etc.)
- Could add URL preview/metadata fetching for rich link display

## Files Modified

1. `src/server/api/routers/document/user-links.ts` - Core validation function and TRPC integration
2. `src/server/services/resume-parser.ts` - Resume parsing integration

## Related Features

- [User Profile Management](./user-profile-management.md) - Links are part of user profiles
- [Resume Parser Optimization](./resume-parser-optimization.md) - Resume parsing uses URL validation
- [AI Chat](./ai-chat.md) - AI tools can create user links
