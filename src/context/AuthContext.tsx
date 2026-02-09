"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type AuthContextType = {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isLoggedIn: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);        // Firebase Auth
  const [profile, setProfile] = useState<any | null>(null); // Firestore user
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);

      if (authUser?.email) {
        try {
          const ref = doc(db, "users", authUser.email);
          const snap = await getDoc(ref);
          setProfile(snap.exists() ? snap.data() : null);
        } catch (e) {
          console.error("User fetch error", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isLoggedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export default useAuth;
