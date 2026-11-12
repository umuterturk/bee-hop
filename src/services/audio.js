let ctx=null;
let music=null;
let tail=null;

const G2=98,C3=131,E3=165,G3=196,A3=220,B3=247,C4=262,D4=294,E4=330,G4=392;

// Peace loop: a G-pentatonic lullaby over G, C, Em, then home again.
export const peaceScore={
  bpm:72,
  beats:32,
  chords:[
    [G3,B3,D4],
    [E3,G3,C4],
    [E3,G3,B3],
    [G3,B3,D4]
  ],
  bass:[G2,C3,E3,G2],
  melody:[
    [D4,2],[B3,1],[A3,1],
    [G3,2],[A3,1],[B3,1],
    [D4,1.5],[E4,0.5],[D4,2],
    [D4,1],[A3,1],[G3,2],
    [G4,2],[E4,1],[D4,1],
    [E4,1.5],[D4,0.5],[B3,2],
    [D4,1],[B3,1],[A3,2],
    [G3,4]
  ]
};

export function peaceBed(beat){
  const loop=peaceScore.beats;
  const step=((beat%loop)+loop)%loop;
  const chord=Math.floor(step/8)%peaceScore.chords.length;
  return {
    step,
    chord:peaceScore.chords[chord],
    bass:step%4===0?peaceScore.bass[chord]:0,
    change:step%8===0
  };
}

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
function drop(handle){
  if(!handle||handle.dropped)return;
  handle.dropped=true;
  handle.stopped=true;
  clearTimeout(handle.timer);
  clearTimeout(handle.fadeTimer);
  try{handle.master.disconnect();}catch{/* already disconnected */}
  for(const node of handle.nodes){
    try{node.stop();}catch{/* already stopped */}
  }
  if(tail===handle)tail=null;
}
function levelAt(handle,now){
  const elapsed=Math.max(0,now-handle.started);
  const attack=0.8;
  if(elapsed>=attack)return handle.level;
  return 0.0001*(handle.level/0.0001)**(elapsed/attack);
}
function fadeOut(handle){
  if(!handle||handle.stopped)return;
  handle.stopped=true;
  clearTimeout(handle.timer);
  const ac=handle.ac;
  const t=ac.currentTime;
  const level=Math.max(0.0001,levelAt(handle,t));
  handle.master.gain.cancelScheduledValues(t);
  handle.master.gain.setValueAtTime(level,t);
  handle.master.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
  handle.fadeTimer=setTimeout(()=>drop(handle),520);
  tail=handle;
}
function bell(ac,dest,freq,when,duration,peak,partial){
  const amp=ac.createGain();
  const osc=ac.createOscillator();
  osc.type='sine';
  osc.frequency.setValueAtTime(freq,when);
  osc.connect(amp);
  if(partial){
    const over=ac.createOscillator();
    const overAmp=ac.createGain();
    over.type='sine';
    over.frequency.setValueAtTime(freq*2,when);
    overAmp.gain.setValueAtTime(partial,when);
    over.connect(overAmp);overAmp.connect(amp);
    over.start(when);over.stop(when+duration+0.05);
  }
  const attack=Math.min(0.045,duration*0.2);
  const body=when+Math.min(duration*0.42,duration-0.05);
  amp.gain.setValueAtTime(0.0001,when);
  amp.gain.exponentialRampToValueAtTime(peak,when+attack);
  if(body>when+attack+0.02)amp.gain.exponentialRampToValueAtTime(peak*0.55,body);
  amp.gain.exponentialRampToValueAtTime(0.0001,when+duration);
  amp.connect(dest);
  osc.start(when);osc.stop(when+duration+0.05);
}
function glideChord(handle,chord,when,seconds){
  handle.pad.forEach((osc,i)=>{
    osc.frequency.cancelScheduledValues(when);
    const from=handle.chordFreqs[i];
    if(seconds>0&&from){
      osc.frequency.setValueAtTime(from,when);
      osc.frequency.exponentialRampToValueAtTime(chord[i],when+seconds);
    }else osc.frequency.setValueAtTime(chord[i],when);
  });
  handle.chordFreqs=chord.slice();
}
function schedule(handle){
  const ac=handle.ac;
  const now=ac.currentTime;
  const horizon=now+2;
  const beat=60/peaceScore.bpm;
  if(handle.gridTime<now-0.2){
    const step=Math.max(0,Math.floor((now-handle.origin)/beat));
    handle.grid=step;
    handle.gridTime=handle.origin+step*beat;
    glideChord(handle,peaceBed(step).chord,now,0);
  }
  if(handle.melTime<now-0.2){
    while(handle.melTime<now-0.2){
      handle.melCursor+=peaceScore.melody[handle.mel%peaceScore.melody.length][1];
      handle.mel+=1;
      handle.melTime=handle.origin+handle.melCursor*beat;
    }
  }
  while(handle.gridTime<horizon){
    const bed=peaceBed(handle.grid);
    if(bed.change)glideChord(handle,bed.chord,handle.gridTime,handle.grid===0?0:0.9);
    if(bed.bass)bell(ac,handle.filter,bed.bass,handle.gridTime,beat*2.6,0.016,0);
    handle.grid+=1;
    handle.gridTime=handle.origin+handle.grid*beat;
  }
  while(handle.melTime<horizon){
    const [freq,beats]=peaceScore.melody[handle.mel%peaceScore.melody.length];
    bell(ac,handle.filter,freq,handle.melTime,beats*beat*1.35,0.048,0.14);
    handle.melCursor+=beats;
    handle.mel+=1;
    handle.melTime=handle.origin+handle.melCursor*beat;
  }
}
function startPeace(ac){
  const now=ac.currentTime;
  const master=ac.createGain();
  const filter=ac.createBiquadFilter();
  const padGain=ac.createGain();
  filter.type='lowpass';
  filter.frequency.value=2200;
  filter.Q.value=0.5;
  padGain.gain.value=0.005;
  master.gain.setValueAtTime(0.0001,now);
  master.gain.exponentialRampToValueAtTime(1,now+0.8);
  filter.connect(master);
  padGain.connect(filter);
  master.connect(ac.destination);
  const home=peaceScore.chords[0];
  const pad=home.map(freq=>{
    const osc=ac.createOscillator();
    osc.type='sine';
    osc.frequency.value=freq;
    osc.connect(padGain);
    osc.start(now);
    return osc;
  });
  const lfo=ac.createOscillator();
  const depth=ac.createGain();
  lfo.frequency.value=0.07;
  depth.gain.value=0.0012;
  lfo.connect(depth);depth.connect(padGain.gain);lfo.start(now);
  const origin=now+0.06;
  const handle={
    ac,master,filter,pad,nodes:[...pad,lfo],
    chordFreqs:home.slice(),
    started:now,level:1,
    origin,grid:0,gridTime:origin,
    mel:0,melCursor:0,melTime:origin,
    stopped:false,dropped:false,timer:0,fadeTimer:0
  };
  const pump=()=>{
    if(handle.stopped)return;
    schedule(handle);
    handle.timer=setTimeout(pump,250);
  };
  schedule(handle);
  handle.timer=setTimeout(pump,250);
  return handle;
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
    if(music)fadeOut(music);
    music=null;
    return;
  }
  const ac=audio();
  if(!ac||music)return;
  if(tail)drop(tail);
  music=startPeace(ac);
}
