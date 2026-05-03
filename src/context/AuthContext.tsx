import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import User from "../models/UserModel";

export const DAILY_LIMIT_ANON = 1;
export const DAILY_LIMIT_AUTH = 5;

type AuthContextType = {
  user:              User | null;
  loading:           boolean;
  dailyUsage:        number;
  dailyLimit:        number;
  canMakeRequest:    boolean;
  recordUsage:       () => Promise<void>;
  googleSignIn:      () => Promise<void>;
  logOut:            () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [user,       setUser]       = useState<User | null>(null);
  const [loading,    setLoading]    = useState(true);
	const [dailyUsage, setDailyUsage] = useState(0);

  const fetchServerUsage = async (uid: string) => {
    try {
      const today   = new Date().toISOString().slice(0, 10);
      const usageRef = doc(db, "user_usage", `${uid}_${today}`);
      const snap    = await getDoc(usageRef);
      if (snap.exists()) {
        setDailyUsage(snap.data().count || 0);
      } else {
        setDailyUsage(0);
      }
    } catch (err) {
      console.warn("[Auth] Could not fetch usage:", err);
    }
	};

  const recordUsage = async () => {
    if (!user) return;
    const today    = new Date().toISOString().slice(0, 10);
    const usageRef = doc(db, "user_usage", `${user.id}_${today}`);
    try {
      const snap = await getDoc(usageRef);
      if (snap.exists()) {
        await updateDoc(usageRef, { count: increment(1), updatedAt: serverTimestamp() });
      } else {
        await setDoc(usageRef, { uid: user.id, date: today, count: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setDailyUsage(prev => prev + 1);
    } catch (err) {
      console.warn("[Auth] Could not record usage:", err);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          if (credential?.accessToken) {
            localStorage.setItem("accessToken", credential.accessToken);
          }
        }
      } catch (error) {
        console.error("[Auth] Redirect result error:", error);
			}

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const { displayName, email, uid, photoURL, metadata } = firebaseUser;
          setUser({
            id:          uid,
            name:        displayName || "",
            email:       email       || "",
            photoURL:    photoURL    || "",
            createdAt:   new Date(metadata.creationTime  || ""),
            lastLogin:   new Date(metadata.lastSignInTime || ""),
            homeAddress: "",
            workAddress: "",
            birthday:    null,
            gender:      "",
					});
					
          await fetchServerUsage(uid);
        } else {
          setUser(null);
          setDailyUsage(0);
        }
        setLoading(false);
      });
    };

    init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem("accessToken", credential.accessToken);
      }
    } catch (error: any) {
      const code = error?.code ?? "";

      if (code === "auth/popup-blocked") {
        console.warn("[Auth] Popup blocked. Falling back to redirect...");
        await signInWithRedirect(auth, new GoogleAuthProvider());
        return;
      }

      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        console.info(`[Auth] Popup dismissed (${code}) — user can try again.`);
      } else {
        console.error("[Auth] Sign-in error:", code, error?.message);
      }

      setLoading(false);
      throw error;
    }
  };

  const logOut = async () => {
    setLoading(true);
    try {
      localStorage.removeItem("accessToken");
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  const dailyLimit    = user ? DAILY_LIMIT_AUTH : DAILY_LIMIT_ANON;
  const canMakeRequest = dailyUsage < dailyLimit;

  return (
    <AuthContext.Provider value={{ user, loading, dailyUsage, dailyLimit, canMakeRequest, recordUsage, googleSignIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("UserAuth must be used within AuthContextProvider");
  return context;
};
