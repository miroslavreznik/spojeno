import './style.css';
import {createIcons,Layers2,ShieldCheck,Image,Check,ArrowUpRight,Upload,ListOrdered,FileCheck2,Combine,ArrowRight,Download,LockKeyhole,Sun,Plus,ArrowUp,ArrowDown,RotateCw,X} from 'lucide';
const icons={Layers2,ShieldCheck,Image,Check,ArrowUpRight,Upload,ListOrdered,FileCheck2,Combine,ArrowRight,Download,LockKeyhole,Sun,Plus,ArrowUp,ArrowDown,RotateCw,X};
import {OFFICE,IMAGES,extension,validate,cleanFilename,friendlyError,readPdf,imagesToPdf,mergePdfs} from './engine.js';
import {convertOffice,stopOffice} from './office.js';
const $=id=>document.getElementById(id);
let items=[],busy=false,dragId=null,outputUrl=null,job=0;
const megabytes = bytes => bytes<1024*1024 ? Math.max(.1,bytes/1024).toLocaleString('cs-CZ',{maximumFractionDigits:0})+' kB' : (bytes/1024/1024).toLocaleString('cs-CZ',{maximumFractionDigits:1})+' MB';
const plural = n => n===1?'strana':n<5?'strany':'stran';
const icon = name => {const i=document.createElement('i');i.dataset.lucide=name;return i;};
const paintIcons=()=>createIcons({icons});
function notice(message=''){ $('notice').textContent=message;$('notice').hidden=!message; }
function resetResult(){if(outputUrl)URL.revokeObjectURL(outputUrl);outputUrl=null;$('result').hidden=true;$('progress-box').hidden=true;}
function action(name,title,fn,disabled=false){const button=document.createElement('button');button.type='button';button.className='icon-button';button.title=title;button.setAttribute('aria-label',title);button.disabled=disabled||busy;button.append(icon(name));button.onclick=fn;return button;}
function render(){
  document.body.classList.toggle('busy',busy);
  $('file-list').replaceChildren();
  items.forEach((item,index)=>{
    const row=document.createElement('li');row.className='file-row'+(item.error?' failed':'');row.draggable=!busy;row.dataset.id=item.id;
    const number=document.createElement('span');number.className='file-number';number.textContent=String(index+1).padStart(2,'0');
    const badge=document.createElement('span');badge.className='file-badge '+(OFFICE.has(item.ext)?'office':IMAGES.has(item.ext)?'image':'');badge.textContent=item.ext.toUpperCase();
    const info=document.createElement('div');info.className='file-info';
    const name=document.createElement('span');name.className='file-name';name.textContent=item.file.name;name.title=item.file.name;
    const meta=document.createElement('div');meta.className='file-meta'+(item.error?' error':'');meta.textContent=item.error||[megabytes(item.file.size),item.pages?item.pages+' '+plural(item.pages):OFFICE.has(item.ext)?'Převede se do PDF':item.ext==='pdf'?'PDF dokument':'Obrázek / sken',item.rotation?item.rotation+'°':null].filter(Boolean).join(' · ');
    info.append(name,meta);
    const actions=document.createElement('div');actions.className='file-actions';
    actions.append(action('arrow-up','Posunout nahoru: '+item.file.name,()=>move(index,index-1),index===0),action('arrow-down','Posunout dolů: '+item.file.name,()=>move(index,index+1),index===items.length-1),action('rotate-cw','Otočit všechny stránky o 90°: '+item.file.name,()=>{item.rotation=(item.rotation+90)%360;resetResult();render();}),action('x','Odebrat: '+item.file.name,()=>{items=items.filter(i=>i.id!==item.id);resetResult();render();}));
    row.append(number,badge,info,actions);
    row.ondragstart=e=>{if(busy){e.preventDefault();return;}dragId=item.id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',item.id);row.classList.add('dragging');};
    row.ondragend=()=>{dragId=null;document.querySelectorAll('.dragging,.drop-target').forEach(el=>el.classList.remove('dragging','drop-target'));};
    row.ondragover=e=>{if(dragId&&!busy){e.preventDefault();e.stopPropagation();row.classList.add('drop-target');}};
    row.ondragleave=()=>row.classList.remove('drop-target');
    row.ondrop=e=>{if(!dragId||busy)return;e.preventDefault();e.stopPropagation();move(items.findIndex(i=>i.id===dragId),index);dragId=null;};
    $('file-list').append(row);
  });
  $('count').textContent=items.length+' / 10';$('stat-count').textContent=items.length;$('stat-size').textContent=items.length?megabytes(items.reduce((s,i)=>s+i.file.size,0)):'0 MB';
  $('list-heading').hidden=!items.length;$('empty-hint').hidden=!!items.length;$('clear').hidden=!items.length;
  document.querySelector('.files-panel').classList.toggle('has-files',!!items.length);
  $('dropzone').classList.toggle('full',items.length===10);
  $('dropzone').disabled=busy||items.length===10;
  $('dropzone').querySelector('strong').textContent=items.length===10?'Máte přidáno všech 10 souborů':items.length?'Přidat další soubory':'Přetáhněte sem soubory';
  $('convert').disabled=busy||!items.length;
  $('button-hint').textContent=busy?'Dokumenty zpracovává váš prohlížeč.':!items.length?'Přidejte první soubor a můžeme začít.':items.some(i=>OFFICE.has(i.ext))?'První převod Wordu stáhne převodník (~250 MB).':'Bez odesílání souborů. Bez vodoznaku.';
  paintIcons();
}
function move(from,to){if(busy||from<0||to<0||to>=items.length)return;const [item]=items.splice(from,1);items.splice(to,0,item);resetResult();render();}
async function addFiles(files){
  if(busy)return;resetResult();const errors=[];
  for(const file of files){
    const error=validate(file,items);
    if(error){errors.push(file.name+': '+error);continue;}
    if(items.some(i=>i.file.name===file.name&&i.file.size===file.size&&i.file.lastModified===file.lastModified)){errors.push(file.name+': Soubor už je přidaný.');continue;}
    items.push({id:crypto.randomUUID(),file,ext:extension(file.name),rotation:0,pages:null,error:null});
  }
  notice(errors.join('\n'));render();
}
$('dropzone').onclick=()=>$('file-input').click();
$('file-input').onchange=e=>{addFiles([...e.target.files]);e.target.value='';};
let depth=0;
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';}});
document.addEventListener('drop',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();depth=0;$('dropzone').classList.remove('drag-over');addFiles([...e.dataTransfer.files]);}});
$('dropzone').ondragenter=e=>{if(e.dataTransfer.types.includes('Files')&&!busy){e.preventDefault();depth++;$('dropzone').classList.add('drag-over');}};
$('dropzone').ondragleave=()=>{if(--depth<=0){depth=0;$('dropzone').classList.remove('drag-over');}};
$('clear').onclick=()=>{if(busy)return;items=[];notice();resetResult();render();};
$('image-layout').onchange=()=>{items.forEach(i=>{if(IMAGES.has(i.ext))delete i.pdf;});resetResult();};
$('output-name').oninput=()=>{if(outputUrl)$('download').download=cleanFilename($('output-name').value);};
function progress(value,message,detail=''){$('progress').value=value;$('percent').textContent=Math.round(value)+' %';$('progress-message').textContent=message;$('progress-detail').textContent=detail;}
function cancel(){job++;busy=false;stopOffice();resetResult();notice('Převod byl zrušen. Soubory zůstaly připravené pro další pokus.');render();}
$('cancel').onclick=cancel;
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
$('convert').onclick=async()=>{
  if(busy||!items.length)return;
  const token=++job;busy=true;notice();resetResult();items.forEach(i=>i.error=null);render();
  $('progress-box').hidden=false;progress(0,'Připravuji dokumenty…');
  let current;
  try{
    const parts=[];
    for(let index=0;index<items.length;index++){
      current=items[index];progress(index/items.length*85,'Zpracovávám '+(index+1)+' z '+items.length,current.file.name);
      await new Promise(resolve=>requestAnimationFrame(resolve));
      if(token!==job)return;
      let bytes=current.pdf;
      if(!bytes){
        if(current.ext==='pdf') bytes=new Uint8Array(await current.file.arrayBuffer());
        else if(IMAGES.has(current.ext)) bytes=await imagesToPdf(current.file,$('image-layout').value);
        else bytes=await convertOffice(current.file,info=>{if(token!==job)return;progress(index/items.length*85,'Spouštím převodník dokumentů…',info.phase==='ready'?'Převodník je připraven.':'První spuštění může trvat několik minut. Stahuje se asi 250 MB a připravuje LibreOffice. Soubory neopouštějí zařízení.');});
        if(token!==job)return;
        const source=await readPdf(bytes);current.pages=source.getPageCount();current.pdf=bytes;
      }
      parts.push({bytes,rotation:current.rotation});
    }
    if(token!==job)return;
    progress(90,'Spojuji do jednoho PDF…');
    const result=await mergePdfs(parts);
    if(token!==job)return;
    outputUrl=URL.createObjectURL(new Blob([result.bytes],{type:'application/pdf'}));
    $('download').href=outputUrl;$('download').download=cleanFilename($('output-name').value);
    $('result-info').textContent=result.pages+' '+plural(result.pages)+' · '+megabytes(result.bytes.length)+' · Připraveno ke stažení';
    $('progress-box').hidden=true;$('result').hidden=false;
    $('button-hint').textContent='PDF je připravené ke stažení níže.';
  }catch(error){
    if(token!==job)return;
    const direct=/příliš velký|milionů|1 000|moderní prohlížeč|formulář/.test(error.message);
    const message=direct?error.message:friendlyError(error);
    if(current)current.error=message;
    notice((current?current.file.name+': ':'')+message+'\nNevytvořili jsme neúplné PDF. Opravte nebo odeberte problematický soubor a zkuste to znovu.');
    $('progress-box').hidden=true;
  }finally{if(token===job){busy=false;render();}}
};
// Complete cross-origin isolation before enabling uploads: never reload with selected documents.
async function boot(){
  try{
    if('serviceWorker' in navigator && isSecureContext){
      await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname});
      await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('SW timeout')),7000))]);
      if(!crossOriginIsolated&&!sessionStorage.getItem('spojeno-isolation-reload')){
        sessionStorage.setItem('spojeno-isolation-reload','1');
        if(!navigator.serviceWorker.controller) await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise(resolve=>setTimeout(resolve,2500))]);
        if(navigator.serviceWorker.controller){location.reload();return;}
      }
    }
  }catch{/* PDF and image merging remain available without Office support. */}
  $('initializing').hidden=true;render();
}
paintIcons();boot();
