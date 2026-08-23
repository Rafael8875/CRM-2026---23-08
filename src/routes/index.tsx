import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CRM Festa e Eventos - Gestão Financeira Profissional" },
      { name: "description", content: "Sistema inteligente para gestão de contratos e fluxo de caixa." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({
      to: "/auth",
    });
  },
});
