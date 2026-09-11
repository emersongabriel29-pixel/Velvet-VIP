# Entretenimento e comunidade

A migração `005_entertainment.sql` prepara:

- Stories com expiração de 24 horas e moderação.
- Playlists privadas.
- Reações além de curtida.
- Enquetes de criadores.
- Lives agendadas e moderadas.
- Pedidos personalizados com consentimento.
- Pontos, níveis e distintivos.
- Preferências de conteúdo, tags bloqueadas e idiomas.
- Histórico de interação para futuras recomendações.

## Ordem de ativação

1. Executar migrações `001` a `005`.
2. Conectar telas ao Supabase.
3. Criar painel de lives, stories e enquetes.
4. Implementar moderação antes de liberar uploads e transmissões.
5. Adicionar notificações e recomendações.
6. Testar com contas de usuário e criador separadas.

Lives e pedidos personalizados não devem ser liberados em produção sem moderação, verificação de identidade, consentimento e regras de pagamento.
