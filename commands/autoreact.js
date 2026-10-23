module.exports = { name:'autoreact', group:true, admin:true, description:'Toggle reactions to select positive messages', usage:'!autoreact on | off',
  async run(ctx,args) {
    if (!['on','off'].includes(args[0])) return ctx.reply(`Auto reaction: ${ctx.store.group(ctx.chat).autoreact ? 'ON' : 'OFF'}\nUse: ${ctx.prefix}autoreact on/off`);
    await ctx.store.setFlag(ctx.chat,'autoreact',args[0]==='on');
    return ctx.reply(`✅ Auto reaction ${args[0].toUpperCase()}.`);
  }
};
