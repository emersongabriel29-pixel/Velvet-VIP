# Observability and recovery runbook

## Security signals
Monitor authentication failures, payment integrity mismatches, webhook signature/replay failures, privileged admin actions, storage denials and unusual rate-limit activity. Do not log bearer tokens, cookies, credentials, full payment payloads or unnecessary personal data.

## Alerts
Critical: payment-credit integrity failure, unauthorized privileged action, secret exposure, destructive database/storage incident.
Warning: repeated rate limiting, webhook validation failures, abnormal authentication failures.
Alerts must carry a correlation/fingerprint and sanitized metadata.

## Recovery
Production must use provider-managed database backups/PITR where available. Before launch and after material schema changes, perform a restore drill into an isolated environment and record the result in recovery_verifications. A backup is not considered verified until restoration has been tested.

## Operations
Keep production secrets outside the repository. Rotate exposed credentials immediately. Restrict service-role credentials to server/Edge Function environments. Document incident start/end, affected components, containment, recovery and follow-up without storing sensitive payloads in logs.
