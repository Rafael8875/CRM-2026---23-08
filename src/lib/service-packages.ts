export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  base_price: number;
  unit: string;
  min_guests: number;
  max_guests: number;
  includes: string[];
  category: "estacao" | "equipe" | "combo";
}

export const SERVICE_PACKAGES: ServicePackage[] = [
  // ESTAÇÕES
  {
    id: "churros",
    name: "Mini Churros Gourmet",
    description: "Estação de mini churros com coberturas variadas",
    base_price: 18,
    unit: "pessoa",
    min_guests: 30,
    max_guests: 500,
    includes: [
      "Mini churros doces e salgados",
      "Coberturas: chocolate, doce de leite, morango",
      "Montagem da estação",
      "Profissional dedicado",
      "Louças e utensílios",
    ],
    category: "estacao",
  },
  {
    id: "hamburguer",
    name: "Mini Hambúrguer Artesanal",
    description: "Estação de mini hambúrgueres artesanais",
    base_price: 22,
    unit: "pessoa",
    min_guests: 40,
    max_guests: 500,
    includes: [
      "Mini hambúrgueres artesanais",
      "Pão brioche, blend 100% carne",
      "Saladas, molhos e acompanhamentos",
      "Montagem da estação",
      "Profissional dedicado",
    ],
    category: "estacao",
  },
  {
    id: "pizza",
    name: "Mini Pizzas",
    description: "Estação de mini pizzas saborosas",
    base_price: 15,
    unit: "pessoa",
    min_guests: 30,
    max_guests: 500,
    includes: [
      "Mini pizzas variadas",
      "Sabores: calabresa, frango, marguerita, portuguesa",
      "Massa artesanal",
      "Montagem da estação",
      "Profissional dedicado",
    ],
    category: "estacao",
  },
  {
    id: "acai",
    name: "Açaí no Copinho",
    description: "Estação de açaí com complementos",
    base_price: 14,
    unit: "pessoa",
    min_guests: 30,
    max_guests: 500,
    includes: [
      "Açaí batido na hora",
      "Copinhos personalizados",
      "Complementos: granola, banana, morango, leite condensado",
      "Montagem da estação",
      "Profissional dedicado",
    ],
    category: "estacao",
  },
  {
    id: "batata",
    name: "Porções de Batatinha Frita",
    description: "Estação de batatinhas fritas com temperos",
    base_price: 12,
    unit: "pessoa",
    min_guests: 25,
    max_guests: 500,
    includes: [
      "Batatinhas fritas crocantes",
      "Temperos variados",
      "Molhos especiais",
      "Montagem da estação",
      "Profissional dedicado",
    ],
    category: "estacao",
  },

  // EQUIPES
  {
    id: "garcom",
    name: "Garçom",
    description: "Serviço de garçom uniformizado para o evento",
    base_price: 180,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Profissional uniformizado",
      "Serviço atencioso",
      "Cobertura de mesas",
    ],
    category: "equipe",
  },
  {
    id: "barman",
    name: "Barman",
    description: "Serviço de barman para drinks e coquetelaria",
    base_price: 250,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Profissional uniformizado",
      "Preparo de drinks e coquetéis",
      "Atendimento no bar",
    ],
    category: "equipe",
  },
  {
    id: "metre",
    name: "Metre",
    description: "Coordenação do salão e atendimento",
    base_price: 220,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Coordenação impecável do salão",
      "Supervisão da equipe",
      "Garantia de qualidade no atendimento",
    ],
    category: "equipe",
  },
  {
    id: "seguranca",
    name: "Segurança",
    description: "Serviço de segurança para o evento",
    base_price: 200,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Profissional treinado",
      "Controle de acesso",
      "Tranquilidade do início ao fim",
    ],
    category: "equipe",
  },
  {
    id: "fritadeira",
    name: "Fritadeira",
    description: "Profissional dedicado às frituras",
    base_price: 160,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Profissional dedicado",
      "Operação de fritadeiras",
      "Qualidade nas porções",
    ],
    category: "equipe",
  },
  {
    id: "apoio",
    name: "Apoio",
    description: "Equipe de suporte para a operação",
    base_price: 140,
    unit: "profissional",
    min_guests: 1,
    max_guests: 1,
    includes: [
      "Suporte operacional",
      "Montagem e desmontagem",
      "Apoio geral",
    ],
    category: "equipe",
  },
];

export const COMBOS = [
  {
    id: "combo-basico",
    name: "Combo Básico",
    description: "2 estações + 2 garçons",
    packages: ["churros", "pizza", "garcom", "garcom"],
    base_price: 65,
    discount_percent: 10,
  },
  {
    id: "combo-completo",
    name: "Combo Completo",
    description: "3 estações + equipe completa",
    packages: ["churros", "pizza", "acai", "garcom", "garcom", "barman", "metre"],
    base_price: 85,
    discount_percent: 15,
  },
  {
    id: "combo-premium",
    name: "Combo Premium",
    description: "Todas as estações + equipe completa",
    packages: [
      "churros", "hamburguer", "pizza", "acai", "batata",
      "garcom", "garcom", "garcom", "barman", "metre", "seguranca", "fritadeira", "apoio",
    ],
    base_price: 120,
    discount_percent: 20,
  },
];

export function getServicesPrompt(): string {
  let prompt = "SERVIÇOS DISPONÍVEIS - Adry Batista Estações Gourmet:\n\n";

  prompt += "### ESTAÇÕES (preço por pessoa):\n";
  SERVICE_PACKAGES.filter((s) => s.category === "estacao").forEach((s) => {
    prompt += `- ${s.name}: R$${s.base_price}/pessoa (mín. ${s.min_guests} pessoas)\n`;
    prompt += `  Inclui: ${s.includes.join(", ")}\n`;
  });

  prompt += "\n### EQUIPES (preço por profissional):\n";
  SERVICE_PACKAGES.filter((s) => s.category === "equipe").forEach((s) => {
    prompt += `- ${s.name}: R$${s.base_price}/profissional\n`;
    prompt += `  Inclui: ${s.includes.join(", ")}\n`;
  });

  prompt += "\n### COMBOS (desconto especial):\n";
  COMBOS.forEach((c) => {
    prompt += `- ${c.name} (${c.discount_percent}% desconto): R$${c.base_price}/pessoa\n`;
    prompt += `  ${c.description}\n`;
  });

  return prompt;
}
