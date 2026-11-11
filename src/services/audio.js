let ctx=null;
let pad=null;

function audio(){
  const AudioCtx=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!AudioCtx)return null;
  if(!ctx)ctx=new AudioCtx();
  if(ctx.state==='suspended')ctx.resume();
  return ctx;
}
function tone(freq,duration,type='triangle',gain=0.045,slide=0){
  const ac=audio();
  if(!ac)return;
  const osc=ac.createOscillator();
  const amp=ac.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(freq,ac.currentTime);
  if(slide)osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),ac.currentTime+duration);
  amp.gain.setValueAtTime(gain,ac.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+duration);
  osc.connect(amp);amp.connect(ac.destination);
  osc.start();osc.stop(ac.currentTime+duration+0.02);
}
export function unlockAudio(){return audio();}
export function playCue(kind,enabled){
  if(!enabled)return;
  if(kind==='jump')tone(520,0.09,'triangle',0.04,240);
  else if(kind==='pollen')tone(980,0.07,'sine',0.05);
  else if(kind==='tunnel')tone(220,0.22,'sine',0.04,-80);
  else if(kind==='seed')tone(640,0.1,'triangle',0.04);
  else if(kind==='summon'){tone(440,0.16,'triangle',0.04);tone(660,0.18,'sine',0.03);}
  else if(kind==='undo')tone(340,0.08,'sine',0.03,-80);
  else if(kind==='win'){tone(523,0.28,'triangle',0.04);tone(659,0.32,'sine',0.03);tone(784,0.36,'sine',0.025);}
}
export function setMusic(on){
  if(!on){
    pad?.stop?.();
    pad=null;
    return;
  }
  const ac=audio();
  if(!ac||pad)return;
  const amp=ac.createGain();
  amp.gain.value=0.012;
  amp.connect(ac.destination);
  const nodes=[196,247,294].map(freq=>{
    const osc=ac.createOscillator();
    osc.type='sine';
    osc.frequency.value=freq;
    osc.connect(amp);
    osc.start();
    return osc;
  });
  pad={stop(){for(const osc of nodes){try{osc.stop();}catch{/* already stopped */}}pad=null;}};
}
