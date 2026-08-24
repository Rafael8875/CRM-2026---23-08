import { PDFDocument } from 'pdf-lib';

interface ExtractedContract {
  contratante_name?: string;
  contratante_document?: string;
  contratante_phone?: string;
  total_value?: number;
  event_date?: string;
  services?: string[];
  raw_text?: string;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  let text = "";

  // Try form fields first
  fields.forEach((field) => {
    try {
      if (field.constructor.name === 'PDFTextField') {
        const val = (field as any).getText();
        if (val) text += val + "\n";
      }
    } catch {}
  });

  // If no form fields, try raw pages text
  if (!text.trim()) {
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      try {
        const content = page.node.Contents();
        if (content) {
          const stream = content.get();
          if (stream && typeof stream === 'object' && 'contents' in stream) {
            const raw = (stream as any).contents;
            if (raw) text += new TextDecoder().decode(raw) + "\n";
          }
        }
      } catch {}
    }
  }

  return text;
}

export function parseContractText(text: string): ExtractedContract {
  const result: ExtractedContract = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  // Name extraction - look for common patterns
  const namePatterns = [
    /contratante[:\s]+(.+)/i,
    /nome[:\s]+(.+)/i,
    /cliente[:\s]+(.+)/i,
    /senhor[ae]?\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)/,
  ];
  for (const pattern of namePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      result.contratante_name = match[1].trim().replace(/[.\-:,]+$/, "");
      break;
    }
  }

  // CPF/CNPJ
  const cpfMatch = fullText.match(/(?:cpf|cnpj|documento)[:\s]*(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\s]?\d{2}|\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[\-\s]?\d{2})/i);
  if (cpfMatch) {
    result.contratante_document = cpfMatch[1].trim();
  } else {
    const cpfOnly = fullText.match(/(\d{3}\.\d{3}\.\d{3}-\d{2})/);
    if (cpfOnly) result.contratante_document = cpfOnly[1];
  }

  // Phone
  const phoneMatch = fullText.match(/(?:telefone|tel|celular|whatsapp|contato)[:\s]*([\(\)\d\s\-+]{10,})/i);
  if (phoneMatch) {
    result.contratante_phone = phoneMatch[1].trim();
  } else {
    const phoneOnly = fullText.match(/(\(\d{2}\)\s*\d{4,5}-\d{4})/);
    if (phoneOnly) result.contratante_phone = phoneOnly[1];
  }

  // Value
  const valuePatterns = [
    /(?:valor\s+total|total|valor)[:\s]*R?\$?\s*([\d\.,]+)/i,
    /R\$\s*([\d\.,]+)/i,
  ];
  for (const pattern of valuePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/\./g, "").replace(",", ".");
      result.total_value = parseFloat(cleaned);
      break;
    }
  }

  // Date
  const datePatterns = [
    /(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(\d{4})/i,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
  ];
  for (const pattern of datePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      if (match[3]) {
        // DD/MM/YYYY
        const months = ["","01","02","03","04","05","06","07","08","09","10","11","12"];
        const m = months[parseInt(match[2])] || "01";
        const y = match[3].length === 2 ? "20" + match[3] : match[3];
        result.event_date = `${y}-${m}-${match[1].padStart(2, "0")}`;
      } else {
        // Written format
        const monthMap: Record<string, string> = {
          janeiro: "01", fevereiro: "02", março: "03", abril: "04", maio: "05", junho: "06",
          julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12"
        };
        const m = monthMap[match[2].toLowerCase()] || "01";
        result.event_date = `${match[3]}-${m}-${match[1].padStart(2, "0")}`;
      }
      break;
    }
  }

  // Services - look for known service names
  const serviceKeywords = [
    { id: "churros", patterns: ["churros", "churro"] },
    { id: "mini_pizza", patterns: ["mini pizza", "pizza"] },
    { id: "mini_pastel", patterns: ["mini pastel", "pastel", "pastéis"] },
    { id: "acai", patterns: ["açaí", "acai"] },
    { id: "drinks", patterns: ["drinks", "drink"] },
    { id: "bancada_drinks", patterns: ["bancada de drinks", "bancada"] },
  ];
  
  const foundServices: string[] = [];
  for (const svc of serviceKeywords) {
    for (const pattern of svc.patterns) {
      if (fullText.toLowerCase().includes(pattern)) {
        foundServices.push(svc.id);
        break;
      }
    }
  }
  if (foundServices.length > 0) {
    result.services = foundServices;
  }

  result.raw_text = fullText;
  return result;
}
