import test from 'node:test';
import assert from 'node:assert/strict';
import { MacOSPluginService } from '../standalone/app/dist/electron/electron/macos_plugin_service.js';

test('first launch uses signed activation and health gate before reporting active', async () => {
  const previous = process.env.YOBOT_RECOVERED;
  process.env.YOBOT_RECOVERED = '1';
  try {
    const calls = [];
    const installed = {version:'2.0.0'};
    const verified = {payload:{version:'2.0.0'}};
    const service = {
      withOperation: fn => fn(), assertAllowed:() => {}, readState:async () => null,
      store:{readInstalledVersion:async version => {assert.equal(version,'2.0.0'); return installed;}},
      lifecycle:{
        resolveVerifiedManifest:async candidate => {assert.equal(candidate,installed); calls.push('verify'); return verified;},
        activateInstalledVersion:async (manifest,generation,secrets,signal) => {
          assert.equal(manifest,verified); assert.equal(generation,0); assert.equal(secrets.rpaToken,'test');
          assert.ok(signal instanceof AbortSignal); calls.push('activate-and-health');
          return {mode:'activated', state:{active:{version:'2.0.0'},last_failure_code:null}};
        },
        recoverAtStartup:async () => {throw new Error('must not interpret pending activation as interrupted');},
      },
    };
    assert.deepEqual(await MacOSPluginService.prototype.recoverAtStartup.call(service,{rpaToken:'test'}),
      {mode:'active', activeVersion:'2.0.0',failureCode:null});
    assert.deepEqual(calls,['verify','activate-and-health']);
  } finally {
    if (previous === undefined) delete process.env.YOBOT_RECOVERED;
    else process.env.YOBOT_RECOVERED = previous;
  }
});
