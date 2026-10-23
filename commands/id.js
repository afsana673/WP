module.exports = { name: 'id', aliases:['uid','tid'], description: 'Show WhatsApp chat and sender IDs',
  async run(ctx) { return ctx.reply(`🆔 Chat: ${ctx.chat}\n👤 Sender: ${ctx.sender}\n${ctx.senderAlt ? `Alternate ID: ${ctx.senderAlt}\n` : ''}🔒 Owner command access: ${ctx.isOwner ? 'yes' : 'no'}`); }
};
