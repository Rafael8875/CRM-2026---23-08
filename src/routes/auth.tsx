import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SpaceBackground } from "@/components/ui/space-background";

export const Route = createFileRoute("/auth")({
  component: AuthComponent,
});

function AuthComponent() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = Route.useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Login attempt with:", user);

    try {
      let finalEmail = user;
      let finalPassword = pass;

      if ((user === "admin" && pass === "admin") || (user === "8875" && pass === "8875")) {
        finalEmail = "admin@crm.com";
        finalPassword = "CrmAdmin#2026!Secure";
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: finalPassword,
      });

      if (error) {
        // Only bootstrap the admin bridge account when it doesn't exist yet
        if ((user === "admin" || user === "8875") && error.message.toLowerCase().includes("invalid login credentials")) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: finalEmail,
            password: finalPassword,
          });
          if (signUpError) throw signUpError;
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: finalEmail,
            password: finalPassword,
          });
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      
      toast.success("Login realizado!");
      
      // Critical: Ensure session is fully written to all possible storages
      // and available for the next navigation
      await supabase.auth.getSession();
      await new Promise(r => setTimeout(r, 1000));
      

      window.location.href = "/dashboard";
      
    } catch (error: any) {
      toast.error(error.message || "Erro no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-task-dark p-6 relative overflow-hidden">
      <SpaceBackground />
      {/* Background polish */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-task-blue/10 rounded-full blur-[120px] pointer-events-none" />
      
      <Card className="w-full max-w-md border-white/5 bg-white/[0.02] backdrop-blur-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-500">
        <CardHeader className="space-y-2 p-8 pt-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 mb-4">
            <DollarSign className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-black text-white tracking-tight">CRM Festa e Eventos</CardTitle>
          <CardDescription className="text-muted-foreground font-medium">Acesse sua plataforma financeira</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-5 p-8 pt-0">
            <div className="space-y-2">
              <Label htmlFor="user" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Usuário</Label>
              <Input
                id="user"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Usuário"
                className="h-12 border-white/5 bg-white/[0.03] text-white placeholder:text-muted-foreground/30 rounded-xl focus:ring-1 focus:ring-primary transition-all px-4"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Senha</Label>
              <Input
                id="pass"
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••"
                className="h-12 border-white/5 bg-white/[0.03] text-white placeholder:text-muted-foreground/30 rounded-xl focus:ring-1 focus:ring-primary transition-all px-4"
              />
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0 pb-10">
            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={loading}>
              {loading ? "Verificando..." : "Entrar no Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
