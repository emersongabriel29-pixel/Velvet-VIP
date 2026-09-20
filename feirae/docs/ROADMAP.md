# Feiraê — roadmap de implementação

## 🔴 MVP operacional
1. Supabase + banco: usuários, feiras, feirantes, lojas, produtos, categorias, estoque, pedidos, itens, endereços, entregas e avaliações.
2. Autenticação: cadastro/login, recuperação de senha, perfis e permissões.
3. Catálogo real: produto, foto, preço, unidade, estoque, disponibilidade e promoções.
4. Feiras reais: endereço, GPS, dias/horários e feirantes participantes.
5. Carrinho persistente: banco, validação server-side de estoque e preço.
6. Pedidos: criação, histórico, status e cancelamento.
7. Painel do feirante: pedidos, produtos, estoque, loja, feira, vendas, financeiro, avaliações e configurações.
8. Checkout: endereço, entrega/retirada, taxa, resumo e pagamento.
9. Entrega: entregador, disponibilidade, aceite, coleta, rota, status, comprovante, taxa e ganhos.
10. Pagamento: Pix/cartão, confirmação, webhook idempotente, reembolso e divisão financeira.

## 🟠 Multi-feirante
Um cliente pode comprar de vários feirantes em uma única experiência. O pedido principal é dividido em `order_vendors`, com status e subtotal por vendedor. Estoque, preço, comissão e repasses devem ser calculados e validados no servidor.

## 🛵 Entregas
Fluxo: pending → assigned → accepted → collecting → collected → out_for_delivery → delivered.
Inclui cadastro/aprovação, disponibilidade, aceite, coleta, rota, localização, comprovante, ganhos e histórico.

## 💰 Pagamentos
Integrar pagamento real somente depois do modelo de pedidos estar estável. Preparar Pix, cartão, confirmação automática, webhooks idempotentes, reembolso, comissão Feiraê, repasse ao feirante e valor do entregador.

## 🧑‍🌾 Painel do feirante
Pedidos · Produtos · Estoque · Minha loja · Minha feira · Vendas · Financeiro · Avaliações · Configurações.

## 🛠️ Painel administrativo
Feiras · feirantes · categorias · pedidos · entregas · usuários · cancelamentos · financeiro · denúncias/moderação · relatórios.

## 🟢 Pós-MVP
Avaliações avançadas, favoritos, notificações, cupons, ofertas, produtos patrocinados, assinatura para feirantes, fidelidade, recomendações, mapa das feiras, retirada agendada, recorrência, chat e analytics.

## Ordem
Supabase/banco → Auth → Feiras/feirantes → Produtos/estoque → GPS/endereço → Carrinho → Pedidos → Painel feirante → Checkout → Entrega → Pagamento real.
