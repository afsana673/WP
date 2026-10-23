module.exports = { name: 'prefix', description: 'Show or change chat prefix', usage: '!prefix # | !prefix reset | !prefix # -g (owner)',
  async run(ctx,args) {
    if (!args.length) return ctx.reply(`🌐 Default prefix: ${ctx.store.data.prefix}\n💬 Here: ${ctx.prefix}\nUse ${ctx.prefix}prefix # to change.`);
    if (!ctx.isOwner && ctx.isGroup) {
      const meta = await ctx.sock().groupMetadata(ctx.chat);
      const { jidEquals } = require('../lib/engine');
      if (!meta.participants?.some(p => p.admin && (jidEquals(p.id,ctx.sender) || jidEquals(p.id,ctx.senderAlt))))
        return ctx.reply('⛔ Group admin required to change prefix.');
    } else if (!ctx.isOwner) return ctx.reply('⛔ Only owner can change prefix in private chats.');
    if (args[0].toLowerCase()==='reset') {
      await ctx.store.resetPrefix(ctx.chat);
      return ctx.reply(`✅ Prefix reset: ${ctx.store.prefix(ctx.chat)}`);
    }
    if (args.includes('-g') && !ctx.isOwner) return ctx.reply('⛔ Only owner can set global prefix.');
    try { await ctx.store.setPrefix(ctx.chat, args[0], args.includes('-g')); }
    catch (e) { return ctx.reply(e.message); }
    return ctx.reply(`✅ ${args.includes('-g') ? 'Global' : 'Chat'} prefix changed to: ${args[0]}`);
  }
};
