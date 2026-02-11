"use client";

import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import useAuth from "../context/AuthContext";
import Image from "next/image";

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const { loading } = useAuth();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };

      Cookies.set("user", JSON.stringify(userData));

      const { checkUserAccess, createOrUpdateUser } = await import("../utils/whitelist");

      try {
        await createOrUpdateUser(user.email, user.displayName, true);
        const accessCheck = await checkUserAccess(user.email);

        console.log("Access check result:", accessCheck);
        console.log("Is superuser:", accessCheck.isSuperuser);
        console.log("User data:", accessCheck.user);

        if (!accessCheck.allowed) {
          await auth.signOut();
          Cookies.remove("user");
          console.log("Access denied. Reason:", accessCheck.reason);
          setPermissionMessage(accessCheck.reason || "You do not have access to this application. Please contact the administrator for access.");
          setShowPermissionModal(true);
          setIsLoading(false);
          return;
        }

        // Redirect based on user type
        if (accessCheck.isSuperuser) {
          console.log("Redirecting superuser to /admin/dashboard");
          router.push("/admin/dashboard");
        } else {
          console.log("Redirecting regular user to /quiz");
          router.push("/quiz");
        }
      } catch (err) {
        console.error("Access check error:", err);
        await auth.signOut();
        Cookies.remove("user");
        setPermissionMessage("You do not have access to this application. Please contact the administrator for access.");
        setShowPermissionModal(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during Google login:", error);
      setPermissionMessage("Failed to sign in. Please try again.");
      setShowPermissionModal(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      
      const checkAdminStatus = async () => {
        try {
          const { checkUserAccess } = await import("../utils/whitelist");
          const accessCheck = await checkUserAccess(userData.email);
          
          console.log("Existing session - Access check:", accessCheck);
          console.log("Existing session - Is superuser:", accessCheck.isSuperuser);
          
          if (accessCheck.allowed && accessCheck.isSuperuser) {
            console.log("Existing session - Redirecting superuser to /admin/dashboard");
            router.push("/admin/dashboard");
          } else if (accessCheck.allowed) {
            console.log("Existing session - Redirecting regular user to /quiz");
            router.push("/quiz");
          } else {
            console.log("Existing session - Access denied, removing cookie");
            Cookies.remove("user");
          }
        } catch (error) {
          console.error("Error checking admin status:", error);
          Cookies.remove("user");
        }
      };
      
      checkAdminStatus();
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden">
      {/* Permission Denied Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600 mb-6">{permissionMessage}</p>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="w-full px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left side - Info & Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-100 p-8 items-center justify-center">
        <div className="max-w-md">
          <img src="/icons/logo.svg" alt="HireLearn" className="h-8 mb-6" />
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Hire Smarter, Learn Faster
          </h1>
          <p className="text-base text-gray-600 mb-8">
            Technical assessments for hiring and training modules for employee development.
          </p>

          <Image src={'/learning.png'} height={400} width={600} alt="hire learn" className="border border-neutral-200 rounded-2xl mb-10" />

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Smart technical assessments</span>
             </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Employee training modules</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Real-time analytics</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <img src="/icons/logo.svg" alt="HireLearn" className="h-8 mx-auto" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Sign in
            </h2>
            <p className="text-gray-600">
              Welcome back! Please sign in to continue.
            </p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {isLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </button>

          <p className="mt-8 text-center text-xs text-gray-500">
            By signing in, you agree to our Terms and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
