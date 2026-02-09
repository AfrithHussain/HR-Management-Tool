# Troubleshooting Guide

## Issue: "Submission not found" Error

If you're seeing "Submission not found" when clicking on a submission, follow
these steps:

### Step 1: Use the Debug Page

1. Navigate to: `http://localhost:3000/admin/debug-submissions`
2. Click "Fetch All Submissions"
3. Check if submissions appear in the list
4. Check browser console (F12) for any errors

### Step 2: Verify Firestore Data

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `fe-screening`
3. Navigate to: **Firestore Database**
4. Check if `submissions` collection exists
5. Check if documents have the correct structure:
   ```javascript
   {
     userId: "string",
     email: "string",
     name: "string",
     answers: { ... },
     score: number,
     submittedAt: Timestamp
   }
   ```

### Step 3: Check Firestore Rules

Make sure your Firestore rules allow reading submissions:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /submissions/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

### Step 4: Check Authentication

1. Make sure you're logged in
2. Check browser console for auth errors
3. Try logging out and back in

### Step 5: Test with Debug Tools

On the submissions list page (`/admin/submissions`):

1. Click "Debug Submissions" button (top right)
2. Check console for submission IDs
3. Compare IDs with what you see in Firebase Console

### Step 6: Manual Test

1. Go to `/admin/debug-submissions`
2. Copy a submission ID from the list
3. Paste it in the test field
4. Click "Test"
5. Check if it returns data

### Common Issues & Solutions

#### Issue: No submissions in list

**Solution**:

- Take the quiz at `/quiz` to create a submission
- Or use `/test-firebase` to add test data

#### Issue: Permission denied

**Solution**:

- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Make sure you're logged in with Google

#### Issue: Submissions exist but can't view details

**Solution**:

- Check browser console for specific error
- Verify submission ID is correct
- Try opening in new tab from debug page

#### Issue: submittedAt.toDate() error

**Solution**:

- This means the timestamp format is wrong
- Check if `submittedAt` is a Firestore Timestamp
- If using `new Date()`, change to Firestore Timestamp:
  ```javascript
  import { Timestamp } from "firebase/firestore";
  submittedAt: Timestamp.now();
  ```

### Debug Checklist

- [ ] Logged in with Google
- [ ] Firestore rules deployed
- [ ] Submissions collection exists in Firestore
- [ ] Can see submissions in `/admin/submissions` list
- [ ] Submission IDs are valid (not undefined)
- [ ] Browser console shows no errors
- [ ] `/admin/debug-submissions` shows submissions

### Still Not Working?

1. **Clear browser cache and cookies**

   - Chrome: Ctrl+Shift+Delete
   - Select "Cookies" and "Cached images"
   - Clear data

2. **Restart development server**

   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

3. **Check for console errors**

   - Open browser console (F12)
   - Look for red error messages
   - Share error messages for help

4. **Verify Firebase connection**
   - Go to `/test-firebase`
   - Click "Test Firestore Connection"
   - Should show success message

### Getting More Help

If issue persists, provide:

1. Screenshot of browser console errors
2. Screenshot of Firebase Console submissions collection
3. Output from `/admin/debug-submissions` page
4. Any error messages from terminal

## Other Common Issues

### Quiz won't load

- Check if questions exist: `/admin/questions`
- Add questions: Click "Insert 20 Curated Questions"
- Check console for errors

### Can't login

- Make sure Firebase Auth is enabled
- Check if Google sign-in is configured
- Verify API keys in `src/lib/firebase.ts`

### Logout not working

- Check if cookies are enabled
- Try clearing browser cookies
- Check console for errors
