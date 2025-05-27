# Job Posting Data Table

## Overview

The job posting data table provides a modern, sortable, and searchable interface for managing job postings. It replaces the previous basic HTML table with a feature-rich data table built using TanStack Table and shadcn/ui components.

## Features

### Core Functionality

- **Sortable Columns**: Click column headers to sort by title, company, location, status, or date added
- **Global Search**: Search across all job posting fields using the search input
- **Column Filtering**: Filter by status (Saved, Applied, Interview, Rejected, Offer) and company
- **Pagination**: Navigate through large datasets with configurable page sizes (5, 10, 20, 30, 50)
- **Responsive Design**: Optimized for both desktop and mobile viewing
- **Loading Animation**: Visual progress indicator during resume generation operations

### Data Display

- **Status Badges**: Color-coded status indicators for quick visual identification
- **Industry Tags**: Display industry information as secondary text under job titles
- **Date Formatting**: Localized date display for creation timestamps

### Context Menu Actions

- **Right-click Anywhere**: Click anywhere on a table row to open the context menu
- **Comprehensive Actions**: Context menu includes:
  - Edit Job Posting
  - View Content
  - Open Job URL (if available)
  - Compatibility Report generation
  - Resume generation/viewing
  - Cover letter generation/viewing
  - Job posting deletion
- **Loading States**: Visual feedback during async operations within the context menu

## Components

### JobPostingsDataTable

**Location**: `src/app/ai-chat/_components/job-postings-data-table.tsx`

Reusable data table component with the following features:

- Generic typing for flexibility
- Built-in search and filtering
- Pagination controls
- Responsive layout
- Empty state handling

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isGeneratingResume?: (id: string) => boolean;
}
```

### JobPostingsTableColumns

**Location**: `src/app/ai-chat/_components/job-postings-table-columns.tsx`

Column definitions factory function that creates sortable columns with:

- Custom header components with sort indicators
- Context menu integration for each cell
- Status badge styling
- Loading state handling

```typescript
export const createJobPostingsColumns = (
  onEdit: (job: JobPosting) => void,
  onDelete: (id: string) => void,
  onViewContent: (id: string, content: string, title: string) => void,
  onViewCompatibility: (jobPostingId: string, jobTitle: string) => void,
  onGenerateResume: (jobPostingId: string) => void,
  onGenerateCoverLetter: (jobPostingId: string) => void,
  onEditDocument: (jobPostingId: string, jobTitle: string, content: string, type: "resume" | "coverLetter") => void,
  isGeneratingResume: (jobPostingId: string) => boolean,
  isGeneratingCoverLetter: (jobPostingId: string) => boolean,
  isDeleting: boolean,
): ColumnDef<JobPosting>[]
```

### JobPostingContextMenu

**Location**: `src/app/ai-chat/_components/job-postings-table-columns.tsx`

A reusable context menu component that wraps table cells and provides:

- Comprehensive action menu
- Conditional menu items based on job posting state
- Loading state indicators
- External link handling for job URLs

## Integration

### JobPostingsPanel Updates

The main job postings panel has been updated to:

- Import and use the new data table components
- Replace the old HTML table with `JobPostingsDataTable`
- Add an edit modal for job posting modifications
- Maintain all existing functionality while improving UX

### Edit Modal

A new modal interface for editing job postings that includes:

- Form validation
- All job posting fields (title, company, location, industry, URL, status, content, notes)
- Save/cancel actions
- Loading states

## User Experience

### Context Menu Interaction

- **Click anywhere** on a table row to open the context menu
- **No dedicated actions column** - cleaner table layout
- **Contextual actions** based on job posting state (e.g., "View Resume" vs "Generate Resume")
- **External links** open in new tabs when available

### Visual Feedback

- **Cursor pointer** on all clickable table cells
- **Hover effects** for better interactivity
- **Loading states** within context menu items
- **Color-coded status badges** for quick identification
- **Row Loading Animation**: Animated progress bar at the bottom of table rows during resume generation
  - Blue progress line that fills from left to right
  - Continuous animation until generation completes
  - Subtle background highlight on loading rows

## Styling

### Color Scheme

- **Blue Theme**: Primary blue colors for headers and borders
- **Status Colors**:
  - Applied: Blue (`bg-blue-100 text-blue-800`)
  - Interview: Yellow (`bg-yellow-100 text-yellow-800`)
  - Offer: Green (`bg-green-100 text-green-800`)
  - Rejected: Red (`bg-red-100 text-red-800`)
  - Saved: Purple (`bg-purple-100 text-purple-800`)

### Layout

- Consistent spacing using Tailwind CSS
- Responsive grid layouts
- Hover effects for better interactivity
- Context menu positioning and styling

## Usage Examples

### Basic Implementation

```tsx
import { JobPostingsDataTable } from "./job-postings-data-table";
import { createJobPostingsColumns } from "./job-postings-table-columns";

const columns = createJobPostingsColumns(
  handleEdit,
  handleDelete,
  handleViewContent,
  handleViewCompatibility,
  handleGenerateResume,
  handleGenerateCoverLetter,
  handleEditDocument,
  isGeneratingResume,
  isGeneratingCoverLetter,
  isDeleting,
);

<JobPostingsDataTable
  columns={columns}
  data={jobPostings}
  isGeneratingResume={(jobPostingId) =>
    generateResumeMutation.isPending &&
    generateResumeMutation.variables?.jobPostingId === jobPostingId
  }
/>;
```

### Context Menu Usage

Users can:

1. Click anywhere on a table row to open the context menu
2. Select from available actions based on the job posting state
3. Access external job URLs directly from the context menu
4. Perform all CRUD operations through the context menu

### Search and Filter

Users can:

1. Type in the search box to filter across all fields
2. Use the status dropdown to filter by application status
3. Use the company dropdown to filter by specific companies
4. Combine filters for precise results

### Sorting

Click any column header to sort:

- First click: Ascending order
- Second click: Descending order
- Third click: Remove sorting

## Performance Considerations

### Optimization Features

- **Efficient Context Menus**: Context menus are rendered on-demand
- **Memoization**: Column definitions are memoized to prevent unnecessary re-renders
- **Efficient Filtering**: TanStack Table's built-in filtering is optimized for performance
- **Pagination**: Reduces DOM nodes for better performance with large datasets

### Memory Management

- Proper cleanup of event listeners
- Efficient state management
- Minimal re-renders through proper dependency arrays

## Future Enhancements

### Planned Features

- [ ] Column visibility toggle
- [ ] Export functionality (CSV, PDF)
- [ ] Bulk actions (select multiple, bulk delete)
- [ ] Advanced filtering (date ranges, multiple status selection)
- [ ] Column resizing
- [ ] Row selection for batch operations
- [ ] Keyboard shortcuts for context menu

### Technical Improvements

- [ ] Virtual scrolling for very large datasets
- [ ] Server-side pagination and filtering
- [ ] Keyboard navigation
- [ ] Accessibility improvements (ARIA labels, screen reader support)
- [ ] Right-click context menu support

## Dependencies

- `@tanstack/react-table`: Core table functionality
- `lucide-react`: Icons for actions and UI elements
- `shadcn/ui`: UI components (Button, Input, Select, DropdownMenu, etc.)
- `tailwindcss`: Styling and responsive design

## Testing Considerations

### Test Cases

- [ ] Sorting functionality for each column
- [ ] Search filtering across all fields
- [ ] Status and company filtering
- [ ] Pagination navigation
- [ ] Context menu functionality on all table cells
- [ ] Loading states during async operations
- [ ] Empty state display
- [ ] Responsive behavior on different screen sizes
- [ ] External link functionality

### Edge Cases

- [ ] Very long job titles or company names
- [ ] Special characters in search queries
- [ ] Network errors during actions
- [ ] Large datasets (1000+ job postings)
- [ ] Concurrent user actions
- [ ] Context menu positioning at screen edges
