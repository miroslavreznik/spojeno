let converter;
let initializing;
function timeout(promise,ms) {
  let timer;
  return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Conversion timeout')),ms);})]).finally(()=>clearTimeout(timer));
}
export function stopOffice() {
  // Terminate synchronously, including when LibreOffice is still compiling.
  if(converter?.worker) converter.worker.terminate();
  converter=null;initializing=null;
}
export async function convertOffice(file,onProgress) {
  if(!crossOriginIsolated || typeof SharedArrayBuffer==='undefined') throw new Error('Pro převod Wordu je potřeba moderní prohlížeč a povolené služby webu. Otevřete aplikaci znovu v Chromu nebo Edge; případně soubor uložte do PDF.');
  if(!converter?.isReady()) {
    if(!initializing) initializing=(async()=>{
      const {WorkerBrowserConverter,createWasmPaths}=await import('@matbee/libreoffice-converter/browser');
      const base=new URL('runtime/',document.baseURI).href;
      converter=new WorkerBrowserConverter({...createWasmPaths(base),browserWorkerJs:base+'browser.worker.js',onProgress:info=>onProgress(info)});
      await timeout(converter.initialize(),300000);
    })();
    try{await initializing;}catch(error){stopOffice();throw error;}
  }
  const local=converter;
  try{
    const converted=await timeout(local.convert(new Uint8Array(await file.arrayBuffer()),{outputFormat:'pdf',inputFormat:file.name.split('.').pop().toLowerCase()},'document.'+file.name.split('.').pop().toLowerCase()),120000);
    return converted.data;
  }catch(error){stopOffice();throw error;}
}
