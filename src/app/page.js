"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { testFirestoreConnection } from "../utils/firestore-test";
import useAuth from "../context/AuthContext";

export default function Login() {
  const router = useRouter();
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { loading, profile } = useAuth();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };

      Cookies.set("user", JSON.stringify(userData));

      // Import whitelist utilities
      const { checkUserAccess, createOrUpdateUser } = await import("../utils/whitelist");

      try {
        // Create or update user record first
        await createOrUpdateUser(user.email, user.displayName, true);
        
        // Check user access and admin status
        const accessCheck = await checkUserAccess(user.email);

        if (!accessCheck.allowed) {
          // User not allowed
          await auth.signOut();
          Cookies.remove("user");
          setError(accessCheck.reason);
          setIsLoading(false);
          return;
        }

        // Route based on admin status
        if (accessCheck.isAdmin) {
          router.push("/admin/users");
        } else {
          router.push("/quiz");
        }
      } catch (err) {
        console.error("Access check error:", err);
        // If there's an error, block access
        await auth.signOut();
        Cookies.remove("user");
        setError("Permission denied!");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      setError(error.message || "Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleTestFirestore = async () => {
    const result = await testFirestoreConnection();
    setTestResult(result);
  };

  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      
      // Check user's admin status from database instead of email domain
      const checkAdminStatus = async () => {
        try {
          const { checkUserAccess } = await import("../utils/whitelist");
          const accessCheck = await checkUserAccess(userData.email);
          
          if (accessCheck.allowed && accessCheck.isAdmin) {
            router.push("/admin/dashboard");
          } else if (accessCheck.allowed) {
            router.push("/quiz");
          } else {
            // User lost access, clear cookie and stay on login
            Cookies.remove("user");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          // On error, clear cookie and stay on login
          Cookies.remove("user");
        }
      };
      
      checkAdminStatus();
    }
  }, [router]);

  if (loading) {
    return <div>Loading....</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="w-full max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Illustration */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl"></div>
              
              {/* Main Illustration */}
              <div className="relative bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8">
                {/* Logo */}
                <div className="mb-8">
                  <img
                    src="/icons/logo.svg"
                    alt="Logo"
                    className="h-10 brightness-0 invert"
                  />
                </div>

                {/* Illustration - Abstract Design */}
                <div className="relative h-80 flex items-center justify-center">
                  {/* Animated Circles */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-64 h-64 bg-blue-500/10 rounded-full animate-pulse"></div>
                    <div className="absolute w-48 h-48 bg-purple-500/10 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute w-32 h-32 bg-emerald-500/10 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                  </div>

                  {/* Center Icon */}
                  <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute top-8 left-8 w-16 h-16 bg-blue-500/10 rounded-2xl backdrop-blur-sm border border-blue-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <div className="absolute bottom-8 right-8 w-16 h-16 bg-emerald-500/10 rounded-2xl backdrop-blur-sm border border-emerald-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}>
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>

                  <div className="absolute top-1/2 right-4 w-12 h-12 bg-purple-500/10 rounded-xl backdrop-blur-sm border border-purple-500/20 flex items-center justify-center animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div>
            {/* Mobile Logo */}
            <div className="text-center mb-6 md:hidden">
              <img
                src="/icons/logo.svg"
                alt="Logo"
                className="h-10 mx-auto brightness-0 invert"
              />
            </div>

            {/* Login Card */}
            <div className="  p-8 space-y-7 ">
              <div className="text-center space-y-2">
                <h2 className="text-2xl md:text-4xl font-bold text-white">
                  Welcome to <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">GG</span>
                </h2>
                <p className="text-gray-400 text-sm">
                  Assessment & Learning Platform
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-2 py-4 text-base font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <svg
                  className="w-5 h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  width="48px"
                  height="48px"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,36.45,44,30.638,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                  />
                </svg>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span className="group-hover:translate-x-0.5 transition-transform">Continue with Google</span>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <p className="text-center text-xs text-gray-500">
                Secure authentication powered by Google
              </p>
            </div>
          </div>
        </div>

        {testResult && (
          <div className={`mt-6 p-4 rounded-xl border ${testResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            <p className="font-semibold text-sm">
              {testResult.success ? "✅ Success" : "❌ Error"}
            </p>
            <p className="text-xs mt-1 opacity-80">{testResult.message}</p>
            {testResult.error && (
              <p className="text-xs mt-1 opacity-60">
                Error: {testResult.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
