export function normalizeHex(value){
  const text=String(value).trim().replace(/^#/,'');
  if(/^[a-f\d]{3}$/i.test(text))return '#'+[...text].map(c=>c+c).join('').toUpperCase();
  if(/^[a-f\d]{6}$/i.test(text))return '#'+text.toUpperCase();
  throw Error('Enter a 3- or 6-digit HEX colour.');
}
export function describe(value){
  const hex=normalizeHex(value),rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const [r,g,b]=rgb.map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
  const hue=d===0?0:60*(max===r?((g-b)/d+6)%6:max===g?(b-r)/d+2:(r-g)/d+4);
  const h=Math.round(hue)%360,s=Math.round((d===0?0:d/(1-Math.abs(2*l-1)))*100),light=Math.round(l*100);
  const linear=rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),lum=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
  return{hex,rgb,hsl:[h,s,light],css:{hex,rgb:`rgb(${rgb.join(', ')})`,hsl:`hsl(${h}, ${s}%, ${light}%)`},ink:lum>.179?'#181818':'#FFFFFF'};
}
export function swatchEntries(entries,prefix){
  return entries.filter(([key,value])=>key.replace(/^\//,'').startsWith(prefix)&&value&&/^#[A-F\d]{6}$/.test(value.hex)&&Number.isFinite(value.at)).map(([key,value])=>({key,...value})).sort((a,b)=>b.at-a.at||a.hex.localeCompare(b.hex));
}
