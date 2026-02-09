"use client";

import { useState, useEffect } from "react";
import { db } from "../../../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

interface SubmissionDetails {
  id: string;
  name: string;
  email: string;
  score: number;
  totalQuestions: number;
  submittedAt: any;
  answers: Record<string, number[]>;
  moduleName?: string;
  userId?: string;
  passed?: boolean;
  attemptNumber?: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  moduleName?: string;
}

export default function SubmissionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [allSubmissions, setAllSubmissions] = useState<SubmissionDetails[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const resolvedParams = await Promise.resolve(params);
        // Decode the URL parameter in case it's URL-encoded
        const idOrEmail = decodeURIComponent(resolvedParams.id);
        
        console.log("Fetching submissions for:", idOrEmail);
        
        let userEmail: string;
        
        // Check if the ID is an email (contains @) or a submission ID
        if (idOrEmail.includes('@')) {
          // It's an email, use it directly
          userEmail = idOrEmail;
          console.log("Using email directly:", userEmail);
        } else {
          // It's a submission ID, fetch the submission to get the email
          const initialSubDoc = await getDoc(doc(db, "submissions", idOrEmail));
          if (!initialSubDoc.exists()) {
            console.error("Submission not found for ID:", idOrEmail);
            throw new Error("Submission not found");
          }
          
          const initialData = initialSubDoc.data();
          userEmail = initialData.email;
          console.log("Got email from submission:", userEmail);
        }

        // 2. Fetch ALL submissions for this user (to show full history/modules)
        const q = query(collection(db, "submissions"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);
        
        console.log(`Found ${querySnapshot.size} submissions for ${userEmail}`);
        
        if (querySnapshot.size === 0) {
          console.warn("No submissions found for user:", userEmail);
          setIsLoading(false);
          return;
        }
        
        const submissionsData = querySnapshot.docs.map(d => ({ 
            id: d.id, 
            ...d.data() 
        } as SubmissionDetails));

        // Group by module and keep only the latest submission per module
        const moduleMap = new Map<string, SubmissionDetails>();
        submissionsData.forEach(sub => {
            const key = sub.moduleName || "general";
            const existing = moduleMap.get(key);
            
            // Keep the latest submission (highest attempt number or most recent date)
            if (!existing || 
                (sub.attemptNumber && existing.attemptNumber && sub.attemptNumber > existing.attemptNumber) ||
                (!sub.attemptNumber && !existing.attemptNumber && (sub.submittedAt?.seconds || 0) > (existing.submittedAt?.seconds || 0))) {
                moduleMap.set(key, sub);
            }
        });

        // Convert back to array and sort
        const latestSubmissions = Array.from(moduleMap.values());
        latestSubmissions.sort((a, b) => {
             const modA = a.moduleName || "";
             const modB = b.moduleName || "";
             const numA = parseInt(modA.match(/Module (\d+):/)?.[1] || "9999");
             const numB = parseInt(modB.match(/Module (\d+):/)?.[1] || "9999");
             
             if (numA !== numB) return numA - numB;
             return (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0);
        });

        console.log("Latest submissions:", latestSubmissions.length);
        setAllSubmissions(latestSubmissions);
        
        // Auto-select first module
        if (latestSubmissions.length > 0) {
          setSelectedModule(latestSubmissions[0].moduleName || latestSubmissions[0].id);
        }

        // 3. Fetch Questions for ALL submissions found
        const allQuestionIds = new Set<string>();
        submissionsData.forEach(sub => {
            Object.keys(sub.answers).forEach(id => allQuestionIds.add(id));
        });

        console.log("Fetching questions for", allQuestionIds.size, "question IDs");
        
        const qData: Record<string, Question> = {};
        await Promise.all(Array.from(allQuestionIds).map(async (qid) => {
            let qSnap = await getDoc(doc(db, "gg-questions", qid));
            if(!qSnap.exists()) qSnap = await getDoc(doc(db, "questions", qid));
            if(qSnap.exists()) qData[qid] = { id: qSnap.id, ...qSnap.data() } as Question;
        }));
        
        console.log("Loaded", Object.keys(qData).length, "questions");
        setQuestions(qData);
      } catch (e) {
        console.error("Error in fetch:", e);
        toast.error("Error loading submissions");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [params]);

  if (isLoading) return (
    <div className="min-h-screen  flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-emerald-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading submissions...</p>
      </div>
    </div>
  );
  
  if (allSubmissions.length === 0) return (
    <div className="min-h-screen bg-gray-950 text-white px-6 md:px-12">
      <Toaster />
      <div className=" mx-auto">
        <button onClick={() => router.push('/admin/users')} className="mb-6 text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Users
        </button>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">No Submissions Found</h2>
          <p className="text-gray-400 mb-6">This user hasn't submitted any assessments yet.</p>
          <button 
            onClick={() => router.push('/admin/users')} 
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all"
          >
            Back to Users
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen  text-white  ">
      <Toaster />
      
      <div className=" mx-auto">
        <button onClick={() => router.push('/admin/users')} className="mb-6 text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-2 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Users
        </button>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">{allSubmissions[0].name}</h1>
        <p className="text-gray-400 mb-6 md:mb-8">Submission History ({allSubmissions.length} module{allSubmissions.length !== 1 ? 's' : ''})</p>
        
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left Sidebar - Module Tabs */}
            <div className="w-full lg:w-80 flex-shrink-0 space-y-2">
                {allSubmissions.map((submission) => {
                    const percentage = Math.round((submission.score / (submission.totalQuestions || 1)) * 100);
                    const moduleKey = submission.moduleName || submission.id;
                    const isSelected = selectedModule === moduleKey;
                    
                    return (
                        <button
                            key={submission.id}
                            onClick={() => setSelectedModule(moduleKey)}
                            className={`w-full text-left p-3 md:p-4 rounded-xl border-2 transition-all ${
                                isSelected 
                                ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/20" 
                                : "bg-gray-900 border-gray-800 hover:border-gray-700 hover:bg-gray-800/50"
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-bold text-xs sm:text-sm line-clamp-2 flex-1 pr-2 ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                    {submission.moduleName || "General Assessment"}
                                </h3>
                                <div className={`text-base sm:text-lg font-bold flex-shrink-0 ${
                                    percentage >= 70 ? "text-emerald-400" : 
                                    percentage >= 50 ? "text-yellow-400" : 
                                    "text-red-400"
                                }`}>
                                    {percentage}%
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                                {submission.moduleName && (
                                    <span className="bg-indigo-500/20 text-indigo-300 px-1.5 sm:px-2 py-0.5 rounded font-semibold">
                                        Module
                                    </span>
                                )}
                                {submission.attemptNumber && (
                                    <span className="bg-blue-500/20 text-blue-300 px-1.5 sm:px-2 py-0.5 rounded font-semibold">
                                        Attempt {submission.attemptNumber}/3
                                    </span>
                                )}
                                {submission.passed !== undefined && (
                                    <span className={`px-1.5 sm:px-2 py-0.5 rounded font-bold ${
                                        submission.passed 
                                        ? "bg-emerald-500/20 text-emerald-300" 
                                        : "bg-red-500/20 text-red-300"
                                    }`}>
                                        {submission.passed ? "✓ Passed" : "✗ Failed"}
                                    </span>
                                )}
                            </div>
                            
                            <p className="text-gray-500 text-xs mt-2 hidden sm:block">
                                {new Date(submission.submittedAt?.toDate?.() || submission.submittedAt).toLocaleString()}
                            </p>
                            
                            <div className="text-gray-400 text-xs mt-1">
                                Score: {submission.score}/{submission.totalQuestions}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {/* Right Content - Module Details */}
            <div className="flex-1">
                {selectedModule && (() => {
                    const submission = allSubmissions.find(s => (s.moduleName || s.id) === selectedModule);
                    if (!submission) return null;
                    
                    const percentage = Math.round((submission.score / (submission.totalQuestions || 1)) * 100);
                    
                    return (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-4 md:p-6">
                            {/* Header */}
                            <div className="mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-800">
                                <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
                                    {submission.moduleName || "General Assessment"}
                                </h2>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                                    <div className="flex items-center gap-2 bg-black/30 px-3 md:px-4 py-2 rounded-lg border border-gray-800">
                                        <span className="text-gray-400 text-xs sm:text-sm">Score:</span>
                                        <span className="text-white font-semibold text-sm sm:text-base">{submission.score}/{submission.totalQuestions}</span>
                                        <span className={`text-lg sm:text-xl font-bold ml-1 sm:ml-2 ${
                                            percentage >= 70 ? "text-emerald-400" : 
                                            percentage >= 50 ? "text-yellow-400" : 
                                            "text-red-400"
                                        }`}>
                                            {percentage}%
                                        </span>
                                    </div>
                                    <span className="text-gray-400 text-xs sm:text-sm">
                                        {new Date(submission.submittedAt?.toDate?.() || submission.submittedAt).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Questions */}
                            <div className="space-y-4">
                                {Object.entries(submission.answers).map(([qId, ansIdx], index) => {
                                    const q = questions[qId];
                                    const questionText = q ? q.question : "[Question deleted from database]";
                                    const options = q ? q.options : [];
                                    const correctAnswers = q ? q.correctAnswers : [];

                                    const userAnsIndices = Array.isArray(ansIdx) ? ansIdx : [ansIdx];
                                    const userAnsText = userAnsIndices.map(i => options[i] || `Option ${i+1}`).join(", ");
                                    const correctAnsText = correctAnswers.map(i => options[i]).join(", ");
                                    
                                    const isCorrect = JSON.stringify(userAnsIndices.sort()) === JSON.stringify(correctAnswers.sort());

                                    return (
                                        <div key={qId} className={`p-3 md:p-5 rounded-xl border-l-4 bg-gray-900/50 ${isCorrect ? "border-emerald-500" : "border-red-500"}`}>
                                            <div className="flex items-start gap-2 md:gap-3 mb-3">
                                                <span className="text-gray-500 font-bold text-xs md:text-sm flex-shrink-0">Q{index + 1}.</span>
                                                <p className="font-medium text-gray-200 flex-1 text-sm md:text-base">{questionText}</p>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm ml-5 md:ml-7">
                                                <div className={`p-2.5 md:p-3 rounded-lg border ${isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                                                    <span className={`block text-xs mb-1 uppercase font-bold ${isCorrect ? "text-emerald-500" : "text-red-500"}`}>Candidate Answer</span>
                                                    <span className="text-white text-xs md:text-sm">{userAnsText}</span>
                                                </div>
                                                {!isCorrect && (
                                                    <div className="bg-gray-800/50 p-2.5 md:p-3 rounded-lg border border-gray-700">
                                                        <span className="text-gray-500 block text-xs mb-1 uppercase font-bold">Correct Answer</span>
                                                        <span className="text-emerald-400 text-xs md:text-sm">{correctAnsText}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
      </div>
    </div>
  );
}