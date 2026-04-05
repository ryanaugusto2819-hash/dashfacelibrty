import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart3, Sparkles, Lock, Mail } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Conta criada! Aguarde a aprovação do administrador para acessar o sistema.");
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou senha incorretos.");
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient orbs */}
      <div
        className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(271 76% 50%) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[400px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(217 91% 55%) 0%, transparent 70%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute bottom-[10%] left-[-8%] w-[400px] h-[300px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(142 71% 40%) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      <div className="w-full max-w-[400px] relative z-10 animate-scale-in">
        {/* Card */}
        <div className="glass-card-elevated p-8 animate-border-glow">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-[3px] accent-bar-purple rounded-t-[inherit] opacity-90" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))",
                  boxShadow: "0 0 40px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
              >
                <BarChart3 className="h-8 w-8 text-violet-400" />
              </div>
              <Sparkles className="absolute -top-1.5 -right-1.5 h-4 w-4 text-violet-400 animate-pulse" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isSignUp ? "Criar Conta" : "Bem-vindo"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? "Preencha seus dados para solicitar acesso" : "Facebook Ads Intelligence Dashboard"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="pl-10 bg-secondary/60 border-border/60 focus:border-primary/60 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pl-10 bg-secondary/60 border-border/60 focus:border-primary/60 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="badge-danger rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="badge-success rounded-lg px-3 py-2 text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold relative overflow-hidden"
              style={{
                background: loading ? undefined : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                boxShadow: loading ? undefined : "0 4px 20px rgba(124,58,237,0.4)",
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Aguarde...
                </span>
              ) : (
                isSignUp ? "Criar Conta" : "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }}
              className="text-sm text-muted-foreground hover:text-violet-400 transition-colors"
            >
              {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/40 mt-5 tracking-wide">
          SYNKRA · FACEBOOK ADS INTELLIGENCE
        </p>
      </div>
    </div>
  );
};

export default Login;
