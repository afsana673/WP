module.exports = { name:'demote', group:true, admin:true, description:'Demote a group participant', usage:'!demote @user or reply',
 async run(ctx) {
   const ci=ctx.raw.message?.extendedTextMessage?.contextInfo||{};
   const id=ci.mentionedJid?.[0] || ctx.quoted?.participant;
   if(!id) return ctx.reply('Mention/reply to a member.');
   await ctx.sock().groupParticipantsUpdate(ctx.chat,[id],'demote');
   return ctx.reply('✅ Member demoted.');
 }
};
