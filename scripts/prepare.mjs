import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
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
