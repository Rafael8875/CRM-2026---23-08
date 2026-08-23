# CRM Financeiro - Especificações

## Telas Principais
1. **Dashboard**: KPIs de faturamento (hoje/semana/mês), contratos (fechados/pendentes), valores a receber/recebidos e gráficos.
2. **Clientes**: Ficha completa com dados pessoais, detalhes do evento/serviço, valores e histórico de contratos.
3. **Contratos**: Criação de novos contratos com cálculo automático de saldo restante.
4. **Financeiro**: Controle de entradas e saídas por categoria com cálculo de lucro.

## Funcionalidades Específicas
- **Filtro de Período**: Hoje, Semana, Mês, Ano e Personalizado.
- **Agenda/Calendário**: Visualização de eventos próximos.
- **Gerador de Contratos**: Modelos com tags dinâmicas `{{cliente_nome}}`, `{{valor_contrato}}`, etc.
- **Histórico**: Registro completo de alterações e pagamentos por cliente.
- **Assinaturas**: Campos para assinatura do cliente e responsável.

## Visual e Acesso
- **Estilo**: Inspirado no dashboard escuro com cards coloridos (laranja, azul, verde) fornecido na imagem de referência.
- **Autenticação**: Login com `admin` / `admin`.
- **Responsividade**: Computador, Notebook e Celular.
- **Menu Lateral**: Dashboard, Clientes, Contratos, Financeiro, Agenda, Relatórios, Configurações.
