import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const Pending = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-warning/20 flex items-center justify-center">
            <Clock className="h-7 w-7 text-warning" />
          </div>
          <CardTitle className="text-xl font-display">Aguardando Aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sua conta foi criada mas ainda não foi aprovada pelo administrador.
            Tente novamente mais tarde.
          </p>
          <Button
            variant="outline"
            onClick={() => supabase.auth.signOut()}
            className="w-full"
          >
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pending;
