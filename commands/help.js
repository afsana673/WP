module.exports = {
  name: 'help', aliases: ['menu','commands'], description: 'Show WhatsApp commands',
  async run(ctx, args) {
    if (args[0]) {
      const command = ctx.engine.names.get(args[0].toLowerCase());
      return ctx.reply(command
        ? `📖 ${ctx.prefix}${command.name}\n${command.description || 'No description'}\n${command.usage || ''}`
        : '❌ Command not found.');
    }
    const rows = [...ctx.engine.commands.values()].filter(c => !c.owner || ctx.isOwner).map(c =>
      `${ctx.prefix}${c.name}${c.admin ? ' [group admin]' : ''}${c.owner ? ' [owner]' : ''}`);
    return ctx.reply(`🍘 *HR HABIB WHATSAPP BOT*\nDeveloper: HR HABIB\n\n${rows.join('\n')}\n\n${rows.length} commands available.\nUse ${ctx.prefix}help <command>`);
  }
};
