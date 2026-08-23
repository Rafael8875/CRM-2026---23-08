import { createFileRoute } from '@tanstack/react-router'
import { supabaseAdmin } from '@/integrations/supabase/client.server'

// Rota para o cron job (deve ser chamada periodicamente, ex: a cada hora)
export const Route = createFileRoute('/api/public/cron/event-alerts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // 1. Enforce strict authorization
        const authHeader = request.headers.get('Authorization')
        const expectedHeader = `Bearer ${process.env['CRON_SECRET']}`
        
        if (!authHeader || authHeader !== expectedHeader) {
          // Check for dev fallback ONLY if CRON_SECRET is not set at all
          if (process.env['CRON_SECRET'] || process.env['NODE_ENV'] === 'production') {
            return new Response('Unauthorized', { status: 401 })
          }
        }

        const supabase = supabaseAdmin
        
        // 2. Buscar eventos que ocorrerão nas próximas 24-25 horas
        const now = new Date()
        const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const twentyFiveHoursFromNow = new Date(now.getTime() + 25 * 60 * 60 * 1000)

        const { data: contracts, error } = await supabase
          .from('contracts')
          .select('*, clients(*), profiles!inner(*)')
          .gte('event_date_time', twentyFourHoursFromNow.toISOString())
          .lte('event_date_time', twentyFiveHoursFromNow.toISOString())
          .eq('status', 'Fechado')

        if (error) {
          console.error('Erro ao buscar contratos para alerta:', error)
          return new Response('Error fetching contracts', { status: 500 })
        }

        const results = []

        // 3. Processar cada contrato
        for (const contract of contracts || []) {
          // Verificar se já enviamos alerta para este contrato
          const { data: existingReminder } = await supabase
            .from('event_reminders')
            .select('*')
            .eq('contract_id', contract.id)
            .eq('reminder_type', 'email')
            .single()

          if (!existingReminder) {
            // Enviar E-mail (Placeholder usando Lovable AI Gateway ou Resend se configurado)
            // Aqui simulamos o envio registrando no log e na tabela
            
            console.log(`[ALERTA 24H] Evento para ${contract.clients.name} em ${contract.event_date_time}`)

            await supabase
              .from('event_reminders')
              .insert([{
                contract_id: contract.id,
                user_id: contract.user_id,
                reminder_type: 'email'
              }])
            
            results.push({ contractId: contract.id, status: 'notified' })
          }
        }

        return new Response(JSON.stringify({ 
          processed: contracts?.length || 0,
          notificationsSent: results.length,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
})
