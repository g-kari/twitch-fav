// Offline browser fixtures using Node's built-in WebSocket and Chrome DevTools Protocol.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawn}=require('node:child_process');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');const dir=path.join(root,'artifacts/browser');fs.mkdirSync(dir,{recursive:true});
const url=file=>pathToFileURL(path.join(root,file)).href;
const script=file=>`<script src="${url(file)}"></script>`;
const options=fs.readFileSync(path.join(root,'public/options.html'),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const cards=['dave','bob','charlie','alice'].map(name=>`<div class="card"><div><a data-a-target="followed-channel" href="/${name}"><span data-a-target="side-nav-title">${name}</span></a></div></div>`).join('');
const content=`<!doctype html><html><head><meta charset="utf-8"></head><body><section id="section"><h2 data-a-target="side-nav-header">フォロー中</h2><div id="cards">${cards}</div></section></body></html>`;
const browser=process.env.CHROME_PATH || (process.platform==='win32'?path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'):'/usr/bin/chromium');
async function run(mode,html) {
 const file=path.join(dir,`${mode}.html`);
 fs.writeFileSync(file,html.replace('<body>',`<body data-mode="${mode}">`).replace('</body>',`${script('tests/browser-mock.js')}${script('dist/background.js')}${script(`dist/${mode}.js`)}${script('tests/browser-checks.js')}</body>`));
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'twitch-fav-test-'));
 const child=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--allow-file-access-from-files',`--user-data-dir=${profile}`,'--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','about:blank'],{stdio:['ignore','ignore','pipe']});
 let logs='';let ws;const pending=new Map();let sequence=0;
 const deadline=setTimeout(()=>{child.kill();for(const request of pending.values())request.reject(Error('browser deadline'));},30000);
 try {
  const endpoint=await new Promise((resolve,reject)=>{
   child.on('error',reject);child.on('exit',code=>reject(Error(`browser exited ${code}: ${logs.slice(-800)}`)));
   child.stderr.on('data',chunk=>{logs+=chunk;const match=/DevTools listening on (ws:\/\/[^\s]+)/.exec(logs);if(match)resolve(match[1]);});
  });
  ws=new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',event=>{const message=JSON.parse(event.data);const callback=pending.get(message.id);if(!callback)return;pending.delete(message.id);message.error?callback.reject(Error(JSON.stringify(message.error))):callback.resolve(message.result);});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  await send('Page.enable',{},sessionId);await send('Runtime.enable',{},sessionId);
  const loaded=new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>{ws.removeEventListener('message',listener);reject(Error('page load timeout'));},10000);
   const listener=event=>{const message=JSON.parse(event.data);if(message.sessionId===sessionId && message.method==='Page.loadEventFired'){clearTimeout(timeout);ws.removeEventListener('message',listener);resolve();}};
   ws.addEventListener('message',listener);
  });
  await send('Page.navigate',{url:pathToFileURL(file).href},sessionId);await loaded;
  const result=await send('Runtime.evaluate',{expression:`new Promise(resolve => { const started=Date.now(); const timer=setInterval(() => { if(document.body?.dataset.result || Date.now()-started>15000){clearInterval(timer);resolve({result:document.body?.dataset.result,checks:document.body?.dataset.checks,failure:document.body?.dataset.failure,html:document.documentElement.outerHTML});}},50); })`,awaitPromise:true,returnByValue:true},sessionId);
  if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
  const outcome=result.result.value;fs.writeFileSync(path.join(dir,`${mode}-result.html`),outcome.html);
  if(outcome.result!=='passed')throw Error(outcome.failure||'fixture did not finish');
  console.log(`${mode}: ${outcome.checks} browser checks passed`);
  const png=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(path.join(dir,`${mode}-fixture.png`),Buffer.from(png.data,'base64'));
 } finally {clearTimeout(deadline);ws?.close();child.kill();fs.writeFileSync(path.join(dir,`${mode}-stderr.log`),logs);}
}
(async()=>{for(const [mode,html] of [['content',content],['options',options]])await run(mode,html);})().catch(error=>{console.error(error);process.exitCode=1;});
