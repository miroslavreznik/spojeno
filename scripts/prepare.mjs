import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const target = new URL('public/runtime/', root);
const source = new URL('node_modules/@matbee/libreoffice-converter/', root);
await mkdir(target, {recursive:true});
for(const name of ['soffice.js','soffice.data','soffice.worker.js']) await copyFile(new URL('wasm/'+name,source),new URL(name,target));
await copyFile(new URL('dist/browser.worker.global.js',source),new URL('browser.worker.js',target));
// Small individual assets work with GitHub Pages and avoid Git's large-file limit.
const wasm = await readFile(new URL('wasm/soffice.wasm',source));
const chunkSize = 48 * 1024 * 1024;
const chunks = [];
for(let start=0;start<wasm.length;start+=chunkSize){
  const name = `soffice.wasm.part${chunks.length}`;
  const data = wasm.subarray(start, start+chunkSize);
  await writeFile(new URL(name,target),data);
  chunks.push({name,size:data.length});
}
await writeFile(new URL('manifest.json',target),JSON.stringify({version:'2.7.2',size:wasm.length,chunks}));
console.log('Office runtime ready, including '+chunks.length+' WASM chunks.');
const fonts=new URL('public/fonts/',root);
await mkdir(fonts,{recursive:true});
for(const family of ['arimo','tinos','cousine','carlito','caladea']){
  const dir=new URL('node_modules/@expo-google-fonts/'+family+'/',root);
  for(const name of await readdir(dir,{recursive:true})){
    if(/_(400Regular|700Bold|400Regular_Italic|700Bold_Italic)\.ttf$/.test(name))await copyFile(new URL(name.replaceAll('\\','/'),dir),new URL(name.split(/[\\/]/).pop(),fonts));
    if(/(OFL|LICENSE|LICENSE_FONT)(\.txt)?$/i.test(name))await copyFile(new URL(name.replaceAll('\\','/'),dir),new URL(family+'-'+name.split(/[\\/]/).pop(),fonts));
  }
}
console.log('Self-hosted fonts ready; loaded only by the small Word converter when needed.');
