# External provider adapters

Velvet VIP keeps provider-specific credentials and SDK calls outside the browser. The application domain remains provider-neutral.

Required production capabilities:
- **Age/identity verification:** provider webhook -> server validation -> `record_age_verification(user, provider, reference)`. Self-declared DOB is never verification.
- **Payments:** provider adapter -> normalized payment event -> atomic settlement. Mercado Pago code currently remains an adapter, not a product-level dependency.
- **Streaming/live:** provider creates a room/stream server-side; `attach_streaming_room` stores only provider references. No streaming secret is exposed to Vite.
- **Moderation:** asynchronous provider/human review should write normalized decisions/events; uploads may use `quarantined` media state.
- **Observability:** production alerts must be forwarded to an external incident/monitoring channel.

Do not mark any capability as operational until credentials, webhook validation, sandbox/staging tests and incident ownership are configured.


## Media processing contract
Long-form uploads are queued through `enqueue_media_processing`. A server-side transcoder should claim queued jobs, produce HLS plus optional MP4 renditions, and update `media_processing_jobs` to `ready`.

Each rendition in `media_processing_jobs.renditions` should use server-controlled metadata such as:
```json
{"label":"720p","height":720,"storage_path":"<creator>/renditions/<video>/720.mp4","type":"video/mp4"}
```
The playback Edge Function signs only managed storage references or HTTPS hosts listed in `STREAMING_ALLOWED_HOSTS`.

## Live playback contract
Provider room IDs and playback references are stored in the private schema. The public live row exposes only non-secret status/provider metadata and quality labels. A server adapter calls `attach_streaming_room` and `set_live_playback_sources`; viewers obtain authorized sources through `get-live-playback` after 18+ and plan checks.
