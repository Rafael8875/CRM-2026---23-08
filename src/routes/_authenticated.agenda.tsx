import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Clock, MapPin, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaComponent,
});

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_NAMES = ["SEG","TER","QUA","QUI","SEX","SAB","DOM"];

interface ManualEvent {
  id: string;
  title: string;
  date: string;
  event_time?: string;
  location?: string;
  client_name?: string;
  status: string;
}

function MiniMonth({ year, month, events, contracts, onDayClick, selectedDate }: {
  year: number;
  month: number;
  events: ManualEvent[];
  contracts: any[];
  onDayClick: (date: string) => void;
  selectedDate: string | null;
}) {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getEvents = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const c = contracts.filter((ct) => ct.event_date === dateStr);
    const m = events.filter((e) => e.date === dateStr);
    return { contracts: c, manual: m, total: c.length + m.length };
  };

  return (
    <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-white text-xs font-bold text-center">{MONTH_NAMES[month]} {year}</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="grid grid-cols-7 gap-0">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[7px] font-bold text-muted-foreground py-0.5">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const ev = getEvents(day);
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={day}
                onClick={() => onDayClick(dateStr)}
                className={`relative h-7 rounded text-[10px] font-bold transition-all ${
                  isSelected ? "bg-primary text-white" : isToday ? "bg-white/10 text-primary" : ev.total > 0 ? "text-white hover:bg-white/5" : "text-white/50 hover:bg-white/5"
                }`}
              >
                {day}
                {ev.total > 0 && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {ev.contracts.length > 0 && <div className="w-1 h-1 rounded-full bg-blue-400" />}
                    {ev.manual.length > 0 && <div className="w-1 h-1 rounded-full bg-green-400" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AgendaComponent() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", client_name: "" });
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const { data: contracts = [] } = useQuery({
    queryKey: ["agenda-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id, event_date, event_start_time, event_end_time, event_location, event_address, description, contratante_name, status, total_value")
        .not("event_date", "is", null)
        .order("event_date");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: manualEvents = [] } = useQuery({
    queryKey: ["manual-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_reminders" as any).select("*").order("event_date");
      if (error) return [];
      return (data || []) as ManualEvent[];
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: typeof newEvent & { date: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { error } = await supabase.from("event_reminders" as any).insert({
        title: event.title, event_date: event.date, event_time: event.time || null,
        location: event.location || null, client_name: event.client_name || null,
        status: "Confirmado", user_id: session.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-events"] });
      toast.success("Evento adicionado!");
      setShowAddModal(false);
      setNewEvent({ title: "", time: "", location: "", client_name: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("event_reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manual-events"] }); toast.success("Evento removido!"); },
  });

  const getEventsForDate = (dateStr: string) => {
    const c = contracts.filter((ct) => ct.event_date === dateStr).map((ct) => ({
      id: ct.id, title: ct.description || "Evento", date: ct.event_date, time: ct.event_start_time || "",
      location: ct.event_location || "", client_name: ct.contratante_name || "", status: ct.status,
      type: "contract" as const, value: ct.total_value,
    }));
    const m = manualEvents.filter((e) => e.date === dateStr).map((e) => ({ ...e, type: "manual" as const }));
    return [...c, ...m];
  };

  const formatCurrency = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "";
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Agenda</h1>
          <p className="text-muted-foreground mt-1">Calendário de eventos e compromissos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setViewYear(viewYear - 1)} className="text-white hover:bg-white/5"><ChevronLeft className="h-5 w-5" /></Button>
          <span className="text-white font-bold text-lg">{viewYear}</span>
          <Button variant="ghost" size="icon" onClick={() => setViewYear(viewYear + 1)} className="text-white hover:bg-white/5"><ChevronRight className="h-5 w-5" /></Button>
          <Button variant="outline" onClick={() => { setViewYear(new Date().getFullYear()); setSelectedDate(null); }} className="border-white/10 text-white hover:bg-white/5 ml-2">Hoje</Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Plus className="h-4 w-4 mr-2" /> Marcar Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <MiniMonth
            key={i}
            year={viewYear}
            month={i}
            events={manualEvents}
            contracts={contracts}
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        ))}
      </div>

      {selectedDate && (
        <Card className="bg-white/[0.02] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)} className="text-white hover:bg-white/5"><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground/50 text-sm">
                <p className="mb-3">Nenhum evento neste dia</p>
                <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 text-xs" onClick={() => setShowAddModal(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Marcar Evento
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedEvents.map((ev) => (
                  <div key={ev.id} className={`p-3 rounded-xl border ${ev.type === "contract" ? "bg-blue-500/5 border-blue-500/20" : "bg-green-500/5 border-green-500/20"}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-bold text-white">{ev.client_name || ev.title}</p>
                        {ev.time && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {ev.time}</p>}
                        {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</p>}
                        {ev.type === "contract" && "value" in ev && (ev as any).value && <p className="text-xs text-primary font-bold">{formatCurrency((ev as any).value)}</p>}
                        <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${ev.status === "Fechado" ? "bg-green-500/20 text-green-400" : ev.status === "Confirmado" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {ev.status}
                        </span>
                      </div>
                      {ev.type === "manual" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deleteEventMutation.mutate(ev.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Marcar Evento</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-white hover:bg-white/5"><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Título do Evento</label>
                <Input placeholder="Ex: Casamento João e Maria" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="bg-white/[0.05] border-white/10" />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Data</label>
                <Input type="date" value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white/[0.05] border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/60 text-[10px] font-bold uppercase">Horário</label>
                  <Input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="bg-white/[0.05] border-white/10" />
                </div>
                <div className="space-y-1">
                  <label className="text-white/60 text-[10px] font-bold uppercase">Cliente</label>
                  <Input placeholder="Nome do cliente" value={newEvent.client_name} onChange={(e) => setNewEvent({ ...newEvent, client_name: e.target.value })} className="bg-white/[0.05] border-white/10" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Local</label>
                <Input placeholder="Endereço ou local do evento" value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} className="bg-white/[0.05] border-white/10" />
              </div>
            </div>
            <Button onClick={() => {
              if (!newEvent.title.trim()) { toast.error("Preencha o título"); return; }
              if (!selectedDate) { toast.error("Selecione a data"); return; }
              addEventMutation.mutate({ ...newEvent, date: selectedDate });
            }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold" disabled={addEventMutation.isPending}>
              {addEventMutation.isPending ? "Salvando..." : "SALVAR EVENTO"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
