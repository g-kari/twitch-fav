(async () => {
 const pause=ms=>new Promise(r=>setTimeout(r,ms));const checks=[];
 function assert(condition,label){if(!condition)throw Error(label);checks.push(label);}
 const ids=()=>Array.from(document.querySelectorAll('[data-a-target="followed-channel"]')).map(x=>x.getAttribute('href').slice(1));
 const anchor=name=>document.querySelector(`a[href="/${name}"]`);
 const star=name=>anchor(name).querySelector('.twitch-fav-star');
 const dispatch=(action)=>new Promise((resolve,reject)=>chrome.runtime.sendMessage({scope:'twitch-favorites',action},r=>r.ok?resolve(r.data):reject(Error(r.error))));
 try {
  await pause(150);
  if(document.body.dataset.mode==='content') {
   assert(ids().join() === 'alice,bob,charlie,dave','favorite and ordinary ordering');
   assert(document.querySelectorAll('.twitch-fav-star').length===4,'exactly one star per channel');
   assert(anchor('alice').closest('.card')?.parentElement.id==='cards','wrappers preserved');
   let mutations=0;const observer=new MutationObserver(rs=>mutations+=rs.length);observer.observe(document.getElementById('cards'),{subtree:true,childList:true});
   await pause(200);assert(mutations===0,'observer settles without self-loop');observer.disconnect();
   star('charlie').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await pause(150);
   assert(fixture.stored()['streamer-charlie'].isFavorite,'keyboard favorite persisted');
   assert(star('charlie').getAttribute('aria-pressed')==='true','favorite state announced');
   fixture.failSave=true;star('dave').click();await pause(150);
   assert(!fixture.stored()['streamer-dave'].isFavorite && star('dave').getAttribute('aria-pressed')==='false','save failure leaves persisted/UI state intact');
   assert(document.getElementById('twitch-fav-status').textContent.includes('quota'),'save error shown');fixture.failSave=false;
   await dispatch({type:'remove',id:'streamer-charlie'});await pause(150);
   assert(star('charlie').getAttribute('aria-pressed')==='false','external change reflected');
   anchor('dave').dispatchEvent(new Event('dragstart',{bubbles:true,cancelable:true}));
   anchor('charlie').dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));await pause(150);
   assert(ids().join()==='alice,bob,dave,charlie','ordinary drag order without DataTransfer');
   anchor('alice').dispatchEvent(new Event('dragstart',{bubbles:true,cancelable:true}));
   anchor('dave').dispatchEvent(new Event('drop',{bubbles:true,cancelable:true}));await pause(150);
   assert(ids().join()==='alice,bob,dave,charlie','cross group drop does not corrupt order');
   anchor('bob').setAttribute('href','/eve');await pause(150);
   assert(star('eve').getAttribute('aria-pressed')==='false','recycled anchor gets new state');star('eve').click();await pause(150);
   assert(fixture.stored()['streamer-eve'].isFavorite,'recycled handler targets current channel');
   anchor('eve').setAttribute('href','/directory/following');await pause(150);
   assert(!document.querySelector('a[href="/directory/following"] .twitch-fav-star'),'invalid recycled path ignored');
   const old=document.getElementById('section');const replacement=old.cloneNode(true);replacement.querySelectorAll('.twitch-fav-star').forEach(x=>x.remove());old.replaceWith(replacement);await pause(150);
   assert(star('alice'),'replaced sidebar reconnects');
   await dispatch({type:'clear'});await pause(150);assert(document.querySelectorAll('.twitch-fav-star.active').length===0,'clear synchronizes open page');
  } else {
   const rows=()=>Array.from(document.querySelectorAll('.favorite-item')).map(x=>x.dataset.streamerId);
   assert(rows().join()==='streamer-alice,streamer-bob','options renders favorites');
   document.querySelector('[data-focus-key="streamer-bob-up"]').click();await pause(100);
   assert(rows().join()==='streamer-bob,streamer-alice','keyboard-accessible move');
   assert(document.activeElement?.dataset.focusKey?.startsWith('streamer-'),'keyboard focus retained after reorder');
   document.querySelector('[data-focus-key="streamer-bob-remove"]').click();await pause(100);
   assert(rows().join()==='streamer-alice','remove persisted');
   document.querySelector('.favorite-item').dispatchEvent(new Event('dragenter',{bubbles:true,cancelable:true}));assert(true,'external dragenter without internal drag safe');
   const input=document.getElementById('import-file');const bad=new DataTransfer();bad.items.add(new File(['{broken'], 'bad.json',{type:'application/json'}));input.files=bad.files;input.dispatchEvent(new Event('change',{bubbles:true}));await pause(100);
   assert(document.getElementById('status-message').className==='error','invalid import displayed');assert(input.value==='' && !document.getElementById('import-btn').disabled,'failed import can be retried');
   const good=new DataTransfer();const imported={'streamer-zed':{id:'streamer-zed',username:'zed',displayName:'<img src=x onerror=alert(1)>',isFavorite:true,order:0,avatarUrl:'https://example.invalid/track'}};good.items.add(new File([JSON.stringify(imported)],'good.json',{type:'application/json'}));input.files=good.files;input.dispatchEvent(new Event('change',{bubbles:true}));await pause(100);
   assert(rows().join()==='streamer-zed','import consistently replaces settings');assert(!document.querySelector('.favorite-item img') && document.querySelector('.favorite-item .name').textContent.includes('<img'),'import names rendered as text, URLs not fetched');
   let called=0;const original=chrome.storage.local.set;chrome.storage.local.set=(...args)=>{called++;original(...args);};
   document.querySelector('[data-focus-key="streamer-zed-remove"]').click();await pause(100);assert(called===1,'rerenders do not multiply mutation handlers');
   window.confirm=()=>false;const before=fixture.writes;document.getElementById('clear-btn').click();await pause(80);assert(fixture.writes===before,'cancel clear has no write');
   window.confirm=()=>true;document.getElementById('clear-btn').click();await pause(100);assert(Object.keys(fixture.stored()).length===0,'clear removes local settings');
  }
  assert(fixture.errors.length===0,`no browser errors: ${fixture.errors.join(';')}`);
  document.body.dataset.result='passed';document.body.dataset.checks=String(checks.length);
 } catch(error) {document.body.dataset.result='failed';document.body.dataset.failure=String(error);}
 const report=document.createElement('pre');report.id='test-report';report.textContent=JSON.stringify({checks,errors:fixture.errors});document.body.appendChild(report);
})();
