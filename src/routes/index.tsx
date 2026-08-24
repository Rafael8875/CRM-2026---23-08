import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Adry Estações Gourmet - CRM e Contratos" },
      { name: "description", content: "Sistema inteligente para gestão de contratos e fluxo de caixa." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({
      to: "/auth",
    });
  },
});
