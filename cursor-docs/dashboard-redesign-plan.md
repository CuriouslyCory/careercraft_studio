---
description: Plan for creating a new dashboard interface with top navigation to replace the ai-chat sidebar layout
globs: src/app/dashboard/**/*
alwaysApply: true
---

# Dashboard Redesign Plan

## Overview

Create a new `/dashboard` route that provides an alternative to the current `/ai-chat` interface. The new design will feature:

- Top navigation instead of left sidebar
- Professional Profile dashboard with completion percentage
- Dedicated pages for each major feature
- Improved user experience with better organization

## Key Requirements

### 1. Top Navigation Structure

- **Logo/Site Name**: Routes to "/" when clicked
- **Job Postings**: View containing job postings panel
- **Professional Profile**: New dashboard with summary data and links
- **Subscription**: Page with subscription panel
- **AI Assistant**: Chat interface with conversation sidebar
- **Account Menu**: User avatar/name with logout functionality

### 2. Professional Profile Dashboard

- **Profile Completion Percentage**: Calculated based on data in each section
- **Summary Cards**: Quick overview of each profile section
- **Document Uploader**: From documents-panel.tsx (without document list)
- **Quick Links**: Direct access to edit each section
- **Sections to Track**:
  - Work History (at least 1 record)
  - Contact Info (basic fields filled)
  - Key Achievements (at least 1 record)
  - Skills (at least 1 skill)
  - Education (at least 1 record)
  - Links (at least 1 link)

### 3. AI Assistant Page

- **Left Sidebar**: Conversation list using sidebar.tsx component
- **Main Area**: Chat interface
- **New Chat Button**: Create new conversations
- **Conversation Management**: Rename, delete conversations

## Implementation Plan

### Phase 1: Core Infrastructure ✅

- [x] Create dashboard layout structure
- [x] Implement top navigation component
- [x] Set up routing for dashboard pages
- [x] Create base page components

### Phase 2: Professional Profile Dashboard ✅

- [x] Create profile completion calculation logic
- [x] Build summary cards for each section
- [x] Integrate document uploader
- [x] Add quick action buttons
- [x] Implement responsive design

### Phase 3: Individual Feature Pages ✅

- [x] Job Postings page with full panel
- [x] Subscription page
- [x] Individual profile section pages (work-history, skills, etc.)

### Phase 4: AI Assistant Integration ✅

- [x] Create AI assistant page layout
- [x] Integrate conversation sidebar
- [x] Implement chat interface
- [x] Add conversation management features

### Phase 5: Polish and Testing ❌

- [ ] Responsive design improvements
- [ ] Navigation state management
- [ ] Error handling
- [ ] Performance optimization

## File Structure

```
src/app/dashboard/
├── layout.tsx                 # Main dashboard layout with top nav
├── page.tsx                   # Professional Profile dashboard
├── job-postings/
│   └── page.tsx              # Job postings page
├── work-history/
│   └── page.tsx              # Work history management
├── contact-info/
│   └── page.tsx              # Contact information
├── achievements/
│   └── page.tsx              # Key achievements
├── skills/
│   └── page.tsx              # Skills management
├── education/
│   └── page.tsx              # Education records
├── links/
│   └── page.tsx              # User links
├── subscription/
│   └── page.tsx              # Subscription management
├── ai-assistant/
│   └── page.tsx              # AI chat with conversation sidebar
└── _components/
    ├── top-navigation.tsx     # Main top navigation
    ├── profile-dashboard.tsx  # Professional profile dashboard
    ├── profile-completion.tsx # Completion percentage logic
    ├── summary-cards.tsx      # Profile section summary cards
    └── account-menu.tsx       # User account dropdown
```

## Component Specifications

### TopNavigation Component

- **Logo**: Clickable, routes to "/"
- **Navigation Items**: Job Postings, Professional Profile, AI Assistant
- **Account Menu**: User avatar, name, Subscription, Sign Out
- **Responsive**: Mobile hamburger menu
- **Active State**: Highlight current page

### ProfileDashboard Component

- **Completion Ring**: Visual percentage indicator
- **Summary Grid**: Cards for each profile section
- **Document Upload**: Integrated uploader component
- **Quick Actions**: "Add" buttons for each section
- **Progress Tracking**: Real-time updates as data is added

### ProfileCompletion Logic

```typescript
interface ProfileSection {
  name: string;
  completed: boolean;
  count: number;
  requiredCount: number;
}

const calculateCompletion = (sections: ProfileSection[]) => {
  const completedSections = sections.filter((s) => s.completed).length;
  return Math.round((completedSections / sections.length) * 100);
};
```

### SummaryCard Component

- **Section Title**: Clear section name
- **Count Display**: "X items" or "Not set up"
- **Quick Stats**: Relevant metrics for each section
- **Action Button**: "Add" or "Edit" based on state
- **Status Indicator**: Complete/incomplete visual cue

## Data Requirements

### Profile Completion Tracking

- **Work History**: At least 1 work experience record
- **Contact Info**: firstName, lastName, email filled
- **Achievements**: At least 1 achievement record
- **Skills**: At least 1 user skill
- **Education**: At least 1 education record
- **Links**: At least 1 user link

### API Endpoints Needed

- `api.profile.getCompletionStatus` - Calculate completion percentage
- `api.profile.getSummaryData` - Get counts and basic info for each section
- Existing endpoints for individual sections (already available)

## Styling Guidelines

### Design System

- **Primary Colors**: Blue gradient (blue-600 to indigo-600)
- **Background**: Clean white with subtle gray accents
- **Cards**: Rounded borders, subtle shadows
- **Typography**: Clear hierarchy with semibold headings
- **Spacing**: Consistent padding and margins
- **Responsive**: Mobile-first approach

### Component Styling

- **Top Nav**: Fixed height, shadow, responsive
- **Dashboard Grid**: CSS Grid for summary cards
- **Completion Ring**: SVG-based circular progress
- **Cards**: Hover effects, consistent padding
- **Buttons**: Gradient backgrounds, hover states

## Testing Strategy

### Unit Tests

- Profile completion calculation logic
- Summary data aggregation
- Navigation state management
- Component rendering

### Integration Tests

- Navigation between pages
- Data loading and display
- User interactions
- Responsive behavior

### User Acceptance Tests

- Complete user journey through dashboard
- Profile completion workflow
- AI assistant functionality
- Mobile responsiveness

## Migration Considerations

### Existing Users

- Both `/ai-chat` and `/dashboard` will coexist
- No data migration required
- Users can choose preferred interface
- Gradual migration strategy

### URL Structure

- `/dashboard` - Professional Profile dashboard
- `/dashboard/job-postings` - Job postings management
- `/dashboard/work-history` - Work history
- `/dashboard/contact-info` - Contact information
- `/dashboard/achievements` - Key achievements
- `/dashboard/skills` - Skills management
- `/dashboard/education` - Education records
- `/dashboard/links` - User links
- `/dashboard/subscription` - Subscription management
- `/dashboard/ai-assistant` - AI chat interface
- `/dashboard/document-editor` - Resume and cover letter editor

## Success Metrics

### User Experience

- Reduced time to find specific features
- Increased profile completion rates
- Higher user engagement with profile sections
- Improved mobile usability

### Technical Performance

- Fast page load times
- Smooth navigation transitions
- Efficient data loading
- Responsive design across devices

## Future Enhancements

### Phase 2 Features

- **Dashboard Analytics**: Usage statistics and insights
- **Profile Export**: PDF/Word export of complete profile
- **Profile Sharing**: Public profile URLs
- **Advanced Customization**: Theme options, layout preferences

### Integration Opportunities

- **Calendar Integration**: Interview scheduling
- **Job Board APIs**: Direct job application
- **Social Media**: LinkedIn profile sync
- **Document Templates**: Industry-specific templates

## Implementation Notes

### Key Dependencies

- Existing tRPC API routes
- Current component library
- Authentication system
- Database schema (no changes needed)

### Performance Considerations

- Lazy loading for heavy components
- Optimistic updates for better UX
- Efficient data fetching strategies
- Image optimization for avatars

### Accessibility

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

## Completion Status

### ✅ Completed Tasks

1. **Core Infrastructure**

   - Created dashboard layout with top navigation
   - Set up routing structure
   - Implemented base page components
   - Added responsive design

2. **Professional Profile Dashboard**

   - Built profile completion calculation
   - Created summary cards for all sections
   - Integrated document uploader
   - Added quick action buttons
   - Implemented completion percentage display

3. **Individual Feature Pages**

   - Job postings page with full functionality
   - All profile section pages (work-history, contact-info, achievements, skills, education, links)
   - Subscription management page
   - Document editor for resumes and cover letters
   - Proper navigation and breadcrumbs

4. **AI Assistant Integration**

   - Chat interface with conversation sidebar
   - Conversation management (create, rename, delete)
   - Responsive layout for mobile
   - Integration with existing chat functionality

5. **Build and Technical Issues**
   - Fixed TypeScript errors in education panel
   - Successful production build
   - All pages rendering correctly

### ❌ Remaining Tasks

5. **Final Polish and Testing**
   - Enhanced responsive design across all pages
   - Improved navigation state management
   - Better error handling and loading states
   - Performance optimization
   - User testing and feedback

### 🎯 Project Status: 90% COMPLETE

**What's Working:**

- ✅ Top navigation with all required menu items and active states
- ✅ Professional Profile dashboard with completion tracking (6 sections)
- ✅ All individual feature pages (job-postings, work-history, contact-info, achievements, skills, education, links, subscription)
- ✅ AI Assistant page with conversation sidebar and chat functionality
- ✅ Account menu with logout functionality
- ✅ Responsive design for mobile devices
- ✅ Integration with existing tRPC APIs
- ✅ Document upload functionality
- ✅ Profile completion percentage calculation with circular progress indicator
- ✅ Summary cards with color coding and quick actions
- ✅ Successful production build without errors

**Still Needed:**

- 🔧 Enhanced responsive design and mobile optimization
- 🔧 Improved error handling and loading states
- 🔧 Performance optimization and code splitting
- 🔧 User testing and feedback integration
- 🔧 Accessibility improvements

The dashboard is now fully functional with all major features implemented. The remaining work focuses on polish, optimization, and user experience enhancements.
