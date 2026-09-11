# Planejamento futuro: armazenamento e vídeo

## Fase 1 — MVP

- Usar Supabase Storage com bucket privado `velvet-media`.
- Separar vídeos, thumbnails e arquivos de moderação em buckets distintos.
- Salvar no banco apenas o caminho do objeto (`storage://...`).
- Entregar vídeos por URLs assinadas e temporárias.
- Limitar tamanho e duração dos uploads.
- Comprimir e validar o arquivo antes da publicação.
- Manter todo upload novo em revisão até a moderação aprovar.

## Fase 2 — Crescimento inicial

Quando o volume de vídeos ou visualizações aumentar:

- Ativar conversão para múltiplas qualidades.
- Gerar thumbnails e frames automaticamente.
- Usar CDN para reduzir custo de tráfego.
- Criar política de retenção para arquivos rejeitados e temporários.
- Monitorar armazenamento, egress, tempo de reprodução e erros.
- Definir alertas de orçamento antes de ultrapassar a franquia.

## Fase 3 — Escala

Para milhares ou milhões de vídeos, avaliar Cloudflare Stream, Bunny Stream ou armazenamento compatível com S3. A escolha deverá considerar:

- Permissão contratual para conteúdo adulto legal e consensual.
- Moderação, denúncias e remoção rápida.
- Streaming adaptativo e proteção contra acesso direto.
- Localização e retenção dos dados.
- Custo de armazenamento, processamento e tráfego.
- Exportação e portabilidade dos arquivos.

O Supabase continuará como banco de dados, autenticação, permissões, pagamentos e registro dos caminhos dos arquivos. O provedor de vídeo poderá armazenar e distribuir a mídia pesada.

## Estimativa simples

A capacidade depende do tamanho médio dos vídeos. Como referência, 100 GB comportam aproximadamente 200 vídeos de 500 MB ou 50 vídeos de 2 GB, sem considerar thumbnails, versões convertidas e tráfego de reprodução.

O plano gratuito do Supabase é adequado apenas para protótipo: atualmente inclui 1 GB de Storage e limite de 50 MB por arquivo. O plano Pro inclui 100 GB e permite arquivos maiores, com cobrança adicional conforme o uso. Consulte os valores atuais antes de contratar.

## Regra de arquitetura

Nunca tornar vídeos explícitos públicos. O acesso deve passar por autenticação, confirmação de idade, assinatura/compra válida, moderação e URL temporária assinada.
