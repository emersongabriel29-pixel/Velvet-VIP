# Worker de mídia

O processo retira trabalhos da fila `media_processing_jobs`, baixa a fonte por URL assinada, cria MP4 e HLS em múltiplas resoluções com FFmpeg e grava os resultados no bucket privado `velvet-media`.

## Execução

Use somente em um servidor privado. A chave `service_role` não pode ser exposta no frontend, em logs ou em imagens Docker.

```bash
docker build -f workers/media/Dockerfile -t velvet-media-worker .
docker run --rm \
  --env SUPABASE_URL=https://PROJECT.supabase.co \
  --env SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SECRET \
  --tmpfs /tmp:rw,noexec,nosuid,size=2g \
  velvet-media-worker
```

Para validar um único trabalho e encerrar, execute `npm run media:once`. O processo contínuo consulta a fila a cada cinco segundos, renova o lease durante a transcodificação e trata `SIGTERM` para encerrar sem assumir um novo trabalho.

## Limites operacionais

- fonte máxima: 512 MB;
- duração máxima: 6 horas;
- dimensão aceita: até 8192 × 8192;
- ladder sem upscale: 360p, 480p, 720p, 1080p e 4K quando a fonte comportar;
- dois threads de codificação por rendition;
- três tentativas por trabalho, controladas no banco.

Os arquivos de saída usam upload TUS em blocos de 6 MB e o hostname direto do Storage para evitar manter vídeos inteiros na memória e tolerar interrupções transitórias.

O manifesto HLS é arquivado, mas o player usa renditions MP4 assinadas enquanto não existir um gateway/CDN capaz de assinar também os segmentos referenciados pelas playlists. Publicar diretamente o manifesto de um bucket privado quebraria a reprodução ou exigiria tornar os segmentos públicos.

## Monitoramento

Os eventos são JSON em stdout/stderr (`media_ready` e `media_failed`). O RPC administrativo `get_operation_diagnostics` expõe contagens de fila, leases vencidos e falhas para a central de operações. Configure o runtime para reiniciar o container, coletar esses logs e alertar quando houver trabalhos parados ou falhas repetidas.
