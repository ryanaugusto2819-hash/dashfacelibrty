import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles } from "lucide-react";

const Pending = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(38 92% 50%) 0%, transparent 70%)", filter: "blur(80px)" }}
      />

      <div className="w-full max-w-[380px] relative z-10 animate-scale-in text-center">
        <div className="glass-card-elevated p-8 relative overflow-hidden animate-border-glow">
          <div className="absolute inset-x-0 top-0 h-[3px] accent-bar-amber opacity-90" />

          <div className="flex flex-col items-center gap-5 mb-6">
            <div className="relative">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center animate-float"
                style={{
                  background: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(252,211,77,0.1))",
                  boxShadow: "0 0 40px rgba(217,119,6,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                  border: "1px solid rgba(217,119,6,0.3)",
                }}
              >
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Aguardando Aprovação</h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Sua conta foi criada mas ainda não foi aprovada pelo administrador.
                Tente novamente mais tarde.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6 text-[11px] text-amber-400/70 bg-amber-500/5 border border-amber-500/15 rounded-lg py-2.5 px-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse-dot" />
            Verificação pendente de administrador
          </div>

          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            className="w-full border-border/50 hover:border-border bg-secondary/40 hover:bg-secondary/60"
          >
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pending;
