import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          // Check approval and role
          const [profileRes, roleRes] = await Promise.all([
            supabase.from("profiles").select("approved").eq("id", u.id).single(),
            supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle(),
          ]);
          setApproved(profileRes.data?.approved ?? false);
          setIsAdmin(!!roleRes.data);
        } else {
          setApproved(false);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        Promise.all([
          supabase.from("profiles").select("approved").eq("id", u.id).single(),
          supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle(),
        ]).then(([profileRes, roleRes]) => {
          setApproved(profileRes.data?.approved ?? false);
          setIsAdmin(!!roleRes.data);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, loading, approved, isAdmin, signOut };
}
