import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
const stringField = maxLength => ({type:'string',minLength:1,maxLength});
const account = stringField(128);
const tools = [
  {name:'wechat_list_history_sessions',description:'列出本机已采集聊天记录的会话索引；不是完整微信历史。返回的账号和 session_id 用于读取消息。',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'wechat_get_history_messages',description:'读取指定账号与会话的已保存聊天记录，不保证完整历史。session_id 必须来自会话索引。',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{account_id:account,session_id:stringField(512)},required:['account_id','session_id'],additionalProperties:false}},
  {name:'wechat_send_message',description:'向指定好友或群发送文字。仅在用户明确要求发送时调用，明确发送账号、准确收件人名称和正文。超时后不要自动重发，先核实是否送达。',annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:false},inputSchema:{type:'object',properties:{account_id:account,user:stringField(256),message:stringField(10000)},required:['account_id','user','message'],additionalProperties:false}},
  {name:'wechat_status',description:'读取本机微信账号与 RPA 状态。',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  ...[['wechat_list_contacts','读取已经同步到本机的好友列表。'],['wechat_list_groups','读取已经同步到本机的群聊列表。'],['wechat_sync_contacts','通过桌面微信同步通讯录，会操作微信界面；失败时返回真实错误，勿与其他桌面操作同时运行。']].map(([name,description])=>({name,description,inputSchema:{type:'object',properties:{account_id:{type:'string',minLength:1,maxLength:128},...(name==='wechat_sync_contacts'?{type:{type:'string',enum:['friend','group']}}:{})},required:name==='wechat_sync_contacts'?['account_id','type']:['account_id'],additionalProperties:false}}))
];
export class RecoveryMcp {
  constructor(execute) { this.execute=execute; this.token=''; this.server=null; this.starting=null; this.lastTool=null; this.lastCalledAt=null; }
  async configure({enabled,regenerate_token=false}) {
    if (!enabled) { await this.close();return {success:true,mounted:false}; }
    if (!this.server) {
      if (!this.starting) this.starting=this.start().finally(()=>{this.starting=null;});
      await this.starting;
    }
    if(regenerate_token) this.token=randomBytes(32).toString('hex');
    return {success:true,mounted:true,endpoint:`http://127.0.0.1:${this.server.address().port}/mcp`,token:this.token,profile:'local-compat',toolset_version:'2',tool_count:tools.length,capabilities:tools.map(t=>t.name),last_called_at:this.lastCalledAt,last_tool:this.lastTool};
  }
  async start() {
    this.token=randomBytes(32).toString('hex');
    const server=http.createServer((req,res)=>this.handle(req,res).catch(()=>{if(!res.headersSent)this.reply(res,500,{error:'Internal error'});else res.end();}));
    server.requestTimeout=400000;server.headersTimeout=10000;
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    this.server=server;
  }
  async close(){ if(this.starting)await this.starting; const s=this.server;this.server=null;this.token='';if(s)await new Promise(resolve=>{s.close(resolve);s.closeAllConnections();}); }
  reply(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(body===undefined?'':JSON.stringify(body));}
  async handle(req,res) {
    if(req.url!=='/mcp')return this.reply(res,404,{error:'Not found'});
    const host=req.headers.host; if(host!==`127.0.0.1:${this.server?.address().port}`||req.headers.origin)return this.reply(res,403,{error:'Origin not allowed'});
    const supplied=Buffer.from(req.headers.authorization||'');const expected=Buffer.from(`Bearer ${this.token}`);
    if(!this.token||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return this.reply(res,401,{error:'Unauthorized'});
    if(req.method!=='POST'){res.setHeader('Allow','POST');return this.reply(res,405,{error:'Method not allowed'});}
    if(!String(req.headers['content-type']).startsWith('application/json'))return this.reply(res,415,{error:'Expected application/json'});
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return this.reply(res,413,{error:'Request too large'});chunks.push(chunk);}
    let rpc;try{rpc=JSON.parse(Buffer.concat(chunks));}catch{return this.reply(res,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
    if(!rpc||Array.isArray(rpc)||rpc.jsonrpc!=='2.0'||typeof rpc.method!=='string')return this.reply(res,400,{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}});
    if(rpc.id===undefined){return this.reply(res,202);}
    const finish=result=>this.reply(res,200,{jsonrpc:'2.0',id:rpc.id,result});
    const fail=(code,message)=>this.reply(res,200,{jsonrpc:'2.0',id:rpc.id,error:{code,message}});
    if(rpc.method==='initialize')return finish({protocolVersion:['2025-03-26','2025-06-18'].includes(rpc.params?.protocolVersion)?rpc.params.protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'yobot-local-compat',version:'1.1.0'},instructions:'本机兼容接口。列表来自本地缓存；同步会操作桌面微信，并可能返回当前原生模块的兼容错误。'});
    if(rpc.method==='ping')return finish({});
    if(rpc.method==='tools/list')return finish({tools});
    if(rpc.method!=='tools/call')return fail(-32601,'Method not found');
    const name=rpc.params?.name;const def=tools.find(t=>t.name===name);const args=rpc.params?.arguments??{};
    if(!def)return fail(-32602,'Unknown tool');
    if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(def.inputSchema.properties,k)))return fail(-32602,'Invalid arguments');
    for(const key of def.inputSchema.required || []) {
      if(!Object.hasOwn(args,key))return fail(-32602,`${key} required`);
    }
    for(const [key,value] of Object.entries(args)) {
      const spec=def.inputSchema.properties[key];
      if(typeof value!=='string'||!value.trim()||(spec.maxLength && value.length>spec.maxLength)||(spec.enum&&!spec.enum.includes(value)))return fail(-32602,`Invalid ${key}`);
    }
    if(args.session_id && (['.','..'].includes(args.session_id)||/[\/\\\x00-\x1f]/.test(args.session_id)))return fail(-32602,'Invalid session_id');
    let request;
    if(name==='wechat_status')request={path:'/api/agent/instances_status',method:'GET'};
    else if(name==='wechat_list_history_sessions')request={path:'/api/chat/history_sessions',method:'GET'};
    else if(name==='wechat_get_history_messages')request={path:`/api/chat/history_messages/${encodeURIComponent(args.session_id)}?${new URLSearchParams({account_id:args.account_id})}`,method:'GET'};
    else if(name==='wechat_send_message')request={path:'/api/chat/send_message',method:'POST',body:{accountId:args.account_id,user:args.user,message:args.message}};
    else if(name==='wechat_sync_contacts')request={path:'/api/contact/sync',method:'POST',body:args};
    else request={path:`${name==='wechat_list_contacts'?'/api/contacts':'/api/contacts/groups'}?${new URLSearchParams({account_id:args.account_id})}`,method:'GET'};
    this.lastCalledAt=Date.now();this.lastTool=name;
    try{
      const result=await this.execute(request);
      let payload;try{payload=JSON.parse(result.bodyText);}catch{}
      const isError=result.success!==true||result.status<200||result.status>=300||payload?.success===false||Boolean(payload?.error);
      return finish({isError,content:[{type:'text',text:result.bodyText||JSON.stringify({status:result.status})}]});
    }catch{return finish({isError:true,content:[{type:'text',text:'本机 RPA 请求失败，未确认操作成功。'}]});}
  }
}
