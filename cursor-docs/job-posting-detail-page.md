# Job Posting Detail Page

## Overview

The Job Posting Detail Page provides a comprehensive view of individual job postings within the Dashboard interface. This feature allows users to view, edit, and manage all aspects of a job posting including compatibility analysis, resume generation, and cover letter creation.

## Features

### 1. Job Posting Details (Editable)

- **Location**: `/dashboard/job-postings/[id]`
- **Component**: `JobPostingDetails`
- **File**: `src/app/dashboard/_components/job-posting-detail/job-posting-details.tsx`

**Functionality**:

- View and edit job posting information (title, company, location, industry, URL, status, notes)
- Inline editing with save/cancel functionality
- Expandable original job posting content view
- Responsive grid layout for form fields
- Status dropdown with predefined options (Saved, Applied, Interview, Rejected, Offer)
- URL validation and external link functionality

### 2. Compatibility Analysis

- **Component**: `CompatibilitySummary`
- **File**: `src/app/dashboard/_components/job-posting-detail/compatibility-summary.tsx`

**Functionality**:

- **Summary View** (Default): Shows overall compatibility percentage, perfect matches, partial matches, and missing skills
- **Expandable Detail View**: Full compatibility report with detailed skill analysis
- **API Integration**: Uses `api.compatibility.analyze.useQuery()` endpoint
- **Visual Indicators**: Color-coded progress bars and status badges
- **Quick Stats**: Displays strengths and improvement areas

### 3. Resume Management

- **Component**: `ResumeSection`
- **File**: `src/app/dashboard/_components/job-posting-detail/resume-section.tsx`

**Functionality**:

- **JobPostDocument Integration**: Uses `api.document.getJobPostDocument.useQuery()` to fetch job-specific resume content stored in `JobPostDocument.resumeContent`
- **Generate Tailored Resume**: Creates job-specific resumes using `api.document.generateTailoredResume.useMutation()`
- **Resume Preview**: Shows tailored resume content with generation timestamp
- **Dashboard Navigation**: Links to `/dashboard/job-postings/[id]/resume/preview` and `/dashboard/job-postings/[id]/resume/edit`
- **Regeneration Option**: Allows updating existing resumes with latest profile data
- **Loading States**: Visual feedback during generation and data fetching
- **Empty State**: Prompts for resume generation when none exists

### 4. Cover Letter Management

- **Component**: `CoverLetterSection`
- **File**: `src/app/dashboard/_components/job-posting-detail/cover-letter-section.tsx`

**Functionality**:

- **JobPostDocument Integration**: Uses `api.document.getJobPostDocument.useQuery()` to fetch job-specific cover letter content stored in `JobPostDocument.coverLetterContent`
- **Generate Cover Letter**: Creates tailored cover letters using `api.document.generateTailoredCoverLetter.useMutation()`
- **Cover Letter Preview**: Shows existing cover letter with generation timestamp and content preview
- **Dashboard Navigation**: Links to `/dashboard/job-postings/[id]/cover-letter/preview` and `/dashboard/job-postings/[id]/cover-letter/edit`
- **Regeneration Option**: Allows creating fresh versions of cover letters
- **Loading States**: Visual feedback during generation
- **Empty State**: Prompts for cover letter generation when none exists

### 5. Navigation & Layout

- **Header Component**: `JobPostingHeader`
- **File**: `src/app/dashboard/_components/job-posting-detail/job-posting-header.tsx`

**Functionality**:

- Breadcrumb navigation back to job postings list
- Job posting title, company, location, and industry display
- Status badges with appropriate color coding
- "View Original" link for external job posting URLs
- Creation date metadata

## Implementation Details

### Route Structure

```
/dashboard/job-postings/[id]/
├── page.tsx - Main detail page
├── loading.tsx - Loading skeleton
└── not-found.tsx - 404 error page
```

### API Dependencies

- `api.jobPosting.get.useQuery()` - Fetch job posting data with details and document relationships
- `api.jobPosting.update.useMutation()` - Update job posting fields
- `api.compatibility.analyze.useQuery()` - Get compatibility analysis
- `api.document.generateTailoredResume.useMutation()` - Generate job-specific resumes
- `api.document.generateTailoredCoverLetter.useMutation()` - Generate job-specific cover letters
- `api.document.getJobPostDocument.useQuery()` - Get JobPostDocument with resume and cover letter content

### Key Features

#### 1. Responsive Layout

- **Desktop**: Two-column grid layout (job details + resume on left, compatibility + cover letter on right)
- **Mobile**: Single column stacked layout
- **Loading States**: Skeleton screens for all components
- **Error Handling**: Graceful error display with user-friendly messages

#### 2. Real-time Updates

- **Optimistic Updates**: Immediate UI updates for edit operations
- **Query Invalidation**: Automatic data refresh after mutations
- **Loading States**: Visual feedback during async operations

#### 3. Navigation Integration

- **Breadcrumbs**: Clear path back to job postings list
- **Deep Linking**: Direct URLs to specific job postings
- **Back Button**: Quick return to job postings list

#### 4. Document Integration

- **Preview Links**: External links for document previews
- **Editor Integration**: Seamless transition to document editors
- **Generation Status**: Real-time feedback during document generation

## User Experience Flow

### Accessing Job Posting Details

1. User navigates to `/dashboard/job-postings`
2. Clicks on a job posting from the list
3. Redirected to `/dashboard/job-postings/[id]`
4. Page loads with comprehensive job posting information

### Editing Job Posting Information

1. Click "Edit" button in Job Details section
2. Form fields become editable
3. Make changes and click "Save" or "Cancel"
4. Changes are saved via API with visual feedback

### Generating Documents

1. Click "Generate Tailored Resume" or "Generate Cover Letter"
2. Loading state shows generation progress
3. Upon completion, document preview appears
4. Click "Edit" to open in document editor

### Viewing Compatibility

1. Compatibility summary loads automatically
2. Click "View Details" to see full compatibility report
3. Detailed analysis shows skill matches, gaps, and recommendations
4. Click "Show Summary" to return to overview

## Technical Considerations

### Performance

- **Lazy Loading**: Components load data independently
- **Parallel Queries**: Multiple API calls execute simultaneously
- **Caching**: TRPC handles query caching automatically
- **Optimistic Updates**: Immediate UI feedback for better UX

### Error Handling

- **404 Handling**: Proper not-found page for invalid job posting IDs
- **API Error Display**: User-friendly error messages
- **Retry Logic**: Automatic retry for failed requests
- **Validation**: Client-side form validation with error display

### Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: Meets WCAG guidelines for all text and UI elements
- **Focus Management**: Logical tab order and focus indicators

## Related Documentation

- [Job Posting Import](./job-posting-import.md)
- [Compatibility Analysis](./compatibility-analysis.md)
- [Resume Generation](./resume-generation.md)
- [Cover Letter Generation](./cover-letter-generation.md)
- [Document Editor Panel](./document-editor-panel.md)
