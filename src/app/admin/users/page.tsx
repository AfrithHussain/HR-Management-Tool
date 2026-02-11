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
  roles?: UserRole[];
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
  hasSubmissions?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("frontend");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isProductMode, setIsProductMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<UserRole[]>([]);
  const [modulesByProduct, setModulesByProduct] = useState<Record<string, string[]>>({});

  const fetchRoleModules = async (role: UserRole) => {
    const productRoles = ["cloudsync-pro", "taskflow", "analytics-pro", "company-training"];
    if (!productRoles.includes(role)) {
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

  const fetchAllProductModules = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "gg-questions"));
      const questions = querySnapshot.docs.map((doc) => doc.data());
      
      const moduleMap: Record<string, string[]> = {};
      
      AVAILABLE_PRODUCTS.forEach(product => {
        const modules = Array.from(new Set(
          questions
            .filter(q => q.role === product.value && q.moduleName)
            .map(q => q.moduleName)
        )).sort((a, b) => {
          const numA = parseInt(a.match(/Module (\d+):/)?.[1] || "999");
          const numB = parseInt(b.match(/Module (\d+):/)?.[1] || "999");
          return numA - numB;
        });
        
        if (modules.length > 0) {
          moduleMap[product.value] = modules;
        }
      });
      
      setModulesByProduct(moduleMap);
    } catch (error) {
      console.error("Error fetching all product modules:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isAddModalOpen) {
      if (isProductMode) {
        fetchAllProductModules();
        setSelectedProducts([]);
        setSelectedModules([]);
      } else {
        fetchRoleModules(selectedRole);
        setSelectedModules([]);
      }
    }
  }, [isAddModalOpen, selectedRole, isProductMode]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        email: doc.id,
      })) as User[];
      
      const usersWithSubmissionCheck = await Promise.all(
        usersData.map(async (user) => {
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

    if (isProductMode) {
      if (selectedProducts.length === 0) {
        toast.error("Please select at least one product");
        return;
      }
      if (selectedModules.length === 0) {
        toast.error("Please select at least one module");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      if (isProductMode && selectedProducts.length > 0) {
        // Add users with multiple products
        let totalSuccess = 0;
        let allDuplicates: string[] = [];
        let allFailed: string[] = [];
        
        for (const product of selectedProducts) {
          const productModules = selectedModules.filter(m => 
            modulesByProduct[product]?.includes(m)
          );
          
          if (productModules.length > 0) {
            const result = await whitelistEmails(emails, product, productModules);
            totalSuccess += result.success;
            allDuplicates = [...allDuplicates, ...result.duplicates];
            allFailed = [...allFailed, ...result.failed];
          }
        }
        
        if (totalSuccess > 0) {
          toast.success(`Successfully added users to ${selectedProducts.length} product(s)`);
          setEmailInput("");
          setSelectedProducts([]);
          setSelectedModules([]);
          setIsAddModalOpen(false);
          fetchUsers();
        }
        
        if (allFailed.length > 0) {
          toast.error(`Failed: ${[...new Set(allFailed)].join(", ")}`);
        }
      } else {
        // Single role/product
        const result = await whitelistEmails(
          emails, 
          selectedRole, 
          isProductMode ? selectedModules : []
        );
        
        if (result.success > 0) {
          toast.success(`Successfully added ${result.success} user(s)`);
          setEmailInput("");
          setSelectedRole(isProductMode ? "cloudsync-pro" : "frontend");
          setSelectedModules([]);
          setIsAddModalOpen(false);
          fetchUsers();
        }

        if (result.duplicates.length > 0) {
          toast.error(`Already exists: ${result.duplicates.join(", ")}`);
        }

        if (result.failed.length > 0) {
          toast.error(`Failed: ${result.failed.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("Error adding users:", error);
      toast.error("Failed to add users");
    } finally {
      setIsLoading(false);
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
    if (!confirm(`Delete ${email}? This will remove all their data.`)) return;

    try {
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("email", "==", email)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);

      const deletePromises = submissionsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, "users", email));
      
      await fetchUsers();
      toast.success(`User deleted`);
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
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Add Users
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none  text-neutral-700 "
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none  text-neutral-700 "
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Comment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || "—"}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="flex gap-1 mt-1">
                        {user.isBlocked && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Blocked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        user.isSuperuser 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {user.isSuperuser ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // Get unique roles - prioritize roles array, fallback to single role
                          const userRoles = user.roles && user.roles.length > 0 
                            ? user.roles 
                            : [user.role || "frontend"];
                          const uniqueRoles = Array.from(new Set(userRoles));
                          
                          return uniqueRoles.map((role, index) => (
                            <span key={`${user.email}-${role}-${index}`} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              {role === "cloudsync-pro" ? "CloudSync Pro" :
                               role === "taskflow" ? "TaskFlow" :
                               role === "analytics-pro" ? "AnalyticsPro" :
                               role === "company-training" ? "Company Training" :
                               role === "frontend" ? "Frontend" :
                               role === "backend" ? "Backend" :
                               role}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.status}
                        onChange={(e) =>
                          handleUpdateStatus(user.email, e.target.value as any)
                        }
                        className={`text-xs font-medium px-2 py-1 rounded border-0 focus:ring-2 focus:ring-gray-900 ${
                          user.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : user.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {editingComment === user.email ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-900"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveComment(user.email)}
                            className="text-green-600 hover:text-green-700"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingComment(null)}
                            className="text-red-600 hover:text-red-700"
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
                          className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
                        >
                          {user.comment || "Add comment..."}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() =>
                            handleToggleBlock(user.email, user.isBlocked)
                          }
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          {user.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          className="text-sm text-red-600 hover:text-red-700"
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

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Add Users
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-4 text-neutral-700">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!isProductMode}
                      onChange={() => {
                        setIsProductMode(false);
                        setSelectedRole("frontend");
                        setSelectedModules([]);
                        setSelectedProducts([]);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Roles</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={isProductMode}
                      onChange={() => {
                        setIsProductMode(true);
                        setSelectedRole("cloudsync-pro");
                        setSelectedModules([]);
                        setSelectedProducts([]);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Products</span>
                  </label>
                </div>
              </div>

              {!isProductMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none text-neutral-700"
                  >
                    {AVAILABLE_ROLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Products (Select Multiple)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                      {AVAILABLE_PRODUCTS.map((product) => (
                        <label key={product.value} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selectedProducts.includes(product.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts([...selectedProducts, product.value]);
                              } else {
                                setSelectedProducts(selectedProducts.filter(p => p !== product.value));
                                // Remove modules from deselected product
                                const productModules = modulesByProduct[product.value] || [];
                                setSelectedModules(selectedModules.filter(m => !productModules.includes(m)));
                              }
                            }}
                          />
                          <span className="text-sm text-gray-700">{product.label}</span>
                          {modulesByProduct[product.value] && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({modulesByProduct[product.value].length} modules)
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {selectedProducts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modules (Select from chosen products)
                      </label>
                      <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2">
                        {selectedProducts.map(product => {
                          const productLabel = AVAILABLE_PRODUCTS.find(p => p.value === product)?.label;
                          const modules = modulesByProduct[product] || [];
                          
                          if (modules.length === 0) return null;
                          
                          return (
                            <div key={product} className="mb-3">
                              <div className="text-xs font-semibold text-gray-600 mb-1 uppercase">
                                {productLabel}
                              </div>
                              {modules.map((module) => (
                                <label key={`${product}-${module}`} className="flex items-center py-1 pl-2">
                                  <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={selectedModules.includes(module)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedModules([...selectedModules, module]);
                                      } else {
                                        setSelectedModules(selectedModules.filter(m => m !== module));
                                      }
                                    }}
                                  />
                                  <span className="text-sm text-gray-700">{module}</span>
                                </label>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Selected: {selectedModules.length} module(s)
                      </p>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emails (comma-separated)
                </label>
                <textarea
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-neutral-700 outline-none "
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddEmails}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEmailInput("");
                  setSelectedModules([]);
                  setSelectedProducts([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
