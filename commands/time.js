module.exports = { name:'time', description:'Show current date and time',
  async run(ctx) { return ctx.reply('🕒 '+new Intl.DateTimeFormat('en-IN',{ dateStyle:'full',timeStyle:'medium',timeZone:'Asia/Kolkata'}).format(new Date())+' (IST)'); }
};
