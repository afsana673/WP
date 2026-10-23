'use strict';
const fs = require('node:fs');
const path = require('node:path');

function jidEquals(a, b) {
  if (!a || !b) return false;
  return String(a).split(':')[0].split('@')[0] === String(b).split(':')[0].split('@')[0];
}
function textFromMessage(raw) {
  let m = raw || {};
  for (let i = 0; i < 4; i++) {
    const wrapper = m.ephemeralMessage?.message || m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
    if (!wrapper) break;
    m = wrapper;
  }
  return m.conversation || m.extendedTextMessage?.text ||
    m.imageMessage?.caption || m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title || '';
}
function quotedInfo(raw) {
  const m = raw?.extendedTextMessage || raw?.imageMessage || raw?.videoMessage || {};
  return m.contextInfo?.stanzaId ? {
    id: m.contextInfo.stanzaId,
    participant: m.contextInfo.participant || '',
    text: textFromMessage(m.contextInfo.quotedMessage || {})
  } : null;
}
function loadCommands(dir = path.join(__dirname,'..','commands')) {
  const names = new Map();
  const canonical = new Map();
  for (const filename of fs.readdirSync(dir).filter(f=>f.endsWith('.js')).sort()) {
    const command = require(path.join(dir,filename));
    if (!command.name || typeof command.run !== 'function') throw Error(`Bad command: ${filename}`);
    const name = command.name.toLowerCase();
    if (names.has(name)) throw Error(`Duplicate command: ${name}`);
    canonical.set(name,command);
    for (const alias of [name,...(command.aliases||[])]) {
      if (names.has(alias)) throw Error(`Duplicate alias: ${alias}`);
      names.set(alias,command);
    }
  }
  return { names, canonical };
}
class Engine {
  constructor({ store, send, socketProvider, commands }) {
    this.store = store;
    this.send = send;
    this.socketProvider = socketProvider;
    const collection = commands || loadCommands();
    this.names = collection.names;
    this.commands = collection.canonical;
    this.cooldowns = new Map();
    this.handled = new Map();
    this.ownedMessageKeys = new Map();
  }
  rememberMessage(chat, raw) {
    if (!raw?.key?.id) return;
    this.ownedMessageKeys.set(`${chat}:${raw.key.id}`, raw.key);
    if (this.ownedMessageKeys.size > 1000) this.ownedMessageKeys.delete(this.ownedMessageKeys.keys().next().value);
  }
  findOwnedMessage(chat, id) { return this.ownedMessageKeys.get(`${chat}:${id}`); }
  async message(raw) {
    const key = raw.key || {};
    const chat = key.remoteJid;
    if (!chat || chat === 'status@broadcast' || chat.endsWith('@newsletter')) return;
    if (key.fromMe && this.ownedMessageKeys.has(`${chat}:${key.id}`)) return;
    const dedupID = key.id ? `${chat}:${key.participant || ''}:${key.id}` : '';
    if (dedupID && this.handled.has(dedupID)) return;
    if (dedupID) {
      this.handled.set(dedupID, Date.now());
      if (this.handled.size > 2000) this.handled.delete(this.handled.keys().next().value);
    }
    const body = String(textFromMessage(raw.message || {})).trim();
    if (!body) return;
    const isGroup = chat.endsWith('@g.us');
    const sender = key.participant || key.remoteJid;
    const senderAlt = key.participantAlt || key.remoteJidAlt || '';
    const prefix = this.store.prefix(chat);
    const fromMe = Boolean(key.fromMe);
    const ctx = {
      chat, body, prefix, isGroup, sender, senderAlt, fromMe,
      isOwner: fromMe, key, raw,
      quoted: quotedInfo(raw.message),
      store: this.store,
      engine: this,
      sock: this.socketProvider,
      reply: text => this.send(chat, { text: String(text) }, { quoted: raw }),
      send: content => this.send(chat, content, { quoted: raw })
    };
    const saved = this.store.group(chat);
    if (saved.autoreact && !fromMe && /\b(thanks|thank you|love|congrats)\b/i.test(body)) {
      try { await this.send(chat, { react: { text: '❤️', key } }); } catch (e) { console.error('Auto reaction failed:', e.message); }
    }
    if (!body.startsWith(prefix)) return;
    const tokens = body.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
    const name = (tokens.shift() || '').toLowerCase();
    const command = this.names.get(name);
    if (!command) return;
    if (command.group && !isGroup) return ctx.reply('❌ This command only works inside a group.');
    if (command.owner && !ctx.isOwner) return ctx.reply('⛔ This command is for the linked WhatsApp owner only.');
    if (command.admin && !ctx.isOwner) {
      try {
        const metadata = await this.socketProvider().groupMetadata(chat);
        const match = (metadata.participants || []).find(p => jidEquals(p.id,sender)||jidEquals(p.id,senderAlt)||jidEquals(p.phoneNumber,senderAlt));
        if (!match?.admin) return ctx.reply('⛔ Only group admins can use this command.');
      } catch (e) { return ctx.reply('Could not verify group admin permissions.'); }
    }
    const token = `${chat}:${sender}:${name}`;
    if (!fromMe && command.cooldown) {
      const previous = this.cooldowns.get(token) || 0;
      if (Date.now() - previous < command.cooldown * 1000) return;
      this.cooldowns.set(token, Date.now());
    }
    try { await command.run(ctx, tokens); }
    catch (e) {
      console.error(`Command ${name} failed:`, e);
      await ctx.reply(`❌ ${name} failed: ${e.message || 'Unknown error'}`).catch(console.error);
    }
  }
  async groupUpdate(update) {
    try {
      await require('../events/group-members')({ send:this.send, store:this.store, update });
    } catch (e) { console.error('Group event failed:',e); }
  }
}
module.exports = { Engine, loadCommands, textFromMessage, quotedInfo, jidEquals };
