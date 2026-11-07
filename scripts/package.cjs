// Deterministic, DEFLATE-compressed ZIP using the ZIP specification. No platform zip command.
const fs = require('node:fs');
const {deflateRawSync} = require('node:zlib');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const files = ['manifest.json','content.js','content.css','background.js','popup.js','popup.html','popup.css','options.js','options.html','options.css','privacy.html','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function zipFiles(entries) {
  const local=[]; const central=[]; let offset=0;
  for (const [filename,data] of entries) {
    const name=Buffer.from(filename); const crc=crc32(data); const packed=deflateRawSync(data,{level:9});
    const header=Buffer.alloc(30); header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(packed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);header.copy(c,6,4,30);c.writeUInt32LE(offset,42);
    local.push(header,name,packed);central.push(c,name);offset+=header.length+name.length+packed.length;
  }
  const directory=Buffer.concat(central);const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
function buildPackage() {
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/manifest.json')));
  assert.equal(manifest.version,pkg.version);
  assert.deepEqual(manifest.permissions,['storage']);
  assert.deepEqual(manifest.content_scripts[0].matches,['https://www.twitch.tv/*']);
  const entries=files.map(name=>{
    const data=fs.readFileSync(path.join(root,'dist',name));assert.ok(data.length,`${name} is empty`);
    if(name.endsWith('.js'))assert.ok(!/\beval\s*\(|new\s+Function\s*\(|importScripts\s*\(\s*['"]https?:/u.test(data.toString()),`${name}: unexpected executable loader`);
    return [name,data];
  });
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  const target=path.join(root,'artifacts',`twitch-favorites-v${pkg.version}.zip`);
  fs.writeFileSync(target,zipFiles(entries));console.log(`Packaged ${entries.length} verified files: ${target}`);
}
if(require.main===module)buildPackage();
module.exports={crc32,zipFiles,files};
