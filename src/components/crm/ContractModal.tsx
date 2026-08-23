import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SERVICES = [
  "Churros Gourmet",
  "Mini Pizza",
  "Mini Pastéis",
  "Açaí",
  "Drinks",
  "Bancada de Drinks",
];

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractModal({ open, onOpenChange }: ContractModalProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    contratante_name: "",
    contratante_document: "",
    fantasy_name: "",
    guest_count: 0,
    event_date: "",
    event_start_time: "",
    event_end_time: "",
    event_location: "",
    event_address: "",
    total_value: 0,
    payment_method: "",
    down_payment: 0,
    observations: "",
  });

  const { data: clients } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, document")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (selectedClientId && clients) {
      const client = clients.find((c: any) => c.id === selectedClientId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          contratante_name: client.name || "",
          contratante_document: client.document || "",
        }));
      }
    }
  }, [selectedClientId, clients]);

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      if (!selectedClientId) throw new Error("Selecione um cliente");

      const { error } = await supabase.from("contracts").insert({
        client_id: selectedClientId,
        user_id: session.user.id,
        service_description: selectedServices.join(", ") || "Serviço",
        total_value: formData.total_value,
        down_payment: formData.down_payment,
        balance_remaining: formData.total_value - formData.down_payment,
        status: 'Orcamento',
        contratante_name: formData.contratante_name || null,
        contratante_document: formData.contratante_document || null,
        fantasy_name: formData.fantasy_name || null,
        guest_count: formData.guest_count || null,
        event_date: formData.event_date || null,
        event_start_time: formData.event_start_time || null,
        event_end_time: formData.event_end_time || null,
        event_location: formData.event_location || null,
        event_address: formData.event_address || null,
        payment_method: formData.payment_method || null,
        observations: formData.observations || null,
        services: selectedServices,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Contrato criado!");
      onOpenChange(false);
      setSelectedClientId("");
      setSelectedServices([]);
      setFormData({
        contratante_name: "", contratante_document: "", fantasy_name: "",
        guest_count: 0, event_date: "", event_start_time: "", event_end_time: "",
        event_location: "", event_address: "", total_value: 0, payment_method: "",
        down_payment: 0, observations: "",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao criar contrato");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-task-dark border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Novo Contrato</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <label className="text-white/80 font-bold uppercase text-[10px] tracking-widest">Cliente</label>
            <select
              className="w-full h-10 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Selecione um cliente</option>
              {clients?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-primary mb-3">Dados do Contrato</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Contratante</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.contratante_name} onChange={(e) => updateField("contratante_name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">CPF/CNPJ Contratante</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.contratante_document} onChange={(e) => updateField("contratante_document", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Contratado</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value="Adry Estações Gourmet" readOnly />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Nome Fantasia</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.fantasy_name} onChange={(e) => updateField("fantasy_name", e.target.value)} placeholder="Adry Estações Gourmet" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-primary mb-3">Serviços Contratados</h3>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((service) => (
                <label key={service} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/5 cursor-pointer hover:bg-white/[0.06] transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={() => toggleService(service)}
                    className="rounded border-white/20"
                  />
                  <span className="text-sm">{service}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-primary mb-3">Evento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Data do Evento</label>
                <input type="date" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.event_date} onChange={(e) => updateField("event_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Nº Convidados</label>
                <input type="number" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.guest_count || ""} onChange={(e) => updateField("guest_count", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Horário Início</label>
                <input type="time" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.event_start_time} onChange={(e) => updateField("event_start_time", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Horário Término</label>
                <input type="time" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.event_end_time} onChange={(e) => updateField("event_end_time", e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-white/60 text-[10px] font-bold uppercase">Local do Evento</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.event_location} onChange={(e) => updateField("event_location", e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-white/60 text-[10px] font-bold uppercase">Endereço Completo</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.event_address} onChange={(e) => updateField("event_address", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-bold text-primary mb-3">Valores e Pagamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Valor Total (R$)</label>
                <input type="number" step="0.01" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.total_value || ""} onChange={(e) => updateField("total_value", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Valor Entrada (R$)</label>
                <input type="number" step="0.01" className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.down_payment || ""} onChange={(e) => updateField("down_payment", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-white/60 text-[10px] font-bold uppercase">Forma de Pagamento</label>
                <input className="w-full h-9 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm" value={formData.payment_method} onChange={(e) => updateField("payment_method", e.target.value)} placeholder="Pix, Cartão, Dinheiro..." />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-white/60 text-[10px] font-bold uppercase">Observações</label>
            <textarea className="w-full h-16 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm resize-none" value={formData.observations} onChange={(e) => updateField("observations", e.target.value)} />
          </div>

          <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={!selectedClientId}>
            CRIAR CONTRATO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
