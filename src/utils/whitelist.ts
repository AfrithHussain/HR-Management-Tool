import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

export type UserRole = "frontend" | "backend" | "data" | "android" | "qa" | "plug" | "socket";

export const AVAILABLE_ROLES: { value: UserRole; label: string }[] = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "data", label: "Data" },
  { value: "android", label: "Android" },
  { value: "qa", label: "QA" },
];

export const AVAILABLE_PRODUCTS: { value: UserRole; label: string }[] = [
  { value: "plug", label: "Plug" },
  { value: "socket", label: "Socket" },
];

export interface User {
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

export const isGreedyGameUser = (email: string): boolean => {
  return email.endsWith("@greedygame.com");
};

export const checkUserAccess = async (
  email: string
): Promise<{ allowed: boolean; reason?: string; user?: User; isAdmin?: boolean }> => {
  // Check if user exists in whitelist
  const userDoc = await getDoc(doc(db, "users", email));

  if (!userDoc.exists()) {
    return {
      allowed: false,
      reason: "Permission denied!",
    };
  }

  const userData = userDoc.data() as User;

  if (userData.isBlocked) {
    return {
      allowed: false,
      reason: "Your access has been blocked. Please contact the administrator.",
    };
  }

  if (!userData.isWhitelisted) {
    return {
      allowed: false,
      reason: "Permission denied!",
    };
  }

  // Check if user is admin (isSuperuser set manually in Firebase)
  const isAdmin = userData.isSuperuser === true;

  return { allowed: true, user: userData, isAdmin };
};

export const createOrUpdateUser = async (
  email: string,
  name: string,
  isLogin: boolean = false
): Promise<void> => {
  const userRef = doc(db, "users", email);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Create new user with default frontend role
    await setDoc(userRef, {
      email,
      name,
      role: "frontend" as UserRole,
      isWhitelisted: false, // No auto-whitelist, must be done manually
      isBlocked: false,
      isSuperuser: false, // No auto-admin, must be set manually in Firebase
      score: null,
      totalQuestions: null,
      status: "pending",
      comment: "",
      createdAt: serverTimestamp(),
      lastLoginAt: isLogin ? serverTimestamp() : null,
      submissionId: null,
      allowedModules: [],
    });
  } else if (isLogin) {
    // Update last login
    await setDoc(
      userRef,
      {
        lastLoginAt: serverTimestamp(),
        name, // Update name in case it changed
      },
      { merge: true }
    );
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
        
        // For GG products (plug/socket), allow adding more modules
        if ((role === "plug" || role === "socket") && allowedModules.length > 0) {
          const existingModules = userData.allowedModules || [];
          const newModules = [...new Set([...existingModules, ...allowedModules])]; // Merge and deduplicate
          
          // Update user with new modules
          await setDoc(
            userRef,
            {
              isWhitelisted: true,
              role,
              allowedModules: newModules,
            },
            { merge: true }
          );
          success++;
          updated++;
        } else {
          // For traditional roles, check if already whitelisted
          if (userData.isWhitelisted) {
            duplicates.push(email.trim());
            continue;
          }
          // Update existing user with traditional role
          await setDoc(
            userRef,
            {
              isWhitelisted: true,
              role,
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
