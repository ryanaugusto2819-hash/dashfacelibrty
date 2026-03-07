import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkUserStatus = async (u: User | null) => {
    if (!u) {
      setUser(null);
      setApproved(false);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setUser(u);
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("approved").eq("id", u.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle(),
      ]);
      setApproved(profileRes.data?.approved ?? false);
      setIsAdmin(!!roleRes.data);
    } catch (err) {
      console.error("Error checking user status:", err);
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
