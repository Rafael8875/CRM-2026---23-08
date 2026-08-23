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
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Search, 
  MoreHorizontal, 
  Trash2, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet 
} from "lucide-react";
import { TransactionModal } from "@/components/crm/TransactionModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financial")({
  component: FinancialComponent,
});

function FinancialComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"income" | "expense">("income");
  const queryClient = useQueryClient();

  const { data: transactions } = useSuspenseQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      
      // Força o refetch imediato do dashboard
      queryClient.refetchQueries({ queryKey: ["dashboard-stats"], type: 'active' });
      
      toast.success("Lançamento excluído com sucesso");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir lançamento");
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totals = transactions?.reduce((acc, curr) => {
    const amt = Number(curr.amount);
    if (curr.status === 'Pago') {
      if (curr.type === 'income') acc.income += amt;
      else acc.expense += amt;
    }
    return acc;
  }, { income: 0, expense: 0 }) || { income: 0, expense: 0 };

  const filteredTransactions = transactions?.filter((t: any) =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Financeiro</h1>
          <p className="text-muted-foreground font-medium">Controle rigoroso de fluxo de caixa, receitas e despesas operacionais.</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="h-10 px-4 gap-2 border-task-green/20 bg-task-green/[0.03] text-task-green hover:bg-task-green/[0.08] font-bold rounded-xl transition-all"
            onClick={() => {
              setModalType("income");
              setIsModalOpen(true);
            }}
          >
            <ArrowUpCircle className="h-4.5 w-4.5" />
            Receita
          </Button>
          <Button 
            variant="outline" 
            className="h-10 px-4 gap-2 border-destructive/20 bg-destructive/[0.03] text-destructive hover:bg-destructive/[0.08] font-bold rounded-xl transition-all"
            onClick={() => {
              setModalType("expense");
              setIsModalOpen(true);
            }}
          >
            <ArrowDownCircle className="h-4.5 w-4.5" />
            Despesa
          </Button>
        </div>
      </div>

      <TransactionModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        defaultType={modalType} 
      />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-white/5 bg-task-green/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden group border-task-green/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-task-green uppercase tracking-widest">Entradas</CardTitle>
            <ArrowUpCircle className="h-5 w-5 text-task-green group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{formatCurrency(totals.income)}</div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-destructive/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden group border-destructive/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-destructive uppercase tracking-widest">Saídas</CardTitle>
            <ArrowDownCircle className="h-5 w-5 text-destructive group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{formatCurrency(totals.expense)}</div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-primary/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden group border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">Saldo Líquido</CardTitle>
            <Wallet className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-white">{formatCurrency(totals.income - totals.expense)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/[0.03]">
            <TableRow className="hover:bg-transparent border-white/5 h-14">
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Data</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Descrição</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Categoria</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Valor</TableHead>
              <TableHead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-6">Status</TableHead>
              <TableHead className="text-right px-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center text-muted-foreground/60 italic font-medium">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions?.map((t: any) => (
                <TableRow key={t.id} className="hover:bg-white/[0.04] border-white/5 transition-colors group">
                  <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground/70">
                    {t.date ? new Date(t.date).toLocaleDateString('pt-BR') : "-"}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${t.type === 'income' ? 'bg-task-green/10 text-task-green' : 'bg-destructive/10 text-destructive'}`}>
                        {t.type === 'income' ? 
                          <ArrowUpCircle className="h-3.5 w-3.5" /> : 
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        }
                      </div>
                      <span className="font-bold text-white group-hover:text-primary transition-colors">{t.description}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.15em] opacity-40 border-white/10 px-2 py-0">
                      {t.category || "Geral"}
                    </Badge>
                  </TableCell>
                  <TableCell className={`px-6 py-4 font-black ${t.type === 'income' ? 'text-task-green' : 'text-destructive'}`}>
                    {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant={t.status === 'Pago' ? 'default' : 'secondary'} className={t.status === 'Pago' ? 'bg-task-green/10 text-task-green border-task-green/20 font-bold px-3 py-0.5 rounded-full' : 'font-bold px-3 py-0.5 rounded-full'}>
                      {t.status || 'Pago'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-task-dark border-border/50">
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("Tem certeza que deseja excluir este lançamento?")) {
                                deleteMutation.mutate(t.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este lançamento?")) {
                            deleteMutation.mutate(t.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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