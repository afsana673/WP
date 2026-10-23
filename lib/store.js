'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

class Store {
  constructor(baseDir, defaultPrefix = '!') {
    this.baseDir = baseDir;
    this.file = path.join(baseDir, 'settings.json');
    this.data = { prefix: defaultPrefix, groups: {} };
    this.saving = Promise.resolve();
  }
  async load() {
    await fs.mkdir(this.baseDir, { recursive: true, mode: 0o700 });
    try {
      const json = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (typeof json.prefix === 'string' && json.prefix.length <= 3 && json.prefix.length > 0) this.data.prefix = json.prefix;
      if (json.groups && typeof json.groups === 'object' && !Array.isArray(json.groups)) this.data.groups = json.groups;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  prefix(chatID) { return this.data.groups[chatID]?.prefix || this.data.prefix; }
  group(chatID) { return this.data.groups[chatID] || {}; }
  async mutate(fn) {
    fn(this.data);
    this.saving = this.saving.catch(() => {}).then(async () => {
      const temp = `${this.file}.tmp`;
      await fs.writeFile(temp, JSON.stringify(this.data, null, 2), { mode: 0o600 });
      await fs.rename(temp, this.file);
    });
    return this.saving;
  }
  async setPrefix(chatID, prefix, globalScope = false) {
    if (!/^\S{1,3}$/.test(prefix)) throw new Error('Prefix must be 1-3 nonspace characters.');
    return this.mutate(data => {
      if (globalScope) data.prefix = prefix;
      else data.groups[chatID] = { ...data.groups[chatID], prefix };
    });
  }
  async resetPrefix(chatID) {
    return this.mutate(data => {
      const group = { ...(data.groups[chatID] || {}) };
      delete group.prefix;
      data.groups[chatID] = group;
    });
  }
  async setFlag(chatID, flag, enabled) {
    if (!['welcome','autoreact'].includes(flag)) throw new Error('Invalid flag.');
    return this.mutate(data => {
      data.groups[chatID] = { ...data.groups[chatID], [flag]: Boolean(enabled) };
    });
  }
}
module.exports = { Store };
