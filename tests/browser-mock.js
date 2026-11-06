// Synthetic local fixture only. No real Twitch account or network.
(() => {
 const listeners=[]; const messageListeners=[];
 const row=(name,order,isFavorite)=>({id:`streamer-${name}`,username:name,displayName:name,order,isFavorite});
 let stored=Object.fromEntries([row('alice',0,true),row('bob',1,true),row('charlie',2,false),row('dave',3,false)].map(x=>[x.id,x]));
 window.fixture={writes:0,errors:[],failSave:false,failRead:false,stored:()=>structuredClone(stored),replace(value){const oldValue=stored;stored=structuredClone(value);listeners.forEach(fn=>fn({twitch_favorites_data:{oldValue,newValue:structuredClone(stored)}},'local'));}};
 window.addEventListener('error',e=>fixture.errors.push(e.message));window.addEventListener('unhandledrejection',e=>fixture.errors.push(String(e.reason)));
 window.confirm=()=>true;
 window.chrome=window.chrome||{};
 chrome.runtime={id:'fixture-extension',onMessage:{addListener:fn=>messageListeners.push(fn)},sendMessage(message,callback){const listener=messageListeners[0];if(!listener)throw Error('missing background');listener(message,{id:chrome.runtime.id},callback);},openOptionsPage:cb=>cb?.()};
 chrome.storage={local:{get(_keys,callback){queueMicrotask(()=>{if(fixture.failRead)chrome.runtime.lastError={message:'read failed'};callback({twitch_favorites_data:structuredClone(stored)});delete chrome.runtime.lastError;});},set(value,callback){queueMicrotask(()=>{if(fixture.failSave){chrome.runtime.lastError={message:'quota failure'};callback();delete chrome.runtime.lastError;return;}fixture.writes++;const oldValue=stored;stored=structuredClone(value.twitch_favorites_data);callback();listeners.forEach(fn=>fn({twitch_favorites_data:{oldValue,newValue:structuredClone(stored)}},'local'));});}},onChanged:{addListener:fn=>listeners.push(fn),removeListener:fn=>{const index=listeners.indexOf(fn);if(index>=0)listeners.splice(index,1);}}};
})();
