"use client";

import { useState, useEffect } from "react";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import {
  whitelistEmails,
  AVAILABLE_ROLES,
  AVAILABLE_PRODUCTS,
  UserRole,
} from "../../../utils/whitelist";

interface User {
  email: string;
  name: string;
  role: UserRole;
  isWhitelisted: boolean;
  isBlocked: boolean;
  isSuperuser: boolean;
  score: number | null;
  totalQuestions: number | null;
  status: "pending" | "accepted" | "rejected";
  comment: string;
  createdAt: any;
  lastLoginAt: any;
  submissionId: string | null;
  allowedModules: string[];
  moduleProgress?: Record<string, {
    attempts: number;
    passed: boolean;
    bestScore: number;
    lastAttemptAt: any;
  }>;
  hasSubmissions?: boolean; // Flag to check if user has any submissions
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("frontend");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isProductMode, setIsProductMode] = useState(false); // Toggle between roles and products

  const fetchRoleModules = async (role: UserRole) => {
    // Only fetch modules for product roles (plug/socket)
    if (role !== "plug" && role !== "socket") {
      setAvailableModules([]);
      return;
    }
    
    try {
      const querySnapshot = await getDocs(collection(db, "gg-questions"));
      const questions = querySnapshot.docs.map((doc) => doc.data());
      
      const modules = Array.from(new Set(
        questions
          .filter(q => q.role === role && q.moduleName)
          .map(q => q.moduleName)
      )).sort((a, b) => {
        const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
        const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
        return numA - numB;
      });
      
      setAvailableModules(modules);
    } catch (error) {
      console.error("Error fetching role modules:", error);
      setAvailableModules([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      fetchRoleModules(selectedRole);
      setSelectedModules([]); // Clear modules when role/product changes
    }
  }, [isAddModalOpen, selectedRole]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Force fresh data from server (not cache)
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        email: doc.id,
      })) as User[];
      
      // Check if each user has any submissions
      const usersWithSubmissionCheck = await Promise.all(
        usersData.map(async (user) => {
          // Check if user has any submissions in the submissions collection
          const submissionsQuery = query(
            collection(db, "submissions"),
            where("email", "==", user.email)
          );
          const submissionsSnapshot = await getDocs(submissionsQuery);
          
          return {
            ...user,
            hasSubmissions: submissionsSnapshot.size > 0,
          };
        })
      );
      
      setUsers(usersWithSubmissionCheck);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmails = async () => {
    const emails = emailInput
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e && e.includes("@"));

    if (emails.length === 0) {
      toast.error("Please enter valid email addresses");
      return;
    }

    // For product mode, require module selection
    if (isProductMode && selectedModules.length === 0) {
      toast.error("Please select at least one module for GG products");
      return;
    }

    setIsLoading(true);
    const result = await whitelistEmails(
      emails, 
      selectedRole, 
      isProductMode ? selectedModules : [] // Only pass modules for products
    );
    setIsLoading(false);

    if (result.success > 0) {
      const modeText = isProductMode ? "product" : "role";
      let successMessage = "";
      
      if (isProductMode && selectedModules.length > 0) {
        if (result.created > 0 && result.updated > 0) {
          successMessage = `Created ${result.created} new user(s) and updated ${result.updated} existing user(s) with ${selectedRole} ${modeText} and ${selectedModules.length} module(s)`;
        } else if (result.created > 0) {
          successMessage = `Created ${result.created} new user(s) with ${selectedRole} ${modeText} and ${selectedModules.length} module(s)`;
        } else if (result.updated > 0) {
          successMessage = `Updated ${result.updated} existing user(s) with ${selectedRole} ${modeText} and ${selectedModules.length} module(s)`;
        }
      } else {
        if (result.created > 0 && result.updated > 0) {
          successMessage = `Created ${result.created} new user(s) and updated ${result.updated} existing user(s) as ${selectedRole} ${modeText}`;
        } else if (result.created > 0) {
          successMessage = `Created ${result.created} new user(s) as ${selectedRole} ${modeText}`;
        } else if (result.updated > 0) {
          successMessage = `Updated ${result.updated} existing user(s) as ${selectedRole} ${modeText}`;
        }
      }
      
      toast.success(successMessage);
      setEmailInput("");
      setSelectedRole(isProductMode ? "plug" : "frontend");
      setSelectedModules([]);
      setIsAddModalOpen(false);
      fetchUsers();
    }

    if (result.duplicates.length > 0) {
      toast.error(`Already whitelisted: ${result.duplicates.join(", ")}`, {
        duration: 5000,
      });
    }

    if (result.failed.length > 0) {
      toast.error(`Failed to whitelist: ${result.failed.join(", ")}`);
    }
  };

  const handleUpdateStatus = async (
    email: string,
    status: "pending" | "accepted" | "rejected"
  ) => {
    try {
      await updateDoc(doc(db, "users", email), { status });
      setUsers(users.map((u) => (u.email === email ? { ...u, status } : u)));
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleToggleBlock = async (
    email: string,
    currentlyBlocked: boolean
  ) => {
    try {
      await updateDoc(doc(db, "users", email), {
        isBlocked: !currentlyBlocked,
      });
      setUsers(
        users.map((u) =>
          u.email === email ? { ...u, isBlocked: !currentlyBlocked } : u
        )
      );
      toast.success(currentlyBlocked ? "User unblocked" : "User blocked");
    } catch (error) {
      console.error("Error toggling block:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${email}?\n\nThis will:\n- Remove their user account completely\n- Delete all submission history\n- Clear all module assignments\n- Allow them to be re-added as a fresh new user\n\nThis action cannot be undone.`
      )
    )
      return;

    try {
      console.log(`Starting deletion process for ${email}`);
      
      // Query and delete all submissions for this user (by email and userId)
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("email", "==", email)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      console.log(`Found ${submissionsSnapshot.size} submissions to delete`);

      // Delete all submissions
      const deletePromises = submissionsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      console.log(`Deleted ${submissionsSnapshot.size} submissions`);

      // Delete the user document completely (this removes all data including modules)
      await deleteDoc(doc(db, "users", email));
      console.log(`Deleted user document for ${email}`);
      
      // Verify deletion by trying to fetch the user
      const userDoc = await getDoc(doc(db, "users", email));
      console.log(`User exists after deletion: ${userDoc.exists()}`);
      
      // Small delay to ensure Firestore has processed the deletion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the users list from database to ensure UI is up to date
      console.log(`Refreshing users list...`);
      await fetchUsers();
      console.log(`Users list refreshed`);

      if (submissionsSnapshot.size > 0) {
        toast.success(
          `✅ User ${email} completely deleted with ${submissionsSnapshot.size} submission(s). All module history cleared. Can be re-added as new user.`
        );
      } else {
        toast.success(`✅ User ${email} completely deleted. All module history cleared. Can be re-added as new user.`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleSaveComment = async (email: string) => {
    try {
      await updateDoc(doc(db, "users", email), { comment: commentText });
      setUsers(
        users.map((u) =>
          u.email === email ? { ...u, comment: commentText } : u
        )
      );
      setEditingComment(null);
      toast.success("Comment saved");
    } catch (error) {
      console.error("Error saving comment:", error);
      toast.error("Failed to save comment");
    }
  };

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || user.status === filterStatus;
      const matchesType =
        filterType === "all" ||
        (filterType === "superuser" && user.isSuperuser) ||
        (filterType === "candidate" && !user.isSuperuser);
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

  return (
    <>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all shadow-lg"
        >
          + Add Email(s)
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          <option value="all">All Users</option>
          <option value="superuser">Superusers</option>
          <option value="candidate">Candidates</option>
        </select>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-emerald-500"></div>
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr className="border-b border-gray-700">
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Name
                  </th>
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Email
                  </th>
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Role
                  </th>
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Status
                  </th>
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Comment
                  </th>
                  <th className="p-2 sm:p-4 text-left text-gray-300 font-semibold text-sm whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.email}
                    className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="p-2 sm:p-4 text-gray-200 text-sm">
                      <div className="whitespace-nowrap">
                        {user.name || "-"}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {user.isSuperuser && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            Admin
                          </span>
                        )}
                        {user.isBlocked && (
                          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 sm:p-4 text-gray-200 text-xs sm:text-sm">
                      <div className="max-w-[200px] truncate">{user.email}</div>
                    </td>
                    <td className="p-2 sm:p-4 text-gray-200 text-sm">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded capitalize">
                        {user.role || "frontend"}
                      </span>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.status}
                        onChange={(e) =>
                          handleUpdateStatus(user.email, e.target.value as any)
                        }
                        className={`px-3 py-1 rounded-lg text-sm font-medium outline-none ${
                          user.status === "accepted"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : user.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="p-4">
                      {editingComment === user.email ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-white text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveComment(user.email)}
                            className="text-emerald-400 hover:text-emerald-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingComment(null)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✗
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingComment(user.email);
                            setCommentText(user.comment || "");
                          }}
                          className="text-gray-300 text-sm cursor-pointer hover:text-white"
                        >
                          {user.comment || "Add comment..."}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-3 text-sm">
                        <button
                          onClick={() =>
                            handleToggleBlock(user.email, user.isBlocked)
                          }
                          className={`font-medium ${
                            user.isBlocked
                              ? "text-emerald-400 hover:text-emerald-300"
                              : "text-yellow-400 hover:text-yellow-300"
                          }`}
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          className="text-red-400 hover:text-red-300 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Emails Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-xl shadow-2xl w-full max-w-xl">
            <h2 className="text-2xl font-bold mb-5 text-white">
              Add Email(s) to Whitelist
            </h2>
            <div className="space-y-4">
              {/* Toggle between Roles and Products */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Assignment Type
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      checked={!isProductMode}
                      onChange={() => {
                        setIsProductMode(false);
                        setSelectedRole("frontend");
                        setSelectedModules([]);
                      }}
                      className="mr-2 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">Tech Roles</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentType"
                      checked={isProductMode}
                      onChange={() => {
                        setIsProductMode(true);
                        setSelectedRole("plug");
                        setSelectedModules([]);
                      }}
                      className="mr-2 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-300 text-sm">GG Products</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  {isProductMode ? "Select Product" : "Select Role"}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full p-2.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                >
                  {(isProductMode ? AVAILABLE_PRODUCTS : AVAILABLE_ROLES).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  {isProductMode 
                    ? "Select the product for these users." 
                    : "Select the role for these users."
                  }
                </p>
              </div>
              
              {/* Module Selection - Only for Products */}
              {isProductMode && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    Assign Access to Modules
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-gray-600 rounded-lg p-2.5 bg-gray-900">
                    {availableModules.length === 0 ? (
                      <p className="text-gray-400 text-sm">No modules available</p>
                    ) : (
                      <div className="space-y-2">
                        {availableModules.map((module) => (
                          <label key={module} className="flex items-center text-gray-300 hover:text-white cursor-pointer">
                            <input
                              type="checkbox"
                              className="mr-2.5 w-4 h-4 text-emerald-500 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500"
                              checked={selectedModules.includes(module)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModules([...selectedModules, module]);
                                } else {
                                  setSelectedModules(selectedModules.filter(m => m !== module));
                                }
                              }}
                            />
                            <span className="text-sm">{module}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {selectedModules.length > 0 ? `Selected: ${selectedModules.length} module(s)` : 'Select modules for access'}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Email Address(es)
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={3}
                  className="w-full p-2.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Separate multiple emails with commas
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleAddEmails}
                disabled={isLoading}
                className="flex-1 px-5 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add to Whitelist"}
              </button>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEmailInput("");
                  setSelectedModules([]);
                  setIsProductMode(false);
                  setSelectedRole("frontend");
                }}
                className="flex-1 px-5 py-2.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
