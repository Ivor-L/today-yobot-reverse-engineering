import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../standalone/app/recovery-rpa-errors.js',import.meta.url),'utf8');
function setup(response) {
  const context={window:{fetch:async()=>response},location:{origin:'http://127.0.0.1:9922',href:'http://127.0.0.1:9922/customer-management'},URL,Response,Headers};
  vm.runInNewContext(source,context);return context;
}
test('structured native error stays a failure and becomes readable without losing diagnostics',async()=>{
 const detail={code:'MACOS_MVP_CONTACT_SYNC_FAILED_ELEMENT_NOT_FOUND',message:'the macOS directory could not be synchronized safely'};
 const original=new Response(JSON.stringify({detail}),{status:409});
 const ctx=setup(original); const patched=ctx.window.fetch;
 vm.runInNewContext(source,ctx);assert.equal(ctx.window.fetch,patched);
 const response=await ctx.window.fetch('/api/contact/sync');
 assert.equal(response.status,409);assert.equal(response.ok,false);
 const body=await response.json();assert.match(body.detail,/未找到微信通讯录所需控件/);assert.deepEqual(body.diagnostic,detail);
 assert.deepEqual(await original.json(),{detail});
});
test('successes, other endpoints and other origins pass through unchanged',async()=>{
 for(const [url,status] of [['/api/contact/sync',200],['/api/contact/list',409],['http://example.invalid/api/contact/sync',409]]) {
  const original=new Response('{}',{status});const ctx=setup(original);assert.equal(await ctx.window.fetch(url),original);
 }
});
test('plain and malformed errors pass through unchanged',async()=>{
 for(const body of ['{"detail":"plain error"}','not json']) {
  const original=new Response(body,{status:500});const ctx=setup(original);assert.equal(await ctx.window.fetch('/api/contact/sync'),original);
 }
});
