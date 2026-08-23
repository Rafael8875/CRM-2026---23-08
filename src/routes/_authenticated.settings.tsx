import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Trash2, Loader2, Plus, Users, ShieldCheck } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { listUsers } from "@/lib/users.functions";
import { useServerFn } from "@tanstack/react-start";
import { UserModal } from "@/components/crm/UserModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsComponent,
});

function SettingsComponent() {
  const [isUploading, setIsUploading] = useState(false);
  const [templateTitle, setTemplateTitle] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const getUsers = useServerFn(listUsers);

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("user_id", session.user.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File, title: string }) => {
      setIsUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Não autenticado");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${session.user.id}/${fileName}`;

        // 1. Upload to storage
        const { error: storageError } = await supabase.storage
          .from("contract-templates")
          .upload(filePath, file);

        if (storageError) throw storageError;

        // 2. Create record in table using any to bypass type lag
        const { error: dbError } = await supabase
          .from("contract_templates")
          .insert([{
            title,
            file_path: filePath,
            content: "pdf_template", 
            user_id: session.user.id
          } as any]);

        if (dbError) throw dbError;

        return { success: true };
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo de PDF enviado com sucesso!");
      setTemplateTitle("");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao enviar modelo");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (template: any) => {
      // 1. Delete from storage
      await supabase.storage.from("contract-templates").remove([template.file_path]);
      
      // 2. Delete from DB
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", template.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Modelo excluído");
    },
    onError: () => toast.error("Erro ao excluir modelo")
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && templateTitle) {
      uploadMutation.mutate({ file, title: templateTitle });
    } else if (!templateTitle) {
      toast.error("Por favor, dê um nome ao modelo antes de enviar");
    }
  };

  return (
    <div className="flex flex-col gap-10 p-10 max-w-5xl mx-auto w-full animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Configurações</h1>
        <p className="text-muted-foreground font-medium">Personalize seu CRM, gerencie usuários e modelos de documentos.</p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="bg-white/[0.03] border border-white/5 p-1 mb-8">
          <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6">
            <FileText className="h-4 w-4 mr-2" />
            DOCUMENTOS
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold px-6">
            <Users className="h-4 w-4 mr-2" />
            USUÁRIOS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="animate-in fade-in slide-in-from-bottom-2">
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Modelos de Contrato (PDF)
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Envie arquivos PDF com campos de formulário para preenchimento automático. 
                <br />
                Campos suportados: <code className="text-task-blue">client_name</code>, <code className="text-task-blue">total_value</code>, etc.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 bg-white/[0.03] p-6 rounded-xl border border-white/5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nome do Modelo</label>
                  <Input 
                    placeholder="Ex: Contrato Padrão Eventos" 
                    value={templateTitle}
                    onChange={(e) => setTemplateTitle(e.target.value)}
                    className="bg-task-dark border-white/10 text-white h-12"
                  />
                </div>
                
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-bold text-white block">Arquivo PDF</span>
                    Selecione o arquivo com os campos para preenchimento.
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".pdf" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  
                  <Button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="default" 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-12" 
                    disabled={isUploading || !templateTitle}
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isUploading ? "ENVIANDO..." : "SELECIONAR E ENVIAR"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Modelos Disponíveis</h3>
                {isLoadingTemplates ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (templates as any)?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/50 text-sm italic border border-dashed border-white/10 rounded-xl">
                    Nenhum modelo enviado ainda.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {(templates as any)?.map((template: any) => (
                      <div key={template.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{template.title}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{template.file_path?.split('/').pop() || 'arquivo'}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => {
                            if (confirm("Excluir este modelo?")) deleteMutation.mutate(template);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in slide-in-from-bottom-2">
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Usuários do Sistema
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Gerencie quem tem acesso ao CRM e seus respectivos níveis de permissão.
                </CardDescription>
              </div>
              <Button onClick={() => setIsUserModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                <Plus className="h-4 w-4 mr-2" />
                NOVO USUÁRIO
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingUsers ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : (users as any)?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground/50 text-sm italic border border-dashed border-white/10 rounded-xl">
                    Nenhum usuário cadastrado.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {(users as any)?.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{user.full_name || 'Sem Nome'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded-full bg-white/5 text-[10px] font-bold text-primary uppercase border border-white/5">
                            {user.role || 'Usuário'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UserModal open={isUserModalOpen} onOpenChange={setIsUserModalOpen} />
    </div>
  );
}
