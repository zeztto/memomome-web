import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

const data=new Map<string,string>();
const key='web-notepad-saved-memos';
let failMemoRead=false;let protectedWrites=0;let protectedRemoves=0;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(itemKey:string)=>{if(itemKey===key&&failMemoRead)throw new DOMException('Synthetic protected-key read denied','SecurityError');return data.get(itemKey)??null},setItem:(itemKey:string,value:string)=>{if(itemKey===key)protectedWrites++;data.set(itemKey,value)},removeItem:(itemKey:string)=>{if(itemKey===key)protectedRemoves++;data.delete(itemKey)}}});
Object.defineProperty(globalThis,'window',{configurable:true,value:{confirm:()=>true}});
const {useMemoStorage}=await import('../src/app/hooks/useMemoStorage');
function mountMemo(){
 let current:any;
 function Probe(){current=useMemoStorage();return null;}
 let renderer:any;act(()=>{renderer=create(createElement(Probe))});
 return {get current(){return current},close:()=>act(()=>renderer.unmount())};
}
const memo={id:'test-only',title:'격리 제목',content:'격리 내용',createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'};

test('loading corrupt memo storage blocks subsequent save and preserves exact original bytes',()=>{
 for(const raw of ['{','{}','null','[null]','']){
  data.clear();data.set(key,raw);const h=mountMemo();
  let saved:boolean;act(()=>{saved=h.current.saveMemo('새 제목','새 내용')});
  assert.equal(saved!,false);assert.equal(data.get(key),raw);
  assert.ok(h.current.storageError);
  h.close();
 }
});

test('corruption after load blocks overwrite and deletion without replacing raw bytes',()=>{
 data.clear();data.set(key,JSON.stringify([memo]));const h=mountMemo();
 act(()=>h.current.loadMemo(memo));
 data.set(key,'{corrupt bytes');
 let saved:boolean;act(()=>{saved=h.current.overwriteMemo('수정 제목','수정 내용')});
 assert.equal(saved!,false);assert.equal(data.get(key),'{corrupt bytes');
 act(()=>h.current.deleteMemo(memo.id));assert.equal(data.get(key),'{corrupt bytes');
 assert.ok(h.current.storageError);h.close();
});

test('valid storage continues to support save, overwrite and delete',()=>{
 data.clear();const h=mountMemo();let saved:boolean;
 act(()=>{saved=h.current.saveMemo('유효 제목','유효 내용')});assert.equal(saved!,true);
 const record=JSON.parse(data.get(key)!)[0];
 act(()=>{saved=h.current.overwriteMemo('수정 제목','수정 내용')});assert.equal(saved!,true);
 assert.equal(JSON.parse(data.get(key)!)[0].content,'수정 내용');
 act(()=>h.current.deleteMemo(record.id));assert.deepEqual(JSON.parse(data.get(key)!),[]);
 h.close();
});


test('actual app SafeStorage read failure reaches hook error state and blocks subsequent save',()=>{
 data.clear();const raw=JSON.stringify([memo]);data.set(key,raw);protectedWrites=0;protectedRemoves=0;failMemoRead=true;
 const h=mountMemo();let saved:boolean;
 act(()=>{saved=h.current.saveMemo('새 제목','새 내용')});
 assert.equal(saved!,false);assert.ok(h.current.storageError);
 assert.equal(protectedWrites,0);assert.equal(protectedRemoves,0);assert.equal(data.get(key),raw);
 h.close();failMemoRead=false;
});

test('actual app SafeStorage late read failure blocks overwrite and delete without changing original bytes',()=>{
 failMemoRead=false;data.clear();const raw=JSON.stringify([memo]);data.set(key,raw);const h=mountMemo();
 act(()=>h.current.loadMemo(memo));protectedWrites=0;protectedRemoves=0;failMemoRead=true;let saved:boolean;
 act(()=>{saved=h.current.overwriteMemo('수정 제목','수정 내용')});
 assert.equal(saved!,false);act(()=>h.current.deleteMemo(memo.id));
 assert.ok(h.current.storageError);assert.equal(protectedWrites,0);assert.equal(protectedRemoves,0);assert.equal(data.get(key),raw);
 h.close();failMemoRead=false;
});
