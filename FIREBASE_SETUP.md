# Firebase Setup & Testing Guide

## What Was Fixed

1. **Added Error Handling**: All Firestore operations now have try-catch blocks
   with user-friendly error messages
2. **Fixed Analytics**: Analytics now only initializes on client-side to prevent
   SSR issues
3. **Added Logout Feature**: Logout buttons added to admin panel and quiz page
4. **Created Test Utilities**: Tools to verify Firebase connection and add test
   questions
5. **Security Rules**: Created Firestore security rules requiring authentication

## Testing Firebase Connection

### Option 1: Use the Test Page (Recommended)

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/test-firebase`

3. Follow the on-screen instructions:
   - Login with Google
   - Test Firestore connection
   - Add test questions

### Option 2: Use Browser Console

1. Navigate to any page after logging in
2. Open browser console (F12)
3. Run these commands:

```javascript
// Test connection
import { testFirestoreConnection } from "./utils/firestore-test";
await testFirestoreConnection();

// Add test questions
import { addTestQuestions } from "./utils/firestore-test";
await addTestQuestions();
```

## Deploy Firestore Rules

To deploy the security rules to Firebase:

```bash
firebase deploy --only firestore:rules
```

## Common Issues & Solutions

### Issue: "Permission Denied" Error

**Solution**:

1. Make sure you're logged in (check auth status on test page)
2. Deploy the Firestore rules: `firebase deploy --only firestore:rules`
3. Verify rules in Firebase Console → Firestore Database → Rules

### Issue: "Unauthenticated" Error

**Solution**:

1. Login with Google first
2. Check if cookies are enabled in your browser
3. Verify Firebase Auth is enabled in Firebase Console

### Issue: No Questions Showing

**Solution**:

1. Go to `/test-firebase` page
2. Login and click "Add Test Questions"
3. Check Firebase Console → Firestore Database to verify data

## Logout Feature

Logout buttons are now available in:

- **Admin Panel**: Bottom of the sidebar
- **Quiz Page**: Top right corner

Clicking logout will:

1. Sign out from Firebase Auth
2. Clear user cookies
3. Redirect to home page

## Environment Variables (Optional)

For better security, create a `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Next Steps

1. Test the connection using `/test-firebase`
2. Add test questions if needed
3. Deploy Firestore rules
4. Test logout functionality
5. Verify error messages appear correctly when operations fail
