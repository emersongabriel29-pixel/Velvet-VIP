# Feiraê

Marketplace das feiras do DF.

> A feira do seu jeito.

## MVP atual

A primeira versão é um protótipo funcional de interface do cliente com:

- busca de produtos, feirantes e feiras;
- categorias;
- feiras em destaque;
- catálogo de produtos;
- favoritos (interface);
- carrinho "Minha Feira";
- controle de quantidade;
- navegação inicial para pedidos e perfil;
- responsividade mobile/desktop.

## Arquitetura planejada

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + RLS
- Storage para imagens
- pagamentos server-side
- pedidos multi-feirante
- entrega e retirada
- painéis de cliente, feirante, entregador e administração

## Regra de produto

O Feiraê é um produto independente. O projeto Velvet-VIP não será alterado para incorporar regras de negócio do Feiraê.

## Desenvolvimento

```bash
cd feirae
npm install
npm run dev
```

## Próxima fase

1. Modelar o banco Supabase.
2. Autenticação e perfis.
3. Cadastro de feiras/feirantes/produtos.
4. Persistência do catálogo e carrinho.
5. Checkout de teste.
6. Pedidos e painel do feirante.
