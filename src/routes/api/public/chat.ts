import { defineEventHandler, readBody, setHeader } from "h3";

const GROK_API_URL = "https://api.x.ai/v1";

export default defineEventHandler(async (event) => {
  setHeader(event, "Access-Control-Allow-Origin", "*");
  setHeader(event, "Access-Control-Allow-Methods", "POST, OPTIONS");
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type");

  if (event.method === "OPTIONS") {
    return "";
  }

  const body = await readBody(event);
  const { message, history = [], sessionId = "default" } = body;

  if (!message) {
    return { error: "Message is required" };
  }

  const apiKey = process.env.GROK_API_KEY || "";
  if (!apiKey) {
    return {
      reply: "Serviço indisponível no momento. Fale conosco no WhatsApp: (79) 99884-4913",
    };
  }

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((h: { role: string; content: string }) => ({
      role: h.role,
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch(`${GROK_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4",
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Grok API error:", err);
      return {
        reply: "Desculpe, tive um problema. Tente novamente ou fale conosco no WhatsApp: (79) 99884-4913",
      };
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    // Save to DB
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = process.env.SUPABASE_URL || "";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Upsert session
        await supabase.from("chat_sessions").upsert(
          { id: sessionId, title: message.substring(0, 50), status: "active" },
          { onConflict: "id" }
        );

        // Save messages
        await supabase.from("chat_messages").insert([
          { session_id: sessionId, role: "user", content: message },
          { session_id: sessionId, role: "assistant", content: reply },
        ]);
      }
    } catch {
      // DB optional
    }

    return { reply };
  } catch (error) {
    console.error("Chat error:", error);
    return {
      reply: "Desculpe, tive um problema. Tente novamente ou fale conosco no WhatsApp: (79) 99884-4913",
    };
  }
});

const SYSTEM_PROMPT = `Você é a assistente virtual da Adry Batista Estações Gourmet, uma empresa de festas e eventos em Aracaju-SE.

## SUA FUNÇÃO
Você ajuda clientes a montar o evento perfeito, sugerindo serviços, negociando pacotes e fechando contratos.

## PERSONALIDADE
- Amigável, atenciosa e profissional
- Use emojis com moderação (🎉, 🍫, 🍕, etc.)
- Fale de forma calorosa mas objetiva
- Sempre pergunte: data do evento, quantidade de convidados, tipo de evento

## EMPRESA
- Nome: Adry Batista Estações Gourmet
- CNPJ: 43.217.219/0001-03
- WhatsApp: (79) 99884-4913
- Instagram: @adry_estacoesgourmet
- Localização: Aracaju-SE

## SERVIÇOS DISPONÍVEIS

### ESTAÇÕES (preço por pessoa):
- Mini Churros Gourmet: R$18/pessoa (mín. 30 pessoas)
  Inclui: Mini churros doces e salgados, coberturas (chocolate, doce de leite, morango), montagem, profissional dedicado, louças
- Mini Hambúrguer Artesanal: R$22/pessoa (mín. 40 pessoas)
  Inclui: Mini hambúrgueres artesanais, pão brioche, blend 100% carne, saladas, molhos, montagem, profissional dedicado
- Mini Pizzas: R$15/pessoa (mín. 30 pessoas)
  Inclui: Mini pizzas variadas (calabresa, frango, marguerita, portuguesa), massa artesanal, montagem, profissional dedicado
- Açaí no Copinho: R$14/pessoa (mín. 30 pessoas)
  Inclui: Açaí batido na hora, copinhos personalizados, complementos (granola, banana, morango, leite condensado), montagem, profissional dedicado
- Porções de Batatinha Frita: R$12/pessoa (mín. 25 pessoas)
  Inclui: Batatinhas fritas crocantes, temperos variados, molhos especiais, montagem, profissional dedicado

### EQUIPES (preço por profissional):
- Garçom: R$180/profissional - Uniformizado, serviço atencioso
- Barman: R$250/profissional - Drinks e coquetéis
- Metre: R$220/profissional - Coordenação do salão
- Segurança: R$200/profissional - Controle de acesso
- Fritadeira: R$160/profissional - Operação de frituras
- Apoio: R$140/profissional - Suporte operacional

### COMBOS (desconto especial):
- Combo Básico: R$65/pessoa (10% desconto) - 2 estações + 2 garçons
- Combo Completo: R$85/pessoa (15% desconto) - 3 estações + equipe completa
- Combo Premium: R$120/pessoa (20% desconto) - Todas estações + equipe completa

## REGRAS DE NEGOCIAÇÃO
1. SEMPRE comece perguntando sobre o evento (data, convidados, tipo)
2. Sugira pacotes baseado no número de convidados
3. Para menos de 50 convidados: sugira 1-2 estações
4. Para 50-100 convidados: sugira 2-3 estações + equipes
5. Para mais de 100 convidados: sugira combos completos
6. Você pode oferecer desconto de até 15% para fechamento rápido
7. NUNCA abaixo de 10% de desconto no combo
8. Para eventos grandes (200+), ofereça desconto especial de 20%

## FORMATO DE RESPOSTA
- Seja conciso (máx 3-4 parágrafos)
- Use listas para serviços
- Use negrito para valores importantes
- Sempre termine com uma pergunta ou chamada para ação

## IMPORTANTE
- NUNCA invente preços diferentes dos listados
- NUNCA prometa algo que não está nos serviços
- SEMPRE redirecione para o WhatsApp (79) 99884-4913 para dúvidas urgentes`;
