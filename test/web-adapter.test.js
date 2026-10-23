'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {WebAdapter}=require('../lib/web-adapter');
const {authorized,escapeHTML,qrPage}=require('../index');

function fake() {
  const inbox=[];
  const sent=[];
  const actions=[];
  const chat={
    isGroup:true,name:'HR Group',description:'Welcome',
    participants:[
      {id:{_serialized:'111@c.us'},isAdmin:true,isSuperAdmin:false},
      {id:{_serialized:'222@c.us'},isAdmin:false,isSuperAdmin:false}
    ],
    async setSubject(name){actions.push(['subject',name]);},
    async removeParticipants(ids){actions.push(['remove',ids]);},
    async promoteParticipants(ids){actions.push(['promote',ids]);},
    async demoteParticipants(ids){actions.push(['demote',ids]);}
  };
  const client={info:{wid:{_serialized:'999@c.us'}},
    async getChatById(id){assert.equal(id,'my-group@g.us');return chat;},
    async sendMessage(id,text,options){
      sent.push({id,text,options});
      return {fromMe:true,from:'999@c.us',to:id,id:{id:`out${sent.length}`,_serialized:`true_${id}_out${sent.length}`},async react(x){actions.push(['react',x]);},async delete(x){actions.push(['delete',x]);}};
    }
  };
  const engine={async message(raw){inbox.push(raw);},async groupUpdate(update){actions.push(['groupUpdate',update]);}};
  const adapter=new WebAdapter(client,engine,{async fromUrl(url){return {mediaUrl:url};}});
  return {adapter,sent,actions,inbox};
}

test('QR dashboard password checks and HTML rendering are safe',()=>{
  assert.equal(authorized({headers:{}},'more-than-twelve-char'),false);
  const auth='Basic '+Buffer.from('admin:more-than-twelve-char').toString('base64');
  assert.equal(authorized({headers:{authorization:auth}},'more-than-twelve-char'),true);
  assert.equal(escapeHTML('<b>'), '&lt;b&gt;');
  assert.match(qrPage({status:'qr_ready',connected:false,qrAt:Date.now(),qrImage:'data:image/png;base64,AAAA'}),/data:image\/png/);
  assert.doesNotMatch(qrPage({status:'qr_ready',connected:false,qrAt:Date.now()-90000,qrImage:'data:image/png;base64,AAAA'}),/data:image\/png/);
});

test('whatsapp-web.js message maps into existing engine, with quote and owner flag',async()=>{
  const f=fake();
  const quoted={id:{id:'parent'},from:'222@c.us',body:'older reply',to:'my-group@g.us',fromMe:false};
  await f.adapter.handleMessage({from:'999@c.us',to:'my-group@g.us',fromMe:true,author:'999@c.us',body:'!ping', id:{id:'first'}, hasQuotedMsg:true,
    mentionedIds:['222@c.us'],getQuotedMessage:async()=>quoted});
  assert.equal(f.inbox[0].key.remoteJid,'my-group@g.us');
  assert.equal(f.inbox[0].key.fromMe,true);
  assert.equal(f.inbox[0].message.extendedTextMessage.contextInfo.stanzaId,'parent');
  assert.deepEqual(f.inbox[0].message.extendedTextMessage.contextInfo.mentionedJid,['222@c.us']);
});

test('web adapter supports group metadata, admin operations, mentions, image and delete',async()=>{
  const f=fake();
  const meta=await f.adapter.groupMetadata('my-group@g.us');
  assert.equal(meta.participants[0].admin,'admin');
  await f.adapter.groupUpdateSubject('my-group@g.us','New');
  await f.adapter.groupParticipantsUpdate('my-group@g.us',['222@c.us'],'remove');
  assert.deepEqual(f.actions.slice(0,2),[['subject','New'],['remove',['222@c.us']]]);
  const a=await f.adapter.sendMessage('my-group@g.us',{text:'Hi @222',mentions:['222@c.us']});
  assert.deepEqual(f.sent[0].options.mentions,['222@c.us']);
  assert.equal(a.key.fromMe,true);
  await f.adapter.sendMessage('my-group@g.us',{react:{text:'❤️',key:{id:'out1'}}});
  await f.adapter.sendMessage('my-group@g.us',{delete:{id:'out1'}});
  assert.ok(f.actions.some(x=>x[0]==='react'));
  assert.ok(f.actions.some(x=>x[0]==='delete' && x[1]===true));
  await f.adapter.sendMessage('my-group@g.us',{image:{url:'https://example.com/image.png'},caption:'Picture'});
  assert.deepEqual(f.sent[1].text,{mediaUrl:'https://example.com/image.png'});
  assert.equal(f.sent[1].options.caption,'Picture');
  await f.adapter.handleGroup({chatId:'my-group@g.us',recipientIds:['111@c.us']},'add');
  assert.equal(f.actions.at(-1)[1].action,'add');
});
