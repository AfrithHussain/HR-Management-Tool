"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { collection, getDocs, addDoc } from "firebase/firestore";
import Cookies from "js-cookie";

export default function DebugFirebasePage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addLog("🔍 Page loaded");

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        addLog(`✅ Auth state changed: ${user.email}`);
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      } else {
        addLog("❌ No user authenticated");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      addLog("🔐 Starting Google login...");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      addLog(`✅ Login successful: ${result.user.email}`);
      addLog(`   UID: ${result.user.uid}`);

      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      };

      Cookies.set("user", JSON.stringify(userData), { expires: 7 });
      setUser(userData);

      // Get the ID token
      const token = await result.user.getIdToken();
      addLog(`   Token length: ${token.length} characters`);
      addLog(`   Token preview: ${token.substring(0, 50)}...`);
    } catch (error: any) {
      addLog(`❌ Login error: ${error.message}`);
      console.error(error);
    }
  };

  const testRead = async () => {
    try {
      addLog("📖 Testing Firestore READ...");
      addLog(`   Current user: ${auth.currentUser?.email || "NONE"}`);

      if (!auth.currentUser) {
        addLog("❌ No authenticated user - login first!");
        return;
      }

      // Get fresh token
      const token = await auth.currentUser.getIdToken(true);
      addLog(`   Fresh token obtained: ${token.substring(0, 30)}...`);

      addLog("   Attempting to read 'questions' collection...");
      const querySnapshot = await getDocs(collection(db, "questions"));

      addLog(`✅ READ SUCCESS! Found ${querySnapshot.size} documents`);
      querySnapshot.forEach((doc) => {
        addLog(`   - Document ID: ${doc.id}`);
      });
    } catch (error: any) {
      addLog(`❌ READ ERROR: ${error.message}`);
      addLog(`   Error code: ${error.code}`);
      addLog(`   Error details: ${JSON.stringify(error, null, 2)}`);
      console.error("Full error:", error);
    }
  };

  const testWrite = async () => {
    try {
      addLog("✍️ Testing Firestore WRITE...");
      addLog(`   Current user: ${auth.currentUser?.email || "NONE"}`);

      if (!auth.currentUser) {
        addLog("❌ No authenticated user - login first!");
        return;
      }

      const testQuestion = {
        question: "Test question created at " + new Date().toISOString(),
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        correctAnswers: [0],
        isMultiSelect: false,
        createdAt: new Date(),
      };

      addLog("   Attempting to write to 'questions' collection...");
      const docRef = await addDoc(collection(db, "questions"), testQuestion);

      addLog(`✅ WRITE SUCCESS! Document ID: ${docRef.id}`);
    } catch (error: any) {
      addLog(`❌ WRITE ERROR: ${error.message}`);
      addLog(`   Error code: ${error.code}`);
      addLog(`   Error details: ${JSON.stringify(error, null, 2)}`);
      console.error("Full error:", error);
    }
  };

  const checkConfig = () => {
    addLog("⚙️ Checking Firebase Configuration...");
    addLog(`   Project ID: ${db.app.options.projectId}`);
    addLog(`   Auth Domain: ${db.app.options.authDomain}`);
    addLog(`   API Key: ${db.app.options.apiKey?.substring(0, 20)}...`);
    addLog(`   Current User: ${auth.currentUser?.email || "Not logged in"}`);
    addLog(`   User UID: ${auth.currentUser?.uid || "N/A"}`);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Firebase Debug Console</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication</h2>
            {user ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded mb-4">
                <p className="text-green-800 font-semibold">✅ Logged In</p>
                <p className="text-sm text-green-700">{user.email}</p>
                <p className="text-xs text-green-600">UID: {user.uid}</p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <p className="text-yellow-800">⚠️ Not Logged In</p>
              </div>
            )}
            <button
              onClick={handleLogin}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Login with Google
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
            <div className="space-y-2">
              <button
                onClick={checkConfig}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Check Config
              </button>
              <button
                onClick={testRead}
                disabled={!user}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Read
              </button>
              <button
                onClick={testWrite}
                disabled={!user}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Write
              </button>
              <button
                onClick={clearLogs}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Debug Logs</h2>
            <span className="text-sm text-gray-500">{logs.length} entries</span>
          </div>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">
                No logs yet. Click buttons above to test.
              </p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📝 Troubleshooting Steps:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Login with Google" and complete authentication</li>
            <li>Click "Check Config" to verify Firebase setup</li>
            <li>Click "Test Read" to check if you can read from Firestore</li>
            <li>Click "Test Write" to check if you can write to Firestore</li>
            <li>Check the logs for detailed error messages</li>
            <li>
              If you see "permission-denied", the Firestore rules need updating
            </li>
          </ol>
        </div>

        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-red-800">
            🔥 If Permission Denied:
          </h3>
          <p className="text-sm mb-2">Run this command to deploy test rules:</p>
          <code className="block bg-black text-white p-2 rounded text-xs">
            cp firestore.rules.testing firestore.rules && firebase deploy --only
            firestore:rules
          </code>
          <p className="text-xs text-red-600 mt-2">
            ⚠️ This allows ALL access for testing. Revert to secure rules after
            testing!
          </p>
        </div>
      </div>
    </div>
  );
}
