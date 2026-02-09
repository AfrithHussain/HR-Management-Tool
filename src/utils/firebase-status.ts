import { auth, db } from "../lib/firebase";

export const checkFirebaseStatus = () => {
  console.log("🔍 Firebase Configuration Status");
  console.log("================================");

  // Check Auth
  console.log("\n📧 Authentication:");
  console.log("  Current User:", auth.currentUser?.email || "Not logged in");
  console.log("  User ID:", auth.currentUser?.uid || "N/A");

  // Check Firestore
  console.log("\n💾 Firestore:");
  console.log("  Database:", db.app.name);
  console.log("  Project ID:", db.app.options.projectId);

  // Check Configuration
  console.log("\n⚙️  Configuration:");
  console.log("  API Key:", db.app.options.apiKey ? "✅ Set" : "❌ Missing");
  console.log("  Auth Domain:", db.app.options.authDomain || "❌ Missing");
  console.log("  Project ID:", db.app.options.projectId || "❌ Missing");

  console.log("\n================================");

  return {
    isAuthenticated: !!auth.currentUser,
    userEmail: auth.currentUser?.email,
    projectId: db.app.options.projectId,
    hasApiKey: !!db.app.options.apiKey,
  };
};

// Make it available in browser console
if (typeof window !== "undefined") {
  (window as any).checkFirebaseStatus = checkFirebaseStatus;
}
