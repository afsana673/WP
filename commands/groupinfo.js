module.exports = { name:'groupinfo', aliases:['boxinfo','group'], group:true, description:'Show group name, description, members',
  async run(ctx) {
    const m=await ctx.sock().groupMetadata(ctx.chat);
    return ctx.reply(`👥 ${m.subject || 'Group'}\nMembers: ${m.participants?.length || 0}\nAdmins: ${m.participants?.filter(x=>x.admin).length || 0}\nDescription: ${(m.desc||'None').slice(0,600)}`);
  }
};
