# Document Editor Panel

## Overview

The Document Editor Panel provides a dedicated interface for editing job-specific resumes and cover letters. It's accessible through the bio sidebar and uses URL parameters to maintain state and allow direct linking to specific documents.

## Features

### URL-Based Navigation

- **Route**: `?bio=documentEditor&jobPostingId={id}&documentType={type}&jobTitle={title}`
- **Parameters**:
  - `jobPostingId`: The ID of the job posting
  - `documentType`: Either "resume" or "coverLetter"
  - `jobTitle`: The job title for display purposes
- **Direct Linking**: URLs can be bookmarked or shared to open specific documents

### Integration Points

#### From Job Postings Table

- **Context Menu**: "View Resume" and "View Cover Letter" options navigate to the editor
- **Success Toasts**: After generation, clickable toasts provide "Open Resume"/"Open Cover Letter" buttons
- **Extended Toast Duration**: 10 seconds to allow user interaction

#### From Sidebar

- **Document Editor**: Available as a dedicated panel in the bio sidebar
- **State Management**: URL parameters preserve the editing context

### Document Loading

- **Automatic Fetch**: Loads job posting data based on URL parameters
- **Error Handling**: Shows appropriate messages for missing or inaccessible documents
- **Loading States**: Visual feedback during data fetching

### Editor Features

- **Full Document Editor**: Uses the existing DocumentEditor component
- **Save Functionality**: Auto-refreshes job posting data after saves
- **Cancel Navigation**: Returns to Job Postings panel
- **All Editor Features**: Markdown editing, PDF export, document deletion, etc.

## Component Structure

### DocumentEditorPanel

**Location**: `src/app/ai-chat/_components/document-editor-panel.tsx`

```typescript
interface DocumentEditorPanelProps {
  // No props - uses URL parameters
}
```

**Key Features**:

- URL parameter parsing and validation
- Job posting data fetching
- Error state handling
- Navigation management

### URL Parameter Handling

```typescript
const searchParams = useSearchParams();
const jobPostingId = searchParams.get("jobPostingId");
const documentType = searchParams.get("documentType") as
  | "resume"
  | "coverLetter";
const jobTitle = searchParams.get("jobTitle");
```

### Navigation Functions

```typescript
// Navigate to document editor
const params = new URLSearchParams(window.location.search);
params.set("bio", "documentEditor");
params.set("jobPostingId", jobPostingId);
params.set("documentType", "resume");
params.set("jobTitle", jobTitle);
window.location.search = params.toString();

// Return to job postings
params.delete("jobPostingId");
params.delete("documentType");
params.delete("jobTitle");
params.set("bio", "jobPostings");
window.location.search = params.toString();
```

## API Dependencies

### New Endpoints

- **`api.document.getJobPosting`**: Fetches single job posting with document data
  - Input: `{ id: string }`
  - Returns: Job posting with details and document content

### Existing Endpoints

- **`api.document.updateJobPostDocument`**: Updates document content
- **`api.document.deleteJobPostDocument`**: Deletes documents
- **`api.document.exportToPDF`**: Exports documents to PDF

## Error Handling

### Missing Parameters

- Shows error message for missing required URL parameters
- Provides "Back to Job Postings" button

### Document Not Found

- Handles cases where job posting doesn't exist
- Handles cases where document content is missing
- Clear error messages with navigation options

### Loading States

- Spinner during job posting fetch
- Graceful handling of network errors

## User Workflows

### From Generation Success Toast

1. User generates resume/cover letter
2. Success toast appears with "Open Resume"/"Open Cover Letter" button
3. User clicks button within 10-second window
4. Navigates to Document Editor Panel with document loaded

### From Context Menu

1. User right-clicks on job posting row
2. Selects "View Resume" or "View Cover Letter"
3. Navigates to Document Editor Panel with document loaded

### Direct Access

1. User clicks "Document Editor" in bio sidebar
2. If no URL parameters, shows parameter requirement message
3. If valid parameters, loads and displays document

### Return Navigation

1. User clicks "Cancel" or "Back to Job Postings"
2. URL parameters are cleaned up
3. Returns to Job Postings panel

## Benefits

### User Experience

- **Dedicated Space**: Full-screen editing without modal constraints
- **Persistent State**: URL-based state allows bookmarking and sharing
- **Clear Navigation**: Obvious entry and exit points
- **Toast Integration**: Seamless flow from generation to editing

### Technical Benefits

- **Separation of Concerns**: Document editing isolated from job posting management
- **URL State Management**: Eliminates complex local state management
- **Direct Linking**: Supports deep linking to specific documents
- **Scalable Architecture**: Easy to extend with additional document types

## Future Enhancements

### Planned Features

- [ ] Document version history
- [ ] Side-by-side job posting view while editing
- [ ] Auto-save functionality
- [ ] Document templates
- [ ] Collaborative editing
- [ ] Document comparison tools

### Technical Improvements

- [ ] Optimistic updates for better UX
- [ ] Keyboard shortcuts for navigation
- [ ] Breadcrumb navigation
- [ ] Document preview mode
- [ ] Mobile-responsive editing interface
