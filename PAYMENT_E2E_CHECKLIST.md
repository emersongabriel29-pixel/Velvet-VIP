# Payment end-to-end gate

A successful build is not evidence that money flow works. Before public launch, run this checklist in an isolated Mercado Pago sandbox environment and attach evidence to the launch record.

## Automated negative-path staging checks
When the `STAGING_*` GitHub secrets exist, `tests/staging.integration.mjs` verifies:
- two independent authenticated accounts;
- RLS isolation of private notifications;
- admin RPC denied to a normal user;
- server-only identity RPC denied to browser users;
- invalid checkout payload is rejected before provider side effects;
- expired/invalid payment webhook signature is rejected.

## Required real sandbox financial cycle
The following still requires actual Mercado Pago sandbox credentials and test buyer/seller accounts:
1. Create a platform-plan checkout and approve it.
2. Confirm Mercado Pago webhook receipt, `checkout_sessions=paid`, entitlement activation and one idempotent ledger entry.
3. Replay the exact webhook and confirm no duplicate credit.
4. Run rejected/cancelled payment and confirm no access.
5. Buy a PPV item, confirm access, then refund it and confirm access is revoked.
6. Run chargeback simulation where supported and confirm financial transaction state and creator balance reversal.
7. Buy an already-owned PPV and confirm checkout is rejected.
8. Attempt amount/currency tampering and confirm webhook rejects the event.
9. Test creator plan subscription and creator/platform split.
10. Confirm no Mercado Pago access token, webhook secret or service-role key is present in browser bundles/logs.

## Evidence record
Record only: date, staging project, commit SHA, scenario result, provider transaction/test ID and links to redacted logs. Never store card data, bearer tokens, webhook secrets, identity documents or full provider payloads in Git/GitHub artifacts.

Public launch remains NO-GO until the real sandbox cycle has passed.
