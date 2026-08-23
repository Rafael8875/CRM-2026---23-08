import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, updateClient } from "@/lib/crm.functions";
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
import { useEffect } from "react";

const clientSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  document: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: any; // Added for editing
}

export function ClientModal({ open, onOpenChange, client }: ClientModalProps) {
  const queryClient = useQueryClient();
  const createClientFn = useServerFn(createClient);
  const updateClientFn = useServerFn(updateClient);

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
      if (client?.id) {
        return updateClientFn({ data: { id: client.id, ...values } });
      }
      return createClientFn({ data: values });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(client ? "Cliente atualizado com sucesso!" : "Cliente criado com sucesso!");
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error(client ? "Erro ao atualizar cliente" : "Erro ao criar cliente");
    },
  });

  function onSubmit(values: ClientFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-task-dark border-border/50">
        <DialogHeader>
          <DialogTitle>{client ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">CPF/CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80 font-bold uppercase text-[10px] tracking-widest">UF</FormLabel>
                    <FormControl>
                      <Input placeholder="UF" {...field} className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/20" maxLength={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full bg-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (client ? "Salvando..." : "Criando...") : (client ? "Salvar Alterações" : "Criar Cliente")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}