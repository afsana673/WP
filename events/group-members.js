'use strict';
module.exports = async function groupMembers({ send, store, update }) {
  const group = update?.id;
  if (!group || !store.group(group).welcome) return;
  const people = (update.participants || []).map(p=>typeof p==='string' ? p : p.id).filter(Boolean);
  if (!people.length) return;
  if (!['add','remove'].includes(update.action)) return;
  const action = update.action === 'add' ? '🎉 Welcome!' : '👋 Goodbye!';
  await send(group,{ text: `${action}\n${people.map(p=>'@'+p.split('@')[0]).join(' ')}`,mentions:people });
};
