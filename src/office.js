let active;
let compat;
export const userError=message=>Object.assign(new Error(message),{userFacing:true});
export function stopOffice(){
  if(active){active.stop();active=null;}
  compat?.stopCompatibility();
}
export async function convertOffice(file,onProgress,mode='fast'){
  if(mode==='compatible'){
    compat=await import('./office-compat.js');
    return {bytes:await compat.convertCompatibility(file,onProgress),losses:[]};
  }
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['doc','docx','txt'].includes(ext)) throw userError('Pro ODT a RTF zvolte kompatibilní převod. Velký převodník se bez této volby nestáhne.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  onProgress({phase:'starting',percent:5,message:'Načítám malý převodník Wordu…'});
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./office.worker.js',import.meta.url),{type:'module'});
    let settled=false;
    const operation={stop:()=>finish(new DOMException('Převod zrušen','AbortError'))};
    const timer=setTimeout(()=>finish(userError('Rychlý převod dokumentu se nedokončil do dvou minut. Zkuste kompatibilní převod nebo dokument uložte do PDF ve Wordu.')),120000);
    function finish(error,result){
      if(settled)return;settled=true;clearTimeout(timer);worker.terminate();
      if(active===operation)active=null;
      if(error)reject(error);else resolve(result);
    }
    active=operation;
    worker.onmessage=({data})=>{
      if(data.type==='progress')onProgress(data.info);
      else if(data.type==='complete')finish(null,{bytes:data.bytes,losses:data.losses});
      else {
        const msg=data.message||'';
        if(/password|encrypt/i.test(msg))finish(userError('Word dokument je chráněný heslem. Nejprve jej odemkněte v původní aplikaci.'));
        else if(/font|fetch|download|network/i.test(msg))finish(userError('Nepodařilo se načíst písma převodníku. Zkontrolujte připojení a zkuste to znovu.'));
        else finish(userError('Rychlý převod tento dokument nedokáže zpracovat. Zkuste kompatibilní převod nebo jej uložte do PDF ve Wordu.'));
      }
    };
    worker.onerror=()=>finish(userError('Malý převodník se nepodařilo načíst. Obnovte stránku a zkuste to znovu.'));
    worker.postMessage({bytes,ext,base:document.baseURI},[bytes.buffer]);
  });
}
