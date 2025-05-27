# User Profile Management

This document describes the User Profile Management feature within CareerCraft Studio, which allows users to manage their professional profile information separate from their authentication provider data.

## Overview

The User Profile Management feature provides users with the ability to maintain professional contact information and personal details that are specifically used for resume generation. This data is stored separately from the authentication provider (NextAuth) user data, giving users full control over their professional presentation.

## Key Features

- **Professional Contact Information**: First name, last name, professional email, phone number, and location
- **Separation from Auth Data**: Profile data is independent of authentication provider information
- **Resume Integration**: Profile data is automatically used in resume generation instead of auth provider data
- **Fallback Support**: If profile data is not provided, the system falls back to auth provider data where applicable

## Database Schema

### UserProfile Model

```prisma
model UserProfile {
    id           String   @id @default(cuid())
    firstName    String?  // Professional first name
    lastName     String?  // Professional last name
    email        String?  // Preferred professional email
    phone        String?  // Phone number
    location     String?  // City, State or City, Country
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt

    user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
    userId String @unique

    @@index([userId])
}
```

### Relationship to User Model

The UserProfile has a one-to-one relationship with the User model:

```prisma
model User {
    // ... existing fields
    userProfile     UserProfile?
}
```

## API Endpoints

### TRPC Router: `document.getUserProfile`

**Purpose**: Retrieve the current user's profile information

**Usage**:

```typescript
const profile = await api.document.getUserProfile.useQuery();
```

**Returns**: `UserProfile | null`

### TRPC Router: `document.upsertUserProfile`

**Purpose**: Create or update user profile information

**Input Schema**:

```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string; // Must be valid email or empty string
  phone?: string;
  location?: string;
}
```

**Usage**:

```typescript
const result = await api.document.upsertUserProfile.mutate({
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
  phone: "(555) 123-4567",
  location: "San Francisco, CA",
});
```

**Features**:

- Automatically handles empty strings by converting them to `null`
- Creates new profile if none exists, updates existing profile otherwise
- Validates email format when provided

### TRPC Router: `document.deleteUserProfile`

**Purpose**: Delete the user's profile information

**Usage**:

```typescript
await api.document.deleteUserProfile.mutate();
```

## Frontend Components

### ProfilePanel Component

**Location**: `src/app/ai-chat/_components/profile-panel.tsx`

**Features**:

- **View Mode**: Displays current profile information in a clean, organized layout
- **Edit Mode**: Provides form inputs for updating profile information
- **Validation**: Client-side validation for email format
- **Loading States**: Shows loading indicators during API calls
- **Error Handling**: Displays toast notifications for success/error states
- **Empty State**: Shows helpful message when no profile exists

**Usage**:

```typescript
import { ProfilePanel } from "../_components/profile-panel";

export default function ProfilePage() {
  return <ProfilePanel />;
}
```

### Profile Page

**Location**: `src/app/ai-chat/profile/page.tsx`

**Route**: `/ai-chat/profile`

**Features**:

- Dedicated page for profile management
- Integrated into the main navigation sidebar
- Responsive design with proper spacing and typography

## Resume Data Generator Integration

### Updated Personal Information Section

The resume data generator now prioritizes UserProfile data over authentication provider data:

```typescript
// Use profile data if available, fallback to auth data
const firstName = profile?.firstName ?? "";
const lastName = profile?.lastName ?? "";
const fullName =
  [firstName, lastName].filter(Boolean).join(" ") || userData.name;

const email = profile?.email ?? userData.email;
```

### Generated Output Format

When UserProfile data is available, the resume data generator produces:

```markdown
## Personal Information

**Name:** John Doe
**Email:** john.doe@example.com
**Phone:** (555) 123-4567
**Location:** San Francisco, CA
```

### Fallback Behavior

If UserProfile data is not available, the system falls back to authentication provider data:

```markdown
## Personal Information

**Name:** John Doe (from auth provider)
**Email:** john.doe@gmail.com (from auth provider)
```

## Navigation Integration

The profile management feature is integrated into the main navigation sidebar:

**Location**: `src/app/_components/bio-sidebar.tsx`

**Menu Item**: "Profile" - positioned at the top of the navigation for easy access

## Data Flow

1. **User Access**: User navigates to `/ai-chat/profile`
2. **Data Fetching**: ProfilePanel component queries current profile via `getUserProfile`
3. **Display**: Profile information is displayed in view mode
4. **Editing**: User clicks "Edit" to enter edit mode
5. **Validation**: Client-side validation ensures data quality
6. **Submission**: Profile data is saved via `upsertUserProfile`
7. **Resume Generation**: Updated profile data is automatically used in resume generation

## Benefits

1. **Professional Presentation**: Users can maintain professional contact information separate from personal accounts
2. **Data Control**: Full control over what information appears in resumes
3. **Consistency**: Ensures consistent professional information across all generated documents
4. **Privacy**: Keeps personal authentication data separate from professional presentation
5. **Flexibility**: Allows users to use different email addresses for different purposes

## Future Enhancements

Potential future improvements could include:

- **Profile Completeness Indicator**: Visual indicator showing profile completion percentage
- **Multiple Profiles**: Support for different professional profiles for different industries
- **Profile Templates**: Pre-defined profile templates for different career stages
- **Social Media Integration**: Optional integration with professional social media profiles
- **Profile Validation**: Enhanced validation and suggestions for profile optimization
