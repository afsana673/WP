module.exports = { name:'welcome', group:true, admin:true, description:'Toggle group welcome and goodbye events', usage:'!welcome on | off',
  async run(ctx,args) {
    if (!['on','off'].includes(args[0])) return ctx.reply(`Welcome messages: ${ctx.store.group(ctx.chat).welcome ? 'ON' : 'OFF'}\nUse: ${ctx.prefix}welcome on/off`);
    await ctx.store.setFlag(ctx.chat,'welcome',args[0]==='on');
    return ctx.reply(`✅ Group welcome/leave events ${args[0].toUpperCase()}.`);
  }
};
