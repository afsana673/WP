module.exports = { name:'promote', group:true, admin:true, description:'Promote a group participant', usage:'!promote @user or reply',
 async run(ctx) {
   const ci=ctx.raw.message?.extendedTextMessage?.contextInfo||{};
   const id=ci.mentionedJid?.[0] || ctx.quoted?.participant;
   if(!id) return ctx.reply('Mention/reply to a member.');
   await ctx.sock().groupParticipantsUpdate(ctx.chat,[id],'promote');
   return ctx.reply('✅ Member promoted.');
 }
};
