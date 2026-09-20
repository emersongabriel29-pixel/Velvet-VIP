# Feiraê

**A feira do seu jeito.**

Marketplace das feiras do Distrito Federal, com alimentos, artesanato, moda, plantas, utilidades e outros produtos.

## GPS e localização
- “Usar minha localização” via Geolocation API.
- GPS opcional: se o cliente negar, pode informar endereço/região manualmente.
- Feiras ordenadas por proximidade.
- Distância cliente → feira.
- Botão para abrir rota no mapa.
- Latitude/longitude para feiras e pontos de venda.
- Endereço de entrega como destino.
- Arquitetura preparada para rastreamento de entregador em tempo real.
- Geolocalização tratada como dado privado e usada com consentimento.

## Produto
- múltiplas feiras do DF;
- múltiplos feirantes por feira;
- loja digital de cada feirante;
- alimentos e produtos não alimentícios;
- entrega e retirada;
- carrinho “Minha Feira”;
- pedidos e acompanhamento;
- compra de vários feirantes em um checkout, com divisão interna por vendedor;
- avaliações, favoritos e notificações;
- painel de cliente, feirante, entregador e administração;
- futuro painel de gestão da feira.

## Arquitetura de dados
Prever latitude/longitude em feiras, pontos de venda e endereços. Para consultas por distância/raio, usar PostGIS no Supabase.

Tabelas previstas:
profiles, vendor_profiles, delivery_profiles, fairs, fair_vendor_memberships, vendor_stores, categories, products, product_images, inventory, addresses, carts, cart_items, orders, order_items, order_vendors, payments, deliveries, reviews, favorites, notifications, promotions, audit_logs.

## Segurança
- RLS no Supabase.
- Nunca confiar em preço enviado pelo cliente.
- Validar estoque e propriedade do vendedor no servidor.
- Mutações financeiras server-side.
- Webhooks idempotentes.
- Logs de auditoria.
- Localização somente com consentimento.

## Roadmap
1. Supabase + schema/PostGIS.
2. Autenticação e perfis.
3. Feiras/feirantes e catálogo.
4. GPS/endereço e busca por proximidade.
5. Carrinho persistente.
6. Pedidos multi-feirante.
7. Painel do feirante.
8. Checkout e pagamento.
9. Entrega e rastreamento.
10. Avaliações, notificações e promoções.

## Desenvolvimento
cd feirae
npm install
npm run dev

O Feiraê permanece separado das regras de negócio do Velvet-VIP.
