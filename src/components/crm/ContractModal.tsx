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
import { Trash2, Sparkles } from "lucide-react";
import { generateContractWithGrok } from "@/lib/grok-generate";

const AI_MODELS = [
  { id: "grok-4", name: "Grok 4" },
  { id: "grok-4.6", name: "Grok 4.6" },
];

interface ContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  editContract?: any;
}

export function ContractModal({ open, onOpenChange, clientId, clientName, editContract }: ContractModalProps) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [contractText, setContractText] = useState("");
  const [selectedModel, setSelectedModel] = useState("grok-4");
  const [isGenerating, setIsGenerating] = useState(false);
  const [totalValue, setTotalValue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [clientNameInput, setClientNameInput] = useState(clientName || "");

  useEffect(() => {
    if (open) {
      if (editContract) {
        setDescription(editContract.description || "");
        setContractText(editContract.contract_text || "");
        setTotalValue(editContract.total_value?.toString() || "");
        setEventDate(editContract.event_date || "");
        setClientNameInput(editContract.contratante_name || clientName || "");
      } else {
        setDescription("");
        setContractText("");
        setTotalValue("");
        setEventDate("");
        setClientNameInput(clientName || "");
      }
    }
  }, [open, editContract, clientName]);

  const handleGenerate = async () => {
    const apiKey = localStorage.getItem("grok_api_key");
    if (!apiKey) {
      toast.error("Configure a chave API do Grok em Configurações");
      return;
    }
    if (!description.trim()) {
      toast.error("Preencha a descrição do contrato");
      return;
    }
    setIsGenerating(true);
    try {
      const text = await generateContractWithGrok(apiKey, {
        contratante_name: clientNameInput,
        total_value: totalValue ? parseFloat(totalValue) : undefined,
        event_date: eventDate,
        observations: description,
      }, selectedModel);
      setContractText(text);
      toast.success("Contrato gerado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar contrato");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const payload = {
        client_id: clientId || null,
        user_id: session.user.id,
        contratante_name: clientNameInput,
        total_value: totalValue ? parseFloat(totalValue) : 0,
        event_date: eventDate || null,
        contract_text: contractText,
        description,
        model_used: selectedModel,
        status: editContract?.status || "Rascunho",
      };

      if (editContract) {
        const { error } = await supabase.from("contracts").update(payload).eq("id", editContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contracts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(editContract ? "Contrato atualizado!" : "Contrato criado!");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0f] border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {editContract ? "Editar Contrato" : "Novo Contrato"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-white/60 text-[10px] font-bold uppercase">Cliente</label>
              <Input
                placeholder="Nome do cliente"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                className="bg-white/[0.05] border-white/10"
              />
            </div>
            <div className="space-y-1">
              <label className="text-white/60 text-[10px] font-bold uppercase">Valor Total (R$)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                className="bg-white/[0.05] border-white/10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-white/60 text-[10px] font-bold uppercase">Data do Evento</label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="bg-white/[0.05] border-white/10"
            />
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Contrato com IA
            </h3>

            <div className="space-y-1">
              <label className="text-white/60 text-[10px] font-bold uppercase">Descrição do Contrato</label>
              <textarea
                className="w-full h-24 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm resize-none placeholder:text-white/20"
                placeholder="Ex: Contrato para estação de churros e mini pizzas para casamento de 150 convidados, dia 15/09/2026, local: Salão de Festas ABC, valor total R$ 3.500..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="space-y-1 flex-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Modelo</label>
                <select
                  className="w-full h-10 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-sm"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {AI_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#0a0a0f]">{m.name}</option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold mt-5"
              >
                {isGenerating ? "Gerando..." : "Gerar Contrato"}
              </Button>
            </div>
          </div>

          {contractText && (
            <div className="space-y-1">
              <label className="text-white/60 text-[10px] font-bold uppercase">Contrato Gerado</label>
              <textarea
                className="w-full h-64 px-3 rounded-md bg-white/[0.05] border border-white/10 text-white text-xs resize-none"
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={() => saveMutation.mutate()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
            disabled={!contractText.trim() || saveMutation.isPending}
          >
            {editContract ? "SALVAR ALTERAÇÕES" : "SALVAR CONTRATO"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
