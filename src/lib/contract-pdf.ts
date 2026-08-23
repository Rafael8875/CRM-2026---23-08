import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ServiceItem {
  service_id: string;
  service_name: string;
  quantity: number;
  unit_value: number;
  total: number;
  observation: string;
  items: string[];
}

interface ContractData {
  contratante_name?: string;
  contratante_document?: string;
  contratante_phone?: string;
  contratante_address?: string;
  fantasy_name?: string;
  guest_count?: number;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  event_location?: string;
  event_address?: string;
  event_city?: string;
  event_state?: string;
  event_zip?: string;
  total_value?: number;
  entry_percent?: number;
  down_payment?: number;
  payment_method?: string;
  payment_deadline?: string;
  services?: ServiceItem[];
  observations?: string;
}

const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function formatDateBR(dateStr?: string): string {
  if (!dateStr) return "___/___/______";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatTimeBR(timeStr?: string): string {
  if (!timeStr) return "__:__";
  return timeStr.substring(0, 5) + " horas";
}

function formatCurrency(value?: number): string {
  if (!value && value !== 0) return "R$ __________";
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateContractPdf(contract: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const page = pdfDoc.addPage([595, 842]); // A4
  const W = 595, H = 842;
  const margin = 55;
  const contentW = W - margin * 2;
  let y = H - margin;

  const blue = rgb(0.1, 0.15, 0.45);
  const dark = rgb(0.1, 0.1, 0.1);
  const gray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.75, 0.75, 0.75);

  let ensureSpace = (needed: number) => {
    if (y - needed < margin + 50) {
      page.addPage([W, H]);
      y = H - margin;
    }
  };

  const draw = (text: string, x: number, yPos: number, font = helvetica, size = 10, color = dark) => {
    try { page.drawText(text, { x, y: yPos, font, size, color }); } catch {}
  };

  const drawLine = (yPos: number) => {
    page.drawLine({ start: { x: margin, y: yPos }, end: { x: W - margin, y: yPos }, thickness: 0.5, color: lightGray });
  };

  const drawParagraph = (text: string, fontSize = 10, spacing = 15) => {
    ensureSpace(spacing * 2);
    const lines = wrapText(text, helvetica, fontSize, contentW);
    lines.forEach((line) => {
      ensureSpace(spacing);
      draw(line, margin, y, helvetica, fontSize, dark);
      y -= spacing;
    });
  };

  const drawField = (label: string, value: string, indent = 0) => {
    ensureSpace(20);
    draw(`${label}: `, margin + indent, y, helveticaBold, 10, dark);
    const labelW = helveticaBold.widthOfTextAtSize(`${label}: `, 10);
    draw(value || "________________", margin + indent + labelW, y, helvetica, 10, dark);
    y -= 16;
  };

  const entryValue = ((contract.total_value || 0) * (contract.entry_percent || 50)) / 100;
  const balanceValue = (contract.total_value || 0) - entryValue;
  const today = formatDateBR(new Date().toISOString().split("T")[0]);

  // === HEADER ===
  draw("ADRY ESTAÇÕES GOURMET", margin, y, helveticaBold, 18, blue);
  y -= 18;
  draw("PRESTAÇÃO DE SERVIÇOS PARA FESTAS E EVENTOS", margin, y, helveticaOblique, 9, gray);
  y -= 5;
  drawLine(y);
  y -= 25;

  // === TÍTULO ===
  ensureSpace(40);
  const titleText = "CONTRATO DE PRESTAÇÃO DE SERVIÇOS";
  const titleW = helveticaBold.widthOfTextAtSize(titleText, 14);
  draw(titleText, (W - titleW) / 2, y, helveticaBold, 14, blue);
  y -= 10;
  drawLine(y);
  y -= 25;

  // === 1. DAS PARTES ===
  ensureSpace(60);
  draw("1. DAS PARTES", margin, y, helveticaBold, 12, blue);
  y -= 22;

  draw("CONTRATADA:", margin, y, helveticaBold, 10, dark);
  y -= 16;
  draw("Adry Estações Gourmet", margin + 15, y, helvetica, 10, dark);
  y -= 20;

  draw("CONTRATANTE:", margin, y, helveticaBold, 10, dark);
  y -= 16;
  drawField("Nome", contract.contratante_name || "", 0);
  drawField("CPF", contract.contratante_document || "", 0);
  drawField("Telefone", contract.contratante_phone || "", 0);
  drawField("Endereço", contract.contratante_address || "", 0);
  y -= 8;

  // === 2. DO OBJETO ===
  ensureSpace(40);
  draw("2. DO OBJETO DO CONTRATO", margin, y, helveticaBold, 12, blue);
  y -= 22;

  const serviceNames = contract.services?.map((s) => s.service_name) || [];
  const objetoText = `O presente contrato tem por objeto a prestação de serviços de estações de eventos pela CONTRATADA ao(a) Sr(a). ${contract.contratante_name || "________"}, compreendendo os seguintes serviços: ${serviceNames.join(", ") || "________"}.`;
  drawParagraph(objetoText);
  y -= 8;

  // === 3. DO EVENTO ===
  ensureSpace(60);
  draw("3. DO EVENTO", margin, y, helveticaBold, 12, blue);
  y -= 22;
  drawField("Data", formatDateBR(contract.event_date), 0);
  drawField("Horário", `A partir das ${formatTimeBR(contract.event_start_time)}${contract.event_end_time ? ` até ${formatTimeBR(contract.event_end_time)}` : ""}`, 0);
  drawField("Local", contract.event_location || "", 0);
  drawField("Endereço", contract.event_address || "", 0);
  if (contract.event_city || contract.event_state) {
    drawField("Cidade/UF", `${contract.event_city || ""}${contract.event_state ? "/" + contract.event_state : ""}`, 0);
  }
  if (contract.guest_count) {
    drawField("Convidados", String(contract.guest_count), 0);
  }
  y -= 8;

  // === 4. DOS SERVIÇOS CONTRATADOS ===
  ensureSpace(40);
  draw("4. DOS SERVIÇOS CONTRATADOS", margin, y, helveticaBold, 12, blue);
  y -= 22;

  if (contract.services && contract.services.length > 0) {
    for (const svc of contract.services) {
      ensureSpace(30);
      draw(`▸ ${svc.service_name}`, margin + 5, y, helveticaBold, 10, dark);
      y -= 16;
      if (svc.quantity > 0) {
        draw(`  Quantidade: ${svc.quantity} ${svc.service_name.toLowerCase().includes("bancada") ? "unidade" : "unidades"}`, margin + 15, y, helvetica, 9, gray);
        y -= 14;
      }
      if (svc.unit_value > 0) {
        draw(`  Valor unitário: ${formatCurrency(svc.unit_value)}`, margin + 15, y, helvetica, 9, gray);
        y -= 14;
      }
      if (svc.observation) {
        draw(`  Obs: ${svc.observation}`, margin + 15, y, helveticaOblique, 9, gray);
        y -= 14;
      }
      if (svc.items && svc.items.length > 0) {
        draw("  Itens inclusos:", margin + 15, y, helveticaBold, 9, dark);
        y -= 14;
        for (const item of svc.items) {
          if (item.trim()) {
            ensureSpace(14);
            draw(`    • ${item}`, margin + 20, y, helvetica, 9, dark);
            y -= 13;
          }
        }
      }
      y -= 5;
    }
  } else {
    drawParagraph("Serviços a serem definidos.");
  }
  y -= 8;

  // === 5. DO VALOR E PAGAMENTO ===
  ensureSpace(80);
  draw("5. DO VALOR E FORMA DE PAGAMENTO", margin, y, helveticaBold, 12, blue);
  y -= 22;
  drawField("Valor Total", formatCurrency(contract.total_value), 0);
  drawField("Entrada", `${contract.entry_percent || 50}% — ${formatCurrency(entryValue)}`, 0);
  drawField("Saldo Restante", `${formatCurrency(balanceValue)}${contract.payment_deadline ? ` — Até ${formatDateBR(contract.payment_deadline)}` : ""}`, 0);
  drawField("Forma de Pagamento", contract.payment_method || "________", 0);
  y -= 8;

  // === 6. DAS OBRIGAÇÕES ===
  ensureSpace(60);
  draw("6. DAS OBRIGAÇÕES DAS PARTES", margin, y, helveticaBold, 12, blue);
  y -= 22;

  const obrigacoes = [
    "6.1. A CONTRATADA se compromete a prestar os serviços descritos neste contrato, com qualidade e dentro do prazo estabelecido.",
    "6.2. A CONTRATANTE se compromete a efetuar os pagamentos conforme acordado, bem como garantir as condições necessárias para a realização do evento.",
    "6.3. A CONTRATANTE deverá informar qualquer alteração com antecedência mínima de 7 (sete) dias úteis.",
    "6.4. A CONTRATADA se responsabiliza por toda a estrutura, equipe e insumos necessários para a execução dos serviços contratados.",
  ];
  for (const text of obrigacoes) {
    drawParagraph(text, 9, 14);
    y -= 3;
  }
  y -= 8;

  // === 7. DO CANCELAMENTO ===
  ensureSpace(60);
  draw("7. DO CANCELAMENTO", margin, y, helveticaBold, 12, blue);
  y -= 22;

  const cancelamento = [
    "7.1. Em caso de cancelamento por parte da CONTRATANTE, o sinal/entrada pago será devolvido integralmente se o cancelamento for solicitado com mais de 30 (trinta) dias de antecedência.",
    "7.2. Para cancelamentos com menos de 30 dias, será retido 50% do valor da entrada.",
    "7.3. Cancelamentos com menos de 7 dias não terão devolução do sinal/entrada.",
    "7.4. Em caso de cancelamento por parte da CONTRATADA, o valor integral pago será devolvido ao CONTRATANTE.",
  ];
  for (const text of cancelamento) {
    drawParagraph(text, 9, 14);
    y -= 3;
  }
  y -= 8;

  // === 8. DAS DISPOSIÇÕES GERAIS ===
  ensureSpace(60);
  draw("8. DAS DISPOSIÇÕES GERAIS", margin, y, helveticaBold, 12, blue);
  y -= 22;

  const disposicoes = [
    "8.1. O presente contrato é regido pelas leis vigentes no Brasil.",
    "8.2. Qualquer alteração deverá ser formalizada por escrito e assinada por ambas as partes.",
    "8.3. Fica eleito o foro da comarca onde se encontra o endereço da CONTRATADA para dirimir quaisquer questões oriundas deste contrato.",
    "8.4. As partes declaram que leram e compreenderam todas as cláusulas deste contrato, estando de pleno acordo com os seus termos.",
  ];
  for (const text of disposicoes) {
    drawParagraph(text, 9, 14);
    y -= 3;
  }
  y -= 15;

  // === RESUMO DO PEDIDO ===
  ensureSpace(80);
  drawLine(y);
  y -= 20;
  draw("RESUMO DO PEDIDO", margin, y, helveticaBold, 12, blue);
  y -= 20;

  if (contract.services && contract.services.length > 0) {
    for (const svc of contract.services) {
      ensureSpace(14);
      const qtyText = svc.quantity > 0 ? ` • ${svc.quantity} un.` : "";
      draw(`${svc.service_name}${qtyText}`, margin + 10, y, helvetica, 10, dark);
      y -= 14;
    }
  }

  ensureSpace(14);
  draw(`Data: ${formatDateBR(contract.event_date)}`, margin + 10, y, helvetica, 10, dark);
  y -= 14;
  if (contract.event_location) {
    ensureSpace(14);
    draw(`Local: ${contract.event_location}`, margin + 10, y, helvetica, 10, dark);
    y -= 14;
  }
  y -= 5;
  drawLine(y);
  y -= 18;
  draw(`Total: ${formatCurrency(contract.total_value)}`, margin + 10, y, helveticaBold, 11, dark);
  y -= 16;
  draw(`Entrada: ${formatCurrency(entryValue)}`, margin + 10, y, helvetica, 10, dark);
  y -= 16;
  draw(`Saldo: ${formatCurrency(balanceValue)}`, margin + 10, y, helvetica, 10, dark);
  y -= 25;

  // === ASSINATURAS ===
  ensureSpace(100);
  drawLine(y);
  y -= 30;

  draw("_______________________________", margin, y);
  draw("_______________________________", W / 2 + 30, y);
  y -= 16;
  draw("CONTRATADA", margin + 60, y, helvetica, 9, gray);
  draw("CONTRATANTE", W / 2 + 80, y, helvetica, 9, gray);
  y -= 16;
  if (contract.contratante_document) {
    draw("CPF: ___.___.___-__", margin + 65, y, helvetica, 8, gray);
    draw(`CPF: ${contract.contratante_document}`, W / 2 + 85, y, helvetica, 8, gray);
  }
  y -= 25;
  draw(`Data: ${today}`, margin, y, helvetica, 9, gray);

  return pdfDoc.save();
}
