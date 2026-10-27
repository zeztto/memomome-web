import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, useEffect, useState } from 'react';
import { act, create } from 'react-test-renderer';
import { useFindReplace } from '../src/app/hooks/useFindReplace';

function mountFindReplace(initial='alpha alpha') {
  let state: any;
  const calls={focus:0,ranges:[] as number[][]};
  const ref={current:{focus:()=>calls.focus++,setSelectionRange:(a:number,b:number)=>calls.ranges.push([a,b]),scrollTop:0,scrollHeight:100}};
  function Probe(){
    const [text,setText]=useState(initial);
    const manager=useFindReplace(text);
    useEffect(()=>manager.navigateToMatch(ref as any,text),[manager,text]);
    state={text,setText,manager};
    return null;
  }
  let renderer:any;act(()=>{renderer=create(createElement(Probe))});
  return {get state(){return state},calls,close:()=>act(()=>renderer.unmount())};
}

test('replace-all treats replacement dollar sequences as literal text',()=>{
  for(const replacement of ['$&', '$`', "$'", '$$']){
    const h=mountFindReplace();
    act(()=>h.state.manager.setSearchTerm('alpha'));
    act(()=>h.state.manager.setReplaceTerm(replacement));
    act(()=>h.state.manager.handleReplaceAll(h.state.text,h.state.setText));
    assert.equal(h.state.text,`${replacement} ${replacement}`);
    h.close();
  }
});

test('continuous search typing preserves input focus; explicit navigation selects matches',()=>{
  const h=mountFindReplace();
  for(const query of ['a','al','alp','alpha'])act(()=>h.state.manager.setSearchTerm(query));
  assert.equal(h.calls.focus,0);
  assert.deepEqual(h.calls.ranges,[]);
  act(()=>h.state.manager.handleNextMatch());
  assert.equal(h.calls.focus,1);assert.deepEqual(h.calls.ranges.at(-1),[6,11]);
  act(()=>h.state.manager.handlePrevMatch());
  assert.equal(h.calls.focus,2);assert.deepEqual(h.calls.ranges.at(-1),[0,5]);
  h.close();
});
