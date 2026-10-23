const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Engine, textFromMessage, loadCommands } = require('../lib/engine');
const { Store } = require('../lib/store');

function incoming(text, { fromMe=false, chat='12000@g.us', participant='919990001111@s.whatsapp.net', id='in1', contextInfo }={}) {
  return {key:{remoteJid:chat,participant,fromMe,id},message:{extendedTextMessage:{text,contextInfo}},messageTimestamp:1700000000};
}
async function fixture() {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hr-habib-bot-'));
  const store=new Store(dir,'!'); await store.load();
  const outputs=[];
  const socket={
    groupMetadata:async()=>({subject:'My Group',desc:'Hello!',participants:[
      {id:'919990001111@s.whatsapp.net',admin:'admin'},
      {id:'919990002222@s.whatsapp.net',admin:null} ]}),
    groupUpdateSubject:async(id,title)=>{outputs.push({subject:title,id})},
    groupParticipantsUpdate:async(id,members,action)=>{outputs.push({id,members,action})},
    sendMessage:async(id,content)=>{outputs.push({id,content})}
  };
  const engine=new Engine({store,send:async(chat,content,options)=>{
    outputs.push({chat,content,options});
    return {key:{remoteJid:chat,id:'out1',fromMe:true}};
  },socketProvider:()=>socket});
  return {store,outputs,engine,dir,socket};
}
test('load WhatsApp native commands without original Messenger modules',()=>{
  const { canonical }=loadCommands();
  assert.ok(canonical.size>=20);
  assert.equal(canonical.get('help').name,'help');
});
test('read plain, ephemeral and quoted messages',()=>{
  assert.equal(textFromMessage({conversation:'Hello'}),'Hello');
  assert.equal(textFromMessage({ephemeralMessage:{message:{conversation:'Hidden'}}}),'Hidden');
});
test('prefix commands run and persist to disk',async()=>{
  const fx=await fixture();
  try {
    await fx.engine.message(incoming('!ping'));
    assert.match(fx.outputs.at(-1).content.text,/Pong/);
    await fx.engine.message(incoming('!prefix #',{fromMe:true,id:'in2'}));
    assert.equal(fx.store.prefix('12000@g.us'),'#');
    const reloaded=new Store(fx.dir);await reloaded.load();
    assert.equal(reloaded.prefix('12000@g.us'),'#');
    await fx.engine.message(incoming('#help',{id:'in3'}));
    assert.match(fx.outputs.at(-1).content.text,/HR HABIB/);
  } finally { await fs.rm(fx.dir,{recursive:true,force:true}); }
});
test('owner-only unsend command cannot be run by other members',async()=>{
  const fx=await fixture();
  try {
    await fx.engine.message(incoming('!unsend'));
    assert.match(fx.outputs.at(-1).content.text,/linked WhatsApp owner/);
  } finally { await fs.rm(fx.dir,{recursive:true,force:true}); }
});
test('group admin authorization prevents arbitrary group subject change',async()=>{
  const fx=await fixture();
  try {
    await fx.engine.message(incoming('!groupname Test',{participant:'919990002222@s.whatsapp.net'}));
    assert.match(fx.outputs.at(-1).content.text,/Only group admins/);
    await fx.engine.message(incoming('!groupname Test',{participant:'919990001111@s.whatsapp.net'}));
    assert.deepEqual(fx.outputs.at(-2),{subject:'Test',id:'12000@g.us'});
  } finally { await fs.rm(fx.dir,{recursive:true,force:true}); }
});
test('group event sends message only when welcome turned on',async()=>{
  const fx=await fixture();
  try {
    await fx.engine.groupUpdate({id:'12000@g.us',participants:['91999@s.whatsapp.net'],action:'add'});
    assert.equal(fx.outputs.length,0);
    await fx.store.setFlag('12000@g.us','welcome',true);
    await fx.engine.groupUpdate({id:'12000@g.us',participants:['91999@s.whatsapp.net'],action:'add'});
    assert.match(fx.outputs.at(-1).content.text,/Welcome!/);
  } finally { await fs.rm(fx.dir,{recursive:true,force:true}); }
});
