import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: () => (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground text-task-blue">Agenda</h1>
      <p className="text-muted-foreground">Calendário de eventos em breve.</p>
    </div>
  ),
});
