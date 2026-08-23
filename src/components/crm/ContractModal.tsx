import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { createContract } from "@/lib/crm.functions";
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
import { Textarea } from "@/components/ui/textarea";

const contractSchema = z.object({
  client_id: z.string().min(1, "Cliente é obrigatório"),
  service_description: z.string().min(1, "Descrição do serviço é obrigatória"),
  total_value: z.coerce.number().min(0.01, "Valor total deve ser maior que zero"),
  down_payment: z.coerce.number().min(0, "Sinal não pode ser negativo"),
  installments: z.coerce.number().min(1, "Mínimo de 1 parcela"),
  event_date_time: z.string().min(1, "Data e hora do evento são obrigatórias"),
});

type ContractFormValues = z.infer<typeof contractSchema>;

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractModal({ open, onOpenChange }: ContractModalProps) {
  const queryClient = useQueryClient();
  const createContractFn = useServerFn(createContract);

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
      client_id: "",
      service_description: "",
      total_value: 0,
      down_payment: 0,
      installments: 1,
      event_date_time: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ContractFormValues) => createContractFn({ data: values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Contrato criado com sucesso!");
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
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Cliente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className="bg-white/[0.05] border-white/10 text-white min-h-[40px]">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-task-dark border-white/20 text-white z-[100] max-h-[300px]">
                      {clients && clients.length > 0 ? (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id} className="focus:bg-white/10 focus:text-primary py-2 cursor-pointer border-b border-white/5 last:border-0">
                            {client.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-white/50">
                          {clients === undefined ? "Carregando..." : "Nenhum cliente cadastrado"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="service_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Descrição do Serviço</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Fotografia de Casamento, Decoração de Festa..." 
                      className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20 min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Valor Total (R$)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className="bg-white/[0.05] border-white/10 text-white" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          const total = parseFloat(e.target.value) || 0;
                          const installments = parseInt(form.getValues("installments")?.toString() || "1");
                          if (installments > 0) {
                            form.setValue("down_payment", Number((total / installments).toFixed(2)));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="down_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Sinal / Entrada (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Parcelas</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        className="bg-white/[0.05] border-white/10 text-white" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          const installments = parseInt(e.target.value) || 1;
                          const total = parseFloat(form.getValues("total_value")?.toString() || "0");
                          if (installments > 0) {
                            form.setValue("down_payment", Number((total / installments).toFixed(2)));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="event_date_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Data e Hora do Evento</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-white/[0.05] border-white/10 text-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={mutation.isPending}>
              {mutation.isPending ? "CRIANDO..." : "CRIAR CONTRATO"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
