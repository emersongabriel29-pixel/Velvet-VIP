# Launch gate — Velvet VIP

Production launch is a human-approved gate. CI success alone never enables real users or real money.

## Required evidence
- Real isolated staging passed the scenarios in `SECURITY_E2E.md`.
- Database/storage backup restored successfully and recorded.
- MFA, email recovery, WAF/rate limiting and external alerting verified.
- Age/identity verification provider connected and tested.
- Payment provider sandbox: approval, rejection, duplicate/concurrent webhook, refund and chargeback tested.
- Media processing/moderation pipeline operational; unreviewed/quarantined media is not published.
- Live/streaming provider tested when live is enabled.
- Legal/LGPD/content-policy review completed for the launch jurisdiction.
- Named operational owners exist for moderation, financial disputes, support and incidents.
- Penetration/security review completed after final infrastructure configuration.

## Go/no-go rule
Any missing required evidence is **NO-GO**. Record date, environment, commit SHA and evidence links. Do not put credentials, identity documents, payment payloads or personal data in the record.

## Rollback
Before launch, document the previous deploy SHA, database rollback/migration strategy, feature switches for payments/uploads/lives, incident contacts and the condition that triggers rollback.
