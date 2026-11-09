import { PDFDocument, degrees } from 'pdf-lib';
export const OFFICE = new Set(['doc','docx','odt','rtf','txt']);
export const IMAGES = new Set(['jpg','jpeg','png','webp','bmp','tif','tiff']);
export const SUPPORTED = new Set(['pdf',...OFFICE,...IMAGES]);
export const MAX_FILES=10, MAX_FILE=50*1024*1024, MAX_TOTAL=150*1024*1024, MAX_OFFICE=25*1024*1024;
export const extension = name => name.split('.').pop().toLowerCase();
export function validate(file, items) {
  if(!SUPPORTED.has(extension(file.name))) return 'Tento formát zatím nepodporujeme. Použijte PDF, Word nebo obrázek.';
  if(!file.size) return 'Soubor je prázdný.';
  if(items.length>=MAX_FILES) return 'Můžete přidat nejvýše 10 souborů.';
  if(file.size>MAX_FILE) return 'Soubor překračuje limit 50 MB.';
  if(OFFICE.has(extension(file.name)) && file.size>MAX_OFFICE) return 'Limit pro textové dokumenty je 25 MB.';
  if(items.reduce((s,i)=>s+i.file.size,0)+file.size>MAX_TOTAL) return 'Celková velikost překračuje 150 MB.';
  return null;
}
export const cleanFilename = value => (value.trim().replace(/\.pdf$/i,'').replace(/[<>:"/\\|?*\x00-\x1F]/g,'-').replace(/[. ]+$/g,'').slice(0,100) || 'spojene-dokumenty')+'.pdf';
export function friendlyError(error) {
  const msg=String(error?.message||error);
  if(/encrypt|password/i.test(msg)) return 'Dokument je chráněný heslem. Nejprve jej odemkněte ve své PDF nebo Word aplikaci.';
  if(/memory|allocation|out of bounds/i.test(msg)) return 'Prohlížeči došla paměť. Zkuste menší soubor nebo Chrome či Edge na počítači.';
  if(/fetch|network|download|load.*script/i.test(msg)) return 'Převodník se nepodařilo stáhnout. Zkontrolujte připojení a zkuste to znovu.';
  if(/timeout|timed out/i.test(msg)) return 'Převod trval příliš dlouho. Zkuste menší soubor nebo jej nejprve uložte do PDF.';
  if(/invalid|parse|corrupt|header|document.*load/i.test(msg)) return 'Soubor nelze přečíst. Může být poškozený nebo mít nesprávnou příponu.';
  return 'Soubor se nepodařilo převést. Zkuste jej otevřít v původní aplikaci a uložit do PDF.';
}
export async function readPdf(bytes) {
  const doc=await PDFDocument.load(bytes,{updateMetadata:false});
  if(doc.isEncrypted) throw new Error('Encrypted PDF');
  if(!doc.getPageCount()) throw new Error('Invalid empty PDF');
  return doc;
}
const checkPixels = (w,h) => {
  if(!w || !h || w*h>50_000_000 || w>30000 || h>30000) throw new Error('Obrázek je příliš velký (maximum 50 milionů pixelů). Zmenšete jej a přidejte znovu.');
};
async function canvasImage(doc, image, layout, lossless=false) {
  const w=image.width,h=image.height;
  checkPixels(w,h);
  const scale=Math.min(1,6000/Math.max(w,h));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(w*scale);canvas.height=Math.round(h*scale);
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,lossless?'image/png':'image/jpeg',.96));
  if(!blob) throw new Error('Image conversion failed');
  const bytes=await blob.arrayBuffer();
  const embedded=lossless?await doc.embedPng(bytes):await doc.embedJpg(bytes);
  const landscape=w>h;
  const [pw,ph]=layout==='original'?[w*.75,h*.75]:(landscape?[841.89,595.28]:[595.28,841.89]);
  const margin=layout==='original'?0:20;
  const fit=Math.min((pw-2*margin)/embedded.width,(ph-2*margin)/embedded.height);
  const dw=embedded.width*fit,dh=embedded.height*fit;
  const page=doc.addPage([pw,ph]);
  page.drawImage(embedded,{x:(pw-dw)/2,y:(ph-dh)/2,width:dw,height:dh});
  canvas.width=canvas.height=1;
}
export async function imagesToPdf(file, layout) {
  const ext=extension(file.name),doc=await PDFDocument.create();
  if(ext==='tif'||ext==='tiff') {
    const {default:UTIF}=await import('utif');
    const bytes=await file.arrayBuffer();
    const frames=UTIF.decode(bytes);
    if(!frames.length || frames.length>300) throw new Error('Invalid TIFF page count');
    for(const frame of frames){
      checkPixels(frame.t256?.[0],frame.t257?.[0]);
      UTIF.decodeImage(bytes,frame);
      const rgba=UTIF.toRGBA8(frame);
      const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
      canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),frame.width,frame.height),0,0);
      await canvasImage(doc,canvas,layout,true);
      canvas.width=canvas.height=1;delete frame.data;
    }
  } else {
    const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    try{await canvasImage(doc,bitmap,layout,ext==='png'||ext==='bmp');}finally{bitmap.close();}
  }
  return doc.save();
}
export async function mergePdfs(parts) {
  const result=await PDFDocument.create();
  for(const part of parts){
    const source=await readPdf(part.bytes);
    const form=source.getForm();
    if(form.hasXFA()) throw new Error('Tento PDF formulář používá XFA. Nejdříve jej v původní aplikaci vytiskněte do PDF a přidejte znovu.');
    if(form.getFields().length){
      try{form.flatten({updateFieldAppearances:false});}
      catch{throw new Error('Vyplněný PDF formulář nelze bezpečně zachovat. Nejdříve jej v původní aplikaci vytiskněte do PDF a přidejte znovu.');}
    }
    if(result.getPageCount()+source.getPageCount()>1000) throw new Error('Výsledek může mít nejvýše 1 000 stran. Rozdělte dokumenty do menších skupin.');
    const pages=await result.copyPages(source,source.getPageIndices());
    pages.forEach(page=>{if(part.rotation) page.setRotation(degrees((page.getRotation().angle+part.rotation)%360));result.addPage(page);});
  }
  result.setTitle('Spojené dokumenty');result.setCreator('Spojeno');result.setProducer('Spojeno · pdf-lib');
  return {bytes:await result.save(),pages:result.getPageCount()};
}
