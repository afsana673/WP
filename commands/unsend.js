module.exports = { name:'unsend', aliases:['delete'], owner:true, description:'Delete bot message from current session', usage:'Reply to a message sent by this bot using !unsend',
  async run(ctx) {
    if (!ctx.quoted?.id) return ctx.reply('Reply to a bot message with !unsend.');
    const key=ctx.engine.findOwnedMessage(ctx.chat,ctx.quoted.id);
    if(!key || !key.fromMe) return ctx.reply('⚠️ Only messages sent by this bot during the current session can be deleted.');
    await ctx.sock().sendMessage(ctx.chat,{delete:key});
  }
};
