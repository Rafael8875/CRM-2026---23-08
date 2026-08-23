import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";
import { PDFDocument } from 'pdf-lib';

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as AuthContext;
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("user_id", userId);
    
    if (error) throw error;
    return data || [];
  });

export const fillContractPdf = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ 
    contractId: z.string().uuid(),
    templateId: z.string().uuid()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId, templateId }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // 1. Fetch Contract Data
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*, clients(*)")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (contractError || !contract) throw new Error("Contract not found");

    // 2. Fetch Template Data
    const { data: template, error: templateError } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", userId)
      .single();
      
    const templateData = template as any;
    if (templateError || !templateData || !templateData.file_path) throw new Error("Template not found or has no file");

    // 3. Download Template PDF
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from("contract-templates")
      .download(templateData.file_path);
      
    if (downloadError) throw downloadError;

    // 4. Fill PDF
    const arrayBuffer = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();

    const contractData = contract as any;

    // Map common fields
    const fieldsMap: Record<string, string> = {
      "client_name": contractData.clients?.name || "",
      "client_document": contractData.clients?.document || "",
      "service_description": contractData.service_description || "",
      "total_value": new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contractData.total_value || 0),
      "event_date": contractData.event_date_time ? new Date(contractData.event_date_time).toLocaleDateString('pt-BR') : "",
      "contract_date": new Date().toLocaleDateString('pt-BR'),
    };

    // Try to fill fields if they exist, but FIRST clear them to ensure no ghost data from template
    const allFields = form.getFields();
    allFields.forEach(field => {
      try {
        if (field.constructor.name === 'PDFTextField') {
          (field as any).setText("");
        }
      } catch (e) {}
    });

    // Now fill with actual data
    Object.entries(fieldsMap).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) field.setText(value);
      } catch (e) {
        // Field might not exist
      }
    });

    // Flatten form
    form.flatten();

    const filledPdfBytes = await pdfDoc.save();

    // 5. Upload Filled PDF
    const fileName = `contrato_${contractData.contract_number || contractId.slice(0,8)}_${Date.now()}.pdf`;
    const filePath = `${contractId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from("contract-pdfs")
      .upload(filePath, filledPdfBytes, {
        contentType: 'application/pdf'
      });
      
    if (uploadError) throw uploadError;

    return { success: true, fileName };
  });
