'use strict';
const path = require('node:path');
const { WebAdapter } = require('./web-adapter');

class WhatsAppClient {
  constructor({dataDir, engine}) {
    this.dataDir = dataDir;
    this.engine = engine;
    this.client = null;
    this.sock = null;
    this.status = 'starting';
    this.connected = false;
    this.qrImage = null;
    this.qrAt = 0;
    this.lastError = '';
    this.stopped = false;
    this.retryTimer = null;
    this.attempts = 0;
  }

  async start() {
    if (this.stopped) return;
    if (this.client) return;
    const QRCode = require('qrcode');
    const {Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
    const executablePath = process.env.CHROME_PATH || undefined;
    const client = new Client({
      authStrategy:new LocalAuth({clientId:'hr-habib', dataPath:path.join(this.dataDir, 'wwebjs_auth')}),
      puppeteer:{
        headless:true,
        ...(executablePath ? {executablePath} : {}),
        args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage', '--no-first-run']
      },
      qrMaxRetries:0,
      deviceName:'HR HABIB BOT'
    });
    this.client = client;
    this.sock = new WebAdapter(client, this.engine, MessageMedia);
    this.status = 'initializing';

    client.on('qr', async qr => {
      if (this.client !== client || this.stopped) return;
      try {
        const image = await QRCode.toDataURL(qr, {width:360, margin:2, errorCorrectionLevel:'M'});
        if (this.client !== client || this.stopped) return;
        this.qrImage = image;
        this.qrAt = Date.now();
        this.status = 'qr_ready';
        console.log('🍘 QR code available at the password-protected /qr page. Open it on another screen.');
      } catch (e) {this.lastError = 'Could not generate QR image: ' + e.message; console.error(this.lastError);}
    });
    client.on('authenticated', () => {
      if (this.client !== client) return;
      this.status = 'authenticated';
      this.qrImage = null;
      console.log('✅ WhatsApp Web authenticated. Loading chats...');
    });
    client.on('ready', () => {
      if (this.client !== client) return;
      this.connected = true;
      this.status = 'connected';
      this.qrImage = null;
      this.attempts = 0;
      this.lastError = '';
      console.log('✅ HR HABIB WhatsApp connected (whatsapp-web.js).');
    });
    client.on('auth_failure', error => {
      if (this.client !== client) return;
      this.lastError = 'WhatsApp session authentication failed. Re-link QR may be required.';
      this.status = 'auth_failure';
      console.error('WhatsApp auth failure:', String(error).slice(0,400));
    });
    client.on('disconnected', reason => {
      if (this.client !== client || this.stopped) return;
      this.connected = false;
      this.qrImage = null;
      console.error('WhatsApp disconnected:', reason);
      this.scheduleRestart(client, `Disconnected: ${reason}`);
    });
    client.on('message_create', msg => {
      if (this.client === client && this.connected) {
        this.sock.handleMessage(msg).catch(e=>console.error('Message handler:',e.message));
      }
    });
    client.on('group_join', note => {
      if (this.client===client && this.connected) this.sock.handleGroup(note, 'add').catch(console.error);
    });
    client.on('group_leave', note => {
      if (this.client===client && this.connected) this.sock.handleGroup(note, 'remove').catch(console.error);
    });

    // Avoid unhandled rejections; the HTTP server stays responsive during retries.
    client.initialize().catch(e=>{
      if (this.client!==client || this.stopped) return;
      this.scheduleRestart(client, `Chromium / WhatsApp Web initialization failed: ${e.message}`);
    });
  }

  scheduleRestart(client, reason) {
    if (this.stopped || this.client!==client || this.retryTimer) return;
    this.connected = false;
    this.status = 'reconnecting';
    this.lastError = String(reason).slice(0,240);
    this.qrImage = null;
    const delay = Math.min(60_000, 3_000 * 2 ** Math.min(this.attempts++,4));
    console.error(`${this.lastError}. Reconnecting in ${Math.ceil(delay/1000)}s.`);
    this.retryTimer = setTimeout(async()=>{
      this.retryTimer = null;
      if (this.stopped || this.client !== client) return;
      this.client = null;
      this.sock = null;
      try { await client.destroy(); } catch (e) { console.error('Closing prior browser:',e.message); }
      if (!this.stopped) this.start().catch(e=>console.error('Reconnect failed:',e));
    },delay);
  }

  async send(...args) {
    if (!this.connected || !this.sock) throw Error('WhatsApp is not connected');
    const sent = await this.sock.sendMessage(...args);
    if (sent?.key?.fromMe) this.engine.rememberMessage(args[0], sent);
    return sent;
  }

  async stop() {
    this.stopped = true;
    this.connected = false;
    this.status = 'stopped';
    this.qrImage = null;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    try { await this.client?.destroy(); } catch (e) {console.error('Browser shutdown:', e.message);}
    this.client = null;
  }
}
module.exports = { WhatsAppClient };
