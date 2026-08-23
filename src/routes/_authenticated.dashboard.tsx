import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  PlusCircle,
  BarChart3,
  Calendar,
  MessageCircle,
  Activity
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, getWhatsAppReminderLink } from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";
import { ClientModal } from "@/components/crm/ClientModal";
import { ContractModal } from "@/components/crm/ContractModal";
import { TransactionModal } from "@/components/crm/TransactionModal";
import { motion, AnimatePresence } from "framer-motion";

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#fff" className="text-sm font-bold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff" className="text-[10px] font-bold uppercase">{`R$ ${value.toLocaleString('pt-BR')}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-[9px]">
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardComponent,
});

const AnyPie = Pie as any;

function DashboardComponent() {
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("income");
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const fetchStats = useServerFn(getDashboardStats);
  const getReminderLink = useServerFn(getWhatsAppReminderLink);
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchStats(),
    retry: 2,
    staleTime: 10000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100-64px)] items-center justify-center p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Carregando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 m-8 flex flex-col items-center gap-4 bg-destructive/5 rounded-lg border border-destructive/20">
        <p className="text-destructive font-medium">Ops! Parece que sua sessão expirou ou ocorreu um erro de conexão.</p>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Sessão inválida"}</p>
        <div className="flex gap-4 mt-2">
          <Button 
            variant="outline"
            onClick={() => window.location.reload()} 
          >
            Tentar Novamente
          </Button>
          <Button 
            variant="default"
            className="bg-task-orange"
            onClick={() => {
              supabase.auth.signOut().then(() => {
                window.location.href = "/auth";
              });
            }} 
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? {
    activeContracts: 0,
    newClients: 0,
    monthlyIncome: 0,
    balance: 0,
    receivables: 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleNewTransaction = (type: "income" | "expense") => {
    setTransactionType(type);
    setTransactionModalOpen(true);
  };


  const handleSendReminder = async (contractId: string) => {
    try {
      const { whatsappUrl } = await getReminderLink({ data: { contractId } });
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      console.error("Erro ao gerar link do WhatsApp:", err);
      alert("Não foi possível gerar o lembrete. Verifique se o WhatsApp do cliente está cadastrado.");
    }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-10 p-10 max-w-7xl mx-auto w-full"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
            Dashboard Interativo
            <Activity className="h-6 w-6 text-task-green animate-pulse" />
          </h1>
          <p className="text-white/70 font-bold text-lg">Bem-vindo ao CRM Festa e Eventos. Sua saúde financeira em tempo real.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all led-hover"
            onClick={() => handleNewTransaction("income")}
          >
            <PlusCircle className="h-4 w-4 text-task-green" />
            Nova Receita
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 gap-2 bg-white/5 border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all led-hover"
            onClick={() => handleNewTransaction("expense")}
          >
            <PlusCircle className="h-4 w-4 text-destructive" />
            Nova Despesa
          </Button>
          <Button 
            size="sm" 
            className="h-10 px-5 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 led-hover"
            onClick={() => setContractModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Novo Contrato
          </Button>
        </div>
      </motion.div>

      {data?.upcomingAlerts && data.upcomingAlerts.length > 0 && (
        <motion.div variants={itemVariants} className="grid gap-4 mb-6">
          {data.upcomingAlerts.map((alert: any) => (
            <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl bg-task-orange/10 border border-task-orange/20 animate-pulse-subtle">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-task-orange/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-task-orange" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">ALERTA: Evento em menos de 24h!</p>
                  <p className="text-xs text-white/70">{alert.clientName} - {alert.service}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-xs font-mono text-task-orange font-bold">
                  {new Date(alert.eventDate).toLocaleString('pt-BR')}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 gap-2 bg-task-orange/20 border-task-orange/30 hover:bg-task-orange/40 text-white text-[10px] font-black rounded-lg transition-all led-hover"
                  onClick={() => handleSendReminder(alert.id)}
                >
                  <MessageCircle className="h-3 w-3" />
                  ENVIAR LEMBRETE
                </Button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Contratos", value: stats.activeContracts, color: "task-blue", icon: FileText, label: "+2 ativos" },
          { title: "Clientes", value: stats.newClients, color: "task-orange", icon: Users, label: "Novos esta semana" },
          { title: "Receita", value: formatCurrency(stats.monthlyIncome), color: "task-green", icon: DollarSign, label: "Saudável" },
          { title: "Saldo Atual", value: formatCurrency(stats.balance), color: "primary", icon: LayoutDashboard, label: "Disponível em conta", highlighted: true }
        ].map((stat, i) => (
          <motion.div key={i} variants={itemVariants}>
            <Card className={`border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden group hover:border-white/10 transition-colors led-border ${stat.highlighted ? 'ring-1 ring-primary/20 bg-primary/5' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className={`text-[13px] font-black uppercase tracking-[0.15em] ${stat.highlighted ? 'text-primary' : 'text-white/50'}`}>{stat.title}</CardTitle>
                <div className={`p-2.5 bg-${stat.color}/10 rounded-xl group-hover:scale-110 group-hover:rotate-12 transition-transform`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-white">{stat.value}</div>
                <div className={`flex items-center mt-2 text-xs font-bold ${stat.highlighted ? 'text-muted-foreground italic opacity-70' : `text-${stat.color} bg-${stat.color}/10 w-fit px-2 py-0.5 rounded-full`}`}>
                  {!stat.highlighted && <ArrowUpRight className="h-3 w-3 mr-1" />}
                  <span>{stat.label}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col gap-8">
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 px-8 py-6 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Tendência de Crescimento
                <TrendingUp className="h-5 w-5 text-task-green" />
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.chartData || []}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value}`}
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
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorReceita)" 
                    animationDuration={2000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesa" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorDespesa)" 
                    animationDuration={2000}
                    animationBegin={500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 px-8 py-6">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                Distribuição Financeira
                <BarChart3 className="h-5 w-5 text-task-blue" />
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] p-0 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <AnyPie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={[
                      { name: 'Receita', value: stats.monthlyIncome || 0 },
                      { name: 'Despesa', value: Math.abs((data as any)?.totalExpenses || 0) || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    animationDuration={1500}
                  >
                    <Cell fill="#10b981" stroke="rgba(16, 185, 129, 0.2)" strokeWidth={4} />
                    <Cell fill="#ef4444" stroke="rgba(239, 68, 68, 0.2)" strokeWidth={4} />
                  </AnyPie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
          <Card className="border-white/5 bg-white/[0.02] backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-white/5 px-8 py-6">
              <CardTitle className="text-xl font-bold text-white">Saúde Financeira</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 p-8">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl border border-task-green/20 bg-task-green/[0.03] p-6 transition-all hover:bg-task-green/[0.06] cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-task-green/20">
                      <ArrowUpRight className="h-6 w-6 text-task-green" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Total Recebido</p>
                      <p className="text-2xl font-black text-task-green">{formatCurrency(stats.monthlyIncome)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="group relative overflow-hidden rounded-2xl border border-task-orange/20 bg-task-orange/[0.03] p-6 transition-all hover:bg-task-orange/[0.06] cursor-default"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-task-orange/20">
                      <TrendingUp className="h-6 w-6 text-task-orange rotate-180" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">A Receber</p>
                      <p className="text-2xl font-black text-task-orange">{formatCurrency(stats.receivables)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="pt-6 border-t border-white/5">
                <h4 className="text-xs font-extrabold text-white/60 mb-4 uppercase tracking-[0.2em]">Ações Rápidas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start text-xs font-bold h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm led-hover"
                    onClick={() => handleNewTransaction("income")}
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-task-green" /> Receita
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start text-xs font-bold h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm led-hover"
                    onClick={() => handleNewTransaction("expense")}
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-destructive" /> Despesa
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start text-xs font-bold h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm led-hover"
                    onClick={() => window.location.href = "/reports"}
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-task-green" /> Relatórios
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="justify-start text-xs font-bold h-11 px-4 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all shadow-sm led-hover"
                    onClick={() => window.location.href = "/contracts"}
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-task-blue" /> Contratos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <ClientModal open={clientModalOpen} onOpenChange={setClientModalOpen} />
      <ContractModal open={contractModalOpen} onOpenChange={setContractModalOpen} />
      <TransactionModal 
        open={transactionModalOpen} 
        onOpenChange={setTransactionModalOpen} 
        defaultType={transactionType} 
      />
    </motion.div>
  );
}


