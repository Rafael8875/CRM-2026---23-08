import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign, 
  Calendar, 
  BarChart3, 
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SpaceBackground } from "@/components/ui/space-background";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // In TanStack Start, beforeLoad runs before the component tree is rendered.
    // For SSR: false routes, it runs on the client.
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ 
        to: "/auth",
        search: {
          redirect: window.location.pathname
        }
      });
    }

    return { user: session.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = Route.useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Clientes", icon: Users, to: "/clients" },
    { label: "Criador de Contrato", icon: FileText, to: "/contracts" },
    { label: "Financeiro", icon: DollarSign, to: "/financial" },
    { label: "Agenda", icon: Calendar, to: "/agenda" },
    { label: "Relatórios", icon: BarChart3, to: "/reports" },
    { label: "Configurações", icon: Settings, to: "/settings" },
  ];

  return (
    <div 
      className="flex min-h-screen bg-task-dark text-foreground selection:bg-primary/30 relative"
      onMouseMove={(e) => {
        const elements = document.querySelectorAll('.led-hover, .led-border');
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          (el as HTMLElement).style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          (el as HTMLElement).style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });
      }}
    >
      <SpaceBackground />
      {/* Sidebar Desktop */}
      <aside className="hidden w-72 border-r border-white/5 bg-white/[0.02] backdrop-blur-2xl lg:flex lg:flex-col shadow-2xl">
        <div className="flex h-20 items-center px-8">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">CRM Festa e Eventos</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1.5 p-6">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-white/10 text-white shadow-sm ring-1 ring-white/10" }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-bold text-muted-foreground transition-all duration-200 hover:bg-white/5 hover:text-white group led-hover"
            >
              <item.icon className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all rounded-xl py-6"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="font-semibold">Sair da Conta</span>
          </Button>
        </div>
      </aside>

      {/* Sidebar Mobile & Rest of Layout */}
      <div className="flex flex-col flex-1 min-w-0 bg-task-dark">
        <header className="flex h-20 items-center justify-between border-b border-white/5 bg-white/[0.02] backdrop-blur-xl px-6 lg:hidden shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <BarChart3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">CRM Festa e Eventos</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="rounded-xl hover:bg-white/10 transition-colors">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </header>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md lg:hidden animate-in fade-in duration-300">
            <div className="fixed inset-y-0 left-0 w-72 bg-task-dark border-r border-white/10 p-6 shadow-2xl animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-white">CRM Festa e Eventos</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl hover:bg-white/10">
                  <X />
                </Button>
              </div>
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    activeProps={{ className: "bg-white/10 text-white ring-1 ring-white/10" }}
                    className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-bold text-muted-foreground transition-all duration-200"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-x-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// Fixed missing Link import in previous version
import { Link } from "@tanstack/react-router";
