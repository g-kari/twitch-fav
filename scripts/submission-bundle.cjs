const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');const {zipFiles}=require('./package.cjs');const {version}=require('../package.json');
const root=path.resolve(__dirname,'..');
const extension=`twitch-favorites-v${version}.zip`;
const files=[['artifacts/'+extension,extension],['store-assets/promo-440x280.png','promo-440x280.png'],['store-assets/promo-440x280.svg','promo-440x280.svg'],['public/privacy.html','privacy.html'],['docs/STORE_SUBMISSION.md','STORE_SUBMISSION.md'],['RELEASE_NOTES.md','RELEASE_NOTES.md']];
const entries=files.map(([src,dest])=>[dest,fs.readFileSync(path.join(root,src))]);
entries.push(['README.txt',Buffer.from('Chrome Web Storeへ提出するのは内包の '+extension+' です。外側の準備ZIPを提出しないでください。\nコードのテストと合成画面の検証は実サイト・ストア審査の完了を意味しません。残項目はSTORE_SUBMISSION.mdをご覧ください。\n')]);
fs.writeFileSync(path.join(root,'artifacts',`twitch-favorites-store-assets-v${version}.zip`),zipFiles(entries));
const artifacts=fs.readdirSync(path.join(root,'artifacts')).filter(name=>name.endsWith('.zip') && (name===extension||name===`twitch-favorites-store-assets-v${version}.zip`));
fs.writeFileSync(path.join(root,'artifacts/SHA256SUMS.txt'),artifacts.sort().map(name=>`${createHash('sha256').update(fs.readFileSync(path.join(root,'artifacts',name))).digest('hex')}  ${name}`).join('\n')+'\n');
