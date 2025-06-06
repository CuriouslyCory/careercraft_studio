# Job Posting Data Table

## Overview

The job posting data table provides a modern, sortable, and searchable interface for managing job postings. It replaces the previous basic HTML table with a feature-rich data table built using TanStack Table and shadcn/ui components.

**Availability**: This data table is available in both the AI Chat interface (`/ai-chat/job-postings`) and the Dashboard interface (`/dashboard/job-postings`). See [Dashboard Redesign](./dashboard-redesign-plan.md) for the dashboard implementation.

## Features

### Core Functionality

- **Sortable Columns**: Click column headers to sort by title, company, location, status, or date added
- **Global Search**: Search across all job posting fields using the search input
- **Column Filtering**: Filter by status (Saved, Applied, Interview, Rejected, Offer) and company
- **Pagination**: Navigate through large datasets with configurable page sizes (5, 10, 20, 30, 50)
- **Responsive Design**: Optimized for both desktop and mobile viewing
- **Loading Animation**: Visual progress indicator during resume generation operations
- **Inline Status Editing**: Click on any status badge to update it directly via dropdown

### Data Display

- **Status Badges**: Color-coded status indicators for quick visual identification
- **Industry Tags**: Display industry information as secondary text under job titles
- **Date Formatting**: Localized date display for creation timestamps
- **Interactive Status**: Status column displays clickable badges that open a dropdown for immediate editing

### Inline Status Editing

- **Click to Edit**: Click directly on any status badge to open a dropdown menu
- **Real-time Updates**: Status changes are immediately reflected in the UI with optimistic updates
- **Database Sync**: Changes are saved to the database automatically on selection
- **Loading States**: Visual feedback during status update operations
- **Error Handling**: Failed updates are reverted with error messages displayed via toast notifications
- **Event Isolation**: Status dropdown clicks don't trigger row context menus

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
- **Document Editor Navigation**: Viewing/editing documents navigates to a dedicated Document Editor panel

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

### InlineStatusDropdown

**Location**: `src/app/ai-chat/_components/job-postings-table-columns.tsx`

New component for inline status editing:

```typescript
export function InlineStatusDropdown({
  jobId,
  currentStatus,
  onStatusUpdate,
  isUpdating,
}: {
  jobId: string;
  currentStatus: string | null;
  onStatusUpdate: (jobId: string, status: string) => void;
  isUpdating: boolean;
});
```

**Features:**

- **Visual Design**: Maintains the same badge styling as the original status display
- **Dropdown Integration**: Uses shadcn/ui Select component for consistent styling
- **Loading States**: Shows "Updating..." text and disabled state during mutations
- **Event Prevention**: Prevents event bubbling to avoid triggering context menus
- **Status Options**: Includes all available status options (No Status, Saved, Applied, Interview, Rejected, Offer)

### JobPostingsTableColumns

**Location**: `src/app/ai-chat/_components/job-postings-table-columns.tsx`

Column definitions factory function that creates sortable columns with:

- Custom header components with sort indicators
- Context menu integration for each cell (except status column)
- Status badge styling with inline editing
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
  onStatusUpdate: (jobId: string, status: string) => void,
  isUpdatingStatus: (jobId: string) => boolean,
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
- **Add status update functionality** with optimistic updates and error handling
- Maintain all existing functionality while improving UX

### Status Update Mutation

**Location**: `src/app/ai-chat/_components/job-postings-panel.tsx`

New mutation handling for status updates:

```typescript
const updateStatusMutation = api.document.updateJobPostingStatus.useMutation({
  onMutate: async (updateData: { id: string; status: string }) => {
    // Optimistic update implementation
  },
  onError: (err, _updateData, context) => {
    // Error handling with reversion
  },
  onSettled: () => {
    // Server sync
  },
});
```

**Features:**

- **Optimistic Updates**: Status changes are immediately visible in the UI
- **Error Recovery**: Failed updates automatically revert the UI state
- **Loading States**: Individual row loading indicators during updates
- **Toast Notifications**: User feedback for successful updates and errors

### tRPC API Integration

**Location**: `src/server/api/routers/document/job-posting.ts`

New procedure for efficient status updates:

```typescript
updateStatus: protectedProcedure
  .input(z.object({
    id: z.string(),
    status: z.string(),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.jobPosting.update({
      where: { id: input.id, userId: ctx.session.user.id },
      data: { status: input.status === "" ? null : input.status },
      include: { details: true },
    });
  }),
```

**Exported as**: `updateJobPostingStatus` in the document router

### Edit Modal

A new modal interface for editing job postings that includes:

- Form validation
- All job posting fields (title, company, location, industry, URL, status, content, notes)
- Save/cancel actions
- Loading states

## User Experience

### Inline Status Editing

- **Quick Updates**: Click any status badge to immediately change the status
- **Visual Feedback**: Badge styling changes to show updating state
- **Smooth Interaction**: No page refreshes or modal dialogs required
- **Error Recovery**: Failed updates are automatically reverted with user notification
- **Consistent Design**: Dropdown maintains the same visual styling as status badges

### Context Menu Interaction

- **Right-click anywhere** on a table row (except status column) to open the context menu
- **Left-click anywhere** on a table row (except status column) to open the job posting details page
- **No dedicated actions column** - cleaner table layout
- **Contextual actions** based on job posting state (e.g., "View Resume" vs "Generate Resume")
- **External links** open in new tabs when available

### Success Toast Navigation

- **Resume Generation**: Success toast includes "Open Resume" button that navigates to Document Editor
- **Cover Letter Generation**: Success toast includes "Open Cover Letter" button that navigates to Document Editor
- **Extended Duration**: Success toasts show for 10 seconds to allow user interaction
- **URL Parameters**: Navigation uses URL parameters to maintain state and allow direct linking

### Visual Feedback

- **Cursor pointer** on all clickable table cells
- **Hover effects** for better interactivity
- **Loading states** within context menu items and status dropdowns
- **Color-coded status badges** for quick identification
- **Right-click context menu** activation with visual feedback
- **Left-click navigation** to job posting details page
- **Row Loading Animation**: Animated progress bar at the bottom of table rows during resume generation
  - Blue progress line that fills from left to right
  - Continuous animation until generation completes
  - Subtle background highlight on loading rows
  - CSS-based animation using pseudo-elements for proper DOM structure

## Styling

### Color Scheme

- **Blue Theme**: Primary blue colors for headers and borders
- **Status Colors**:
  - Applied: Blue (`bg-blue-100 text-blue-800`)
  - Interview: Yellow (`bg-yellow-100 text-yellow-800`)
  - Offer: Green (`bg-green-100 text-green-800`)
  - Rejected: Red (`bg-red-100 text-red-800`)
  - Saved: Purple (`bg-purple-100 text-purple-800`)
  - No Status: Gray (`bg-gray-100 text-gray-800`)

### Layout

- Consistent spacing using Tailwind CSS
- Responsive grid layouts
- Hover effects for better interactivity
- Context menu positioning and styling
- Status dropdown integration with existing badge styling

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
  handleStatusUpdate, // New handler for status updates
  isUpdatingStatus, // New loading state checker
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

### Status Update Implementation

```typescript
const handleStatusUpdate = (jobId: string, status: string) => {
  updateStatusMutation.mutate({ id: jobId, status });
};

const isUpdatingStatus = (jobId: string) => {
  return (
    updateStatusMutation.isPending &&
    updateStatusMutation.variables?.id === jobId
  );
};
```

### Context Menu Usage

Users can:

1. **Right-click** anywhere on a table row (except status column) to open the context menu
2. **Left-click** anywhere on a table row (except status column) to open the job posting details page
3. Select from available actions based on the job posting state
4. Access external job URLs directly from the context menu
5. Perform all CRUD operations through the context menu

### Status Editing Usage

Users can:

1. Click directly on any status badge to open the status dropdown
2. Select a new status from the available options
3. See immediate visual feedback with optimistic updates
4. Receive error notifications if updates fail

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

- **Efficient Loading Animation**: CSS-based animation using pseudo-elements avoids DOM nesting issues
- **Memoization**: Column definitions are memoized to prevent unnecessary re-renders
- **Efficient Filtering**: TanStack Table's built-in filtering is optimized for performance
- **Pagination**: Reduces DOM nodes for better performance with large datasets
- **Optimistic Updates**: Status changes appear immediately without waiting for server response
- **Targeted Mutations**: Status updates only modify the status field for efficiency

### Memory Management

- Proper cleanup of event listeners
- Efficient state management
- Minimal re-renders through proper dependency arrays
- Event isolation to prevent unwanted side effects

## Future Enhancements

### Planned Features

- [ ] Column visibility toggle
- [ ] Export functionality (CSV, PDF)
- [ ] Bulk actions (select multiple, bulk delete)
- [ ] Advanced filtering (date ranges, multiple status selection)
- [ ] Column resizing
- [ ] Row selection for batch operations
- [ ] Keyboard shortcuts for context menu
- [ ] **Bulk status updates** (select multiple rows and update status simultaneously)
- [ ] **Status change history** tracking and display
- [ ] **Custom status options** user-defined beyond the default set

### Technical Improvements

- [ ] Virtual scrolling for very large datasets
- [ ] Server-side pagination and filtering
- [ ] Keyboard navigation
- [ ] Accessibility improvements (ARIA labels, screen reader support)
- [x] Right-click context menu support
- [ ] **Drag and drop status updates** (drag job postings between status columns)
- [ ] **Status change notifications** via email or push notifications

## Dependencies

- `@tanstack/react-table`: Core table functionality
- `lucide-react`: Icons for actions and UI elements
- `shadcn/ui`: UI components (Button, Input, Select, DropdownMenu, etc.)
- `tailwindcss`: Styling and responsive design
- `sonner`: Toast notifications for user feedback

## Testing Considerations

### Test Cases

- [ ] Sorting functionality for each column
- [ ] Search filtering across all fields
- [ ] Status and company filtering
- [ ] Pagination navigation
- [ ] Context menu functionality on all table cells (except status)
- [ ] **Inline status editing functionality**
- [ ] **Status update optimistic UI behavior**
- [ ] **Error handling for failed status updates**
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
- [ ] **Multiple rapid status changes on the same job posting**
- [ ] **Status updates during other pending operations**
- [ ] **Network failures during optimistic status updates**
