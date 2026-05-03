import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { UserAuth } from "../context/AuthContext";

interface UserPreferences {
  preferredState:        string;
  preferredElectionType: string;
  preferredLanguage:     string;
}

const DEFAULTS: UserPreferences = {
  preferredState:        "",
  preferredElectionType: "lok_sabha",
  preferredLanguage:     "en",
};

export const useUserPreferences = () => {
  const { user } = UserAuth();
  const [prefs, setPrefsState] = useState<UserPreferences>(DEFAULTS);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!user) {
      setPrefsState(DEFAULTS);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.id);
    getDoc(ref)
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setPrefsState({
            preferredState:        data.preferredState        || "",
            preferredElectionType: data.preferredElectionType || "lok_sabha",
            preferredLanguage:     data.preferredLanguage     || "en",
          });
        }
      })
      .catch(err => console.error("[Prefs] load error:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const setPrefs = async (updates: Partial<UserPreferences>) => {
    const next = { ...prefs, ...updates };
    setPrefsState(next);

    if (!user) return;
    try {
      await setDoc(
        doc(db, "users", user.id),
        { ...updates, updatedAt: new Date() },
        { merge: true }
      );
    } catch (err) {
      console.error("[Prefs] save error:", err);
    }
  };

  return { prefs, setPrefs, loading };
};
