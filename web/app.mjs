import {connect} from './sdk/browser.js';
import {normalizeHex,describe,swatchEntries} from './colors.mjs';
import {pickScreen} from './picker.mjs';
const $=id=>document.getElementById(id),nativeScreen=typeof window.EyeDropper==='function';
let ink,doc,off,current=describe('#b9c2cd'),controller,busy=false;
const setStatus=text=>{$('status').textContent=text;};
const error=err=>{setStatus(err.message||String(err));};
function entries(prefix){return swatchEntries(doc?.entries()||[],prefix);}
function paintCurrent(){
  $('preview').style.background=current.hex;$('preview').style.color=current.ink;$('preview').setAttribute('aria-label','Current colour '+current.hex);$('preview-hex').textContent=current.hex;
  if(document.activeElement!==$('hex'))$('hex').value=current.hex;
  $('rgb').textContent=current.rgb.join(', ');$('hsl').textContent=`${current.hsl[0]}°, ${current.hsl[1]}%, ${current.hsl[2]}%`;$('native').value=current.hex;
  $('save').textContent=doc?.get('pin:'+current.hex)?'Remove swatch':'Save swatch';$('save').setAttribute('aria-pressed',String(!!doc?.get('pin:'+current.hex)));
}
function paintList(prefix,id){
  const list=entries(prefix).slice(0,prefix==='pin:'?64:48),holder=$(id);holder.replaceChildren();$(id+'-empty').hidden=!!list.length;
  for(const item of list){const button=document.createElement('button');button.style.background=item.hex;button.style.setProperty('--swatch-ink',describe(item.hex).ink);button.title=item.hex;button.setAttribute('aria-label',`Select ${item.hex}`);button.setAttribute('aria-pressed',String(current.hex===item.hex));button.onclick=()=>void choose(item.hex,false).catch(error);holder.append(button);}
}
function paint(){paintCurrent();paintList('pin:','saved');paintList('pick:','recent');}
async function choose(value,remember=true){
  current=describe(value);$('hex').value=current.hex;$('hex').removeAttribute('aria-invalid');paint();
  if(!doc)return;
  await doc.set('current',current.hex);
  if(remember){await doc.set('pick:'+current.hex,{hex:current.hex,at:Date.now()});for(const item of entries('pick:').slice(48))await doc.delete(item.key);}
  paint();setStatus('Colour selected');
}
function openSystemPicker(){
  // Color inputs are permitted to open across origins; this delegates to the
  // platform UI (including its eyedropper where available), never screenshots.
  try{if($('native').showPicker)$('native').showPicker();else $('native').click();setStatus('Use the eyedropper in the system colour panel.');}catch(err){error(err);}
}
async function pick(){
  if(busy||!doc)return;
  if(!nativeScreen){openSystemPicker();return;}
  busy=true;controller=new AbortController();$('pick').disabled=true;setStatus('Click a pixel anywhere. Esc cancels.');
  try{const value=await pickScreen({EyeDropper:window.EyeDropper,signal:controller.signal});if(value)await choose(value);else setStatus('Picking cancelled');}
  catch(err){setStatus(err.name==='NotAllowedError'?'Click Pick anywhere to start the eyedropper.':err.message);}
  finally{busy=false;controller=null;$('pick').disabled=false;}
}
$('pick').onclick=pick;
$('native').addEventListener('input',()=>{current=describe($('native').value);paintCurrent();});
$('native').addEventListener('change',()=>void choose($('native').value).catch(error));
$('hex-form').onsubmit=event=>{event.preventDefault();try{const value=normalizeHex($('hex').value);void choose(value).catch(error);}catch(err){$('hex').setAttribute('aria-invalid','true');error(err);}};
$('save').onclick=async()=>{try{const key='pin:'+current.hex;if(doc.get(key)){await doc.delete(key);setStatus('Swatch removed');}else{if(entries('pin:').length>=64){setStatus('64 swatches saved. Remove one to make room.');return;}await doc.set(key,{hex:current.hex,at:Date.now()});setStatus('Swatch saved');}paint();}catch(err){error(err);}};
for(const button of document.querySelectorAll('[data-copy]'))button.onclick=async()=>{const value=current.css[button.dataset.copy];try{await navigator.clipboard.writeText(value);setStatus('Copied '+value);}catch{$('hex').focus();$('hex').select();setStatus('Clipboard unavailable. Select the value and copy it.');}};
document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.target.closest('input,textarea,select,[contenteditable=true]'))return;if(event.key.toLowerCase()==='p'){event.preventDefault();void pick();}});
addEventListener('pagehide',()=>{controller?.abort();off?.();void doc?.close();});
function localDocument(){
  const key='ink-color-picker-preview';let values={};try{values=JSON.parse(localStorage.getItem(key)||'{}');}catch{}const listeners=new Set();
  const emit=()=>{localStorage.setItem(key,JSON.stringify(values));for(const fn of listeners)fn({type:'change',local:true});};
  return{get:(key,fallback)=>values[key]??fallback,entries:()=>Object.entries(values),async set(key,value){values[key]=value;emit();},async delete(key){delete values[key];emit();},subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},async close(){listeners.clear();}};
}
async function boot(){
  if(parent!==window){ink=await connect();ink.ready();doc=await ink.state.open('color-picker');$('storage').textContent='Saved in Ink';ink.on('visibility',value=>{if(value.hidden)controller?.abort();});}
  else{doc=localDocument();$('storage').textContent='Local preview';}
  const saved=doc.get('current');if(saved){try{current=describe(saved);}catch{}}
  off=doc.subscribe(event=>{if(event.type!=='change')return;const value=doc.get('current');if(value&&event.local===false){try{current=describe(value);}catch{}}paint();});
  if(!nativeScreen){$('pick-label').textContent='Open colour picker';$('shortcut').hidden=true;$('support').textContent='Use the system panel’s eyedropper to sample another app. Direct screen picking is available in Chrome and Edge.';$('method').textContent='System picker · sRGB';}
  $('pick').disabled=$('native').disabled=$('save').disabled=false;paint();setStatus('Ready');
}
void boot().catch(error);
