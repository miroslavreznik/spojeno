// Only application/runtime responses are handled. User documents never enter this worker or cache.
const CACHE = 'spojeno-office-2.7.2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
const isolated = response => {
  if (response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy','require-corp');
  headers.set('Cross-Origin-Opener-Policy','same-origin');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
};
async function runtime(request,event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if(hit) return hit;
  const response = await fetch(request);
  if(!response.ok) throw new Error('Runtime download failed: '+response.status);
  // Cache only public conversion software, never documents.
  // Stream to the converter immediately instead of waiting for a complete
  // 50–100 MB cache write before the first byte can reach the caller.
  const saved=cache.put(request,response.clone()).catch(()=>{});
  event.waitUntil(saved);
  return response;
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  if(event.request.cache==='only-if-cached' && event.request.mode!=='same-origin') return;
  event.respondWith((async()=>{
    if(url.pathname.endsWith('/runtime/soffice.wasm')) {
      const manifest = await (await runtime(new Request(new URL('runtime/manifest.json',self.registration.scope)),event)).json();
      let index=0, reader;
      const stream=new ReadableStream({async pull(controller){
        try {
          while(true) {
            if(!reader) {
              if(index>=manifest.chunks.length){controller.close();return;}
              const part=manifest.chunks[index++];
              reader=(await runtime(new Request(new URL('runtime/'+part.name,self.registration.scope)),event)).body.getReader();
            }
            const {done,value}=await reader.read();
            if(done){reader=null;continue;}
            controller.enqueue(value);return;
          }
        } catch(error){controller.error(error);}
      }});
      return isolated(new Response(stream,{headers:{'Content-Type':'application/wasm','Content-Length':String(manifest.size)}}));
    }
    return isolated(await (url.pathname.includes('/runtime/') ? runtime(event.request,event) : fetch(event.request)));
  })());
});
