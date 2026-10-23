module.exports = { name:'uptime', aliases:['status'], description:'Show uptime and command count',
  async run(ctx) { const s=Math.floor(process.uptime()); return ctx.reply(`🍘 HR HABIB — Online\nUptime: ${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s\nCommands: ${ctx.engine.commands.size}`); }
};
