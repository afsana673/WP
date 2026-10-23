module.exports = { name:'react', aliases:['reaction'], description:'React to replied-to message with emoji', usage:'!react ❤️ (reply to a message)',
  async run(ctx,args) {
    if (!ctx.quoted?.id) return ctx.reply('Reply to a message with !react ❤️');
    const emoji=args[0];
    if(!emoji || emoji.length>16) return ctx.reply('Provide one emoji: !react ❤️');
    const known=ctx.engine.findOwnedMessage(ctx.chat,ctx.quoted.id);
    const target=known || { remoteJid:ctx.chat, id:ctx.quoted.id, participant:ctx.quoted.participant, fromMe:false };
    await ctx.send({ react: { text:emoji, key:target } });
  }
};
