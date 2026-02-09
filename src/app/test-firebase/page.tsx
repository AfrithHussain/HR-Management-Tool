"use client";

import { useState, useEffect } from "react";
import {
  testFirestoreConnection,
  addTestQuestions,
} from "../../utils/firestore-test";
import { checkFirebaseStatus } from "../../utils/firebase-status";
import { auth } from "../../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Cookies from "js-cookie";

export default function TestFirebasePage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      };
      Cookies.set("user", JSON.stringify(userData), { expires: 7 });
      setUser(userData);
      console.log("✅ Logged in:", userData);
    } catch (error) {
      console.error("❌ Login error:", error);
    }
  };

  const runConnectionTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    const result = await testFirestoreConnection();
    setTestResult(result);
    setIsLoading(false);
  };

  const addQuestions = async () => {
    setIsLoading(true);
    setTestResult(null);
    const result = await addTestQuestions();
    setTestResult(result);
    setIsLoading(false);
  };

  const checkStatus = () => {
    const status = checkFirebaseStatus();
    console.log("Status check complete - see console for details");
    setTestResult({
      success: status.isAuthenticated,
      message: status.isAuthenticated
        ? `Connected as ${status.userEmail}`
        : "Not authenticated - please login first",
    });
  };

  useEffect(() => {
    // Check auth state on mount
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Firebase Connection Test</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          {user || auth.currentUser ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                ✅ Logged in as: {user?.email || auth.currentUser?.email}
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-gray-600">
                You need to login first to test Firestore
              </p>
              <button
                onClick={handleGoogleLogin}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Login with Google
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-3">
            <button
              onClick={checkStatus}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Check Firebase Status
            </button>

            <button
              onClick={runConnectionTest}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Testing..." : "Test Firestore Connection"}
            </button>

            <button
              onClick={addQuestions}
              disabled={isLoading || !auth.currentUser}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add Test Questions"}
            </button>
          </div>
        </div>

        {testResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div
              className={`p-4 rounded ${
                testResult.success
                  ? "bg-green-50 border border-green-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <p
                className={
                  testResult.success ? "text-green-800" : "text-red-800"
                }
              >
                {testResult.success ? "✅" : "❌"} {testResult.message}
              </p>
              {testResult.error && (
                <p className="text-sm mt-2 text-red-600">
                  Error code: {testResult.error}
                </p>
              )}
              {testResult.questions && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Added Questions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {testResult.questions.map((q: any, i: number) => (
                      <li key={i} className="text-sm">
                        {q.question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📝 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>First, login with Google</li>
            <li>Click "Test Firestore Connection" to verify connectivity</li>
            <li>
              If connection works, click "Add Test Questions" to populate the
              database
            </li>
            <li>Check the console (F12) for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
