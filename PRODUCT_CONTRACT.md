# VELVET VIP — PRODUCT CONTRACT / IMPLEMENTATION FREEZE

**Snapshot:** 19/09/2026  
**Repository:** emersongabriel29-pixel/Velvet-VIP  
**Latest snapshot commit:** 02bb93fac148d64ce76f46fe470820ae1a075bc8

> Este documento é o contrato funcional para evitar regressões. Novas alterações devem preservar as funcionalidades já existentes e adicionar mudanças por migrações/commits incrementais.

## 1. Princípios de acesso

- O feed é gratuito para visualizar.
- O login é obrigatório para assistir qualquer live, inclusive live gratuita.
- Lives podem ser configuradas pelo criador como:
  - **free:** aberta/gratuita;
  - **plus:** Plus ou VIP;
  - **vip:** somente VIP.
- O bloqueio acontece ao tentar reproduzir o conteúdo protegido, não no feed.
- Lives gratuitas também aceitam gorjetas.
- Gorjetas são opcionais e aparecem durante a live quando habilitadas pelo criador.
- Live Solo é uma compra separada e deve resultar em uma experiência privada entre membro e criador; o pagamento e o pedido já estão modelados. A criação efetiva da sala privada/agendamento permanece uma etapa posterior do módulo de vídeo privado.

## 2. Feed

O feed deve misturar descoberta e monetização:
- vídeos curtos;
- vídeos longos;
- lives em andamento;
- conteúdo gratuito e conteúdo protegido.

### Lives no feed
Quando um criador estiver ao vivo, o feed pode mostrar um card do tipo:
**“Fulano está em live agora”**.
Ao clicar:
- visitante sem login recebe convite para entrar/criar conta;
- membro logado entra na live;
- se a live for protegida e o plano não der direito, o servidor mantém o bloqueio e o usuário é orientado a adquirir o acesso.

### Vídeos longos
Vídeos longos aparecem no feed. O feed continua gratuito, mas a reprodução integral pode exigir compra/assinatura.
- conteúdo já adquirido/desbloqueado: reprodução direta;
- conteúdo protegido: card com bloqueio e CTA de compra;
- a experiência prevista é uma prévia curta antes do paywall. Para produção segura, a prévia deve ser um arquivo/rendição separado, nunca o URL assinado do vídeo integral.

## 3. Lives

Já implementado no código:
- configuração free/Plus/VIP;
- gorjetas durante a live;
- Live Solo com checkout;
- validação de autenticação para lives;
- playback protegido via Edge Function;
- seleção de qualidade quando o provedor oferece múltiplas fontes;
- integração com Mercado Pago para checkout.

## 4. Gorjetas

As gorjetas:
- funcionam em lives gratuitas e pagas;
- usam checkout separado;
- podem carregar mensagem;
- são associadas ao criador e, quando originadas de live, ao live_id;
- passam pelo webhook de pagamento e crédito do criador.

## 5. Progressão de criadores — níveis 1 a 5

Todo criador aprovado começa no **Nível 1**.

A pontuação é calculada no banco e atualizada automaticamente.

### Pontos considerados
- seguidores/interações;
- curtidas;
- comentários;
- minutos de lives;
- valor de gorjetas pagas;
- vendas/PPV concluídos;
- visualizações.

### Fórmula atual
- seguidores: até 300 pontos, 2 pontos por seguidor;
- curtidas: até 250 pontos, 0,25 por curtida;
- comentários: até 250 pontos, 2 por comentário;
- minutos de live: até 200 pontos, 0,50 por minuto;
- gorjetas: até 400 pontos, 1 ponto por R$ 1;
- vendas: até 400 pontos, 5 pontos por venda;
- visualizações: até 200 pontos, 0,02 por visualização.

Os limites por métrica evitam que uma única atividade domine toda a progressão.

### Faixas
| Nível | Pontuação mínima | Boost de descoberta | Limite de destaques |
|---|---:|---:|---:|
| 1 | 0 | 1,00x | 3 |
| 2 | 100 | 1,15x | 5 |
| 3 | 300 | 1,35x | 8 |
| 4 | 700 | 1,65x | 12 |
| 5 | 1.400 | 2,00x | 20 |

### Efeito do nível
Quanto maior o nível:
- maior prioridade de descoberta;
- maior frequência relativa de aparição no feed;
- maior limite de destaques;
- maior exposição em superfícies de descoberta futuras.

O boost é um fator de ranking, não uma duplicação artificial do mesmo post.

## 6. Ranking do feed

O feed usa o nível/pontuação/boost do criador como um dos sinais de descoberta, preservando recência como componente.

Regra de produto:
- não remover criadores de nível baixo do feed;
- não garantir posição fixa;
- nível maior aumenta a probabilidade relativa de descoberta.

## 7. Admin / CMS

O administrador pode editar separadamente:
- página inicial;
- página do membro;
- página do membro VIP;
- página do criador/Creator Studio.

Cada página possui título e subtítulo próprios persistidos em app_content_settings.

## 8. Notificações

As notificações usam uma lista única.
Não existe mais uma escolha separada entre “novo conteúdo” e “novo criador”.

Triggers implementados:
- novo criador aprovado;
- novo vídeo aprovado publicado para seguidores.

Tipos adicionados:
- new_content;
- new_creator.

## 9. Segurança

- Lives protegidas passam por Edge Function.
- Vídeos protegidos passam por Edge Function.
- RLS deve continuar habilitado nas tabelas públicas.
- Funções privilegiadas devem permanecer com permissões restritas.
- Novas tabelas/migrações devem manter RLS e grants coerentes.

## 10. Estado atual e próximos módulos

### Implementado neste ciclo
- páginas de membro/VIP/criador no Admin;
- lives free/Plus/VIP;
- gorjetas em lives;
- Live Solo: checkout, request e crédito;
- login obrigatório para assistir lives;
- lives no feed;
- progressão 1–5 e cálculo automático;
- boost de descoberta por nível;
- nível visível no Creator Studio;
- notificações unificadas;
- triggers de novos criadores/conteúdo.

### Próxima etapa técnica recomendada
1. criar sala privada real para Live Solo após pagamento/aceite do criador;
2. criar rendição/arquivo separado de prévia para vídeos longos protegidos;
3. criar painel do criador para aceitar, agendar, concluir ou cancelar Live Solo;
4. adicionar métricas de retenção, tempo assistido e conversão ao ranking quando existirem eventos confiáveis.

## 11. Regra de não regressão

Não remover ou substituir:
- pagamentos existentes;
- webhook/idempotência;
- RLS;
- playback privado;
- moderação;
- comentários/curtidas;
- assinaturas;
- PPV;
- destaques;
- analytics;
- notificações;
- configurações administrativas.

Toda nova funcionalidade deve ser adicionada por commit/migração incremental e passar por TypeScript, testes e segurança antes de ser considerada concluída.
