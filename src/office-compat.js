let converter;
let loading;
let operation;
const fail=message=>Object.assign(new Error(message),{userFacing:true});
const CACHE='spojeno-office-2.7.2';
export function stopCompatibility(){
  if(operation){operation.abort();operation=null;}
  converter?.worker?.terminate();converter=null;loading=null;
}
async function stageRuntime(signal,onProgress){
  // The vendor starts its own two-minute timer at initialize(). Download first,
  // so slow first-time downloads cannot consume the WASM startup allowance.
  const base=new URL('runtime/',document.baseURI);
  const manifestResponse=await fetch(new URL('manifest.json',base),{signal});
  if(!manifestResponse.ok)throw new Error('Runtime download failed');
  const manifest=await manifestResponse.json();
  const assets=[...manifest.chunks,{name:'soffice.data',size:99735918},{name:'soffice.js',size:444153},{name:'soffice.worker.js',size:3221},{name:'browser.worker.js',size:110190}];
  const cache=await caches.open(CACHE);
  const total=assets.reduce((sum,a)=>sum+a.size,0);let done=0;
  for(const asset of assets){
    const url=new URL(asset.name,base).href;
    if(!(await cache.match(url))){
      const response=await fetch(url,{signal});
      if(!response.ok)throw new Error('Runtime download failed');
      const reader=response.body.getReader();const chunks=[];let received=0;
      while(true){const {done:end,value}=await reader.read();if(end)break;chunks.push(value);received+=value.length;onProgress({phase:'download',percent:(done+received)/total*65,message:'Stahuji kompatibilní převodník',detail:Math.round((done+received)/1024/1024)+' / '+Math.ceil(total/1024/1024)+' MB'});}
      await cache.put(url,new Response(new Blob(chunks),{headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream'}}));
    }
    done+=asset.size;
    onProgress({phase:'download',percent:done/total*65,message:'Připravuji kompatibilní převodník',detail:Math.round(done/1024/1024)+' / '+Math.ceil(total/1024/1024)+' MB'});
  }
}
export async function convertCompatibility(file,onProgress){
  if(!crossOriginIsolated||typeof SharedArrayBuffer==='undefined')throw fail('Kompatibilní převod potřebuje izolované prostředí. Obnovte stránku v Chromu nebo Edge. Rychlý převod Wordu funguje i bez něj.');
  const own=new AbortController();operation=own;
  let stage='download';
  try{
    if(!converter?.isReady()){
      if(!loading)loading=(async()=>{
        const downloadTimer=setTimeout(()=>own.abort(),600000);
        try{await stageRuntime(own.signal,onProgress);}finally{clearTimeout(downloadTimer);}
        own.signal.throwIfAborted();stage='initialize';
        onProgress({phase:'initialize',percent:70,message:'Spouštím kompatibilní převodník…',detail:'Převodník je stažený. Nyní se připravuje v prohlížeči.'});
        const {WorkerBrowserConverter,createWasmPaths}=await import('@matbee/libreoffice-converter/browser');
        const base=new URL('runtime/',document.baseURI).href;
        converter=new WorkerBrowserConverter({...createWasmPaths(base),browserWorkerJs:base+'browser.worker.js'});
        await converter.initialize();
      })();
      await loading;
    }
    own.signal.throwIfAborted();stage='convert';
    onProgress({phase:'convert',percent:85,message:'Převádím dokument…',detail:file.name});
    return (await converter.convert(new Uint8Array(await file.arrayBuffer()),{outputFormat:'pdf',inputFormat:file.name.split('.').pop().toLowerCase()},'document.'+file.name.split('.').pop().toLowerCase())).data;
  }catch(error){
    if(operation!==own)throw error;
    stopCompatibility();
    if(/timeout|timed out|abort/i.test(error.message))throw fail(stage==='download'?'Stahování kompatibilního převodníku se nedokončilo. Nejde o velikost vašeho dokumentu. Zkuste rychlý převod Wordu nebo lepší připojení.':stage==='initialize'?'Kompatibilní převodník se nepodařilo spustit včas. Nejde o velikost vašeho dokumentu. Zkuste rychlý převod Wordu nebo jiný prohlížeč.':'Kompatibilní převod tohoto dokumentu překročil časový limit. Zkuste jej uložit do PDF v původní aplikaci.');
    if(/fetch|network|download/i.test(error.message))throw fail('Kompatibilní převodník se nepodařilo stáhnout. Zkontrolujte připojení; běžný Word lze převést rychlým režimem bez velkého stahování.');
    throw error;
  }finally{if(operation===own)operation=null;}
}
