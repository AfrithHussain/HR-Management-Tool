# Browser Console Commands

Open your browser console (F12) and run these commands to test Firebase:

## Check Firebase Status

```javascript
// Import and run status check
import { checkFirebaseStatus } from "./utils/firebase-status";
checkFirebaseStatus();
```

## Test Firestore Connection

```javascript
// Import and test connection
import { testFirestoreConnection } from "./utils/firestore-test";
await testFirestoreConnection();
```

## Add Test Questions

```javascript
// Import and add questions
import { addTestQuestions } from "./utils/firestore-test";
await addTestQuestions();
```

## Check Current User

```javascript
// Check if user is logged in
import { auth } from "./lib/firebase";
console.log("Current user:", auth.currentUser);
console.log("Email:", auth.currentUser?.email);
console.log("UID:", auth.currentUser?.uid);
```

## Check Firestore Instance

```javascript
// Check Firestore configuration
import { db } from "./lib/firebase";
console.log("Project ID:", db.app.options.projectId);
console.log("Auth Domain:", db.app.options.authDomain);
```

## Quick Test (All-in-One)

```javascript
// Run all checks at once
import { auth, db } from "./lib/firebase";
import { checkFirebaseStatus } from "./utils/firebase-status";
import { testFirestoreConnection } from "./utils/firestore-test";

console.log("=== FIREBASE STATUS ===");
checkFirebaseStatus();

console.log("\n=== FIRESTORE TEST ===");
await testFirestoreConnection();

console.log("\n=== AUTH STATUS ===");
console.log("Logged in:", !!auth.currentUser);
console.log("Email:", auth.currentUser?.email);
```

## Note

Most of these commands are easier to run from the `/test-firebase` page, but
these console commands are useful for debugging.
