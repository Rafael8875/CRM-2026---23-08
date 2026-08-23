import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
  UserPlus,
  FileText,
  FilePlus,
  ChevronDown,
  ChevronRight,
  Download,
  CheckCircle,
  MessageCircle,
  Loader2,
  Upload,
  X
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { listContractFiles, getContractFileUrl, deleteContractFile, getWhatsAppShareLink } from "@/lib/contracts.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsComponent,
});

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  document: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

const contractSchema = z.object({
  service_description: z.string().min(1, "Descrição do serviço é obrigatória"),
  total_value: z.coerce.number().min(0.01, "Valor total deve ser maior que zero"),
  down_payment: z.coerce.number().min(0, "Sinal não pode ser negativo"),
  installments: z.coerce.number().min(1, "Mínimo de 1 parcela"),
  event_date_time: z.string().min(1, "Data e hora do evento são obrigatórias"),
});

type ClientFormValues = z.infer<typeof clientSchema>;
type ContractFormValues = z.infer<typeof contractSchema>;

function ClientsComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
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

  const { data: contracts } = useSuspenseQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("contracts")
        .select("*, clients(name)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: clientContracts } = await supabase
        .from("contracts")
        .select("id")
        .eq("client_id", id);
      
      const contractIds = clientContracts?.map(c => c.id) || [];

      if (contractIds.length > 0) {
        await supabase
          .from("transactions")
          .delete()
          .in("contract_id", contractIds);
      }

      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Cliente e todos os seus lançamentos foram removidos");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente");
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("transactions").delete().eq("contract_id", id);
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Contrato removido");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir contrato:", error);
      toast.error("Erro ao excluir contrato");
    },
  });

  const closeContractMutation = useMutation({
    mutationFn: async ({ id, total_value, service_description }: { id: string; total_value: number; service_description: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({ status: "Fechado" })
        .eq("id", id);
      if (error) throw error;

      const { data: contract } = await supabase
        .from("contracts")
        .select("client_id")
        .eq("id", id)
        .single();

      await supabase.from("transactions").insert({
        user_id: user.id,
        client_id: (contract as any)?.client_id,
        contract_id: id,
        type: "income",
        amount: total_value,
        status: "Pago",
        description: `Receita do contrato: ${service_description || "Serviço"}`,
        date: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Contrato fechado e receita registrada!");
    },
    onError: (error: any) => {
      console.error("Erro ao fechar contrato:", error);
      toast.error("Erro ao fechar contrato");
    },
  });

  const filteredClients = clients?.filter((client: any) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.document?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClientContracts = (clientId: string) => {
    return contracts?.filter((c: any) => c.client_id === clientId) || [];
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case 'Fechado':
        return <Badge className="bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full text-[10px]">Fechado</Badge>;
      case 'Negociação':
        return <Badge className="bg-task-blue/10 text-task-blue border-task-blue/20 font-bold px-3 py-0.5 rounded-full text-[10px]">Negociação</Badge>;
      case 'Cancelado':
        return <Badge variant="destructive" className="font-bold px-3 py-0.5 rounded-full text-[10px]">Cancelado</Badge>;
      case 'Pago':
        return <Badge className="bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full text-[10px]">Pago</Badge>;
      case 'Concluído':
        return <Badge className="bg-primary/10 text-primary border-primary/20 font-bold px-3 py-0.5 rounded-full text-[10px]">Concluído</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{status || 'Orçamento'}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Clientes e Contratos</h1>
          <p className="text-muted-foreground font-medium">Gerencie seus clientes e contratos em um só lugar.</p>
        </div>
        
        <Button 
          className="h-10 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          onClick={() => {
            setSelectedClient(null);
            setIsClientModalOpen(true);
          }}
        >
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <ClientModal 
        open={isClientModalOpen} 
        onOpenChange={(open) => {
          setIsClientModalOpen(open);
          if (!open) setSelectedClient(null);
        }} 
        client={selectedClient}
      />

      <ContractModal 
        open={isContractModalOpen} 
        onOpenChange={setIsContractModalOpen}
        clientId={expandedClientId || undefined}
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

      <div className="space-y-4">
        {filteredClients?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground/60 italic font-medium">
            Nenhum cliente encontrado.
          </div>
        ) : (
          filteredClients?.map((client: any) => {
            const clientContracts = getClientContracts(client.id);
            const isExpanded = expandedClientId === client.id;
            
            return (
              <div key={client.id} className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
                <div 
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() => setExpandedClientId(isExpanded ? null : client.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-lg">{client.name}</span>
                        <Badge variant={client.status === 'Ativo' ? 'default' : 'secondary'} className={client.status === 'Ativo' ? 'bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full' : 'font-bold px-3 py-0.5 rounded-full'}>
                          {client.status || 'Ativo'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {client.document && <span className="font-mono text-xs">{client.document}</span>}
                        {client.whatsapp && <span>{client.whatsapp}</span>}
                        {client.city && <span>{client.city}/{client.state || ""}</span>}
                        {client.email && <span className="text-xs">{client.email}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant="outline" className="text-xs font-bold">
                      {clientContracts.length} {clientContracts.length === 1 ? 'contrato' : 'contratos'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-task-blue hover:bg-task-blue/10"
                      onClick={() => {
                        setSelectedClient(client);
                        setIsClientModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este cliente?")) {
                          deleteClientMutation.mutate(client.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-white/5 p-5 pt-0">
                    <div className="flex items-center justify-between mt-5 mb-4">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Contratos</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 gap-2 border-task-blue/20 bg-task-blue/[0.03] text-task-blue hover:bg-task-blue/[0.08] font-bold rounded-lg text-xs"
                        onClick={() => setIsContractModalOpen(true)}
                      >
                        <FilePlus className="h-3 w-3" />
                        Novo Contrato
                      </Button>
                    </div>
                    
                    {clientContracts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground/50 text-sm italic border border-dashed border-white/10 rounded-xl">
                        Nenhum contrato para este cliente.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/5 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-white/[0.03]">
                            <TableRow className="hover:bg-transparent border-white/5 h-10">
                              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-4">Número</TableHead>
                              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-4">Serviço</TableHead>
                              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-4">Valor</TableHead>
                              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-4">Data</TableHead>
                              <TableHead className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-4">Status</TableHead>
                              <TableHead className="text-right px-4">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {clientContracts.map((contract: any) => (
                              <TableRow key={contract.id} className="hover:bg-white/[0.04] border-white/5 transition-colors group">
                                <TableCell className="px-4 py-3 font-mono text-[10px] text-muted-foreground/60">
                                  #{contract.contract_number || contract.id.slice(0, 8)}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-xs font-medium text-white max-w-[200px] truncate">
                                  {contract.service_description || "-"}
                                </TableCell>
                                <TableCell className="px-4 py-3 font-black text-white text-xs">
                                  {formatCurrency(contract.total_value)}
                                </TableCell>
                                <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                  {contract.contract_date ? new Date(contract.contract_date).toLocaleDateString('pt-BR') : "-"}
                                </TableCell>
                                <TableCell className="px-4 py-3">
                                  {getContractStatusBadge(contract.status)}
                                </TableCell>
                                <TableCell className="text-right px-4">
                                  <div className="flex justify-end gap-1">
                                    {contract.status !== "Fechado" && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="h-7 text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300 text-[10px] font-bold gap-1"
                                        title="Fechar contrato e gerar receita"
                                        onClick={() => {
                                          if (confirm("Fechar este contrato? Uma receita será gerada automaticamente.")) {
                                            closeContractMutation.mutate({
                                              id: contract.id,
                                              total_value: contract.total_value || 0,
                                              service_description: contract.service_description || "",
                                            });
                                          }
                                        }}
                                        disabled={closeContractMutation.isPending}
                                      >
                                        <CheckCircle className="h-3 w-3" />
                                        FECHAR
                                      </Button>
                                    )}
                                    <ContractFilesManager contractId={contract.id} contractNumber={contract.contract_number} />
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        if (confirm("Tem certeza que deseja excluir este contrato?")) {
                                          deleteContractMutation.mutate(contract.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ClientModal({ open, onOpenChange, client }: { open: boolean; onOpenChange: (open: boolean) => void; client?: any }) {
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      document: "",
      whatsapp: "",
      city: "",
      state: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        form.reset({
          name: client.name || "",
          email: client.email || "",
          document: client.document || "",
          whatsapp: client.whatsapp || "",
          city: client.city || "",
          state: client.state || "",
        });
      } else {
        form.reset({
          name: "",
          email: "",
          document: "",
          whatsapp: "",
          city: "",
          state: "",
        });
      }
    }
  }, [client, open, form]);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      if (client?.id) {
        const { error } = await supabase
          .from("clients")
          .update(values)
          .eq("id", client.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("clients")
          .insert({ ...values, user_id: session.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(client ? "Cliente atualizado!" : "Cliente criado!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar cliente");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-task-dark border-border/50">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="email@exemplo.com" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="document" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">CPF/CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="whatsapp" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="state" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">UF</FormLabel>
                  <FormControl>
                    <Input placeholder="UF" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" maxLength={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full bg-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : (client ? "Salvar Alterações" : "Criar Cliente")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ContractModal({ open, onOpenChange, clientId }: { open: boolean; onOpenChange: (open: boolean) => void; clientId?: string }) {
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      service_description: "",
      total_value: 0,
      down_payment: 0,
      installments: 1,
      event_date_time: "",
    },
  });

  const [selectedClientId, setSelectedClientId] = useState(clientId || "");

  useEffect(() => {
    if (open && clientId) {
      setSelectedClientId(clientId);
    } else if (open && !clientId) {
      setSelectedClientId("");
    }
  }, [open, clientId]);

  const mutation = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { error } = await supabase.from("contracts").insert({
        client_id: selectedClientId,
        user_id: session.user.id,
        service_description: values.service_description,
        total_value: values.total_value,
        down_payment: values.down_payment,
        balance_remaining: values.total_value - values.down_payment,
        status: 'Orcamento',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Contrato criado!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar contrato");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-task-dark border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Contrato</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Cliente</label>
              <select 
                className="w-full h-10 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">Selecione um cliente</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <FormField control={form.control} name="service_description" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Descrição do Serviço</FormLabel>
                <FormControl>
                  <Textarea placeholder="Ex: Fotografia de Casamento, Decoração de Festa..." className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 min-h-[80px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="total_value" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Valor Total (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="down_payment" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Sinal / Entrada (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="installments" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Parcelas</FormLabel>
                  <FormControl>
                    <Input type="number" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="event_date_time" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Data e Hora do Evento</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={mutation.isPending || !selectedClientId}>
              {mutation.isPending ? "CRIANDO..." : "CRIAR CONTRATO"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ContractFilesManager({ contractId, contractNumber }: { contractId: string, contractNumber?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();
  
  const listFiles = useServerFn(listContractFiles);
  const getUrl = useServerFn(getContractFileUrl);
  const deleteFileFn = useServerFn(deleteContractFile);
  const getWhatsAppLink = useServerFn(getWhatsAppShareLink);

  const { data: files } = useSuspenseQuery({
    queryKey: ["contract-files", contractId],
    queryFn: () => listFiles({ data: { contractId } }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${contractId}/${fileName}`;

        const { error } = await supabase.storage
          .from("contract-pdfs")
          .upload(filePath, file);

        if (error) throw error;
        return { fileName };
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-files", contractId] });
      toast.success("PDF enviado!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao enviar PDF");
    }
  });

  const handleDownload = async (fileName: string) => {
    try {
      const url = await getUrl({ data: { contractId, fileName } });
      window.open(url, '_blank');
    } catch (error) {
      toast.error("Erro ao gerar link");
    }
  };

  const handleWhatsAppShare = async (fileName: string) => {
    try {
      const { whatsappUrl } = await getWhatsAppLink({ data: { contractId, fileName } });
      window.open(whatsappUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar link");
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("Excluir este arquivo?")) return;
    try {
      await deleteFileFn({ data: { contractId, fileName } });
      queryClient.invalidateQueries({ queryKey: ["contract-files", contractId] });
      toast.success("Arquivo excluído");
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-3.5 w-3.5" />
      </Button>

      <DialogContent className="sm:max-w-[425px] bg-task-dark border-white/10 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Arquivos do Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Documentos</h3>
            <label className="cursor-pointer">
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMutation.mutate(file);
                }}
                disabled={isUploading}
              />
              <div className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors w-fit">
                {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                IMPORTAR PDF
              </div>
            </label>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {files?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground/50 text-sm italic">
                Nenhum PDF anexado.
              </div>
            ) : (
              files?.map((file: any) => (
                <div key={file.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4 text-red-500" />
                    </div>
                    <span className="text-sm font-medium truncate pr-2">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] font-bold gap-1 bg-task-green/10 text-task-green border-task-green/20 hover:bg-task-green hover:text-white transition-all rounded-lg"
                      onClick={() => handleWhatsAppShare(file.name)}
                    >
                      <MessageCircle className="h-3 w-3" />
                      WHATSAPP
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-[10px] font-bold gap-1 bg-white/5 text-white border-white/10 hover:bg-white/10 transition-all rounded-lg"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-3 w-3" />
                      BAIXAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
                      onClick={() => handleDelete(file.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
