import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createTransaction } from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  type: z.enum(["income", "expense"]),
  category: z.string().optional().nullable(),
  date: z.string().min(1, "Data é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  contract_id: z.string().optional().nullable(),
});

type TransactionFormValues = {
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string | null;
  date: string;
  status: string;
  contract_id?: string | null;
};

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "income" | "expense";
}

export function TransactionModal({ open, onOpenChange, defaultType = "income" }: TransactionModalProps) {
  const queryClient = useQueryClient();
  const createTransactionFn = useServerFn(createTransaction);

  const { data: contracts } = useQuery({
    queryKey: ["contracts-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, service_description, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      description: "",
      amount: 0,
      type: defaultType,
      category: "",
      date: new Date().toISOString().split("T")[0],
      status: "Pago",
      contract_id: "",
    } as any,
  });

  const mutation = useMutation({
    mutationFn: (values: TransactionFormValues) => {
      const payload = {
        description: values.description,
        amount: values.amount,
        type: values.type,
        date: values.date,
        status: values.status,
        contract_id: (values.contract_id === "" || values.contract_id === "none" || !values.contract_id) ? undefined : values.contract_id,
        category: (values.category === "" || !values.category) ? undefined : values.category,
      };
      return createTransactionFn({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Lançamento criado com sucesso!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar lançamento");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-task-dark border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Lançamento ({defaultType === 'income' ? 'Receita' : 'Despesa'})</DialogTitle>
        </DialogHeader>
        <Form {...(form as any)}>
          <form 
            onSubmit={form.handleSubmit((v: any) => mutation.mutate(v))} 
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control as any}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pagamento de Contrato" {...field} value={field.value ?? ""} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Valor (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? 0} className="bg-white/[0.05] border-white/10 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} className="bg-white/[0.05] border-white/10 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control as any}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Categoria</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Venda, Material, Salário" 
                      {...field} 
                      value={field.value ?? ""}
                      className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {defaultType === 'income' && (
              <FormField
                control={form.control as any}
                name="contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Vincular a Contrato (Opcional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/[0.05] border-white/10 text-white">
                          <SelectValue placeholder="Selecione um contrato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-task-dark border-white/20 text-white z-[100]">
                        <SelectItem value="none" className="focus:bg-white/10 cursor-pointer">Nenhum</SelectItem>
                        {contracts?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id} className="focus:bg-white/10 cursor-pointer">
                            {c.clients?.name} - {c.service_description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full bg-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Criando..." : "Criar Lançamento"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
