import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserPlus 
} from "lucide-react";
import { ClientModal } from "@/components/crm/ClientModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsComponent,
});

function ClientsComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: clients } = useSuspenseQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro buscamos todos os contratos associados a este cliente
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id")
        .eq("client_id", id);
      
      const contractIds = contracts?.map(c => c.id) || [];

      // Removemos as transações vinculadas a esses contratos explicitamente para garantir
      if (contractIds.length > 0) {
        await supabase
          .from("transactions")
          .delete()
          .in("contract_id", contractIds);
      }

      // Agora removemos o cliente (o CASCADE no banco cuidará dos contratos)
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalida todas as queries para garantir que o cache do React Query seja limpo
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Força a atualização imediata dos dados do dashboard (saldo, receita, etc)
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      
      toast.success("Cliente e todos os seus lançamentos financeiros foram removidos");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente e registros vinculados");
    },
  });

  const filteredClients = clients?.filter((client: any) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Clientes</h1>
          <p className="text-muted-foreground font-medium">Base estratégica de contatos e parceiros de negócio.</p>
        </div>
        
        <Button 
          className="h-10 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          onClick={() => {
            setSelectedClient(null);
            setIsModalOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <ClientModal 
        open={isModalOpen} 
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setSelectedClient(null);
        }} 
        client={selectedClient}
      />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, documento ou e-mail..."
            className="pl-10 h-10 border-white/5 bg-white/[0.03] text-white placeholder:text-muted-foreground/50 rounded-xl focus:ring-1 focus:ring-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="hover:bg-transparent border-white/5 h-14">
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Nome</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Documento</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">WhatsApp</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Cidade/UF</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Status</TableHead>
              <TableHead className="text-right px-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground/60 italic font-medium">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredClients?.map((client: any) => (
                <TableRow key={client.id} className="hover:bg-white/[0.04] border-white/5 transition-colors group">
                  <TableCell className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-white group-hover:text-primary transition-colors">{client.name}</span>
                      <span className="text-[11px] font-medium text-muted-foreground/60">{client.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">{client.document || "-"}</TableCell>
                  <TableCell className="px-6 py-4 font-medium text-white">{client.whatsapp || "-"}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    {client.city ? `${client.city}/${client.state || ""}` : "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'} className={client.status === 'Ativo' ? 'bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full' : 'font-bold px-3 py-0.5 rounded-full'}>
                      {client.status || 'Ativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 bg-task-dark border-border/50">
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer"
                          onSelect={() => {
                            setSelectedClient(client);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          onSelect={() => {
                            if (confirm("Tem certeza que deseja excluir este cliente?")) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}