import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const gate=fs.readFileSync('LAUNCH_GATE.md','utf8');const checklist=fs.readFileSync('SECURITY_PRODUCTION_CHECKLIST.md','utf8');
test('launch requires staging, restore, external providers and pentest evidence',()=>{for(const x of ['staging','restored','MFA','Age/identity','Payment provider sandbox','Penetration'])assert.match(gate,new RegExp(x,'i'));});
test('missing mandatory evidence is no-go',()=>{assert.match(gate,/missing required evidence is \*\*NO-GO\*\*/);assert.match(checklist,/NO-GO/);});
test('launch record forbids sensitive evidence',()=>{assert.match(gate,/Do not put credentials, identity documents, payment payloads or personal data/);});
