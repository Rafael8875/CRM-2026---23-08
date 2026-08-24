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
  Upload,
  Download,
  Loader2,
  MessageCircle
} from "lucide-react";

import { ContractModal } from "@/components/crm/ContractModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { listContractFiles, getContractFileUrl, deleteContractFile, getWhatsAppShareLink } from "@/lib/contracts.functions";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle, FileDown } from "lucide-react";
import { generateContractPdf } from "@/lib/contract-pdf";

export const Route = createFileRoute("/_authenticated/contracts")({
  component: ContractsComponent,
});

function ContractsComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Removemos transações vinculadas a este contrato antes da exclusão (garantia extra de sincronia)
      await supabase.from("transactions").delete().eq("contract_id", id);
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Força o refetch imediato do dashboard para atualizar saldo e receita
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
      
      toast.success("Contrato e seus lançamentos financeiros foram removidos");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir contrato:", error);
      toast.error("Erro ao excluir contrato");
    },
  });

  const closeContractMutation = useMutation({
    mutationFn: async ({ id, total_value, description }: { id: string; total_value: number; description: string }) => {
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
        description: `Receita do contrato: ${description || "Serviço"}`,
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

  const filteredContracts = contracts?.filter((contract: any) =>
    contract.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contract_number?.includes(searchTerm) ||
    contract.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Fechado':
        return <Badge className="bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full">Fechado</Badge>;
      case 'Negociação':
        return <Badge className="bg-task-blue/10 text-task-blue border-task-blue/20 font-bold px-3 py-0.5 rounded-full">Negociação</Badge>;
      case 'Cancelado':
        return <Badge variant="destructive" className="font-bold px-3 py-0.5 rounded-full">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Criador de Contratos</h1>
          <p className="text-muted-foreground font-medium">Gere contratos automaticamente a partir de modelos profissionais.</p>
        </div>
        
        <Button 
          className="h-10 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          onClick={() => setIsModalOpen(true)}
        >
          <FilePlus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      <ContractModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, número ou serviço..."
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
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Número</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Cliente</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Serviço</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Valor Total</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Status</TableHead>
              <TableHead className="text-right px-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContracts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground/60 italic font-medium">
                  Nenhum contrato encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredContracts?.map((contract: any) => (
                <TableRow key={contract.id} className="hover:bg-white/[0.04] border-white/5 transition-colors group">
                  <TableCell className="px-6 py-4 font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                    #{contract.contract_number || contract.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">
                    {contract.clients?.name}
                  </TableCell>
                  <TableCell className="px-6 py-4 max-w-[200px] truncate text-xs font-medium text-muted-foreground">
                    {contract.description || "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4 font-black text-white">{formatCurrency(contract.total_value)}</TableCell>
                  <TableCell className="px-6 py-4">
                    {getStatusBadge(contract.status || 'Orçamento')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ContractFilesManager contractId={contract.id} contractNumber={contract.contract_number} />
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-task-dark border-white/10 text-white shadow-2xl backdrop-blur-xl">
                          {contract.status !== "Fechado" && (
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer text-green-400 focus:text-green-300 focus:bg-green-500/10 transition-colors"
                              onClick={() => {
                                if (confirm("Fechar este contrato? Uma receita será gerada automaticamente.")) {
                                  closeContractMutation.mutate({
                                    id: contract.id,
                                    total_value: contract.total_value || 0,
                                    description: contract.description || "",
                                  });
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Fechar Contrato
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-blue-400 focus:text-blue-300 focus:bg-blue-500/10 transition-colors"
                            onClick={async () => {
                              try {
                                const pdfBytes = await generateContractPdf({
                                  contratante_name: contract.contratante_name || contract.clients?.name,
                                  contratante_document: contract.contratante_document,
                                  fantasy_name: contract.fantasy_name,
                                  guest_count: contract.guest_count,
                                  event_date: contract.event_date,
                                  event_start_time: contract.event_start_time,
                                  event_end_time: contract.event_end_time,
                                  event_location: contract.event_location,
                                  event_address: contract.event_address,
                                  total_value: contract.total_value,
                                  payment_method: contract.payment_method,
                                  down_payment: contract.down_payment,
                                  services: contract.services,
                                  observations: contract.observations,
                                  description: contract.description,
                                  client_name: contract.clients?.name,
                                });
                                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `contrato_${contract.contract_number || contract.id.slice(0,8)}.pdf`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success("PDF gerado com sucesso!");
                              } catch (err) {
                                console.error(err);
                                toast.error("Erro ao gerar PDF");
                              }
                            }}
                          >
                            <FileDown className="h-4 w-4" />
                            Gerar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer focus:bg-white/5 focus:text-primary transition-colors">
                            <Edit className="h-4 w-4 text-task-blue" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5 transition-colors"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este contrato?")) {
                                deleteMutation.mutate(contract.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

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
      toast.success("PDF enviado com sucesso!");
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
      toast.error("Erro ao gerar link de download");
    }
  };

  const handleWhatsAppShare = async (fileName: string) => {
    try {
      const { whatsappUrl } = await getWhatsAppLink({ data: { contractId, fileName } });
      window.open(whatsappUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar link do WhatsApp");
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm("Excluir este arquivo?")) return;
    try {
      await deleteFileFn({ data: { contractId, fileName } });
      queryClient.invalidateQueries({ queryKey: ["contract-files", contractId] });
      toast.success("Arquivo excluído");
    } catch (error) {
      toast.error("Erro ao excluir arquivo");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <FileText className="h-4 w-4" />
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
            <div>
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
                      className="h-8 px-3 text-[10px] font-bold gap-2 bg-task-green/10 text-task-green border-task-green/20 hover:bg-task-green hover:text-white transition-all rounded-lg"
                      onClick={() => handleWhatsAppShare(file.name)}
                    >
                      <MessageCircle className="h-3 w-3" />
                      WHATSAPP
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 px-3 text-[10px] font-bold gap-2 bg-white/5 text-white border-white/10 hover:bg-white/10 transition-all rounded-lg"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-3 w-3" />
                      BAIXAR
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all rounded-lg"
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
