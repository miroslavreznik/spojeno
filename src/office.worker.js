import {fastOffice} from './fast-office-core.js';
const families=['Arimo','Tinos','Cousine','Carlito','Caladea'];
const variants=['400Regular','700Bold','400Regular_Italic','700Bold_Italic'];
const allowed=new Set(families.flatMap(f=>variants.map(v=>f+'_'+v+'.ttf')));
self.onmessage=async ({data})=>{
  try{
    const fontFetch=async url=>{
      const name=new URL(url).pathname.split('/').pop();
      if(!allowed.has(name)) return new Response(null,{status:404});
      try{
        const response=await fetch(new URL('fonts/'+name,data.base),{signal:AbortSignal.timeout(45000)});
        if(!response.ok) throw new Error('Font HTTP '+response.status);
        return response;
      }catch{throw new Error('FONT_DOWNLOAD_FAILED');}
    };
    const result=await fastOffice(data.bytes,data.ext,fontFetch,info=>self.postMessage({type:'progress',info}));
    self.postMessage({type:'complete',...result},[result.bytes.buffer]);
  }catch(error){self.postMessage({type:'error',message:error.message,code:error.name});}
};
