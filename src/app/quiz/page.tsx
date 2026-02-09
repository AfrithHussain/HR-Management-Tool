"use client";

import { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { UserRole } from "../../utils/whitelist";

// --- Types ---
interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswers: number[];
  isMultiSelect: boolean;
  role?: UserRole;
  moduleName?: string;
  difficulty?: string;
}

interface ModuleStatus {
  name: string;
  isLocked: boolean; // Not in allowedModules
  isCompleted: boolean; // Found in submissions
  questionCount: number;
  attempts?: number;
  passed?: boolean;
  bestScore?: number;
}

export default function QuizPage() {
  // --- Global State ---
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbRole, setDbRole] = useState<string>(""); // To track if user is plug/socket
  
  // View State
  const [viewState, setViewState] = useState<"loading" | "dashboard" | "quiz" | "result" | "completed">("loading");

  // --- Quiz Logic State ---
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Result State ---
  const [lastScore, setLastScore] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [hasPassed, setHasPassed] = useState(false);
  
  // --- Dashboard Data ---
  const [modulesList, setModulesList] = useState<ModuleStatus[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  
  const router = useRouter();

  // --- Data Loading Function ---
  const loadData = async () => {
    setIsLoading(true);
    try {
      const userCookie = Cookies.get("user");
      if (!userCookie) {
        setIsLoading(false);
        return; 
      }
      
      const userData = JSON.parse(userCookie);
      setUser(userData);

      // A. Fetch User Permissions
      const userDoc = await getDoc(doc(db, "users", userData.email));
      if (!userDoc.exists()) {
        toast.error("User not found in whitelist.");
        setIsLoading(false);
        return;
      }

      const userInfo = userDoc.data();
      const userRole: UserRole = userInfo.role;
      const allowedModules: string[] = userInfo.allowedModules || [];
      const progress = userInfo.moduleProgress || {}; 

      setDbRole(userRole);

      // B. Fetch Previous Submissions (to check completion)
      const subQuery = query(collection(db, "submissions"), where("email", "==", userData.email));
      const subSnap = await getDocs(subQuery);
      const submissions = subSnap.docs.map(d => d.data());

      // === LOGIC BRANCH ===
      
      // BRANCH 1: PRODUCT ROLES (Plug/Socket) -> SHOW DASHBOARD
      if (userRole === "plug" || userRole === "socket") {
        // 1. Get all questions for this role to find available modules
        const qQuery = query(collection(db, "gg-questions"), where("role", "==", userRole));
        const qSnap = await getDocs(qQuery);
        const allRoleQuestions = qSnap.docs.map(d => d.data());

        // 2. Aggregate Modules (Count questions per module)
        const modMap = new Map<string, number>();
        allRoleQuestions.forEach((q: any) => {
           if (q.moduleName) {
               modMap.set(q.moduleName, (modMap.get(q.moduleName) || 0) + 1);
           }
        });

        // 3. Build Module List with Status
        const modules: ModuleStatus[] = Array.from(modMap.keys()).sort((a, b) => {
           // Numeric Sort: Module 1, Module 2, Module 10...
           const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
           const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
           return numA - numB;
        }).map(modName => {
           // Get module progress from user profile
           const modProgress = progress[modName];
           const attempts = modProgress?.attempts || 0;
           const passed = modProgress?.passed || false;
           const bestScore = modProgress?.bestScore || 0;
           
           return {
             name: modName,
             questionCount: modMap.get(modName) || 0,
             // Locked if NOT in the whitelist allowed array
             isLocked: !allowedModules.includes(modName), 
             // Completed if passed OR reached max attempts (3)
             isCompleted: passed || attempts >= 3,
             attempts,
             passed,
             bestScore,
           };
        });

        setModulesList(modules);
        
        // Calculate badges: one badge per passed module
        const passedModules = modules.filter(m => m.passed).map(m => m.name);
        setEarnedBadges(passedModules);
        setTotalBadges(allowedModules.length); // Total possible badges = allowed modules
        
        setViewState("dashboard");
      } 
      
      // BRANCH 2: TRADITIONAL ROLES (Frontend/Backend) -> SINGLE QUIZ
      else {
         // If already submitted anything, show completed screen
         if (submissions.length > 0) {
            setViewState("completed");
         } else {
            // Fetch questions from OLD collection
            const qQuery = query(collection(db, "questions"), where("role", "==", userRole));
            const qSnap = await getDocs(qQuery);
            const qs = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
            
            if (qs.length === 0) {
               // Fallback for generic questions
               const genericQQuery = query(collection(db, "questions"));
               const genericSnap = await getDocs(genericQQuery);
               const genericQs = genericSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
                  .filter(q => !q.role || q.role === userRole);
               setQuestions(genericQs);
            } else {
              setQuestions(qs);
            }
            
            if (questions.length === 0 && qs.length === 0) {
                // Wait for render to show "No questions"
            } else {
                setViewState("quiz");
            }
         }
      }

    } catch (e) {
      console.error(e);
      toast.error("Error loading quiz data.");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. INITIALIZATION
  useEffect(() => {
    loadData();
  }, []);

  // --- ACTIONS ---

  // Start a specific module (Only for Product Roles)
  const handleStartModule = async (moduleName: string) => {
     setIsLoading(true);
     try {
        // Get current attempts for this module
        const userDoc = await getDoc(doc(db, "users", user.email));
        const userData = userDoc.data();
        const moduleProgress = userData?.moduleProgress || {};
        const currentProgress = moduleProgress[moduleName] || { attempts: 0, passed: false };
        
        // Check if already passed or max attempts reached
        if (currentProgress.passed) {
            toast.error("You have already passed this module!");
            setIsLoading(false);
            return;
        }
        
        if (currentProgress.attempts >= 3) {
            toast.error("Maximum attempts (3) reached for this module.");
            setIsLoading(false);
            return;
        }
        
        const qQuery = query(collection(db, "gg-questions"), where("moduleName", "==", moduleName));
        const qSnap = await getDocs(qQuery);
        const modQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
        
        if (modQuestions.length === 0) {
            toast.error("This module has no questions yet.");
            setIsLoading(false);
            return;
        }

        setQuestions(modQuestions);
        setActiveModule(moduleName);
        setCurrentQuestionIndex(0);
        setSelectedAnswers({});
        setCurrentAttempts(currentProgress.attempts);
        setViewState("quiz");
     } catch (e) {
        console.error(e);
        toast.error("Failed to start module.");
     } finally {
        setIsLoading(false);
     }
  };

  const handleOptionSelect = (qId: string, optIndex: number, isMulti: boolean) => {
    setSelectedAnswers(prev => {
        const current = prev[qId] || [];
        if (isMulti) {
            if (current.includes(optIndex)) {
                return { ...prev, [qId]: current.filter(i => i !== optIndex) };
            } else {
                return { ...prev, [qId]: [...current, optIndex] };
            }
        }
        return { ...prev, [qId]: [optIndex] };
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    let score = 0;
    questions.forEach((q) => {
      const correct = q.correctAnswers.sort().toString();
      const selected = (selectedAnswers[q.id] || []).sort().toString();
      if (correct === selected) score += 1;
    });

    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 70;

    const submissionData = {
      userId: user.uid,
      email: user.email,
      name: user.displayName || user.name,
      role: user.role || "unknown",
      answers: selectedAnswers,
      score,
      totalQuestions: questions.length,
      submittedAt: Timestamp.now(),
      moduleName: activeModule || null,
      passed,
      attemptNumber: currentAttempts + 1,
    };

    try {
      // 1. Create Submission Log
      const ref = await addDoc(collection(db, "submissions"), submissionData);
      
      // 2. Update User Profile Progress
      const { updateUserScore } = await import("../../utils/whitelist");
      await updateUserScore(user.email, score, questions.length, ref.id, activeModule);

      // 3. Set result state
      setLastScore(score);
      setLastTotal(questions.length);
      setCurrentAttempts(currentAttempts + 1);
      setHasPassed(passed);
      
      setViewState("result");
      toast.success("Submitted successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
     if (!(selectedAnswers[questions[currentQuestionIndex]?.id]?.length > 0)) {
         return toast.error("Please select an answer");
     }
     setCurrentQuestionIndex(curr => curr + 1);
  };

  const handleLogout = async () => {
    await signOut(auth);
    Cookies.remove("user");
    router.push("/");
  };

  // ✅ New Logic: Updates data and returns to dashboard without reloading page
  const handleBackToDashboard = async () => {
      setViewState("loading");
      setActiveModule(null);
      setQuestions([]);
      setSelectedAnswers({});
      setCurrentQuestionIndex(0);
      await loadData(); // Re-fetch to update "Completed" status
  };
  
  const handleRetakeModule = () => {
      if (currentAttempts >= 3) {
          toast.error("Maximum attempts reached!");
          return;
      }
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setViewState("quiz");
  };

  // --- VIEWS ---

  if (isLoading) return (
      <div className="flex flex-col items-center justify-center w-screen h-screen py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-800 border-t-emerald-500 mb-4"></div>
          <p className="text-gray-500 animate-pulse ">Loading quizz...</p>
      </div>
  );

  // 1. DASHBOARD VIEW
  if (viewState === "dashboard") {
      const badgePercentage = totalBadges > 0 ? (earnedBadges.length / totalBadges) * 100 : 0;
      
      return (
        <div className="w-full text-white">
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto py-10 px-4">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Learning Dashboard</h1>
                        <p className="text-gray-400">Complete your assigned modules to proceed.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => router.push('/documents')} 
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span>📚</span>
                            <span>Documents</span>
                        </button>
                        <button onClick={handleLogout} className="px-5 py-2.5 border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors">
                            Logout
                        </button>
                    </div>
                </header>

                {/* Badges Section */}
                <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Badge Count */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">
                                    {earnedBadges.length} / {totalBadges} Badges
                                </h2>
                                <p className="text-sm text-gray-400">
                                    {earnedBadges.length === totalBadges 
                                        ? "🎉 All badges earned!" 
                                        : `${totalBadges - earnedBadges.length} more to go`
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 w-full md:max-w-md">
                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                <span>Progress</span>
                                <span>{Math.round(badgePercentage)}%</span>
                            </div>
                            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transition-all duration-500 ease-out"
                                    style={{ width: `${badgePercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Badge Icons */}
                        <div className="flex gap-2 flex-wrap justify-center">
                            {Array.from({ length: totalBadges }).map((_, idx) => (
                                <div 
                                    key={idx}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        idx < earnedBadges.length
                                            ? "bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50 scale-100"
                                            : "bg-gray-800 border border-gray-700 scale-90 opacity-50"
                                    }`}
                                    title={idx < earnedBadges.length ? earnedBadges[idx] : "Locked"}
                                >
                                    {idx < earnedBadges.length ? (
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modulesList.map((mod) => {
                        const canRetake = !mod.passed && (mod.attempts || 0) < 3 && !mod.isLocked;
                        const attemptsLeft = 3 - (mod.attempts || 0);
                        const hasBadge = mod.passed;
                        
                        return (
                        <div key={mod.name} className={`relative p-6 rounded-2xl border transition-all duration-300 group ${mod.isLocked ? "bg-gray-900/30 border-gray-800 opacity-60" : "bg-gray-900/80 border-gray-700 hover:border-emerald-500/50"}`}>
                            {/* Badge Icon - Top Right */}
                            {hasBadge && (
                                <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                </div>
                            )}
                            
                            {/* Status Badge */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    mod.passed ? "bg-emerald-500/20 text-emerald-400" : 
                                    mod.isLocked ? "bg-gray-800 text-gray-500" : 
                                    (mod.attempts || 0) > 0 ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-blue-500/20 text-blue-400"
                                }`}>
                                    {mod.passed ? "Passed" : mod.isLocked ? "Locked" : (mod.attempts || 0) > 0 ? "In Progress" : "Available"}
                                </div>
                                <div className="text-2xl">{mod.passed ? "✅" : mod.isLocked ? "🔒" : (mod.attempts || 0) >= 3 ? "❌" : "🔓"}</div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 h-14">{mod.name}</h3>
                            <div className="text-xs gap-3 text-gray-500 mb-4 flex-wrap justify-start  items-center flex ">
                                <p className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-gray-600"></span>
                                    {mod.questionCount} Questions
                                </p>
                                {(mod.attempts || 0) > 0 && (
                                    <>
                                        <p className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Attempts: {mod.attempts}/3
                                        </p>
                                        {mod.bestScore !== undefined && (
                                            <p className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                Best Score: {mod.bestScore}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>

                            {mod.passed ? (
                                <div className="w-full py-3.5 bg-gray-800 rounded-xl text-center text-sm font-semibold text-emerald-400 border border-gray-700">
                                    ✓ Assessment Passed
                                </div>
                            ) : (mod.attempts || 0) >= 3 ? (
                                <div className="w-full py-3.5 bg-red-900/20 rounded-xl text-center text-sm font-semibold text-red-400 border border-red-900/50">
                                    Max Attempts Reached
                                </div>
                            ) : (
                                <button 
                                    onClick={() => !mod.isLocked && handleStartModule(mod.name)}
                                    disabled={mod.isLocked}
                                    className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                                        mod.isLocked 
                                        ? "bg-gray-800 text-gray-600 cursor-not-allowed" 
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg"
                                    }`}
                                >
                                    {mod.isLocked ? "Access Denied" : (mod.attempts || 0) > 0 ? `Retake (${attemptsLeft} left)` : "Start Module →"}
                                </button>
                            )}
                        </div>
                    )})}
                    {modulesList.length === 0 && (
                         <div className="col-span-full py-20 text-center text-gray-500">
                             <p>No modules found for your role. Contact admin.</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
      );
  }

  // 2. QUIZ VIEW
  if (viewState === "quiz") {
      const q = questions[currentQuestionIndex];
      const hasAnswer = (selectedAnswers[q.id] || []).length > 0;
      const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

      return (
        <div className="text-white flex flex-col items-center py-12 px-4 w-full">
            <Toaster position="top-center" />
            
            {/* Header */}
            <div className="w-full max-w-3xl flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
               <div>
                   {activeModule && <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded uppercase tracking-wider mb-2 inline-block">{activeModule}</span>}
                   <p className="text-gray-400 text-sm">Question {currentQuestionIndex + 1} of {questions.length}</p>
                </div>
                {activeModule && (
                    <button onClick={() => { if(confirm("Exit module? Progress will be lost.")) handleBackToDashboard(); }} className="text-xs text-red-400 border border-red-900/50 px-3 py-1 rounded hover:bg-red-900/10 transition-colors">
                        ✕ Exit
                    </button>
                )}
            </div>

            {/* Progress */}
            <div className="w-full max-w-3xl h-2 bg-gray-800 rounded-full mb-10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Question Card */}
            <div className="w-full max-w-3xl bg-gray-800/50 border border-gray-700 p-6 sm:p-10 rounded-2xl shadow-2xl">
                 <div className="mb-8">
                    {q.isMultiSelect && <span className="text-xs text-gray-500 border border-gray-700 px-2 py-1 rounded mb-4 inline-block">Multiple Choice</span>}
                    <h2 className="text-xl sm:text-2xl font-bold leading-relaxed">{q.question}</h2>
                 </div>
                 
                 <div className="space-y-3">
                    {q.options.map((opt, idx) => {
                        const isSelected = selectedAnswers[q.id]?.includes(idx);
                        return (
                            <label 
                                key={idx}
                                className={`
                                    flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                                    ${isSelected 
                                        ? "border-emerald-500 bg-emerald-500/10" 
                                        : "border-gray-700 bg-gray-800/30 hover:border-gray-600 hover:bg-gray-800/50"
                                    }
                                `}
                            >
                                <input 
                                    type={q.isMultiSelect ? "checkbox" : "radio"}
                                    name={`q-${q.id}`}
                                    className="sr-only"
                                    checked={!!isSelected}
                                    onChange={() => handleOptionSelect(q.id, idx, q.isMultiSelect)}
                                />
                                <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-${q.isMultiSelect ? 'md' : 'full'} border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-emerald-500 border-emerald-500" : "bg-gray-700 border-gray-600"}`}>
                                    {isSelected && (
                                        q.isMultiSelect 
                                        ? <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        : <div className="w-3 h-3 rounded-full bg-white"></div>
                                    )}
                                </div>
                                <span className={`text-base ${isSelected ? "text-white font-medium" : "text-gray-300"}`}>{opt}</span>
                            </label>
                        )
                    })}
                 </div>

                 <div className="mt-10 flex justify-end gap-3">
                    {currentQuestionIndex > 0 && (
                        <button onClick={() => setCurrentQuestionIndex(c => c - 1)} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all">
                            ← Previous
                        </button>
                    )}
                    {currentQuestionIndex < questions.length - 1 ? (
                        <button onClick={handleNext} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg transition-all">
                            Next →
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={!hasAnswer || isSubmitting} className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            {isSubmitting ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> Submitting...</> : "Submit Quiz ✓"}
                        </button>
                    )}
                 </div>
            </div>
        </div>
      )
  }

  // 3. RESULT VIEW
  if (viewState === "result" || viewState === "completed") {
      const isResult = viewState === "result";
      const isProductRole = dbRole === "plug" || dbRole === "socket";
      const percentage = lastTotal > 0 ? Math.round((lastScore / lastTotal) * 100) : 0;
      const attemptsLeft = 3 - currentAttempts;
      
      // For module-based assessments, show detailed results
      if (isProductRole && activeModule && isResult) {
          return (
              <div className="flex items-center justify-center p-4 py-20 w-full min-h-[80vh]">
                  <div className={`border p-10 rounded-3xl text-center max-w-lg w-full shadow-2xl relative overflow-hidden ${
                      hasPassed ? "bg-gray-900 border-emerald-500/50" : "bg-gray-900 border-yellow-500/50"
                  }`}>
                      <div className={`absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none ${
                          hasPassed ? "from-emerald-500/10" : "from-yellow-500/10"
                      }`}></div>
                      
                      {/* Icon */}
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-xl ${
                          hasPassed ? "bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10" : "bg-yellow-500/20 text-yellow-400 shadow-yellow-500/10"
                      }`}>
                          {hasPassed ? (
                              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                          ) : (
                              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                          )}
                      </div>
                      
                      {/* Title */}
                      <h2 className={`text-3xl font-bold mb-2 ${hasPassed ? "text-emerald-400" : "text-yellow-400"}`}>
                          {hasPassed ? "Congratulations! 🎉" : "Keep Trying!"}
                      </h2>
                      
                      <p className="text-gray-400 mb-6">
                          {hasPassed ? "You passed the assessment!" : "You didn't pass this time, but you can try again."}
                      </p>
                      
                      {/* Score Display */}
                      <div className="bg-black/30 border border-gray-800 rounded-2xl p-6 mb-6">
                          <div className="flex justify-around items-center">
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Your Score</div>
                                  <div className="text-3xl font-bold text-white">{lastScore}/{lastTotal}</div>
                              </div>
                              <div className="w-px h-12 bg-gray-700"></div>
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Percentage</div>
                                  <div className={`text-3xl font-bold ${hasPassed ? "text-emerald-400" : "text-yellow-400"}`}>
                                      {percentage}%
                                  </div>
                              </div>
                              <div className="w-px h-12 bg-gray-700"></div>
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Attempts</div>
                                  <div className="text-3xl font-bold text-white">{currentAttempts}/3</div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Pass/Fail Message */}
                      <div className={`p-4 rounded-xl mb-6 border ${
                          hasPassed 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" 
                          : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"
                      }`}>
                          <p className="text-sm font-medium">
                              {hasPassed 
                                  ? "✓ You scored 70% or above. Well done!" 
                                  : `You need 70% to pass. You scored ${percentage}%.`
                              }
                          </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="space-y-3">
                          {hasPassed ? (
                              <>
                                  {/* Badge Earned Notification */}
                                  <div className="bg-gradient-to-r from-yellow-400/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-4 mb-4">
                                      <div className="flex items-center justify-center gap-3">
                                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-bounce">
                                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                          </div>
                                          <div className="text-left">
                                              <p className="text-yellow-400 font-bold text-sm">Badge Earned! 🎉</p>
                                              <p className="text-yellow-300/80 text-xs">You've unlocked a new achievement</p>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <button 
                                      onClick={handleBackToDashboard} 
                                      className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]"
                                  >
                                      Back to Dashboard
                                  </button>
                              </>
                          ) : (
                              <>
                                  {attemptsLeft > 0 ? (
                                      <>
                                          <button 
                                              onClick={handleRetakeModule} 
                                              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]"
                                          >
                                              Retake Assessment ({attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left)
                                          </button>
                                          <button 
                                              onClick={handleBackToDashboard} 
                                              className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition-all"
                                          >
                                              Back to Dashboard
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          onClick={handleBackToDashboard} 
                                          className="w-full px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all"
                                      >
                                          Back to Dashboard (Max Attempts Reached)
                                      </button>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
          );
      }
      
      // Traditional completion view (non-module or already completed)
      return (
          <div className="flex items-center justify-center p-4 py-20 w-full min-h-[80vh]">
              <div className="bg-gray-900 border border-gray-800 p-10 rounded-3xl text-center max-w-md w-full shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
                  
                  <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-xl shadow-emerald-500/10">
                    <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-white mb-3">
                      {isResult ? "Module Completed!" : "Quiz Completed"}
                  </h2>
                  
                  <p className="text-gray-400 mb-8">Thank you for participating.</p>
                  
                  {isProductRole ? (
                      <button onClick={handleBackToDashboard} className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-[1.02]">
                          Back to Dashboard
                      </button>
                  ) : (
                      <button onClick={handleLogout} className="w-full px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-bold transition-all">
                          Logout
                      </button>
                  )}
              </div>
          </div>
      )
  }

  return null;
}