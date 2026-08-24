const GROK_API_URL = "https://api.x.ai/v1";

interface ContractData {
  contratante_name: string;
  contratante_document?: string;
  contratante_phone?: string;
  fantasy_name?: string;
  event_date?: string;
  event_location?: string;
  event_address?: string;
  event_city?: string;
  event_state?: string;
  guest_count?: number;
  total_value?: number;
  entry_percent?: number;
  payment_method?: string;
  services?: string[];
  observations?: string;
}

export async function generateContractWithGrok(
  apiKey: string,
  data: ContractData,
  model: string = "grok-4",
): Promise<string> {
  const servicesText =
    data.services && data.services.length > 0
      ? data.services.join(", ")
      : "Não informado";

  const prompt = `Gere um CONTRATO DE PRESTAÇÃO DE SERVIÇOS para uma empresa de estação de gourmet chamada "Adry Estações Gourmet" (CNPJ: 43.217.219/0001-03).

DADOS DO CONTRATO:
- Contratante: ${data.contratante_name || "A definir"}
- CPF/CNPJ do Contratante: ${data.contratante_document || "A definir"}
- Telefone: ${data.contratante_phone || "A definir"}
- Nome Fantasia do Evento: ${data.fantasy_name || "A definir"}
- Data do Evento: ${data.event_date || "A definir"}
- Local do Evento: ${data.event_location || "A definir"}
- Endereço: ${data.event_address || "A definir"}
- Cidade/UF: ${data.event_city || "A definir"}/${data.event_state || "A definir"}
- Nº de Convidados: ${data.guest_count || "A definir"}
- Valor Total: R$ ${data.total_value ? data.total_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "A definir"}
- Entrada (${data.entry_percent || 50}%): R$ ${data.total_value && data.entry_percent ? ((data.total_value * data.entry_percent) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "A definir"}
- Saldo: R$ ${data.total_value && data.entry_percent ? ((data.total_value * (100 - data.entry_percent)) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "A definir"}
- Forma de Pagamento: ${data.payment_method || "A definir"}
- Serviços: ${servicesText}
- Observações: ${data.observations || "Nenhuma"}

INSTRUÇÕES:
- Gere um contrato profissional completo em português brasileiro
- Use cláusulas numeradas
- Inclua: Partes, Objeto do Contrato, Descrição dos Serviços, Valor e Condições de Pagamento, Obrigações, Cancelamento, Foro, Disposições Gerais
- Use linguagem formal jurídica
- No final, inclua espaços para assinaturas de Ambas as Partes
- Data de assinatura: ___/___/______
- NÃO inclua nenhum texto explicativo, apenas o contrato
- NÃO use markdown, apenas texto puro com quebras de linha`;

  const response = await fetch(`${GROK_API_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "Você é um advogado especialista em contratos comerciais. Gere contratos profissionais e completos.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Erro na API Grok: ${response.status}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || "";
}
