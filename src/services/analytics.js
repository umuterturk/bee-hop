function buildId(){
  try{return __BEEHOP_BUILD_ID__;}
  catch{return 'local';}
}
export function track(name,props={}){
  const detail={name,build:buildId(),...props};
  try{globalThis.dispatchEvent?.(new CustomEvent('bee-hop-event',{detail}));}
  catch{/* Analytics must never block a move. */}
}
