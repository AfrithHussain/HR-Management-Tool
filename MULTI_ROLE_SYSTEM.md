# Multi-Role System Implementation

## Overview

The quiz system now supports multiple roles (Frontend, Backend, Data, Android,
iOS, DevOps, QA). Users are assigned a role when whitelisted, and they
automatically see questions specific to their role.

## Features Implemented

### 1. Role Management

- **Available Roles**: Frontend, Backend, Data, Android, iOS, DevOps, QA
- **Default Role**: Frontend (for backward compatibility)
- **Role Assignment**: Admins select role when adding users to whitelist

### 2. User Management Updates

- **Role Column**: Users table now displays each user's role with a badge
- **Role Selection**: Dropdown in "Add Email(s)" modal to select role
- **Uniqueness Check**: System detects and reports duplicate emails
- **Auto-Role Assignment**: GreedyGame users default to Frontend role

### 3. Questions Management Updates

- **Role Tabs**: Questions page has tabs for each role showing question count
- **Filtered View**: Only shows questions for the selected role
- **Role Badge**: Each question displays whether it's Single or Multiple choice
- **Empty State**: Helpful message when no questions exist for a role
- **Role Assignment**: New questions automatically assigned to active role tab

### 4. Quiz Experience

- **Automatic Filtering**: Users only see questions for their assigned role
- **Backward Compatibility**: Questions without role field show for all users
- **No User Action**: Users don't select role - it's automatic based on their
  profile

## Data Model Changes

### Users Collection

```typescript
{
  email: string;
  name: string;
  role: "frontend" | "backend" | "data" | "android" | "ios" | "devops" | "qa";
  isWhitelisted: boolean;
  isBlocked: boolean;
  isSuperuser: boolean;
  score: number | null;
  totalQuestions: number | null;
  status: "pending" | "accepted" | "rejected";
  comment: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  submissionId: string | null;
}
```

### Questions Collection

```typescript
{
  question: string;
  options: string[];
  correctAnswers: number[];
  isMultiSelect: boolean;
  role: "frontend" | "backend" | "data" | "android" | "ios" | "devops" | "qa";
}
```

## Usage Guide

### For Admins

**Adding Users with Roles:**

1. Go to Users page
2. Click "Add Email(s)"
3. Select role from dropdown (Frontend, Backend, etc.)
4. Enter email addresses (comma-separated)
5. Click "Add to Whitelist"
6. System will report: success count, duplicates, and failures

**Managing Questions by Role:**

1. Go to Questions page
2. Click on role tab (Frontend, Backend, etc.)
3. See questions count for each role
4. Add questions - they're automatically assigned to active role
5. Edit/Delete questions as needed

**Viewing User Roles:**

- Users table shows role badge for each user
- Filter and search work across all roles
- Submissions show user's role context

### For Users

**Taking the Quiz:**

1. Login with whitelisted email
2. System automatically loads questions for your role
3. Complete quiz (no role selection needed)
4. Submit and see results

## Migration Notes

**Existing Data:**

- Existing users without role: Default to "frontend"
- Existing questions without role: Visible to all users
- No data migration required - system handles gracefully

**Adding Roles:**

- To add new roles, update `AVAILABLE_ROLES` in `src/utils/whitelist.ts`
- Roles are type-safe throughout the application

## Files Modified

1. `src/utils/whitelist.ts` - Added UserRole type and role management
2. `src/app/admin/users/page.tsx` - Added role column and selection
3. `src/app/admin/questions/page.tsx` - Added role tabs and filtering
4. `src/app/quiz/page.tsx` - Added role-based question filtering
5. `src/utils/curated-questions.ts` - Added role field to curated questions

## Benefits

1. **Scalability**: Easy to add new roles
2. **Separation**: Each team sees only relevant questions
3. **Simplicity**: Users don't need to choose - it's automatic
4. **Flexibility**: Admins control role assignments
5. **Backward Compatible**: Works with existing data
