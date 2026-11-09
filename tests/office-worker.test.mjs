import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {PDFDocument} from 'pdf-lib';
import {textToDocx} from '../src/fast-office-core.js';

test('the browser worker protocol completes using only self-hosted fonts',async()=>{
  const worker=new Worker(new URL('./office-worker-harness.mjs',import.meta.url),{workerData:{bytes:textToDocx(new TextEncoder().encode('Žádost\fDruhá strana')),ext:'docx',base:'https://spojeno.test/'}});
  const phases=[];
  try{
    const result=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Worker timeout')),15000);
      worker.on('message',data=>{
        if(data.type==='progress')phases.push(data.info.phase);
        if(data.type==='error'){clearTimeout(timer);reject(new Error(data.message));}
        if(data.type==='complete'){clearTimeout(timer);resolve(data);}
      });
      worker.on('error',error=>{clearTimeout(timer);reject(error);});
    });
    assert.equal((await PDFDocument.load(result.bytes)).getPageCount(),2);
    assert.deepEqual(phases,['parse','fonts','complete']);
  }finally{await worker.terminate();}
});
