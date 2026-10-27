import test from 'node:test';
import assert from 'node:assert/strict';
import { SafeStorage } from '../src/app/utils/storage';
import { persistSavedMemos, SAVED_MEMOS_KEY } from '../src/app/utils/memoValidation';

const memo={id:'test-only-read',title:'격리 제목',content:'원본 bytes 보존',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};
function actualAdapter(initial:string|null, failRead:boolean) {
 const data=new Map<string,string>();if(initial!==null)data.set(SAVED_MEMOS_KEY,initial);
 const calls={writes:0,removes:0};
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(key:string)=>{if(key===SAVED_MEMOS_KEY&&failRead)throw new DOMException('Synthetic protected-key read denied','SecurityError');return data.get(key)??null},
  setItem:(key:string,value:string)=>{if(key===SAVED_MEMOS_KEY)calls.writes++;data.set(key,value)},
  removeItem:(key:string)=>{if(key===SAVED_MEMOS_KEY)calls.removes++;data.delete(key)}
 }});
 const storage=new SafeStorage();assert.equal(storage.isMemoryMode(),false);
 return {storage,data,calls};
}

test('actual SafeStorage read denial blocks actual persist helper with zero protected-key writes/removes',()=>{
 const raw=JSON.stringify([memo]);const h=actualAdapter(raw,true);
 const result=persistSavedMemos(h.storage,[{...memo,content:'new content'}]);
 assert.equal(result.success,false);assert.equal(result.blocked,true);
 assert.equal(h.calls.writes,0);assert.equal(h.calls.removes,0);assert.equal(h.data.get(SAVED_MEMOS_KEY),raw);
});

test('actual SafeStorage missing key remains a successful read and allows initial save',()=>{
 const h=actualAdapter(null,false);const result=persistSavedMemos(h.storage,[memo]);
 assert.equal(result.success,true);assert.equal(h.calls.writes,1);
 assert.deepEqual(JSON.parse(h.data.get(SAVED_MEMOS_KEY)!),[memo]);
});
