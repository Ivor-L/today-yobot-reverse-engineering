/** Local operation policy for the company's recovered RPA.
 * No subscription, activation code, cloud request, or commercial entitlement.
 * The signed Control still authenticates to this process and holds a finite
 * single-owner runtime lease. Never expose this server beyond loopback.
 */
import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

let context;
export function getLocalRpaContext() { return context; }

export async function startLocalRpaPolicy() {
  if (context) return context;
  const token = randomBytes(32).toString('base64url');
  const seatId = randomUUID(); // compatibility field, not a purchased seat
  let owner = null;
  const counters = { verified: 0, renewed: 0, released: 0, rejected: 0 };
  const server = http.createServer(async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
      res.end(JSON.stringify(body));
    };
    const supplied = Buffer.from(req.headers.authorization || '');
    const expected = Buffer.from(`Bearer ${token}`);
    if (req.headers.origin || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      counters.rejected++;
      return reply(401, {success:false, error_code:'LOCAL_SESSION_REQUIRED'});
    }
    if (req.method !== 'POST' || !['/v1/rpa/auth/verify','/v1/rpa/runtime/release'].includes(req.url)) {
      return reply(404, {success:false, error_code:'LOCAL_ROUTE_NOT_FOUND'});
    }
    let body;
    try {
      const chunks = []; let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 4096) { reply(413, {success:false}); return; }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch { return reply(400, {success:false, error_code:'INVALID_REQUEST'}); }
    if (req.url === '/v1/rpa/runtime/release') {
      if (!owner || body.runtime_id !== owner.runtimeId || body.lease_id !== owner.leaseId) {
        return reply(409, {success:false, error_code:'LOCAL_OWNER_MISMATCH'});
      }
      owner = null; counters.released++;
      return reply(200, {success:true, released:true});
    }
    if (!/^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$/.test(body.machine_code || '')) {
      return reply(400, {success:false, error_code:'INVALID_MACHINE_CODE'});
    }
    const now = Date.now();
    const data = {mode:'local', seat_id:seatId, expires_at:new Date(now + 86400000).toISOString()};
    if (body.runtime_id !== undefined) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(body.runtime_id)) {
        return reply(400, {success:false, error_code:'INVALID_RUNTIME_ID'});
      }
      if (owner && owner.expires > now && (owner.runtimeId !== body.runtime_id || owner.machine !== body.machine_code)) {
        return reply(409, {success:false, error_code:'LOCAL_RUNTIME_BUSY'});
      }
      if (!owner || owner.expires <= now) {
        owner = {runtimeId:body.runtime_id, machine:body.machine_code, leaseId:randomUUID()};
      } else { counters.renewed++; }
      owner.expires = now + 120000;
      data.runtime_lease = {lease_id:owner.leaseId, runtime_id:owner.runtimeId,
        expires_at:new Date(owner.expires).toISOString(), heartbeat_interval_seconds:30, replaced_previous:false};
    }
    counters.verified++;
    if (counters.verified === 1) console.log('[Recovery] Signed RPA accepted local runtime policy');
    reply(200, {success:true, data});
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  server.unref();
  context = {apiBase:`http://127.0.0.1:${server.address().port}`, token,
    stats:() => ({mode:'local', ...counters, hasRuntimeOwner:!!owner}),
    close:() => new Promise(resolve => server.close(() => {context = undefined; resolve();}))};
  return context;
}
