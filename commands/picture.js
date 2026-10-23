module.exports = { name:'picture', aliases:['pic'], owner:true, description:'Send a picture by public HTTPS URL', usage:'!picture https://example.com/photo.jpg',
  async run(ctx,args) {
    let url;
    try { url=new URL(args[0]); } catch { return ctx.reply('Use: !picture <https image URL>'); }
    if (url.protocol !== 'https:' || !url.hostname.includes('.')) return ctx.reply('Only public HTTPS image URLs are supported.');
    return ctx.send({ image:{url:url.toString()}, caption:'🍘 HR HABIB' });
  }
};
