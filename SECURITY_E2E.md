# Security E2E validation

This suite validates that the hardening layers remain connected across account restrictions, private media, API abuse protection, admin authorization, payment integrity and observability.

These repository tests are security contract tests. They do **not** replace a real staging penetration test, Supabase RLS integration tests with multiple authenticated users, payment-provider sandbox tests, or a database restore drill.

## Production gate
Before production, validate in an isolated staging environment:
1. two-user RLS isolation and creator/admin privilege boundaries;
2. blocked/restricted user attempts for publish, message, live and purchase;
3. private media access and expired signed URLs;
4. webhook replay, duplicate and concurrent payment delivery;
5. payment amount/currency tampering;
6. admin privilege escalation attempts;
7. rate-limit behavior under concurrent requests;
8. backup restoration and recovery verification.
