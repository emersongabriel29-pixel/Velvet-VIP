import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const e2e=fs.readFileSync('SECURITY_E2E.md','utf8');
const status=fs.readFileSync('PRODUCTION_STATUS.md','utf8');
test('staging gate documents real security scenarios',()=>{for(const x of ['two-user RLS','expired signed URLs','concurrent payment','backup restoration']) assert.match(e2e,new RegExp(x,'i'));});
test('production status does not equate repository checks with launch readiness',()=>{assert.match(status,/staging/i);assert.match(status,/Só então habilitar produção/i);});
