# Quick Fix for Login Issue

## Problem

Getting "Missing or insufficient permissions" error when trying to login.

## Solution

### Step 1: Deploy Updated Firestore Rules

The updated `firestore.rules` file now includes proper permissions for the
`users` collection.

**Deploy the rules:**

```bash
firebase deploy --only firestore:rules
```

### Step 2: Verify Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `fe-screening`
3. Navigate to: **Firestore Database** → **Rules**
4. Verify the rules include the `users` collection

### Step 3: Test Login Again

1. Clear browser cache and cookies
2. Go to login page
3. Click "Continue with Google"
4. Select your GreedyGame account (prabeen@greedygame.com)
5. Should redirect to `/admin/users`

## What Changed

### 1. Login Logic Updated

- GreedyGame users now bypass whitelist check
- They go directly to admin panel
- User record creation is non-blocking (won't fail login if it errors)

### 2. Firestore Rules Updated

```javascript
match /users/{email} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && (
    request.auth.token.email == email ||
    request.auth.token.email.matches('.*@greedygame[.]com$')
  );
}
```

**Permissions:**

- Any authenticated user can READ users collection
- Users can WRITE their own record
- GreedyGame users can WRITE any record

### 3. Error Handling Improved

- Better error messages
- Non-blocking user creation for admins
- Graceful fallback for permission errors

## If Still Not Working

### Option 1: Temporary Open Rules (Testing Only)

Edit `firestore.rules`:

```javascript
match /users/{email} {
  allow read, write: if request.auth != null;
}
```

Then deploy:

```bash
firebase deploy --only firestore:rules
```

### Option 2: Check Firebase Auth

1. Go to Firebase Console → Authentication
2. Verify Google sign-in is enabled
3. Check if your email is in the users list

### Option 3: Clear Everything

```bash
# Clear browser
- Open DevTools (F12)
- Application → Clear storage → Clear site data

# Try incognito mode
- Open incognito window
- Try login again
```

## Verification Steps

After deploying rules:

1. **Check Rules Deployed:**

   ```bash
   firebase firestore:rules:get
   ```

2. **Test in Browser Console:**

   ```javascript
   // After login, check if user is authenticated
   firebase.auth().currentUser;
   ```

3. **Check Firestore:**
   - Go to Firebase Console → Firestore Database
   - Look for `users` collection
   - Should see your user record after login

## Expected Behavior

### For GreedyGame Users (prabeen@greedygame.com):

1. Click login
2. Select Google account
3. See "Signing in..." with spinner
4. Redirect to `/admin/users` page
5. See empty users table (initially)

### For Regular Users:

1. Click login
2. Select Google account
3. If not whitelisted: Error message shown
4. If whitelisted: Redirect to `/quiz`

## Need More Help?

Check browser console (F12) for detailed error messages and share them.
