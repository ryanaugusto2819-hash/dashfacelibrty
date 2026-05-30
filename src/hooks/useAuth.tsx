import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);

  const checkUserStatus = async (u: User | null) => {
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
      setApproved(profileRes.data?.approved ?? false);
      setIsAdmin(!!roleRes.data);
    } catch (err) {
      console.error("Error checking user status:", err);
      // Reset so a future auth event can retry
      lastCheckedUserId.current = null;
      setApproved(false);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          checkUserStatus(session?.user ?? null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, approved, isAdmin, signOut };
}
