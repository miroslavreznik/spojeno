import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,degrees} from 'pdf-lib';
import {validate,cleanFilename,mergePdfs,readPdf} from '../src/engine.js';
const file=(name,size=100)=>({name,size,lastModified:1});
test('rejects unsupported, empty, oversized, too many and oversized total inputs',()=>{
  assert.match(validate(file('data.exe'),[]),/formát/);
  assert.match(validate(file('data.pdf',0),[]),/prázdný/);
  assert.match(validate(file('data.pdf',51*1024*1024),[]),/50 MB/);
  assert.match(validate(file('data.doc',26*1024*1024),[]),/25 MB/);
  assert.match(validate(file('data.pdf'),Array.from({length:10},()=>({file:file('x.pdf')}))),/10 souborů/);
  assert.match(validate(file('data.pdf',50*1024*1024),Array.from({length:3},()=>({file:file('x.pdf',40*1024*1024)}))),/150 MB/);
  for(const ext of ['pdf','jpg','jpeg','png','webp','bmp','tif','tiff','doc','docx','odt','rtf','txt']) assert.equal(validate(file('data.'+ext),[]),null);
});
test('produces safe PDF names, preserving Czech letters',()=>{
  assert.equal(cleanFilename(' Žádost a přílohy.pdf '),'Žádost a přílohy.pdf');
  assert.equal(cleanFilename(' /:*? '),'----.pdf');
  assert.equal(cleanFilename(''),'spojene-dokumenty.pdf');
});
test('merges every page in order, preserving dimensions and adding relative rotations',async()=>{
  const first=await PDFDocument.create();first.addPage([200,300]);first.addPage([400,500]).setRotation(degrees(90));
  const second=await PDFDocument.create();second.addPage([600,700]);
  const merged=await mergePdfs([{bytes:await second.save(),rotation:90},{bytes:await first.save(),rotation:180}]);
  assert.equal(merged.pages,3);
  const output=await readPdf(merged.bytes);
  assert.deepEqual(output.getPages().map(p=>[p.getWidth(),p.getHeight(),p.getRotation().angle]),[[600,700,90],[200,300,180],[400,500,270]]);
});
test('invalid PDF aborts the merge instead of returning a partial PDF',async()=>{
  const doc=await PDFDocument.create();doc.addPage();
  await assert.rejects(mergePdfs([{bytes:await doc.save()},{bytes:new Uint8Array([1,2,3])}]));
});
test('filled PDF form values become visible page content',async()=>{
  const doc=await PDFDocument.create();const page=doc.addPage();
  const field=doc.getForm().createTextField('permit');field.setText('Building permit 123');field.addToPage(page);
  const result=await mergePdfs([{bytes:await doc.save()}]);
  const merged=await readPdf(result.bytes);
  assert.equal(merged.getPageCount(),1);
  assert.equal(merged.getForm().getFields().length,0);
  assert.ok(merged.getPage(0).node.Contents());
});
