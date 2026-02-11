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
  const [dbRole, setDbRole] = useState<string>(""); // To track user's role
  const [userProducts, setUserProducts] = useState<UserRole[]>([]); // All products user has access to
  const [activeProduct, setActiveProduct] = useState<UserRole | null>(null); // Currently selected product tab
  
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
      
      // Check if user is superuser - redirect to admin
      if (userInfo.isSuperuser === true) {
        console.log("Superuser detected, redirecting to admin dashboard");
        router.push("/admin/dashboard");
        return;
      }
      
      const userRole: UserRole = userInfo.role;
      const userRoles: UserRole[] = userInfo.roles || [userRole]; // Get all roles or fallback to single role
      const allowedModules: string[] = userInfo.allowedModules || [];
      const progress = userInfo.moduleProgress || {}; 

      setDbRole(userRole);

      // B. Fetch Previous Submissions (to check completion)
      const subQuery = query(collection(db, "submissions"), where("email", "==", userData.email));
      const subSnap = await getDocs(subQuery);
      const submissions = subSnap.docs.map(d => d.data());

      // === LOGIC BRANCH ===
      
      // BRANCH 1: PRODUCT ROLES -> SHOW DASHBOARD
      const productRoles = ["cloudsync-pro", "taskflow", "analytics-pro", "company-training"];
      const userProductRoles = userRoles.filter(r => productRoles.includes(r));
      
      if (userProductRoles.length > 0) {
        // User has product roles - show dashboard with tabs
        setUserProducts(userProductRoles);
        setActiveProduct(userProductRoles[0]);
        setDbRole(userProductRoles[0]);
        
        // 1. Get all questions for the first product to find available modules
        const qQuery = query(collection(db, "gg-questions"), where("role", "==", userProductRoles[0]));
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
        
        // Calculate badges: one badge per passed module FOR THIS PRODUCT ONLY
        const passedModules = modules.filter(m => m.passed).map(m => m.name);
        setEarnedBadges(passedModules);
        
        // Total badges = modules that exist for this product AND user has access to
        const allowedModulesForThisProduct = modules.filter(m => !m.isLocked).length;
        setTotalBadges(allowedModulesForThisProduct);
        
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

  // Switch active product tab
  const handleProductSwitch = async (product: UserRole) => {
    if (product === activeProduct) return;
    
    setIsLoading(true);
    setActiveProduct(product);
    setDbRole(product);
    
    try {
      // Fetch user data for this product
      const userDoc = await getDoc(doc(db, "users", user.email));
      if (!userDoc.exists()) {
        toast.error("User data not found");
        setIsLoading(false);
        return;
      }
      
      const userInfo = userDoc.data();
      const allowedModules: string[] = userInfo.allowedModules || [];
      const progress = userInfo.moduleProgress || {};
      
      // Get all questions for this product
      const qQuery = query(collection(db, "gg-questions"), where("role", "==", product));
      const qSnap = await getDocs(qQuery);
      const allRoleQuestions = qSnap.docs.map(d => d.data());
      
      // Aggregate Modules
      const modMap = new Map<string, number>();
      allRoleQuestions.forEach((q: any) => {
        if (q.moduleName) {
          modMap.set(q.moduleName, (modMap.get(q.moduleName) || 0) + 1);
        }
      });
      
      // Build Module List
      const modules: ModuleStatus[] = Array.from(modMap.keys()).sort((a, b) => {
        const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
        const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
        return numA - numB;
      }).map(modName => {
        const modProgress = progress[modName];
        const attempts = modProgress?.attempts || 0;
        const passed = modProgress?.passed || false;
        const bestScore = modProgress?.bestScore || 0;
        
        return {
          name: modName,
          questionCount: modMap.get(modName) || 0,
          isLocked: !allowedModules.includes(modName),
          isCompleted: passed || attempts >= 3,
          attempts,
          passed,
          bestScore,
        };
      });
      
      setModulesList(modules);
      
      // Calculate badges FOR THIS PRODUCT ONLY
      const passedModules = modules.filter(m => m.passed).map(m => m.name);
      setEarnedBadges(passedModules);
      
      // Total badges = modules that exist for this product AND user has access to
      const allowedModulesForThisProduct = modules.filter(m => !m.isLocked).length;
      setTotalBadges(allowedModulesForThisProduct);
    } catch (e) {
      console.error(e);
      toast.error("Failed to switch product");
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="flex flex-col items-center justify-center w-screen h-screen py-20 bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900 mb-4"></div>
          <p className="text-gray-600 animate-pulse">Loading quiz...</p>
      </div>
  );

  // 1. DASHBOARD VIEW
  if (viewState === "dashboard") {
      const badgePercentage = totalBadges > 0 ? (earnedBadges.length / totalBadges) * 100 : 0;
      const hasMultipleProducts = userProducts.length > 1;
      
      // Get product label
      const getProductLabel = (role: UserRole) => {
        const product = [
          { value: "cloudsync-pro", label: "CloudSync Pro" },
          { value: "taskflow", label: "TaskFlow" },
          { value: "analytics-pro", label: "AnalyticsPro" },
          { value: "company-training", label: "Company Training" },
        ].find(p => p.value === role);
        return product?.label || role;
      };
      
      return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto py-8 px-4">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Learning Dashboard</h1>
                        <p className="text-gray-600">Complete your assigned modules to proceed.</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => router.push('/documents')} 
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <span>📚</span>
                            <span>Documents</span>
                        </button>
                        <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                            Logout
                        </button>
                    </div>
                </header>

                {/* Product Tabs - Show only if user has multiple products */}
                {hasMultipleProducts && (
                  <div className="mb-6 border-b border-gray-200 bg-white rounded-t-lg">
                    <div className="flex gap-1 overflow-x-auto px-4">
                      {userProducts.map((product) => (
                        <button
                          key={product}
                          onClick={() => handleProductSwitch(product)}
                          className={`px-6 py-3 text-sm font-medium transition-all whitespace-nowrap border-b-2 ${
                            activeProduct === product
                              ? "text-gray-900 border-gray-900"
                              : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                          }`}
                        >
                          {getProductLabel(product)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Badges Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {earnedBadges.length} / {totalBadges} Badges
                                </h2>
                                <p className="text-sm text-gray-600">
                                    {earnedBadges.length === totalBadges 
                                        ? "🎉 All badges earned for this product!" 
                                        : `${totalBadges - earnedBadges.length} more to go`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex-1 w-full md:max-w-md">
                            <div className="flex justify-between text-xs text-gray-600 mb-2">
                                <span>Progress</span>
                                <span>{Math.round(badgePercentage)}%</span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 transition-all duration-500 ease-out"
                                    style={{ width: `${badgePercentage}%` }}
                                ></div>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                            {Array.from({ length: totalBadges }).map((_, idx) => (
                                <div 
                                    key={idx}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                        idx < earnedBadges.length
                                            ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-md scale-100"
                                            : "bg-gray-200 border border-gray-300 scale-90 opacity-50"
                                    }`}
                                    title={idx < earnedBadges.length ? earnedBadges[idx] : "Locked"}
                                >
                                    {idx < earnedBadges.length ? (
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {modulesList.map((mod) => {
                        const canRetake = !mod.passed && (mod.attempts || 0) < 3 && !mod.isLocked;
                        const attemptsLeft = 3 - (mod.attempts || 0);
                        const hasBadge = mod.passed;
                        
                        return (
                        <div key={mod.name} className={`relative bg-white border rounded-lg p-5 transition-all ${
                            mod.isLocked 
                                ? "border-gray-200 opacity-60" 
                                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                        }`}>
                            {hasBadge && (
                                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide ${
                                    mod.passed ? "bg-green-100 text-green-700" : 
                                    mod.isLocked ? "bg-gray-100 text-gray-500" : 
                                    (mod.attempts || 0) > 0 ? "bg-amber-100 text-amber-700" :
                                    "bg-blue-100 text-blue-700"
                                }`}>
                                    {mod.passed ? "Passed" : mod.isLocked ? "Locked" : (mod.attempts || 0) > 0 ? "In Progress" : "Available"}
                                </div>
                                <div className="text-xl">{mod.passed ? "✅" : mod.isLocked ? "🔒" : (mod.attempts || 0) >= 3 ? "❌" : "🔓"}</div>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">{mod.name}</h3>
                            <div className="text-xs gap-2 text-gray-600 mb-4 flex flex-wrap items-center">
                                <p className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                    {mod.questionCount} Questions
                                </p>
                                {(mod.attempts || 0) > 0 && (
                                    <>
                                        <p className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            Attempts: {mod.attempts}/3
                                        </p>
                                        {mod.bestScore !== undefined && (
                                            <p className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                Best: {mod.bestScore}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                            {mod.passed ? (
                                <div className="w-full py-2.5 bg-green-50 border border-green-200 rounded-lg text-center text-sm font-semibold text-green-700">
                                    ✓ Assessment Passed
                                </div>
                            ) : (mod.attempts || 0) >= 3 ? (
                                <div className="w-full py-2.5 bg-red-50 border border-red-200 rounded-lg text-center text-sm font-semibold text-red-700">
                                    Max Attempts Reached
                                </div>
                            ) : (
                                <button 
                                    onClick={() => !mod.isLocked && handleStartModule(mod.name)}
                                    disabled={mod.isLocked}
                                    className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                        mod.isLocked 
                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                                        : "bg-gray-900 hover:bg-gray-800 text-white"
                                    }`}
                                >
                                    {mod.isLocked ? "Access Denied" : (mod.attempts || 0) > 0 ? `Retake (${attemptsLeft} left)` : "Start Module →"}
                                </button>
                            )}
                        </div>
                    )})}
                    {modulesList.length === 0 && (
                         <div className="col-span-full py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-lg">
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            <Toaster position="top-center" />
            
            {/* Header */}
            <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
               <div className="flex justify-between items-center">
                   <div>
                       {activeModule && <span className="text-sm text-gray-600 font-medium mb-1 block">{activeModule}</span>}
                       <p className="text-gray-900 text-base font-semibold">Question {currentQuestionIndex + 1} of {questions.length}</p>
                   </div>
                   {activeModule && (
                       <button onClick={() => { if(confirm("Exit module? Progress will be lost.")) handleBackToDashboard(); }} className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium">
                           ✕ Exit
                       </button>
                   )}
               </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-3xl mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-2 font-medium">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            {/* Question Card */}
            <div className="w-full max-w-3xl bg-white border border-gray-200 p-8 sm:p-10 rounded-xl shadow-sm">
                 <div className="mb-8">
                    {q.isMultiSelect && <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md mb-4 inline-block font-medium">Multiple Choice</span>}
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-relaxed">{q.question}</h2>
                 </div>
                 
                 <div className="space-y-3">
                    {q.options.map((opt, idx) => {
                        const isSelected = selectedAnswers[q.id]?.includes(idx);
                        return (
                            <label 
                                key={idx}
                                className={`
                                    flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                                    ${isSelected 
                                        ? "border-blue-500 bg-blue-50" 
                                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
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
                                <div className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-${q.isMultiSelect ? 'md' : 'full'} border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-300"}`}>
                                    {isSelected && (
                                        q.isMultiSelect 
                                        ? <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        : <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                                    )}
                                </div>
                                <span className={`text-base ${isSelected ? "text-gray-900 font-medium" : "text-gray-700"}`}>{opt}</span>
                            </label>
                        )
                    })}
                 </div>

                 <div className="mt-8 flex justify-end gap-3">
                    {currentQuestionIndex > 0 && (
                        <button onClick={() => setCurrentQuestionIndex(c => c - 1)} className="px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-all">
                            ← Previous
                        </button>
                    )}
                    {currentQuestionIndex < questions.length - 1 ? (
                        <button onClick={handleNext} className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all">
                            Next →
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={!hasAnswer || isSubmitting} className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
      const productRoles = ["cloudsync-pro", "taskflow", "analytics-pro", "company-training"];
      const isProductRole = productRoles.includes(dbRole);
      const percentage = lastTotal > 0 ? Math.round((lastScore / lastTotal) * 100) : 0;
      const attemptsLeft = 3 - currentAttempts;
      
      // For module-based assessments, show detailed results
      if (isProductRole && activeModule && isResult) {
          return (
              <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-20">
                  <div className={`bg-white border-2 p-10 rounded-2xl text-center max-w-lg w-full shadow-lg ${
                      hasPassed ? "border-green-200" : "border-amber-200"
                  }`}>
                      {/* Icon */}
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                          hasPassed ? "bg-green-100" : "bg-amber-100"
                      }`}>
                          {hasPassed ? (
                              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                          ) : (
                              <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                          )}
                      </div>
                      
                      {/* Title */}
                      <h2 className={`text-3xl font-bold mb-2 ${hasPassed ? "text-green-700" : "text-amber-700"}`}>
                          {hasPassed ? "Congratulations! 🎉" : "Keep Trying!"}
                      </h2>
                      
                      <p className="text-gray-600 mb-6">
                          {hasPassed ? "You passed the assessment!" : "You didn't pass this time, but you can try again."}
                      </p>
                      
                      {/* Score Display */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                          <div className="flex justify-around items-center">
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Your Score</div>
                                  <div className="text-3xl font-bold text-gray-900">{lastScore}/{lastTotal}</div>
                              </div>
                              <div className="w-px h-12 bg-gray-300"></div>
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Percentage</div>
                                  <div className={`text-3xl font-bold ${hasPassed ? "text-green-600" : "text-amber-600"}`}>
                                      {percentage}%
                                  </div>
                              </div>
                              <div className="w-px h-12 bg-gray-300"></div>
                              <div>
                                  <div className="text-gray-500 text-xs uppercase font-bold mb-1">Attempts</div>
                                  <div className="text-3xl font-bold text-gray-900">{currentAttempts}/3</div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Pass/Fail Message */}
                      <div className={`p-4 rounded-lg mb-6 border ${
                          hasPassed 
                          ? "bg-green-50 border-green-200 text-green-700" 
                          : "bg-amber-50 border-amber-200 text-amber-700"
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
                                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-4">
                                      <div className="flex items-center justify-center gap-3">
                                          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                              </svg>
                                          </div>
                                          <div className="text-left">
                                              <p className="text-amber-700 font-bold text-sm">Badge Earned! 🎉</p>
                                              <p className="text-amber-600 text-xs">You've unlocked a new achievement</p>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <button 
                                      onClick={handleBackToDashboard} 
                                      className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all"
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
                                              className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all"
                                          >
                                              Retake Assessment ({attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left)
                                          </button>
                                          <button 
                                              onClick={handleBackToDashboard} 
                                              className="w-full px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-all"
                                          >
                                              Back to Dashboard
                                          </button>
                                      </>
                                  ) : (
                                      <button 
                                          onClick={handleBackToDashboard} 
                                          className="w-full px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold transition-all"
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
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-20">
              <div className="bg-white border border-gray-200 p-10 rounded-2xl text-center max-w-md w-full shadow-lg">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                      {isResult ? "Module Completed!" : "Quiz Completed"}
                  </h2>
                  
                  <p className="text-gray-600 mb-8">Thank you for participating.</p>
                  
                  {isProductRole ? (
                      <button onClick={handleBackToDashboard} className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-all">
                          Back to Dashboard
                      </button>
                  ) : (
                      <button onClick={handleLogout} className="w-full px-6 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-semibold transition-all">
                          Logout
                      </button>
                  )}
              </div>
          </div>
      )
  }

  return null;
}