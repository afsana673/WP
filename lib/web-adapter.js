'use strict';

// Keep the existing 21 WhatsApp-native commands working with whatsapp-web.js.
// No Baileys dependency is imported or used here.
class WebAdapter {
  constructor(client, engine, MessageMedia) {
    this.client = client;
    this.engine = engine;
    this.MessageMedia = MessageMedia;
    this.messages = new Map();
  }

  remember(msg) {
    const id = msg?.id?.id;
    const chat = msg?.fromMe ? msg?.to : msg?.from;
    if (!id || !chat) return;
    this.messages.set(`${chat}:${id}`, msg);
    if (this.messages.size > 2000) this.messages.delete(this.messages.keys().next().value);
  }

  async getMessage(chat, id) {
    if (!id) return null;
    const cached = this.messages.get(`${chat}:${id}`);
    if (cached) return cached;
    return null;
  }

  async handleMessage(msg) {
    if (!msg || msg.isStatus || msg.from === 'status@broadcast') return;
    const chat = msg.fromMe ? msg.to : msg.from;
    if (!chat || chat.endsWith('@newsletter')) return;
    this.remember(msg);
    const contextInfo = {};
    if (Array.isArray(msg.mentionedIds)) contextInfo.mentionedJid = msg.mentionedIds.map(id => typeof id === 'string' ? id : id?._serialized).filter(Boolean);
    if (msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage();
        if (quoted) {
          this.remember(quoted);
          contextInfo.stanzaId = quoted.id?.id || '';
          contextInfo.participant = quoted.author || quoted.from || '';
          contextInfo.quotedMessage = { conversation: quoted.body || '' };
        }
      } catch (e) { console.warn('Quoted message unavailable:', e.message); }
    }
    const sender = msg.author || (msg.fromMe ? (this.client.info?.wid?._serialized || msg.from) : msg.from);
    const raw = {
      key: {
        remoteJid: chat,
        id: msg.id?.id || '',
        fromMe: Boolean(msg.fromMe),
        participant: sender
      },
      message: { extendedTextMessage: { text: String(msg.body || ''), contextInfo } },
      _wweb: msg
    };
    await this.engine.message(raw);
  }

  async handleGroup(notification, action) {
    const chat = notification?.chatId;
    if (!chat) return;
    const recipients = (notification.recipientIds || []).map(x => typeof x === 'string' ? x : x?._serialized).filter(Boolean);
    await this.engine.groupUpdate({ id:chat, participants:recipients, action });
  }

  async groupMetadata(id) {
    const chat = await this.client.getChatById(id);
    if (!chat?.isGroup) throw new Error('This is not a group');
    return {
      id,
      subject:chat.name || '',
      desc:chat.description || '',
      participants:(chat.participants || []).map(p=>({
        id:p.id?._serialized || String(p.id || ''),
        admin:(p.isAdmin || p.isSuperAdmin) ? 'admin' : null
      }))
    };
  }

  async groupParticipantsUpdate(id, participants, action) {
    const chat = await this.client.getChatById(id);
    if (!chat?.isGroup) throw new Error('Group action requires a group');
    const targets = participants.filter(x=>typeof x==='string' && x.includes('@'));
    if (!targets.length) throw new Error('No valid members selected');
    const fn = { remove:'removeParticipants', promote:'promoteParticipants', demote:'demoteParticipants' }[action];
    if (!fn) throw new Error('Unsupported group action');
    return chat[fn](targets);
  }

  async groupUpdateSubject(id, title) {
    const chat = await this.client.getChatById(id);
    if (!chat?.isGroup) throw new Error('Group action requires a group');
    return chat.setSubject(title);
  }

  async sendMessage(chat, content, opts={}) {
    if (content?.react) {
      const target = await this.getMessage(chat, content.react.key?.id);
      if (!target) throw new Error('Reaction target is not in the current session cache');
      return target.react(content.react.text);
    }
    if (content?.delete) {
      const target = await this.getMessage(chat, content.delete?.id);
      if (!target?.fromMe) throw new Error('Can only unsend this bot\'s messages');
      return target.delete(true);
    }

    const options = {};
    if (opts?.quoted?._wweb?.id?._serialized) {
      options.quotedMessageId = opts.quoted._wweb.id._serialized;
    }
    if (Array.isArray(content?.mentions)) options.mentions = content.mentions;

    let payload;
    if (typeof content === 'string') payload = content;
    else if (content?.image?.url) {
      payload = await this.MessageMedia.fromUrl(content.image.url, { unsafeMime:false });
      options.caption = content.caption || '';
    } else payload = String(content?.text ?? '');

    const sent = await this.client.sendMessage(chat, payload, options);
    this.remember(sent);
    return { key:{ id:sent.id?.id, remoteJid:chat, fromMe:true }, _wweb:sent };
  }
}
module.exports = { WebAdapter };
