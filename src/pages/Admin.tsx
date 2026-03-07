import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">Gerenciar Usuários</h1>
        </div>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div>
                      <p className="text-sm font-medium">{p.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.approved ? "default" : "destructive"}>
                        {p.approved ? "Aprovado" : "Pendente"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={p.approved ? "destructive" : "default"}
                        onClick={() => toggleApproval(p.id, p.approved)}
                      >
                        {p.approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
