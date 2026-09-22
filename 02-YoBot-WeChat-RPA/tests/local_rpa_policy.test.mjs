import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { startLocalRpaPolicy } from '../standalone/app/recovery-local-rpa.js';

test('local RPA authenticates callers, keeps one lease owner, and matches original parser', async () => {
  const local = await startLocalRpaPolicy();
  const body = {machine_code:'1234-5678-ABCD-EF01', runtime_id:randomUUID()};
  const send = (payload=body, headers={}, route='/v1/rpa/auth/verify') => fetch(local.apiBase+route, {
    method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${local.token}`, ...headers},
    body:JSON.stringify(payload),
  });
  try {
    assert.equal((await send(body, {Authorization:'Bearer wrong'})).status, 401);
    assert.equal((await send(body, {Origin:'https://untrusted.invalid'})).status, 401);
    assert.equal((await send({...body, machine_code:'invalid'})).status, 400);
    const response = await send(); assert.equal(response.status, 200);
    const first = await response.json();
    const contract = spawnSync('/usr/bin/python3', ['tests/check_local_rpa_contract.py'], {
      input:JSON.stringify(first), encoding:'utf8', cwd:new URL('..', import.meta.url),
    });
    assert.equal(contract.status, 0, contract.stderr || contract.stdout);
    const renewed = await (await send()).json();
    assert.equal(renewed.data.runtime_lease.lease_id, first.data.runtime_lease.lease_id);
    assert.equal((await send({...body, runtime_id:randomUUID()})).status, 409);
    assert.equal((await send({runtime_id:body.runtime_id, lease_id:randomUUID()}, {}, '/v1/rpa/runtime/release')).status, 409);
    assert.equal((await send({runtime_id:body.runtime_id, lease_id:first.data.runtime_lease.lease_id}, {}, '/v1/rpa/runtime/release')).status, 200);
    assert.equal(local.stats().hasRuntimeOwner, false);
    assert.equal((await send({...body, runtime_id:randomUUID()})).status, 200);
    assert.equal((await send({}, {}, '/unrecognized')).status, 404);
  } finally { await local.close(); }
});
