import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PDFDocument} from 'pdf-lib';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {fastOffice,textToDocx,normalizeLegacyBullets} from '../src/fast-office-core.js';

const loaded=new Set();
const fontFetch=async url=>{
  const name=new URL(url).pathname.split('/').pop();
  const family=name.split('_')[0].toLowerCase(),suffix=name.slice(name.indexOf('_')+1,-4);
  const root=new URL('../node_modules/@expo-google-fonts/'+family+'/',import.meta.url);
  for(const relative of [suffix+'/'+name,name]){
    try{const bytes=await fs.readFile(new URL(relative,root));loaded.add(name);return new Response(bytes);}catch{}
  }
  return new Response(null,{status:404});
};
test('DOCX with Czech text and a real page break converts without network or a large runtime',async()=>{
  const text='Žádost o stavební povolení. Příliš žluťoučký kůň úpěl ďábelské ódy.\fDruhá strana příloh: ěščřžýáíéůúďťň.';
  const input=textToDocx(new TextEncoder().encode(text));
  const result=await fastOffice(input,'docx',fontFetch);
  const pdf=await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(),2);
  assert.equal(result.losses.filter(l=>l.severity==='dropped').length,0);
  assert.ok(loaded.size>0);
  assert.ok(result.bytes.length>1000);
  const task=getDocument({data:result.bytes.slice(),useSystemFonts:false});
  try{
    const independent=await task.promise;
    const first=(await (await independent.getPage(1)).getTextContent()).items.map(i=>i.str).join(' ');
    const second=(await (await independent.getPage(2)).getTextContent()).items.map(i=>i.str).join(' ');
    assert.match(first,/Příliš žluťoučký kůň úpěl ďábelské ódy/);
    assert.match(second,/ěščřžýáíéůúďťň/);
  }finally{await task.destroy();}
});
test('legacy DOC keeps both pages; compatibility limitations are surfaced',async()=>{
  const base64=await fs.readFile(new URL('fixtures/two-page.doc.base64',import.meta.url),'utf8');
  const result=await fastOffice(new Uint8Array(Buffer.from(base64,'base64')),'doc',fontFetch);
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(),2);
  assert.ok(result.losses.some(l=>l.severity==='degraded'));
});
test('TXT supports UTF-8, UTF-16 and Windows-1250 without an office runtime',async()=>{
  for(const bytes of [new TextEncoder().encode('Žádost\fPřílohy'),new Uint8Array([0xff,0xfe,...Buffer.from('Žádost\fPřílohy','utf16le')]),new Uint8Array([0x8e,0xe1,0x64,0x6f,0x73,0x74,0x0c,0x50,0xf8,0xed,0x6c,0x6f,0x68,0x79])]){
    const result=await fastOffice(bytes,'txt',fontFetch);
    assert.equal((await PDFDocument.load(result.bytes)).getPageCount(),2);
    assert.ok(!result.losses.some(l=>l.severity==='dropped'));
  }
});
test('malformed input fails rather than producing an empty PDF',async()=>{
  await assert.rejects(fastOffice(new Uint8Array([1,2,3]),'doc',fontFetch));
});
test('legacy bullet normalization is limited to the leading Symbol list-marker pattern',()=>{
  const flow={body:[{runs:[{text:'\uf0b7\tBod seznamu'},{text:'Běžný text \uf0b7 uvnitř'},{text:'•\tHotová odrážka'}]}]};
  normalizeLegacyBullets(flow);
  assert.deepEqual(flow.body[0].runs.map(r=>r.text),['•\tBod seznamu','Běžný text \uf0b7 uvnitř','•\tHotová odrážka']);
});
