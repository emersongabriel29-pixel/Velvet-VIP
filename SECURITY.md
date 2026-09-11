# Segurança e privacidade — Velvet VIP

## Regras obrigatórias

- A plataforma é exclusiva para maiores de 18 anos.
- Todo criador deve ter identidade e maioridade verificadas antes de publicar.
- Conteúdo deve ser original ou ter autorização documentada.
- É proibido conteúdo envolvendo menores, incesto, abuso, coerção, exploração, violência sexual, gravação sem consentimento, deepfake sexual ou exposição de dados pessoais.
- Conteúdo denunciado deve ser ocultado durante a análise quando houver risco relevante.
- Mídia premium deve permanecer em Storage privado e ser entregue somente por URL temporária assinada.
- Segredos de servidor nunca podem usar variáveis `VITE_*`.

## Antes da produção

1. Executar as migrações SQL na ordem indicada no README.
2. Revisar RLS usando anon, usuário, criador e administrador.
3. Ativar confirmação de e-mail e recuperação de senha.
4. Configurar limites de upload, antivírus e proteção contra abuso.
5. Configurar logs sem armazenar IP desnecessariamente.
6. Definir retenção e exclusão de dados conforme a LGPD.
7. Criar canal de denúncias e procedimento de resposta.
8. Fazer testes de invasão e revisão jurídica especializada.
