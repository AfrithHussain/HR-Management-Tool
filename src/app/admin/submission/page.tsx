"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";

interface GeneralSubmission {
  id: string;
  email: string;
  name: string;
  role: string;
  score: number;
  totalQuestions: number;
  submittedAt: any;
  answers: Record<string, number[]>;
}

interface UserWithModules {
  email: string;
  name: string;
  role: string;
  allowedModules: string[];
  moduleProgress: Record<string, {
    attempts: number;
    passed: boolean;
    bestScore: number;
    lastAttemptAt: any;
  }>;
}

export default function SubmissionsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "module">("general");
  const [generalSubmissions, setGeneralSubmissions] = useState<GeneralSubmission[]>([]);
  const [moduleUsers, setModuleUsers] = useState<UserWithModules[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      // First, load all users to get their roles
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersMap = new Map<string, any>();
      const usersWithModules: UserWithModules[] = [];
      
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersMap.set(doc.id, userData);
        
        // Collect users with module-based roles (plug/socket)
        if ((userData.role === "plug" || userData.role === "socket") && userData.moduleProgress) {
          usersWithModules.push({
            email: doc.id,
            name: userData.name || doc.id,
            role: userData.role,
            allowedModules: userData.allowedModules || [],
            moduleProgress: userData.moduleProgress || {},
          });
        }
      });
      
      // Load general submissions (latest per user)
      const submissionsQuery = query(
        collection(db, "submissions"),
        orderBy("submittedAt", "desc")
      );
      const snapshot = await getDocs(submissionsQuery);
      
      const generalMap = new Map<string, GeneralSubmission>();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only general assessments (no moduleName)
        if (!data.moduleName) {
          // Keep only the latest submission per email
          if (!generalMap.has(data.email)) {
            // Get role from users collection
            const userRole = usersMap.get(data.email)?.role || data.role || "unknown";
            
            generalMap.set(data.email, {
              id: doc.id,
              ...data,
              role: userRole, // Override with role from users collection
            } as GeneralSubmission);
          }
        }
      });
      
      setGeneralSubmissions(Array.from(generalMap.values()));
      setModuleUsers(usersWithModules);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGeneralSubmissions = generalSubmissions.filter((sub) => {
    const matchesSearch =
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || sub.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredModuleUsers = moduleUsers.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    
    // Filter by module
    let matchesModule = filterModule === "all";
    if (!matchesModule && user.moduleProgress) {
      matchesModule = Object.keys(user.moduleProgress).includes(filterModule);
    }
    
    // Filter by status
    let matchesStatus = filterStatus === "all";
    if (!matchesStatus && user.moduleProgress) {
      const progressValues = Object.values(user.moduleProgress);
      if (filterStatus === "passed") {
        matchesStatus = progressValues.some(p => p.passed);
      } else if (filterStatus === "failed") {
        matchesStatus = progressValues.some(p => !p.passed && p.attempts >= 3);
      } else if (filterStatus === "in-progress") {
        matchesStatus = progressValues.some(p => !p.passed && p.attempts > 0 && p.attempts < 3);
      }
    }
    
    return matchesSearch && matchesRole && matchesModule && matchesStatus;
  });

  // Get unique modules filtered by selected role
  const uniqueModules = Array.from(
    new Set(
      moduleUsers
        .filter(user => filterRole === "all" || user.role === filterRole) // Filter by role first
        .flatMap(user => Object.keys(user.moduleProgress || {}))
    )
  ).sort((a, b) => {
    const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
    const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
    return numA - numB;
  });

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 70) return "text-emerald-400";
    if (percentage >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Submissions</h1>
        <p className="text-gray-400">View all assessment submissions</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab("general")}
          className={`text-lg font-medium transition-all px-4 py-2 ${
            activeTab === "general"
              ? "text-white border-b-2 border-emerald-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Interview Screening ({generalSubmissions.length})
        </button>
        <button
          onClick={() => setActiveTab("module")}
          className={`text-lg font-medium transition-all px-4 py-2 ${
            activeTab === "module"
              ? "text-white border-b-2 border-emerald-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          GG Internal Assessment ({moduleUsers.length})
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <select
          value={filterRole}
          onChange={(e) => {
            setFilterRole(e.target.value);
            setFilterModule("all"); // Reset module filter when role changes
          }}
          className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          <option value="all">All Roles</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="plug">Plug</option>
          <option value="socket">Socket</option>
        </select>
        {activeTab === "module" && (
          <>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Modules</option>
              {uniqueModules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {activeTab === "general" ? (
            // General Assessments Table
            <div className="overflow-x-auto">
              {filteredGeneralSubmissions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No interview screening submissions found.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="border-b border-gray-700">
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Candidate
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Email
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Role
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Score
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Submitted
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGeneralSubmissions.map((sub) => {
                      // Handle NaN by checking if score and totalQuestions are valid numbers
                      const score = typeof sub.score === 'number' && !isNaN(sub.score) ? sub.score : 0;
                      const totalQuestions = typeof sub.totalQuestions === 'number' && !isNaN(sub.totalQuestions) && sub.totalQuestions > 0 ? sub.totalQuestions : 1;
                      const percentage = Math.round((score / totalQuestions) * 100);
                      
                      return (
                        <tr
                          key={sub.id}
                          className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="p-4 text-gray-200">{sub.name || "-"}</td>
                          <td className="p-4 text-gray-200 text-sm">{sub.email}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded capitalize">
                              {sub.role || "N/A"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${getScoreColor(score, totalQuestions)}`}>
                                {score}/{totalQuestions}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  percentage >= 70
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : percentage >= 50
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                                }`}
                              >
                                {percentage}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-gray-400 text-sm">
                            {sub.submittedAt?.toDate?.()?.toLocaleString() || "-"}
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/admin/submission/${sub.id}`}
                              className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            // Module Assessments Table
            <div className="overflow-x-auto">
              {filteredModuleUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No GG internal assessment users found.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="border-b border-gray-700">
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Candidate
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Email
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Role
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Modules Progress
                      </th>
                      <th className="p-4 text-left text-gray-300 font-semibold text-sm">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModuleUsers.map((user) => {
                      return (
                        <tr
                          key={user.email}
                          className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="p-4 text-gray-200">{user.name || "-"}</td>
                          <td className="p-4 text-gray-200 text-sm">{user.email}</td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded capitalize">
                              {user.role || "N/A"}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(user.moduleProgress || {}).map(([modName, progress]) => {
                                const percentage = progress.bestScore || 0;
                                return (
                                  <div key={modName} className="flex items-center gap-2 bg-gray-900/50 px-3 py-2 rounded-lg border border-gray-700">
                                    <div className="flex flex-col">
                                      <span className="text-xs text-gray-400 truncate max-w-[150px]">
                                        {modName.replace(/^Module \d+: /, "")}
                                      </span>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs font-semibold ${
                                          progress.passed 
                                            ? "text-emerald-400" 
                                            : progress.attempts >= 3
                                            ? "text-red-400"
                                            : "text-yellow-400"
                                        }`}>
                                          {progress.passed ? `✓ ${percentage}%` : `${progress.attempts}/3 attempts`}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                            progress.passed
                                              ? "bg-emerald-500/20 text-emerald-400"
                                              : progress.attempts >= 3
                                              ? "bg-red-500/20 text-red-400"
                                              : "bg-yellow-500/20 text-yellow-400"
                                          }`}
                                        >
                                          {progress.passed ? "Passed" : progress.attempts >= 3 ? "Failed" : "In Progress"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4">
                            <Link
                              href={`/admin/submission/${encodeURIComponent(user.email)}`}
                              className="text-blue-400 hover:text-blue-300 font-medium text-sm"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
