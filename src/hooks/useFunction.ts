import { useState, useCallback } from "react";
import { httpsCallable, HttpsCallableResult } from "firebase/functions";
import { functions } from "../firebase";
import { UserAuth } from "../context/AuthContext";

export const MAX_USES_ANON = 1;
export const MAX_USES_AUTH = 5;
const todayStr = () => new Date().toISOString().slice(0, 10);

function readUsage(key: string): number {
  try {
    const u = JSON.parse(localStorage.getItem(key) || "{}");
    return u.date === todayStr() ? (u.count || 0) : 0;
  } catch {
    return 0;
  }
}

function writeUsage(key: string, count: number) {
  localStorage.setItem(key, JSON.stringify({ count, date: todayStr() }));
}
interface UseFunctionReturn<T> {
  call:          (payload: Record<string, unknown>) => Promise<T | null>;
  loading:       boolean;
  error:         string;
  usageCount:    number;
  maxUses:       number;
  usagesLeft:    number;
  limitReached:  boolean;
  clearError:    () => void;
}

export function useFunction<T = unknown>(
  fnName: string,
): UseFunctionReturn<T> {
  const { user } = UserAuth();

  const storageKey  = user ? `vakku_auth_${user.id}` : "vakku_usage";
  const maxUses     = user ? MAX_USES_AUTH : MAX_USES_ANON;

  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [usageCount, setUsageCount] = useState(() => readUsage(storageKey));

  const usagesLeft   = Math.max(0, maxUses - usageCount);
  const limitReached = usageCount >= maxUses;

  const call = useCallback(
    async (payload: Record<string, unknown>): Promise<T | null> => {
      if (loading || limitReached) return null;
      setLoading(true);
      setError("");
      try {
        const fn     = httpsCallable<Record<string, unknown>, T>(functions, fnName);
        const result: HttpsCallableResult<T> = await fn(payload);
        const next = readUsage(storageKey) + 1;
        writeUsage(storageKey, next);
        setUsageCount(next);
        return result.data;
      } catch (err: unknown) {
        const msg = (err as { message?: string })?.message ?? "";
        if (msg.includes("rate") || (err as { code?: string })?.code === "resource-exhausted") {
          setError("Daily limit reached. Sign in for more analyses.");
        } else {
          setError(msg || "Request failed. Please try again.");
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fnName, loading, limitReached, storageKey],
  );

  return {
    call,
    loading,
    error,
    usageCount,
    maxUses,
    usagesLeft,
    limitReached,
    clearError: () => setError(""),
  };
}
