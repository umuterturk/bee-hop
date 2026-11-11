export function buzz(ms,enabled){
  if(!enabled||typeof navigator==='undefined'||typeof navigator.vibrate!=='function')return;
  try{navigator.vibrate(ms);}catch{/* Haptics are optional. */}
}
