module.exports = { name:'tagall', aliases:['everyone'], group:true, admin:true, cooldown:300, description:'Mention group participants once',
  async run(ctx,args) {
    const members=(await ctx.sock().groupMetadata(ctx.chat)).participants.map(p=>p.id);
    if(members.length>250) return ctx.reply('This group is too large for a tag-all command.');
    return ctx.send({text:(args.join(' ') || '📢 Attention group members')+'\n'+members.map(x=>'@'+x.split('@')[0]).join(' '),mentions:members});
  }
};
