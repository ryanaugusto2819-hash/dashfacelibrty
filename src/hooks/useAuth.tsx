import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  loading: boolean;
  approved: boolean;
  isAdmin: boolean;
  signOut: () => Promise<{ error: unknown }>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
  throw lastErr;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);
  const statusCheckId = useRef(0);

  const checkUserStatus = useCallback(async (u: User | null) => {
    const checkId = ++statusCheckId.current;

    if (!u) {
      lastCheckedUserId.current = null;
      setUser(null);
      setApproved(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setUser(u);
    // Skip duplicate checks for the same user
    if (lastCheckedUserId.current === u.id) {
      setLoading(false);
      return;
    }
    lastCheckedUserId.current = u.id;

    try {
      const profileRes = await fetchWithRetry(async () => {
        const r = await supabase.from("profiles").select("approved").eq("id", u.id).maybeSingle();
        if (r.error) throw r.error;
        return r;
      });
      const roleRes = await fetchWithRetry(async () => {
        const r = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id)
          .eq("role", "admin")
          .maybeSingle();
        if (r.error) throw r.error;
        return r;
      });
      if (checkId !== statusCheckId.current) return;
      setApproved(profileRes.data?.approved ?? false);
      setIsAdmin(!!roleRes.data);
    } catch (err) {
      if (checkId !== statusCheckId.current) return;
      console.error("Error checking user status:", err);
      // Reset so a future auth event can retry
      lastCheckedUserId.current = null;
      setApproved(false);
      setIsAdmin(false);
    }
    if (checkId === statusCheckId.current) setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) checkUserStatus(data.session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) checkUserStatus(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, approved, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
