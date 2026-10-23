module.exports = { name:'clear', owner:true, description:'Explain WhatsApp chat clearing limitations',
 async run(ctx){return ctx.reply('WhatsApp does not allow a linked-device bot to clear other people’s chat histories. You can delete your own messages with !unsend.');}
};
