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
import { Trash2, Plus, Upload, FileText } from "lucide-react";
import { extractTextFromPdf, parseContractText } from "@/lib/pdf-extract";
import { generateContractWithGrok } from "@/lib/grok-generate";

const AVAILABLE_SERVICES = [
  { id: "churros", name: "Churros", unit: "unidades", defaultItems: ["Estação de Churros", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Montagem e desmontagem", "Serviço no horário contratado"] },
  { id: "mini_pizza", name: "Mini Pizza", unit: "unidades", defaultItems: ["Estação de Mini Pizzas", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Montagem e desmontagem", "Serviço no horário contratado"] },
  { id: "mini_pastel", name: "Mini Pastéis", unit: "unidades", defaultItems: ["Estação de Mini Pastéis", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Montagem e desmontagem", "Serviço no horário contratado"] },
  { id: "acai", name: "Açaí", unit: "unidades", defaultItems: ["Estação de Açaí", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Montagem e desmontagem", "Serviço no horário contratado"] },
  { id: "drinks", name: "Drinks", unit: "unidades", defaultItems: ["Estação de Drinks", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Montagem e desmontagem", "Serviço no horário contratado"] },
  { id: "bancada_drinks", name: "Bancada de Drinks", unit: "unidade", defaultItems: ["Bancada de Drinks", "Insumos e produtos necessários", "Estrutura e utensílios", "Equipe para operação", "Barraquinha", "Montagem e desmontagem", "Serviço no horário contratado"] },
];

interface ServiceItem {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_value: number;
  total: number;
  observation: string;
  items: string[];
}

interface ContractFormData {
  contratante_name: string;
  contratante_document: string;
  contratante_phone: string;
  contratante_address: string;
  fantasy_name: string;
  guest_count: number;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_location: string;
  event_address: string;
  event_city: string;
  event_state: string;
  event_zip: string;
  total_value: number;
  entry_percent: number;
  payment_method: string;
  payment_deadline: string;
  observations: string;
}

const defaultFormData: ContractFormData = {
  contratante_name: "",
  contratante_document: "",
  contratante_phone: "",
  contratante_address: "",
  fantasy_name: "Adry Estações Gourmet",
  guest_count: 0,
  event_date: "",
  event_start_time: "",
  event_end_time: "",
  event_location: "",
  event_address: "",
  event_city: "",
  event_state: "",
  event_zip: "",
  total_value: 0,
  entry_percent: 50,
  payment_method: "",
  payment_deadline: "",
  observations: "",
};

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  editContract?: any;
}

export function ContractModal({ open, onOpenChange, clientId, editContract }: ContractModalProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState(clientId || "");
  const [formData, setFormData] = useState<ContractFormData>(defaultFormData);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseContractText(text);

      if (parsed.contratante_name) {
        const client = clients?.find((c: any) =>
          c.name.toLowerCase().includes(parsed.contratante_name!.toLowerCase())
        );
        if (client) setSelectedClientId(client.id);
        updateField("contratante_name", parsed.contratante_name);
      }
      if (parsed.contratante_document) updateField("contratante_document", parsed.contratante_document);
      if (parsed.contratante_phone) updateField("contratante_phone", parsed.contratante_phone);
      if (parsed.total_value) updateField("total_value", parsed.total_value);
      if (parsed.event_date) updateField("event_date", parsed.event_date);
      if (parsed.services) {
        const newServices: ServiceItem[] = [];
        for (const svcId of parsed.services) {
          const available = AVAILABLE_SERVICES.find((s) => s.id === svcId);
          if (available) {
            newServices.push({
              service_id: available.id,
              service_name: available.name,
              quantity: 0,
              unit_value: 0,
              total: 0,
              observation: "",
              items: [...available.defaultItems],
            });
          }
        }
        setServices(newServices);
      }
      toast.success("Dados extraídos do PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao extrair dados do PDF");
    } finally {
      setIsExtracting(false);
      e.target.value = "";
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    const parsed = parseContractText(pasteText);
    if (parsed.contratante_name) {
      const client = clients?.find((c: any) =>
        c.name.toLowerCase().includes(parsed.contratante_name!.toLowerCase())
      );
      if (client) setSelectedClientId(client.id);
      updateField("contratante_name", parsed.contratante_name);
    }
    if (parsed.contratante_document) updateField("contratante_document", parsed.contratante_document);
    if (parsed.contratante_phone) updateField("contratante_phone", parsed.contratante_phone);
    if (parsed.total_value) updateField("total_value", parsed.total_value);
    if (parsed.event_date) updateField("event_date", parsed.event_date);
    if (parsed.services) {
      const newServices: ServiceItem[] = [];
      for (const svcId of parsed.services) {
        const available = AVAILABLE_SERVICES.find((s) => s.id === svcId);
        if (available) {
          newServices.push({
            service_id: available.id,
            service_name: available.name,
            quantity: 0,
            unit_value: 0,
            total: 0,
            observation: "",
            items: [...available.defaultItems],
          });
        }
      }
      setServices(newServices);
    }
    toast.success("Dados extraídos do texto!");
    setPasteText("");
  };

  const handleGenerateWithGrok = async () => {
    const apiKey = localStorage.getItem("grok_api_key");
    if (!apiKey) {
      toast.error("Configure a chave API do Grok em Configurações");
      return;
    }
    setIsGenerating(true);
    try {
      const contractText = await generateContractWithGrok(apiKey, {
        contratante_name: formData.contratante_name,
        contratante_document: formData.contratante_document,
        contratante_phone: formData.contratante_phone,
        fantasy_name: formData.fantasy_name,
        event_date: formData.event_date,
        event_location: formData.event_location,
        event_address: formData.event_address,
        event_city: formData.event_city,
        event_state: formData.event_state,
        guest_count: formData.guest_count,
        total_value: formData.total_value,
        entry_percent: formData.entry_percent,
        payment_method: formData.payment_method,
        services: services.map((s) => s.service_name),
        observations: formData.observations,
      });
      updateField("contract_text", contractText);
      toast.success("Contrato gerado pelo Grok!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar contrato com Grok");
    } finally {
      setIsGenerating(false);
    }
  };

  const { data: clients } = useQuery({
    queryKey: ["clients-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, document, whatsapp, email, city, state")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (editContract) {
      setSelectedClientId(editContract.client_id || "");
      setFormData({
        contratante_name: editContract.contratante_name || editContract.clients?.name || "",
        contratante_document: editContract.contratante_document || editContract.clients?.document || "",
        contratante_phone: editContract.contratante_phone || editContract.clients?.whatsapp || "",
        contratante_address: editContract.contratante_address || "",
        fantasy_name: editContract.fantasy_name || "Adry Estações Gourmet",
        guest_count: editContract.guest_count || 0,
        event_date: editContract.event_date || "",
        event_start_time: editContract.event_start_time || "",
        event_end_time: editContract.event_end_time || "",
        event_location: editContract.event_location || "",
        event_address: editContract.event_address || "",
        event_city: editContract.event_city || "",
        event_state: editContract.event_state || "",
        event_zip: editContract.event_zip || "",
        total_value: editContract.total_value || 0,
        entry_percent: editContract.entry_percent || 50,
        payment_method: editContract.payment_method || "",
        payment_deadline: editContract.payment_deadline || "",
        observations: editContract.observations || "",
      });
      if (editContract.services && Array.isArray(editContract.services)) {
        setServices(editContract.services);
      }
    } else {
      setFormData(defaultFormData);
      setServices([]);
    }
  }, [editContract, open]);

  useEffect(() => {
    if (selectedClientId && clients && !editContract) {
      const client = clients.find((c: any) => c.id === selectedClientId);
      if (client) {
        setFormData((prev) => ({
          ...prev,
          contratante_name: client.name || "",
          contratante_document: client.document || "",
          contratante_phone: client.whatsapp || "",
        }));
      }
    }
  }, [selectedClientId, clients, editContract]);

  const updateField = (field: keyof ContractFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addService = (serviceId: string) => {
    const available = AVAILABLE_SERVICES.find((s) => s.id === serviceId);
    if (!available || services.find((s) => s.service_id === serviceId)) return;

    setServices((prev) => [
      ...prev,
      {
        service_id: available.id,
        service_name: available.name,
        quantity: 0,
        unit_value: 0,
        total: 0,
        observation: "",
        items: [...available.defaultItems],
      },
    ]);
  };

  const updateService = (index: number, field: keyof ServiceItem, value: any) => {
    setServices((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === "quantity" || field === "unit_value") {
        updated[index].total = updated[index].quantity * updated[index].unit_value;
      }
      return updated;
    });
  };

  const removeService = (index: number) => {
    setServices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateServiceItem = (serviceIndex: number, itemIndex: number, value: string) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[serviceIndex].items[itemIndex] = value;
      return updated;
    });
  };

  const addServiceItem = (serviceIndex: number) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[serviceIndex].items.push("");
      return updated;
    });
  };

  const removeServiceItem = (serviceIndex: number, itemIndex: number) => {
    setServices((prev) => {
      const updated = [...prev];
      updated[serviceIndex].items.splice(itemIndex, 1);
      return updated;
    });
  };

  const entryValue = (formData.total_value * formData.entry_percent) / 100;
  const balanceValue = formData.total_value - entryValue;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      if (!selectedClientId) throw new Error("Selecione um cliente");
      if (services.length === 0) throw new Error("Selecione pelo menos um serviço");

      const payload = {
        client_id: selectedClientId,
        user_id: session.user.id,
        service_description: services.map((s) => s.service_name).join(", "),
        total_value: formData.total_value,
        down_payment: entryValue,
        balance_remaining: balanceValue,
        status: editContract?.status || "Rascunho",
        contratante_name: formData.contratante_name,
        contratante_document: formData.contratante_document,
        contratante_phone: formData.contratante_phone,
        contratante_address: formData.contratante_address,
        fantasy_name: formData.fantasy_name,
        guest_count: formData.guest_count || null,
        event_date: formData.event_date || null,
        event_start_time: formData.event_start_time || null,
        event_end_time: formData.event_end_time || null,
        event_location: formData.event_location,
        event_address: formData.event_address,
        event_city: formData.event_city,
        event_state: formData.event_state,
        event_zip: formData.event_zip,
        payment_method: formData.payment_method,
        payment_deadline: formData.payment_deadline || null,
        entry_percent: formData.entry_percent,
        observations: formData.observations,
        services: services,
      };

      if (editContract) {
        const { error } = await supabase
          .from("contracts")
          .update(payload)
          .eq("id", editContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contracts").insert(payload);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(editContract ? "Contrato atualizado!" : "Contrato criado!");
      onOpenChange(false);
      setSelectedClientId("");
      setFormData(defaultFormData);
      setServices([]);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar contrato");
    }
  };

  const unselectedServices = AVAILABLE_SERVICES.filter(
    (s) => !services.find((sv) => sv.service_id === s.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-task-dark border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editContract ? "Editar Contrato" : "Novo Contrato"}
          </DialogTitle>
        </DialogHeader>

        <div className="border border-dashed border-white/20 rounded-xl p-4 text-center bg-white/[0.02]">
          <label className="cursor-pointer flex flex-col items-center gap-2">
            <input type="file" accept=".pdf,.txt" className="hidden" onChange={handlePdfImport} disabled={isExtracting} />
            {isExtracting ? (
              <FileText className="h-6 w-6 text-primary animate-pulse" />
            ) : (
              <Upload className="h-6 w-6 text-primary" />
            )}
            <span className="text-xs text-muted-foreground">
              {isExtracting ? "Extraindo dados..." : "Importar PDF/contrato para preencher automático"}
            </span>
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-white/60 text-[10px] font-bold uppercase">Ou cole o texto do contrato</label>
          <textarea
            className="w-full h-20 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-xs resize-none placeholder:text-white/20"
            placeholder="Cole aqui o texto do contrato antigo..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          {pasteText.trim() && (
            <Button variant="outline" size="sm" className="text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={handlePasteImport}>
              Extrair dados do texto
            </Button>
          )}
        </div>

        <div className="space-y-5 pt-2">
          {/* Cliente */}
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

          {/* Dados do Contratante */}
          <Section title="Dados do Contratante">
            <Field label="Nome Completo" value={formData.contratante_name} onChange={(v) => updateField("contratante_name", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF" value={formData.contratante_document} onChange={(v) => updateField("contratante_document", v)} placeholder="000.000.000-00" />
              <Field label="Telefone/WhatsApp" value={formData.contratante_phone} onChange={(v) => updateField("contratante_phone", v)} placeholder="(00) 00000-0000" />
            </div>
            <Field label="Endereço do Contratante" value={formData.contratante_address} onChange={(v) => updateField("contratante_address", v)} />
          </Section>

          {/* Serviços */}
          <Section title="Serviços Contratados">
            <div className="flex flex-wrap gap-2 mb-3">
              {unselectedServices.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  size="sm"
                  className="border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs gap-1"
                  onClick={() => addService(s.id)}
                >
                  <Plus className="h-3 w-3" />
                  {s.name}
                </Button>
              ))}
            </div>

            {services.length === 0 && (
              <p className="text-muted-foreground text-xs italic">Nenhum serviço selecionado</p>
            )}

            {services.map((svc, si) => (
              <div key={svc.service_id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-primary">{svc.service_name}</h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => removeService(si)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label={`Qtd (${svc.items.length > 0 ? "un" : ""})`} type="number" value={svc.quantity || ""} onChange={(v) => updateService(si, "quantity", parseInt(v) || 0)} />
                  <Field label="Valor Unit. (R$)" type="number" value={svc.unit_value || ""} onChange={(v) => updateService(si, "unit_value", parseFloat(v) || 0)} />
                  <div className="space-y-1">
                    <label className="text-white/60 text-[10px] font-bold uppercase">Total</label>
                    <div className="h-9 px-3 rounded-md bg-white/[0.02] border border-white/5 text-white text-sm flex items-center">
                      {formatCurrency(svc.total)}
                    </div>
                  </div>
                </div>
                <Field label="Observação" value={svc.observation} onChange={(v) => updateService(si, "observation", v)} placeholder="Ex: Sabores específicos..." />

                <div className="space-y-2">
                  <label className="text-white/60 text-[10px] font-bold uppercase">Itens Inclusos</label>
                  {svc.items.map((item, ii) => (
                    <div key={ii} className="flex gap-2">
                      <Input
                        className="h-8 bg-white/[0.03] border-white/5 text-white text-xs flex-1"
                        value={item}
                        onChange={(e) => updateServiceItem(si, ii, e.target.value)}
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive" onClick={() => removeServiceItem(si, ii)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 gap-1" onClick={() => addServiceItem(si)}>
                    <Plus className="h-3 w-3" /> Adicionar item
                  </Button>
                </div>
              </div>
            ))}
          </Section>

          {/* Dados do Evento */}
          <Section title="Dados do Evento">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data do Evento" type="date" value={formData.event_date} onChange={(v) => updateField("event_date", v)} />
              <Field label="Nº Convidados" type="number" value={formData.guest_count || ""} onChange={(v) => updateField("guest_count", parseInt(v) || 0)} />
              <Field label="Horário Início" type="time" value={formData.event_start_time} onChange={(v) => updateField("event_start_time", v)} />
              <Field label="Horário Término" type="time" value={formData.event_end_time} onChange={(v) => updateField("event_end_time", v)} />
            </div>
            <Field label="Local do Evento" value={formData.event_location} onChange={(v) => updateField("event_location", v)} />
            <Field label="Endereço do Evento" value={formData.event_address} onChange={(v) => updateField("event_address", v)} />
            <div className="grid grid-cols-3 gap-3">
              <Field label="Cidade" value={formData.event_city} onChange={(v) => updateField("event_city", v)} />
              <Field label="Estado" value={formData.event_state} onChange={(v) => updateField("event_state", v)} />
              <Field label="CEP" value={formData.event_zip} onChange={(v) => updateField("event_zip", v)} />
            </div>
          </Section>

          {/* Pagamento */}
          <Section title="Valor e Pagamento">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor Total (R$)" type="number" value={formData.total_value || ""} onChange={(v) => updateField("total_value", parseFloat(v) || 0)} />
              <Field label="Entrada (%)" type="number" value={formData.entry_percent || ""} onChange={(v) => updateField("entry_percent", parseFloat(v) || 0)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Valor Entrada</label>
                <div className="h-9 px-3 rounded-md bg-white/[0.02] border border-white/5 text-white text-sm flex items-center font-bold">
                  {formatCurrency(entryValue)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Saldo Restante</label>
                <div className="h-9 px-3 rounded-md bg-white/[0.02] border border-white/5 text-white text-sm flex items-center font-bold">
                  {formatCurrency(balanceValue)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Forma de Pagamento" value={formData.payment_method} onChange={(v) => updateField("payment_method", v)} placeholder="Pix, Cartão, Dinheiro..." />
              <Field label="Data Limite Pgto Saldo" type="date" value={formData.payment_deadline} onChange={(v) => updateField("payment_deadline", v)} />
            </div>
          </Section>

          {/* Contrato Gerado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/60 text-[10px] font-bold uppercase">Texto do Contrato</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-[10px] border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleGenerateWithGrok}
                disabled={isGenerating}
              >
                {isGenerating ? "Gerando..." : "Gerar com Grok"}
              </Button>
            </div>
            <textarea
              className="w-full h-40 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-xs resize-none placeholder:text-white/20"
              placeholder="Cole ou gere o texto do contrato aqui..."
              value={formData.contract_text}
              onChange={(e) => updateField("contract_text", e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-white/60 text-[10px] font-bold uppercase">Observações</label>
            <textarea
              className="w-full h-20 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm resize-none"
              value={formData.observations}
              onChange={(e) => updateField("observations", e.target.value)}
            />
          </div>

          <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={!selectedClientId || services.length === 0}>
            {editContract ? "SALVAR ALTERAÇÕES" : "CRIAR CONTRATO"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-4 space-y-3">
      <h3 className="text-sm font-bold text-primary">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-white/60 text-[10px] font-bold uppercase">{label}</label>
      <Input
        type={type}
        className="h-9 bg-white/[0.05] border-white/10 text-white text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
