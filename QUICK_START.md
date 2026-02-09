# 🚀 Quick Start Guide

## Test Firebase Connection & Add Questions

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Open Test Page

Navigate to: **http://localhost:3000/test-firebase**

### Step 3: Login

Click **"Login with Google"** button

### Step 4: Check Status

Click **"Check Firebase Status"** (opens console with details)

### Step 5: Test Connection

Click **"Test Firestore Connection"**

- ✅ Success = Firestore is working
- ❌ Error = Check the error message

### Step 6: Add Test Questions

Click **"Add Test Questions"**

- Adds 5 sample quiz questions to Firestore
- Questions will appear in `/admin/questions`

### Step 7: Deploy Security Rules (Important!)

```bash
firebase login
firebase deploy --only firestore:rules
```

## Test Logout Feature

### In Admin Panel:

1. Go to: **http://localhost:3000/admin/questions**
2. Look for **"Logout"** button at bottom of sidebar
3. Click it → Should redirect to home page

### In Quiz Page:

1. Go to: **http://localhost:3000/quiz**
2. Look for **"Logout"** button at top right
3. Click it → Should redirect to home page

## Verify Everything Works

1. ✅ Login with Google
2. ✅ Add test questions via `/test-firebase`
3. ✅ View questions at `/admin/questions`
4. ✅ Take quiz at `/quiz`
5. ✅ Logout from any page
6. ✅ See error messages if something fails

## Troubleshooting

### "Permission Denied" Error

```bash
# Deploy the security rules
firebase deploy --only firestore:rules
```

### "Not Authenticated" Error

- Make sure you're logged in
- Check cookies are enabled
- Try logging out and back in

### No Questions Showing

- Use `/test-firebase` to add test questions
- Check Firebase Console → Firestore Database
- Verify `questions` collection exists

## Need More Help?

- See `FIREBASE_SETUP.md` for detailed setup
- See `DEPLOYMENT_CHECKLIST.md` for deployment steps
- See `CHANGES_SUMMARY.md` for what was changed
