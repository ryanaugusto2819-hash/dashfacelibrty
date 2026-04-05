import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Shield, Users } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  approved: boolean;
  created_at: string;
}

const Admin = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProfiles(); }, []);

  const toggleApproval = async (id: string, approved: boolean) => {
    await supabase.from("profiles").update({ approved: !approved }).eq("id", id);
    fetchProfiles();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="icon-box icon-box-purple"
              style={{ width: 40, height: 40, borderRadius: 10 }}
            >
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold">Gerenciar Usuários</h1>
              <p className="text-[11px] text-muted-foreground tracking-wide">
                Aprovar ou revogar acesso ao sistema
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card relative overflow-hidden animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <div className="absolute inset-x-0 top-0 h-[3px] accent-bar-purple opacity-90" />

          <div className="p-5 border-b border-border/40 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Usuários Cadastrados</h2>
            {!loading && (
              <span className="ml-auto text-[11px] badge-purple px-2 py-0.5 rounded-full">
                {profiles.length} total
              </span>
            )}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="shimmer h-14 rounded-xl" />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm py-6 text-center">
                Nenhum usuário cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {profiles.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/40 border border-border/30 hover:border-border/60 transition-all animate-fade-in-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{
                          background: p.approved
                            ? "linear-gradient(135deg, rgba(5,150,105,0.25), rgba(52,211,153,0.1))"
                            : "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.1))",
                          border: p.approved
                            ? "1px solid rgba(5,150,105,0.3)"
                            : "1px solid rgba(124,58,237,0.3)",
                          color: p.approved ? "#34d399" : "#a78bfa",
                        }}
                      >
                        {p.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.email}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit", month: "short", year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${
                        p.approved ? "badge-success" : "badge-warning"
                      }`}>
                        {p.approved ? "Aprovado" : "Pendente"}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => toggleApproval(p.id, p.approved)}
                        className={`h-8 w-8 p-0 rounded-lg border-0 ${
                          p.approved
                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {p.approved ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
