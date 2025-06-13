# Account Management & Data Request Feature

## Purpose

Empower users to control their data by allowing them to request a copy of their personal data or request account deletion (with a soft-delete, followed by permanent deletion via cron). This supports privacy best practices and regulatory compliance.

## Use Cases

- **Data Export:** User requests a copy of all their data. They receive an email with their data within 48 hours.
- **Account Deletion:** User requests account deletion. Their account is flagged for deletion (soft delete), and a cron will later permanently remove their data.

## Database Changes

### User Model (Soft Delete)

```prisma
model User {
  // ...existing fields...
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  dataRequests DataRequest[]
}
```

### DataRequest Model

Tracks user-initiated data export or deletion requests.

```prisma
model DataRequest {
  id          String   @id @default(cuid())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  type        DataRequestType
  status      DataRequestStatus @default(PENDING)
  createdAt   DateTime @default(now())
  processedAt DateTime?
  resultUrl   String?
  error       String?

  @@index([userId])
}

enum DataRequestType {
  EXPORT
  DELETE
}

enum DataRequestStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

## API Endpoints (Planned)

- `requestDataExport`: Create a DataRequest of type EXPORT
- `requestAccountDeletion`: Create a DataRequest of type DELETE and soft-delete the user
- (Optional) `getDataRequests`: List user's requests for UI feedback/history

## UI/UX

- New "Account" menu in dashboard top navigation
- `/dashboard/account` page for managing account, requesting data, and deletion
- Confirmation and feedback for all actions

## Privacy Policy

- Will be updated to describe this process and user rights

## Implementation Tasks

- [x] Add DataRequest model and soft-delete fields to Prisma schema
- [ ] Add tRPC endpoints for data requests and soft delete
- [ ] Update top navigation and add account page
- [ ] Add UI for data requests and deletion
- [ ] Update privacy policy and documentation
