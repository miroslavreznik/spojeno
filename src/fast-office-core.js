import { Ream } from 'reamkit';
import { zipSync, strToU8 } from 'fflate';

export function textToDocx(bytes) {
  let text;
  if(bytes[0]===0xff&&bytes[1]===0xfe) text=new TextDecoder('utf-16le').decode(bytes.subarray(2));
  else if(bytes[0]===0xfe&&bytes[1]===0xff) text=new TextDecoder('utf-16be').decode(bytes.subarray(2));
  else {try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1250').decode(bytes);}}
  const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const paragraphs=text.replace(/\r\n?/g,'\n').split('\n').map(line=>'<w:p>'+line.split('\f').map(part=>'<w:r><w:t xml:space="preserve">'+escape(part)+'</w:t></w:r>').join('<w:r><w:br w:type="page"/></w:r>')+'</w:p>').join('');
  return zipSync({
    '[Content_Types].xml':strToU8('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
    '_rels/.rels':strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
    'word/document.xml':strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paragraphs+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>')
  });
}

// Shared by the browser worker and integration tests. Fonts are supplied by the app;
// neither document contents nor font names are sent to a third-party service.
export async function fastOffice(bytes,ext,fontFetch,onProgress=()=>{}) {
  onProgress({phase:'parse',percent:20,message:'Čtu dokument…'});
  const doc=Ream.parse(ext==='txt'?textToDocx(bytes):bytes);
  if(!['doc','docx'].includes(doc.format)) throw new Error('UNSUPPORTED_WORD_FORMAT');
  if(doc.format==='doc') normalizeLegacyBullets(doc.flow);
  onProgress({phase:'fonts',percent:40,message:'Připravuji písma…'});
  const result=await doc.convertWithReport('pdf',{fontFetch});
  onProgress({phase:'complete',percent:100,message:'Dokument je převedený.'});
  return {bytes:result.bytes,losses:result.losses};
}

// Word's legacy Symbol bullet is sometimes stored as a private-use glyph followed
// by a tab, without its font. Normalize only that list-marker pattern, never prose.
export function normalizeLegacyBullets(flow) {
  const seen=new WeakSet();
  function visit(node){
    if(!node||typeof node!=='object'||ArrayBuffer.isView(node)||node instanceof ArrayBuffer||seen.has(node))return;
    seen.add(node);
    if(typeof node.text==='string'&&/^\uf0b7\t/.test(node.text))node.text=node.text.replace(/^\uf0b7/,'•');
    for(const value of Object.values(node))visit(value);
  }
  visit(flow);
}
