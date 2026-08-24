import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, User, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaComponent,
});

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_NAMES = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

interface ManualEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  client_name?: string;
  status: string;
}

function AgendaComponent() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", time: "", location: "", client_name: "" });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

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
      const { data, error } = await supabase
        .from("event_reminders" as any)
        .select("*")
        .order("event_date");
      if (error) return [];
      return (data || []) as ManualEvent[];
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async (event: typeof newEvent & { date: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { error } = await supabase.from("event_reminders" as any).insert({
        title: event.title,
        event_date: event.date,
        event_time: event.time || null,
        location: event.location || null,
        client_name: event.client_name || null,
        status: "Confirmado",
        user_id: session.user.id,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-events"] });
      toast.success("Evento removido!");
    },
  });

  const getEventsForDate = (dateStr: string) => {
    const contractEvents = contracts
      .filter((c) => c.event_date === dateStr)
      .map((c) => ({
        id: c.id,
        title: c.description || "Evento",
        date: c.event_date,
        time: c.event_start_time || "",
        location: c.event_location || "",
        client_name: c.contratante_name || "",
        status: c.status,
        type: "contract" as const,
        value: c.total_value,
      }));
    const manualEvts = manualEvents
      .filter((e) => e.date === dateStr)
      .map((e) => ({
        ...e,
        type: "manual" as const,
      }));
    return [...contractEvents, ...manualEvts];
  };

  const formatCurrency = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "";

  const goToPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(null); };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">Agenda</h1>
          <p className="text-muted-foreground mt-1">Calendário de eventos e compromissos</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={goToToday} className="border-white/10 text-white hover:bg-white/5">
            Hoje
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Marcar Evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="text-white hover:bg-white/5">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-white text-lg font-bold">
                {MONTH_NAMES[month]} {year}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={goToNextMonth} className="text-white hover:bg-white/5">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const events = getEventsForDate(dateStr);
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                  const isSelected = selectedDate === dateStr;
                  const hasContract = events.some((e) => e.type === "contract");
                  const hasManual = events.some((e) => e.type === "manual");

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`relative h-16 md:h-20 rounded-lg p-1.5 text-left transition-all ${
                        isSelected
                          ? "bg-primary/20 border border-primary/50 ring-1 ring-primary/30"
                          : isToday
                          ? "bg-white/[0.06] border border-white/10"
                          : "hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <span className={`text-xs font-bold ${isToday ? "text-primary" : "text-white/70"}`}>
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {events.slice(0, 2).map((ev, idx) => (
                          <div
                            key={idx}
                            className={`text-[8px] md:text-[9px] truncate rounded px-1 py-0.5 font-bold ${
                              ev.type === "contract"
                                ? "bg-blue-500/20 text-blue-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {ev.client_name || ev.title}
                          </div>
                        ))}
                        {events.length > 2 && (
                          <div className="text-[8px] text-muted-foreground text-center">+{events.length - 2}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Panel */}
        <div className="lg:col-span-1">
          <Card className="bg-white/[0.02] border-white/5 sticky top-24">
            <CardHeader>
              <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
                  : "Selecione um dia"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-8 text-muted-foreground/50 text-sm">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Clique em um dia para ver os eventos
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/50 text-sm">
                  <p className="mb-3">Nenhum evento neste dia</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 text-primary hover:bg-primary/10 text-xs"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Marcar Evento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border ${
                        ev.type === "contract"
                          ? "bg-blue-500/5 border-blue-500/20"
                          : "bg-green-500/5 border-green-500/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-bold text-white">{ev.client_name || ev.title}</p>
                          {ev.time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {ev.time}
                            </p>
                          )}
                          {ev.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ev.location}
                            </p>
                          )}
                          {ev.type === "contract" && "value" in ev && (ev as any).value && (
                            <p className="text-xs text-primary font-bold">{formatCurrency((ev as any).value)}</p>
                          )}
                          <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            ev.status === "Fechado"
                              ? "bg-green-500/20 text-green-400"
                              : ev.status === "Confirmado"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {ev.status}
                          </span>
                        </div>
                        {ev.type === "manual" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => deleteEventMutation.mutate(ev.id)}
                          >
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
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Marcar Evento</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-white hover:bg-white/5">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Título do Evento</label>
                <Input
                  placeholder="Ex: Casamento João e Maria"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="bg-white/[0.05] border-white/10"
                />
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Data</label>
                <Input
                  type="date"
                  value={selectedDate || ""}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white/[0.05] border-white/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-white/60 text-[10px] font-bold uppercase">Horário</label>
                  <Input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="bg-white/[0.05] border-white/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-white/60 text-[10px] font-bold uppercase">Cliente</label>
                  <Input
                    placeholder="Nome do cliente"
                    value={newEvent.client_name}
                    onChange={(e) => setNewEvent({ ...newEvent, client_name: e.target.value })}
                    className="bg-white/[0.05] border-white/10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-white/60 text-[10px] font-bold uppercase">Local</label>
                <Input
                  placeholder="Endereço ou local do evento"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="bg-white/[0.05] border-white/10"
                />
              </div>
            </div>
            <Button
              onClick={() => {
                if (!newEvent.title.trim()) { toast.error("Preencha o título"); return; }
                if (!selectedDate) { toast.error("Selecione a data"); return; }
                addEventMutation.mutate({ ...newEvent, date: selectedDate });
              }}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              disabled={addEventMutation.isPending}
            >
              {addEventMutation.isPending ? "Salvando..." : "SALVAR EVENTO"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
