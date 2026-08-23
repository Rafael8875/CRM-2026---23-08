import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as AuthContext;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    
    // Buscar alertas próximos (24h)
    const { data: upcomingAlerts } = await supabase
      .from("contracts")
      .select("id, service_description, event_date_time, clients(name)")
      .eq("user_id", userId)
      .eq("status", "Fechado")
      .gte("event_date_time", now.toISOString())
      .lte("event_date_time", twentyFourHoursFromNow)
      .order("event_date_time", { ascending: true });
    
    const { count: activeContracts } = await (supabase
      .from("contracts")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .eq("status", "Fechado"));

    const { count: newClients } = await (supabase
      .from("clients")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfMonth));

    const { data: monthlyIncome } = await (supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "income")
      .eq("status", "Pago")
      .gte("date", startOfMonth));

    const totalMonthlyIncome = monthlyIncome?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;

    const { data: receivables } = await (supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "income")
      .in("status", ["Pendente", "Vencido"]));

    const totalReceivables = receivables?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;

    const { data: allTransactions } = await (supabase
      .from("transactions")
      .select("amount, type, status")
      .eq("user_id", userId)
      .eq("status", "Pago"));

    const balance = allTransactions?.reduce((acc: number, curr: any) => {
      const amt = Number(curr.amount);
      return curr.type === 'income' ? acc + amt : acc - amt;
    }, 0) || 0;

    // Get total expenses for the dashboard chart
    const { data: expenses } = await (supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .eq("status", "Pago"));
    
    const totalExpenses = expenses?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;

    // Gerar dados reais para o gráfico baseados nas transações dos últimos 6 meses
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: monthTrans } = await supabase
        .from("transactions")
        .select("amount, type")
        .eq("user_id", userId)
        .eq("status", "Pago")
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const income = monthTrans?.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0) || 0;
      const expense = monthTrans?.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0) || 0;

      chartData.push({ name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), receita: income, despesa: expense });
    }
    
    return {
      stats: {
        activeContracts: activeContracts || 0,
        newClients: newClients || 0,
        monthlyIncome: totalMonthlyIncome,
        receivables: totalReceivables,
        balance: balance
      },
      totalExpenses,
      chartData,
      upcomingAlerts: (upcomingAlerts || []).map((c: any) => ({
        id: c.id,
        clientName: c.clients?.name,
        service: c.service_description,
        eventDate: c.event_date_time
      }))
    };
  });

export const createClient = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    document: z.string().optional(),
    whatsapp: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context as AuthContext;
    const { data, error } = await supabase
      .from("clients")
      .insert([{
        name: input.name,
        email: input.email || null,
        document: input.document || null,
        whatsapp: input.whatsapp || null,
        city: input.city || null,
        state: input.state || null,
        user_id: userId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    document: z.string().optional(),
    whatsapp: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context as AuthContext;
    const { data, error } = await supabase
      .from("clients")
      .update({
        name: input.name,
        email: input.email || null,
        document: input.document || null,
        whatsapp: input.whatsapp || null,
        city: input.city || null,
        state: input.state || null,
      })
      .eq("id", input.id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const createContract = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    client_id: z.string().uuid(),
    service_description: z.string().min(1),
    total_value: z.number().min(0),
    down_payment: z.number().min(0).default(0),
    event_date_time: z.string().optional(),
    status: z.string().default("Fechado"),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // 1. Criar o contrato
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .insert([{
        client_id: input.client_id,
        service_description: input.service_description,
        total_value: input.total_value,
        down_payment: input.down_payment,
        event_date_time: input.event_date_time || null,
        contract_date: new Date().toISOString().split('T')[0] as string | null,
        status: input.status,
        user_id: userId
      }])
      .select()
      .single();
      
    if (contractError) throw contractError;

    // 2. Se houver um sinal/entrada, criar automaticamente uma transação de receita paga
    if (input.down_payment > 0) {
      const { error: transError } = await supabase
        .from("transactions")
        .insert([{
          description: `Entrada: ${input.service_description}`,
          amount: input.down_payment,
          type: "income",
          category: "Entrada de Contrato",
          date: new Date().toISOString(),
          status: "Pago",
          contract_id: contract.id,
          user_id: userId
        }]);
        
      if (transError) console.error("Erro ao criar transação de entrada:", transError);
    }

    return contract;
  });

export const createTransaction = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({
    description: z.string().min(1),
    amount: z.number().min(0),
    type: z.enum(["income", "expense"]),
    category: z.string().optional(),
    date: z.string().default(() => new Date().toISOString()),
    status: z.string().default("Pago"),
    contract_id: z.string().uuid().optional(),
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context as AuthContext;
    const { data, error } = await supabase
      .from("transactions")
      .insert([{
        description: input.description,
        amount: input.amount,
        type: input.type,
        category: input.category || null,
        date: input.date,
        status: input.status,
        contract_id: input.contract_id || null,
        user_id: userId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  });

export const getFinancialReport = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({
    month: z.number().min(1).max(12),
    year: z.number().min(2000).max(2100)
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    const startDate = new Date(input.year, input.month - 1, 1).toISOString();
    const endDate = new Date(input.year, input.month, 0, 23, 59, 59).toISOString();

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) throw error;

    const totals = (transactions || []).reduce((acc: any, curr: any) => {
      const amt = Number(curr.amount);
      if (curr.status === 'Pago') {
        if (curr.type === 'income') acc.income += amt;
        else acc.expense += amt;
      } else {
        if (curr.type === 'income') acc.pending_income += amt;
        else acc.pending_expense += amt;
      }
      return acc;
    }, { income: 0, expense: 0, pending_income: 0, pending_expense: 0 });

    const categoriesMap = (transactions || []).reduce((acc: any, curr: any) => {
      const cat = curr.category || "Geral";
      if (!acc[cat]) acc[cat] = { name: cat, income: 0, expense: 0 };
      if (curr.type === 'income') acc[cat].income += Number(curr.amount);
      else acc[cat].expense += Number(curr.amount);
      return acc;
    }, {} as any);

    const categoryData = Object.values(categoriesMap).map((c: any) => ({
      name: String(c.name),
      income: Number(c.income),
      expense: Number(c.expense)
    }));

    return {
      transactions: (transactions || []).map(t => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        status: t.status,
        date: t.date,
        description: t.description,
        category: t.category
      })),
      totals,
      categoryData
    };
  });

export const getWhatsAppReminderLink = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ 
    contractId: z.string().uuid()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*, clients(name, whatsapp)")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (error || !contract) throw new Error("Contrato não encontrado");

    const client = (contract as any).clients;
    if (!client?.whatsapp) throw new Error("WhatsApp do cliente não cadastrado");

    const cleanNumber = client.whatsapp.replace(/\D/g, "");
    const eventTime = contract.event_date_time 
      ? new Date(contract.event_date_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : "";
    
    const message = encodeURIComponent(
      `Olá ${client.name}! Lembrete do seu evento (${contract.service_description}) amanhã às ${eventTime}. Estamos ansiosos!`
    );
    
    return { 
      whatsappUrl: `https://wa.me/${cleanNumber}?text=${message}`
    };
  });
