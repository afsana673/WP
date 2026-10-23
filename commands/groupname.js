module.exports = { name:'groupname', aliases:['setgroupname'], group:true, admin:true, description:'Change WhatsApp group subject', usage:'!groupname New group name',
  async run(ctx,args) {
    const title=args.join(' ').trim();
    if (!title || title.length>100) return ctx.reply('Use: !groupname <up to 100 characters>');
    await ctx.sock().groupUpdateSubject(ctx.chat,title);
    return ctx.reply(`✅ Group renamed: ${title}`);
  }
};
