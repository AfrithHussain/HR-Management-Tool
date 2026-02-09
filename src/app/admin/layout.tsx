"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { signOut } from "firebase/auth";
import Cookies from "js-cookie";
import { toast, Toaster } from "react-hot-toast";
import { useState, useEffect } from "react";
import useAuth from "../../context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { loading, profile } = useAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Check admin access on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const userCookie = Cookies.get("user");
        if (!userCookie) {
          router.push("/");
          return;
        }

        const userData = JSON.parse(userCookie);
        const { checkUserAccess } = await import("../../utils/whitelist");
        const accessCheck = await checkUserAccess(userData.email);

        if (!accessCheck.allowed) {
          toast.error("Access denied!");
          router.push("/");
          return;
        }

        if (!accessCheck.isAdmin) {
          toast.error("Admin access required!");
          router.push("/quiz");
          return;
        }

        setHasAdminAccess(true);
      } catch (error) {
        console.error("Error checking admin access:", error);
        toast.error("Access verification failed!");
        router.push("/");
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Cookies.remove("user");
      toast.success("Logged out successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-emerald-500 mx-auto mb-4"></div>
          <p className="text-xl text-white font-semibold">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if no access
  if (!hasAdminAccess) {
    return null;
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        {/* Top App Bar */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-20">
          <div className="flex justify-between items-center px-4 sm:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden text-gray-400 hover:text-white"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
              <img
                src="/icons/logo.svg"
                alt="Logo"
                className="h-6 sm:h-8 brightness-0 invert"
              />
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 sm:px-4 text-xs sm:text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-all font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-1 relative">
          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar - Mobile (Slide-in) */}
          <div
            className={`fixed inset-y-0 left-0 transform ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            } lg:translate-x-0 lg:static w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out z-40 lg:z-0`}
          >
            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                 <li className="mx-auto text-center  py-3 text-xl">
                  Admin Dashboard
                </li>
                <li>
                  <Link
                    href="/admin/users"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/users"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span className="font-medium">Users</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/submission"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/submission"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium">Submission</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/questions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/questions"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium">Questions</span>
                    </div>
                  </Link>
                </li>
                
                {/* gg-questions */}
                 <li>
                  <Link
                    href="/admin/gg-questions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/gg-questions"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                        />
                      </svg>
                      <span className="font-medium">GG Questions</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/upload-content"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/upload-content"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span className="font-medium">Upload Content</span>
                      </div>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/search-content"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg transition-all ${
                      pathname === "/admin/search-content"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <span className="font-medium">Search Content</span>
                    </div>
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-4 sm:p-8 overflow-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
