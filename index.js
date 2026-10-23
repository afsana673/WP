'use strict';
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const {Store} = require('./lib/store');
const {Engine} = require('./lib/engine');
const {WhatsAppClient} = require('./lib/client');

const hash = text => crypto.createHash('sha256').update(text).digest();
function authorized(request, password) {
  const received = request.headers.authorization || '';
  const expected = 'Basic '+Buffer.from('admin:'+password).toString('base64');
  return crypto.timingSafeEqual(hash(received), hash(expected));
}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
}
function qrPage(bot) {
  const valid = bot.qrImage && Date.now() - bot.qrAt < 65000 && bot.status === 'qr_ready';
  const state = escapeHTML(bot.status);
  const qr = valid ? `<img alt="Scan with WhatsApp Business linked devices" src="${bot.qrImage}" width="300" height="300">` : '<p>QR is not ready or has expired. This page refreshes automatically.</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="12"><title>HR HABIB — WhatsApp QR</title><style>body{font-family:system-ui,sans-serif;background:#0b141a;color:white;text-align:center;margin:0;padding:26px}main{max-width:480px;margin:auto;padding:20px;background:#1f2c34;border-radius:16px}img{max-width:100%;height:auto;background:white;padding:12px;border-radius:12px}p{color:#b6c9cf;line-height:1.5}</style></head><body><main><h2>🍘 HR HABIB Bot</h2><p>Connection: ${state}</p>${bot.connected ? '<h3>✅ WhatsApp connected!</h3>':qr}<p>On your WhatsApp Business phone: ⋮ → Linked devices → Link a device → Scan this QR displayed on another screen.</p><p>Refreshes every 12 seconds. Do not share this page or login password.</p></main></body></html>`;
}
async function main() {
  const qrPassword = process.env.QR_PASSWORD || '';
  if (qrPassword.length < 12) throw Error('QR_PASSWORD must contain at least 12 characters. Set it privately in Render Environment.');
  const dataDir = path.resolve(process.env.DATA_DIR || './data');
  const store = new Store(dataDir, process.env.PREFIX || '!');
  await store.load();
  let client;
  const engine = new Engine({store,send:(...args)=>client.send(...args),socketProvider:()=>client.sock});
  client = new WhatsAppClient({dataDir,engine});
  const server=http.createServer((req,res)=>{
    const pathname=(req.url || '').split('?')[0];
    res.setHeader('cache-control','no-store');
    res.setHeader('x-content-type-options','nosniff');
    if (pathname==='/health' || pathname==='/') {
      res.writeHead(200,{'content-type':'application/json; charset=utf-8'});
      return res.end(JSON.stringify({name:'HR HABIB WhatsApp Bot',connection:client.status,connected:client.connected,commands:engine.commands.size,loginUrl:'/qr'}));
    }
    if (pathname==='/qr') {
      if (!authorized(req,qrPassword)) {
        res.writeHead(401, {'www-authenticate':'Basic realm="HR HABIB WhatsApp login"','content-type':'text/plain'});
        return res.end('Login required: username admin, password QR_PASSWORD from Render Environment.');
      }
      res.setHeader('content-security-policy',"default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
      res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
      return res.end(qrPage(client));
    }
    res.writeHead(404);res.end('Not found');
  });
  server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log(`🍘 HR HABIB HTTP server started. Commands: ${engine.commands.size}; open /qr with QR_PASSWORD.`));
  await client.start();
  let closing=false;
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{
    if (closing) return;
    closing=true;
    client.stop().finally(()=>server.close(()=>process.exit(0)));
  });
}
if (require.main===module) main().catch(e=>{console.error('Startup failure:',e.message);process.exitCode=1;});
module.exports={authorized,escapeHTML,qrPage,main};
