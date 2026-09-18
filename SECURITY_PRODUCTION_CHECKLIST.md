# Checklist de segurança para produção

## Implementado no código

- RLS e políticas por função.
- Segredos de servidor fora de variáveis VITE.
- Storage privado e URLs temporárias.
- Auditoria, denúncias, bloqueios e moderação.
- Webhook idempotente e assinatura HMAC.
- CI com typecheck, build e auditoria de dependências.
- Cabeçalhos de segurança documentados para o provedor de hospedagem.

## Configuração obrigatória externa

- Ativar MFA para administradores e criadores.
- Ativar confirmação de e-mail e recuperação segura.
- Configurar WAF, rate limit e proteção contra brute force.
- Configurar antivírus e limites de tamanho/formato no upload.
- Configurar backups automáticos e teste de restauração.
- Configurar alertas de login, pagamentos e alterações administrativas.
- Fazer teste de invasão antes do lançamento.
- Revisar RLS com contas anon, usuário, criador e admin.
- Definir retenção, exclusão e resposta a incidentes conforme LGPD.

## Gate final

- [ ] Evidências de staging real anexadas ao registro de lançamento.
- [ ] Restore drill concluído e registrado.
- [ ] Provedores externos efetivamente conectados e testados.
- [ ] Pentest/revisão final concluído após configuração da infraestrutura.
- [ ] LGPD/jurídico/política de conteúdo revisados.
- [ ] Plano de rollback e responsáveis operacionais definidos.

Enquanto qualquer item obrigatório estiver pendente, o estado é **NO-GO** para usuários e dinheiro reais.
