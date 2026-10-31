import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHex,describe,swatchEntries} from '../web/colors.mjs';
import {pickScreen} from '../web/picker.mjs';
test('sRGB conversion covers primaries, grayscale and hue wrap',()=>{
  assert.equal(normalizeHex(' aBc '),'#AABBCC');assert.equal(normalizeHex('b9c2cd'),'#B9C2CD');
  for(const bad of ['red','#12345678','#xyz','12345',''])assert.throws(()=>normalizeHex(bad));
  for(const [hex,rgb,hsl] of [['#FF0000',[255,0,0],[0,100,50]],['#00FF00',[0,255,0],[120,100,50]],['#0000FF',[0,0,255],[240,100,50]],['#000000',[0,0,0],[0,0,0]],['#FFFFFF',[255,255,255],[0,0,100]],['#FF00FF',[255,0,255],[300,100,50]]]){
    assert.deepEqual(describe(hex).rgb,rgb);assert.deepEqual(describe(hex).hsl,hsl);
  }
  assert.equal(describe('#FFFFFF').ink,'#181818');assert.equal(describe('#000000').ink,'#FFFFFF');
});
test('colour entries ignore unrelated or invalid data and sort most recent first',()=>{
  assert.deepEqual(swatchEntries([['/current','#FFFFFF'],['/pin:#FFFFFF',{hex:'#FFFFFF',at:1}],['/pick:#000000',{hex:'#000000',at:2}],['/pick:bad',{hex:'bad',at:3}],['/pick:#FFFFFF',{hex:'#FFFFFF',at:4}]],'pick:').map(i=>i.hex),['#FFFFFF','#000000']);
});
test('screen picking starts synchronously, returns native pixel and cancellation adds no colour',async()=>{
  const controller=new AbortController();let started=false;
  class Native{open({signal}){started=true;assert.equal(signal,controller.signal);return Promise.resolve({sRGBHex:'#abc123'});}}
  const promise=pickScreen({EyeDropper:Native,signal:controller.signal});assert.equal(started,true);assert.equal(await promise,'#abc123');
  class Cancelled{open(){return Promise.reject(new DOMException('Cancelled','AbortError'));}}
  assert.equal(await pickScreen({EyeDropper:Cancelled}),null);
  class Failed{open(){return Promise.reject(new DOMException('Denied','NotAllowedError'));}}
  await assert.rejects(pickScreen({EyeDropper:Failed}),{name:'NotAllowedError'});
  await assert.rejects(pickScreen({}),/unavailable/);
});
