import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export type UserRole = "frontend" | "backend" | "data" | "android" | "qa" | "cloudsync-pro" | "taskflow" | "analytics-pro" | "company-training";

export const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "data", label: "Data" },
  { value: "android", label: "Android" },
  { value: "qa", label: "QA" },
];

export const AVAILABLE_PRODUCTS: { value: UserRole; label: string }[] = [
  { value: "cloudsync-pro", label: "CloudSync Pro" },
  { value: "taskflow", label: "TaskFlow" },
  { value: "analytics-pro", label: "AnalyticsPro" },
  { value: "company-training", label: "Company Training" },
];

export interface User {
  email: string;
  name: string;
  role: UserRole; // Primary role (for backward compatibility)
  roles?: UserRole[]; // Array of all roles/products user has access to
  isWhitelisted: boolean;
  isBlocked: boolean;
  isSuperuser: boolean;
  score: number | null;
  totalQuestions: number | null;
  status: "pending" | "accepted" | "rejected";
  comment: string;
  createdAt: Date;
  lastLoginAt: Date | null;
  submissionId: string | null;
  allowedModules: string[];
  moduleProgress?: Record<string, {
    attempts: number;
    passed: boolean;
    bestScore: number;
    lastAttemptAt: Date;
  }>;
}

export const isHireLearnUser = (email: string): boolean => {
  return email.endsWith("@hirelearn.com");
};

export const checkUserAccess = async (
  email: string
): Promise<{ allowed: boolean; reason?: string; user?: User; isSuperuser?: boolean }> => {
  console.log("Checking access for:", email);
  
  // Check if user exists in whitelist
  const userDoc = await getDoc(doc(db, "users", email));

  if (!userDoc.exists()) {
    console.log("User document does not exist");
    return {
      allowed: false,
      reason: "Permission denied!",
    };
  }

  const userData = userDoc.data() as any;
  console.log("User data:", userData);

  // Check if user is blocked
  if (userData.isBlocked === true) {
    console.log("User is blocked");
    return {
      allowed: false,
      reason: "Your access has been blocked. Please contact the administrator.",
    };
  }

  // Check if user is allowed (support both 'allowed' and 'isWhitelisted' fields)
  const isAllowed = userData.allowed === true || userData.isWhitelisted === true;
  console.log("Is allowed:", isAllowed, "- allowed:", userData.allowed, "isWhitelisted:", userData.isWhitelisted);
  
  if (!isAllowed) {
    console.log("User is not whitelisted");
    return {
      allowed: false,
      reason: "Permission denied!",
    };
  }

  // Check if user is superuser
  const isSuperuser = userData.isSuperuser === true;
  console.log("Is superuser:", isSuperuser);

  return { allowed: true, user: userData, isSuperuser };
};

export const createOrUpdateUser = async (
  email: string,
  name: string,
  isLogin: boolean = false
): Promise<void> => {
  console.log("createOrUpdateUser called:", { email, name, isLogin });
  
  const userRef = doc(db, "users", email);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    console.log("User document does not exist");
    
    // During login, do NOT create new users - they must be whitelisted first by admin
    if (isLogin) {
      console.log("Login attempt - not creating new user, must be whitelisted first");
      return; // User doesn't exist, let checkUserAccess handle the denial
    }
    
    console.log("Creating new user (not during login)");
    // Only create new user when called from admin panel (isLogin = false)
    await setDoc(userRef, {
      email,
      name,
      role: "frontend" as UserRole,
      roles: ["frontend"], // Add roles array
      isWhitelisted: false, // No auto-whitelist, must be done manually
      isBlocked: false,
      isSuperuser: false, // No auto-admin, must be set manually in Firebase
      score: null,
      totalQuestions: null,
      status: "pending",
      comment: "",
      createdAt: serverTimestamp(),
      lastLoginAt: null,
      submissionId: null,
      allowedModules: [],
    });
  } else {
    console.log("User document exists");
    
    if (isLogin) {
      console.log("Updating last login time");
      // Update last login for existing users
      await setDoc(
        userRef,
        {
          lastLoginAt: serverTimestamp(),
          name, // Update name in case it changed
        },
        { merge: true }
      );
    }
  }
};

export const whitelistEmails = async (
  emails: string[],
  role: UserRole = "frontend",
  allowedModules: string[] = []
): Promise<{ 
  success: number; 
  failed: string[]; 
  duplicates: string[]; 
  created: number; 
  updated: number; 
}> => {
  let success = 0;
  let created = 0;
  let updated = 0;
  const failed: string[] = [];
  const duplicates: string[] = [];

  for (const email of emails) {
    try {
      const userRef = doc(db, "users", email.trim());
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // For HireLearn products (cloudsync-pro, taskflow, analytics-pro, company-training), allow adding more modules
        if ((role === "cloudsync-pro" || role === "taskflow" || role === "analytics-pro" || role === "company-training") && allowedModules.length > 0) {
          const existingModules = userData.allowedModules || [];
          const newModules = [...new Set([...existingModules, ...allowedModules])]; // Merge and deduplicate
          
          // Add role to roles array if not already present
          const existingRoles = userData.roles || [userData.role];
          const newRoles = [...new Set([...existingRoles, role])]; // Merge and deduplicate
          
          // Update user with new modules and roles
          await setDoc(
            userRef,
            {
              isWhitelisted: true,
              role, // Update primary role to latest
              roles: newRoles, // Store all roles
              allowedModules: newModules,
            },
            { merge: true }
          );
          success++;
          updated++;
        } else {
          // For traditional roles, check if already whitelisted
          if (userData.isWhitelisted && !allowedModules.length) {
            duplicates.push(email.trim());
            continue;
          }
          // Update existing user with traditional role
          await setDoc(
            userRef,
            {
              isWhitelisted: true,
              role,
              roles: [role], // Single role for traditional roles
              allowedModules,
            },
            { merge: true }
          );
          success++;
          updated++;
        }
      } else {
        // Create new whitelisted user
        await setDoc(userRef, {
          email: email.trim(),
          name: "",
          role,
          roles: [role], // Initialize roles array
          isWhitelisted: true,
          isBlocked: false,
          isSuperuser: false, // Admin access must be set manually
          score: null,
          totalQuestions: null,
          status: "pending",
          comment: "",
          createdAt: serverTimestamp(),
          lastLoginAt: null,
          submissionId: null,
          allowedModules,
        });
        success++;
        created++;
      }
    } catch (error) {
      console.error(`Failed to whitelist ${email}:`, error);
      failed.push(email);
    }
  }

  return { success, failed, duplicates, created, updated };
};

export const updateUserScore = async (
  email: string,
  score: number,
  totalQuestions: number,
  submissionId: string,
  moduleName?: string | null
): Promise<void> => {
  const userRef = doc(db, "users", email);
  
  // If it's a module-based assessment, update module progress
  if (moduleName) {
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    const moduleProgress = userData?.moduleProgress || {};
    const currentProgress = moduleProgress[moduleName] || { attempts: 0, passed: false, bestScore: 0 };
    
    const percentage = (score / totalQuestions) * 100;
    const passed = percentage >= 70; // 70% passing threshold
    
    await setDoc(
      userRef,
      {
        moduleProgress: {
          ...moduleProgress,
          [moduleName]: {
            attempts: currentProgress.attempts + 1,
            passed: passed || currentProgress.passed, // Once passed, stays passed
            bestScore: Math.max(currentProgress.bestScore, score),
            lastAttemptAt: serverTimestamp(),
          }
        }
      },
      { merge: true }
    );
  } else {
    // Traditional single quiz
    await setDoc(
      userRef,
      {
        score,
        totalQuestions,
        submissionId,
      },
      { merge: true }
    );
  }
};
