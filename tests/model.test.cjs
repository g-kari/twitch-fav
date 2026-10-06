const {test} = require('node:test');
const assert = require('node:assert/strict');
const {validateStreamers, sortedStreamers, moveStreamer, channelName, MAX_STREAMERS} = require('../.test-build/utils/model.js');
const {applyAction, createActionQueue} = require('../.test-build/utils/actions.js');
const item = (name, order=0, isFavorite=false) => ({id:`streamer-${name}`, username:name, displayName:name, order, isFavorite});
const map = (...items) => Object.fromEntries(items.map(x=>[x.id,x]));
test('legacy roundtrip preserves fields and drops unused arbitrary avatar URLs', () => {
  const data=map({...item('Alice'),avatarUrl:'https://example.test/track',extra:1});
  assert.deepEqual(validateStreamers(JSON.parse(JSON.stringify(data))),map({...item('alice'),displayName:'Alice'}));
});
for (const value of [null,[],0,'x',true]) test(`invalid root ${JSON.stringify(value)}`,()=>assert.throws(()=>validateStreamers(value)));
for (const field of [{order:-1},{order:1.5},{order:Infinity},{order:'0'},{isFavorite:1},{displayName:''},{displayName:'x'.repeat(201)},{username:'../x'},{id:'other'}]) test(`invalid field ${JSON.stringify(field)}`,()=>assert.throws(()=>validateStreamers(map({...item('alice'),...field}))));
test('dangerous keys rejected',()=>assert.throws(()=>validateStreamers(JSON.parse('{"__proto__":{"username":"alice"}}'))));
test('canonical duplicate rejected',()=>assert.throws(()=>validateStreamers(map(item('Alice'),item('alice')))));
test('too many records rejected',()=>assert.throws(()=>validateStreamers(Object.fromEntries(Array.from({length:MAX_STREAMERS+1},(_,i)=>[`streamer-u${i}`,item(`u${i}`)])))));
test('only channel paths accepted',()=>{assert.equal(channelName('/Alice/'),'alice');for(const p of ['/x/videos','https://evil.test/x','//evil.test','/x?q=1','/../x','/'])assert.equal(channelName(p),null);});
test('favorites ascending then ordinary order',()=>assert.deepEqual(sortedStreamers(map(item('c',2),item('b',1,true),item('a',0,true),item('d',3))).map(x=>x.username),['a','b','c','d']));
test('up/down moves and input immutability',()=>{
 const data=map(item('a',0),item('b',1),item('c',2));
 assert.deepEqual(sortedStreamers(moveStreamer(data,'streamer-a','streamer-c')).map(x=>x.username),['b','c','a']);
 assert.deepEqual(sortedStreamers(moveStreamer(data,'streamer-c','streamer-a')).map(x=>x.username),['c','a','b']);assert.equal(data['streamer-a'].order,0);
});
test('cross-group rejected and unknown IDs safe',()=>{
 const data=map(item('a',0,true),item('b',1));assert.throws(()=>moveStreamer(data,'streamer-a','streamer-b'));
 assert.deepEqual(moveStreamer(data,'__proto__','streamer-a'),data);assert.deepEqual(applyAction(data,{type:'remove',id:'__proto__'}),data);assert.equal(Object.prototype.isFavorite,undefined);
});
test('toggle/import/clear',()=>{
 let data=applyAction({},{type:'toggle',streamer:item('alice')});assert.equal(data['streamer-alice'].isFavorite,true);
 data=applyAction(data,{type:'toggle',streamer:item('alice')});assert.equal(data['streamer-alice'].isFavorite,false);
 assert.deepEqual(applyAction(data,{type:'import',data:map(item('bob',0,true))}),map(item('bob',0,true)));
 assert.deepEqual(applyAction(data,{type:'clear'}),{});assert.throws(()=>applyAction(data,{type:'unknown'}));
});
test('serialized concurrent writes preserve both tabs',async()=>{
 let stored={};const queue=createActionQueue(async()=>structuredClone(stored),async value=>{await new Promise(r=>setTimeout(r,2));stored=value;});
 await Promise.all([queue({type:'toggle',streamer:item('alice')}),queue({type:'toggle',streamer:item('bob')})]);assert.equal(stored['streamer-alice'].isFavorite,true);assert.equal(stored['streamer-bob'].isFavorite,true);
});
test('queue recovers after read failure with explicit clear',async()=>{
 let bad=true;let stored={};const queue=createActionQueue(async()=>{if(bad)throw Error('broken');return stored;},async v=>{stored=v;bad=false;});
 await assert.rejects(queue({type:'toggle',streamer:item('alice')}));await queue({type:'clear'});await queue({type:'toggle',streamer:item('alice')});assert.equal(stored['streamer-alice'].isFavorite,true);
});
test('save failure does not poison next queued operation',async()=>{
 let fail=true;let stored={};const queue=createActionQueue(async()=>stored,async v=>{if(fail){fail=false;throw Error('quota');}stored=v;});
 await assert.rejects(queue({type:'toggle',streamer:item('alice')}));await queue({type:'toggle',streamer:item('bob')});assert.equal(stored['streamer-alice'],undefined);assert.equal(stored['streamer-bob'].isFavorite,true);
});
test('zip CRC and structure',()=>{
 const {crc32,zipFiles}=require('../scripts/package.cjs');assert.equal(crc32(Buffer.from('123456789')),0xcbf43926);
 const zip=zipFiles([['test.txt',Buffer.from('hello')]]);assert.equal(zip.readUInt32LE(0),0x04034b50);assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);assert.equal(zip.readUInt16LE(zip.length-12),1);
});
