import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";

export const listContractFiles = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({ contractId: z.string().uuid() }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // Check if contract belongs to user
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (contractError || !contract) {
      throw new Error("Contract not found or access denied");
    }

    const { data, error } = await supabase.storage
      .from("contract-pdfs")
      .list(contractId);
      
    if (error) throw error;
    return data || [];
  });

export const getContractFileUrl = createServerFn({ method: "GET" })
  .validator((data: any) => z.object({ 
    contractId: z.string().uuid(),
    fileName: z.string()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId, fileName }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // Check access
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (contractError || !contract) {
      throw new Error("Access denied");
    }

    const { data, error } = await supabase.storage
      .from("contract-pdfs")
      .createSignedUrl(`${contractId}/${fileName}`, 60); // 1 minute expiry
      
    if (error) throw error;
    return data.signedUrl;
  });

export const deleteContractFile = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ 
    contractId: z.string().uuid(),
    fileName: z.string()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId, fileName }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // Check access
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (contractError || !contract) {
      throw new Error("Access denied");
    }

    const { error } = await supabase.storage
      .from("contract-pdfs")
      .remove([`${contractId}/${fileName}`]);
      
    if (error) throw error;
    return { success: true };
  });

export const getWhatsAppShareLink = createServerFn({ method: "POST" })
  .validator((data: any) => z.object({ 
    contractId: z.string().uuid(),
    fileName: z.string()
  }).parse(data))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: { contractId, fileName }, context }) => {
    const { supabase, userId } = context as AuthContext;
    
    // 1. Fetch Contract and Client Data
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*, clients(name, whatsapp)")
      .eq("id", contractId)
      .eq("user_id", userId)
      .single();
      
    if (contractError || !contract) throw new Error("Contract not found");

    const client = (contract as any).clients;
    if (!client?.whatsapp) throw new Error("WhatsApp do cliente não cadastrado");

    // 2. Generate Signed URL for the PDF (longer expiry for sharing)
    const { data: signedData, error: signedError } = await supabase.storage
      .from("contract-pdfs")
      .createSignedUrl(`${contractId}/${fileName}`, 60 * 60 * 24); // 24 hours expiry
      
    if (signedError) throw signedError;

    // 3. Format WhatsApp link
    const cleanNumber = client.whatsapp.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Olá ${client.name}, segue o link para visualizar o seu contrato: ${signedData.signedUrl}`
    );
    
    return { 
      whatsappUrl: `https://wa.me/${cleanNumber}?text=${message}`
    };
  });
