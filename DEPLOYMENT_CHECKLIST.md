# Firestore Deployment Checklist

## Before Testing

- [ ] Firebase CLI is installed (`firebase --version`)
- [ ] Logged into Firebase CLI (`firebase login`)
- [ ] Project is initialized (`firebase init`)

## Deploy Firestore Rules

```bash
# Login to Firebase (if not already)
firebase login

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

## Verify Deployment

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `fe-screening`
3. Navigate to: **Firestore Database** → **Rules**
4. Verify the rules match `firestore.rules` file

## Test the Application

1. **Start Development Server**

   ```bash
   npm run dev
   ```

2. **Test Firebase Connection**

   - Navigate to: `http://localhost:3000/test-firebase`
   - Login with Google
   - Click "Test Firestore Connection"
   - Should see: ✅ Firestore connection working

3. **Add Test Questions**

   - On the test page, click "Add Test Questions"
   - Should see: 🎉 Successfully added 5 test questions!
   - Verify in Firebase Console → Firestore Database

4. **Test Logout**

   - Go to `/quiz` or `/admin/questions`
   - Click the "Logout" button
   - Should redirect to home page

5. **Test Error Handling**
   - Try operations without logging in
   - Should see user-friendly error messages

## Current Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /questions/{document} {
      allow read, write: if request.auth != null;
    }

    match /submissions/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

These rules require users to be authenticated before accessing Firestore.

## Troubleshooting

### Can't deploy rules?

```bash
firebase login --reauth
firebase use fe-screening
firebase deploy --only firestore:rules
```

### Permission denied errors?

- Ensure Firestore rules are deployed
- Verify user is logged in
- Check Firebase Console for rule errors

### No questions showing?

- Use `/test-firebase` to add test questions
- Check Firebase Console → Firestore Database
- Verify collections exist: `questions` and `submissions`
