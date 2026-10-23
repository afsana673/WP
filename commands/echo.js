module.exports = { name: 'echo', aliases:['say'], description: 'Repeat a text message', usage: '!echo Hello!',
  async run(ctx,args) { return ctx.reply(args.join(' ') || 'Use: !echo <text>'); }
};
