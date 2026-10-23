const { jidEquals } = require('../lib/engine');
module.exports = { name:'kick', group:true, admin:true, description:'Remove a mentioned or replied-to group member', usage:'!kick @user or reply with !kick',
  async run(ctx) {
    const ci=ctx.raw.message?.extendedTextMessage?.contextInfo || {};
    const target=ci.mentionedJid?.[0] || ctx.quoted?.participant;
    if(!target || !target.includes('@')) return ctx.reply('Mention someone or reply to their message with !kick.');
    const meta=await ctx.sock().groupMetadata(ctx.chat);
    if (meta.participants.some(p=>jidEquals(p.id,target) && p.admin)) return ctx.reply('⚠️ Cannot kick a group admin.');
    await ctx.sock().groupParticipantsUpdate(ctx.chat,[target],'remove');
    return ctx.reply('✅ Member removed.');
  }
};
