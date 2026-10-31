// Call directly from a click/key handler: browser activation cannot survive awaits.
export async function pickScreen({EyeDropper,signal}){
  if(typeof EyeDropper!=='function')throw Error('Screen picking is unavailable in this browser.');
  try{return(await new EyeDropper().open({signal})).sRGBHex;}
  catch(error){if(error.name==='AbortError')return null;throw error;}
}
