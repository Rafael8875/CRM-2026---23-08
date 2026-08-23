import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinancialReport } from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet,
  Download,
  BarChart3
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsComponent,
});

function ReportsComponent() {
  const now = new Date();
  const [month, setMonth] = useState<string>((now.getMonth() + 1).toString());
  const [year, setYear] = useState<string>(now.getFullYear().toString());

  const fetchReport = useServerFn(getFinancialReport);
  
  const { data, isLoading } = useQuery({
    queryKey: ["financial-report", month, year],
    queryFn: () => fetchReport({ data: { month: parseInt(month), year: parseInt(year) } }),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (now.getFullYear() - i).toString());

  // Safe data access
  const reportData = data as any;
  const totals = reportData?.totals || { income: 0, expense: 0, pending_income: 0, pending_expense: 0 };
  const transactions = reportData?.transactions || [];
  const categoryData = reportData?.categoryData || [];

  return (
    <div className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Relatórios Financeiros</h1>
          <p className="text-muted-foreground font-medium">Análise detalhada do desempenho mensal do seu negócio.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="bg-task-dark border-white/10">
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-white focus:bg-white/10 focus:text-white cursor-pointer">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="bg-task-dark border-white/10">
                {years.map(y => (
                  <SelectItem key={y} value={y} className="text-white focus:bg-white/10 focus:text-white cursor-pointer">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline" 
            className="h-10 px-4 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all led-hover"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-20 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground font-bold">Gerando relatório detalhado...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-white/5 bg-task-green/[0.02] backdrop-blur-md shadow-2xl rounded-2xl border-task-green/10 led-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black text-task-green uppercase tracking-widest">Entradas (Pagas)</CardTitle>
                <ArrowUpCircle className="h-5 w-5 text-task-green" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">{formatCurrency(totals.income)}</div>
                {totals.pending_income > 0 && (
                  <p className="text-[10px] text-task-green/60 mt-2 font-bold uppercase tracking-wider">
                    + {formatCurrency(totals.pending_income)} pendentes
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-destructive/[0.02] backdrop-blur-md shadow-2xl rounded-2xl border-destructive/10 led-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black text-destructive uppercase tracking-widest">Saídas (Pagas)</CardTitle>
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">{formatCurrency(totals.expense)}</div>
                {totals.pending_expense > 0 && (
                  <p className="text-[10px] text-destructive/60 mt-2 font-bold uppercase tracking-wider">
                    + {formatCurrency(totals.pending_expense)} pendentes
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-primary/[0.02] backdrop-blur-md shadow-2xl rounded-2xl border-primary/10 led-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black text-primary uppercase tracking-widest">Lucro Realizado</CardTitle>
                <Wallet className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">{formatCurrency(totals.income - totals.expense)}</div>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-wider italic">
                  Competência: {months.find(m => m.value === month)?.label}
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl led-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-black text-white/40 uppercase tracking-widest">Movimentações</CardTitle>
                <BarChart3 className="h-5 w-5 text-white/20" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-white">{transactions.length}</div>
                <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-wider">Lançamentos no período</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-8 py-6">
                <CardTitle className="text-xl font-bold text-white">Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px] p-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(23, 23, 23, 0.95)', 
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff'
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="income" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 px-8 py-6">
                <CardTitle className="text-xl font-bold text-white">Resumo Operacional</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {categoryData.map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{cat.income > 0 ? 'Receita' : 'Custo'} Principal</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${cat.income >= cat.expense ? 'text-task-green' : 'text-destructive'}`}>
                          {cat.income > 0 ? `+ ${formatCurrency(cat.income)}` : `- ${formatCurrency(cat.expense)}`}
                        </p>
                        <div className="w-32 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full ${cat.income >= cat.expense ? 'bg-task-green' : 'bg-destructive'}`} 
                            style={{ width: `${Math.min(100, (Math.max(cat.income, cat.expense) / (totals.income || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!categoryData || categoryData.length === 0) && (
                    <p className="text-center text-muted-foreground italic py-10">Nenhum dado para este período.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}