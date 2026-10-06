const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawnSync}=require('node:child_process');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');const dir=path.join(root,'artifacts/browser');fs.mkdirSync(dir,{recursive:true});
const url=file=>pathToFileURL(path.join(root,file)).href;
const script=file=>`<script src="${url(file)}"></script>`;
const options=fs.readFileSync(path.join(root,'public/options.html'),'utf8').replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
const cards=['dave','bob','charlie','alice'].map(name=>`<div class="card"><div><a data-a-target="followed-channel" href="/${name}"><span data-a-target="side-nav-title">${name}</span></a></div></div>`).join('');
const content=`<!doctype html><html><head><meta charset="utf-8"></head><body><section id="section"><h2 data-a-target="side-nav-header">フォロー中</h2><div id="cards">${cards}</div></section></body></html>`;
const browser=process.env.CHROME_PATH || (process.platform==='win32'?path.join(process.env.PROGRAMFILES||'C:\\Program Files','Google/Chrome/Application/chrome.exe'):'/usr/bin/chromium');
for(const [mode,html] of [['content',content],['options',options]]) {
 const file=path.join(dir,`${mode}.html`);const fixture=html.replace('<body>',`<body data-mode="${mode}">`).replace('</body>',`${script('tests/browser-mock.js')}${script('dist/background.js')}${script(`dist/${mode}.js`)}${script('tests/browser-checks.js')}</body>`);fs.writeFileSync(file,fixture);
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'twitch-fav-test-'));
 const run=spawnSync(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--allow-file-access-from-files',`--user-data-dir=${profile}`,'--dump-dom','--virtual-time-budget=6000',pathToFileURL(file).href],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 fs.writeFileSync(path.join(dir,`${mode}-result.html`),run.stdout||'');fs.writeFileSync(path.join(dir,`${mode}-stderr.log`),run.stderr||String(run.error||''));
 if(run.status!==0 || !run.stdout.includes('data-result="passed"')) {console.error(`${mode}: failed or browser unavailable`,run.error?.message||'',run.stdout.match(/data-failure="[^"]*/)?.[0]||run.stderr.slice(-1000));process.exitCode=1;}
 else console.log(`${mode}: ${run.stdout.match(/data-checks="(\d+)"/)?.[1]} browser checks passed`);
}
