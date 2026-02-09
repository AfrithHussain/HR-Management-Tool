"use client";

import { useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";

export default function DebugSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [testId, setTestId] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllSubmissions = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "submissions"));
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSubmissions(data);
      console.log("All submissions:", data);
      toast.success(`Found ${data.length} submissions`);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSubmissionById = async () => {
    if (!testId.trim()) {
      toast.error("Please enter a submission ID");
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    try {
      console.log("Testing submission ID:", testId);
      const submissionDoc = await getDoc(doc(db, "submissions", testId));

      const result = {
        exists: submissionDoc.exists(),
        id: submissionDoc.id,
        data: submissionDoc.data(),
      };

      setTestResult(result);
      console.log("Test result:", result);

      if (submissionDoc.exists()) {
        toast.success("Submission found!");
      } else {
        toast.error("Submission not found!");
      }
    } catch (error: any) {
      console.error("Error:", error);
      setTestResult({ error: error.message, code: error.code });
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Toaster />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Debug Submissions</h1>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Fetch All Submissions</h2>
          <button
            onClick={fetchAllSubmissions}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Fetch All Submissions"}
          </button>

          {submissions.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">
                Found {submissions.length} submissions:
              </h3>
              <div className="space-y-2">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 bg-gray-50 rounded border text-sm"
                  >
                    <p>
                      <strong>ID:</strong> {sub.id}
                    </p>
                    <p>
                      <strong>Email:</strong> {sub.email}
                    </p>
                    <p>
                      <strong>Name:</strong> {sub.name}
                    </p>
                    <p>
                      <strong>Score:</strong> {sub.score}
                    </p>
                    <a
                      href={`/admin/submissions/${sub.id}`}
                      className="text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in new tab →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Test Specific Submission
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={testId}
              onChange={(e) => setTestId(e.target.value)}
              placeholder="Enter submission ID"
              className="flex-1 p-2 border rounded-md"
            />
            <button
              onClick={testSubmissionById}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Test
            </button>
          </div>

          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-2">Test Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">📝 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>
              Click "Fetch All Submissions" to see all submissions in database
            </li>
            <li>Copy a submission ID from the list</li>
            <li>Paste it in the "Test Specific Submission" field</li>
            <li>Click "Test" to verify if it can be fetched</li>
            <li>Check browser console (F12) for detailed logs</li>
          </ol>
        </div>
      </div>
    </>
  );
}
