
-- Adicionar coluna event_date_time na tabela de contratos para alertas precisos
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS event_date_time TIMESTAMPTZ;

-- Criar tabela para rastrear lembretes enviados
CREATE TABLE IF NOT EXISTS public.event_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reminder_type TEXT NOT NULL, -- 'email' ou 'whatsapp_ready'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contract_id, reminder_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reminders TO authenticated;
GRANT ALL ON public.event_reminders TO service_role;

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders" ON public.event_reminders
    TO authenticated USING (user_id = auth.uid());

-- Criar segredo para o CRON se não existir
-- Nota: Isso é apenas um placeholder para a lógica da aplicação
