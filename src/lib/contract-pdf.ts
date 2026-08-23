import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface ContractData {
  contratante_name?: string;
  contratante_document?: string;
  contratado_name?: string;
  fantasy_name?: string;
  guest_count?: number;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  event_location?: string;
  event_address?: string;
  total_value?: number;
  payment_method?: string;
  down_payment?: number;
  services?: string[];
  observations?: string;
  service_description?: string;
  client_name?: string;
}

export async function generateContractPdf(contract: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();
  
  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const drawText = (text: string, x: number, yPos: number, font = helvetica, size = 11, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x, y: yPos, font, size, color });
  };

  const drawLine = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "___/___/______";
    return new Date(dateStr + "T00:00:00").toLocaleDateString('pt-BR');
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "__:__";
    return timeStr;
  };

  const formatCurrency = (value?: number) => {
    if (!value && value !== 0) return "R$ __________";
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // Header
  drawText("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", margin, y, helveticaBold, 16, rgb(0.1, 0.1, 0.5));
  y -= 10;
  drawLine(y);
  y -= 30;

  // Preamble
  const clientName = contract.contratante_name || contract.client_name || "________________";
  const today = new Date().toLocaleDateString('pt-BR');
  
  const preamble = `Pelo presente instrumento particular, as partes abaixo qualificadas contratam entre si a prestação de serviços descrita neste contrato, nas condições e cláusulas a seguir estabelecidas:`;
  
  const lines = wrapText(preamble, helvetica, 11, contentWidth);
  lines.forEach((line) => {
    drawText(line, margin, y);
    y -= 16;
  });
  y -= 10;

  // Contratante
  drawText("CONTRATANTE:", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
  y -= 18;
  drawText(`Nome: ${clientName}`, margin, y);
  y -= 16;
  drawText(`CPF/CNPJ: ${contract.contratante_document || "___.___.___-__"}`, margin, y);
  y -= 25;

  // Contratado
  drawText("CONTRATADO:", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
  y -= 18;
  drawText(`Razão Social / Nome: ${contract.contratado_name || "Adry Estações Gourmet"}`, margin, y);
  y -= 16;
  drawText(`Nome Fantasia: ${contract.fantasy_name || "Adry Estações Gourmet"}`, margin, y);
  y -= 16;
  drawText(`CPF/CNPJ: ___.___.___-__`, margin, y);
  y -= 25;

  // Objeto
  drawText("1. OBJETO DO CONTRATO", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
  y -= 18;
  
  const services = contract.services && contract.services.length > 0 ? contract.services : (contract.service_description ? [contract.service_description] : []);
  if (services.length > 0) {
    drawText("Serviços contratados:", margin, y, helveticaBold, 11);
    y -= 16;
    services.forEach((service) => {
      drawText(`  • ${service}`, margin, y);
      y -= 15;
    });
  } else {
    drawText("Serviço: _________________________________", margin, y);
    y -= 16;
  }
  y -= 10;

  // Dados do Evento
  drawText("2. DADOS DO EVENTO", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
  y -= 18;
  drawText(`Data: ${formatDate(contract.event_date)}`, margin, y);
  y -= 16;
  drawText(`Horário: ${formatTime(contract.event_start_time)} às ${formatTime(contract.event_end_time)}`, margin, y);
  y -= 16;
  drawText(`Nº de Convidados: ${contract.guest_count || "___"}`, margin, y);
  y -= 16;
  drawText(`Local: ${contract.event_location || "_______________________________"}`, margin, y);
  y -= 16;
  drawText(`Endereço: ${contract.event_address || "_______________________________"}`, margin, y);
  y -= 25;

  // Valor
  drawText("3. VALOR E CONDIÇÕES DE PAGAMENTO", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
  y -= 18;
  drawText(`Valor Total: ${formatCurrency(contract.total_value)}`, margin, y, helveticaBold);
  y -= 16;
  drawText(`Sinal / Entrada: ${formatCurrency(contract.down_payment)}`, margin, y);
  y -= 16;
  drawText(`Forma de Pagamento: ${contract.payment_method || "________________"}`, margin, y);
  y -= 25;

  // Observações
  if (contract.observations) {
    drawText("4. OBSERVAÇÕES", margin, y, helveticaBold, 12, rgb(0.1, 0.1, 0.5));
    y -= 18;
    const obsLines = wrapText(contract.observations, helvetica, 11, contentWidth);
    obsLines.forEach((line) => {
      drawText(line, margin, y);
      y -= 16;
    });
    y -= 15;
  }

  // Assinaturas
  y -= 20;
  drawLine(y);
  y -= 30;
  
  drawText("_______________________________", margin, y);
  drawText("_______________________________", width / 2 + 25, y);
  y -= 16;
  drawText("Contratante", margin, y, helvetica, 10);
  drawText("Contratado", width / 2 + 25, y, helvetica, 10);

  return pdfDoc.save();
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
