# External provider adapters

Velvet VIP keeps provider-specific credentials and SDK calls outside the browser. The application domain remains provider-neutral.

Required production capabilities:
- **Age/identity verification:** provider webhook -> server validation -> `record_age_verification(user, provider, reference)`. Self-declared DOB is never verification.
- **Payments:** provider adapter -> normalized payment event -> atomic settlement. Mercado Pago code currently remains an adapter, not a product-level dependency.
- **Streaming/live:** provider creates a room/stream server-side; `attach_streaming_room` stores only provider references. No streaming secret is exposed to Vite.
- **Moderation:** asynchronous provider/human review should write normalized decisions/events; uploads may use `quarantined` media state.
- **Observability:** production alerts must be forwarded to an external incident/monitoring channel.

Do not mark any capability as operational until credentials, webhook validation, sandbox/staging tests and incident ownership are configured.
