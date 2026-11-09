import {parentPort,workerData} from 'node:worker_threads';
import fs from 'node:fs/promises';
globalThis.self={postMessage:data=>parentPort.postMessage(data)};
globalThis.fetch=async url=>{
  const parsed=new URL(url);
  if(parsed.origin!=='https://spojeno.test'||!parsed.pathname.startsWith('/fonts/'))throw new Error('Unexpected network request');
  const name=parsed.pathname.split('/').pop();
  const family=name.split('_')[0].toLowerCase(),suffix=name.slice(name.indexOf('_')+1,-4);
  for(const relative of [suffix+'/'+name,name]){
    try{return new Response(await fs.readFile(new URL('../node_modules/@expo-google-fonts/'+family+'/'+relative,import.meta.url)));}catch{}
  }
  return new Response(null,{status:404});
};
await import('../src/office.worker.js');
await self.onmessage({data:workerData});
