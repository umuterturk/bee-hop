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
// Each board action has its own short voice. Noise sweeps are physical;
// pentatonic tones match the meadow loop.
export const actionCues={
  jump:[
    {at:0,kind:'noise',from:500,to:1400,duration:0.08,gain:0.055,q:0.8},
    {at:0,kind:'tone',freq:700,slide:280,duration:0.07,gain:0.02,wave:'triangle'}
  ],
  pollen:[
    {at:0,kind:'tone',freq:988,duration:0.11,gain:0.046,wave:'sine'},
    {at:0.05,kind:'tone',freq:1319,duration:0.13,gain:0.03,wave:'sine'}
  ],
  tunnel:[
    {at:0,kind:'noise',from:1400,to:180,duration:0.18,gain:0.055,q:0.7},
    {at:0,kind:'tone',freq:300,slide:-140,duration:0.16,gain:0.018,wave:'sine'}
  ],
  seed:[
    {at:0,kind:'noise',from:260,to:160,duration:0.05,gain:0.05,q:0.7,filter:'lowpass'},
    {at:0.04,kind:'tone',freq:392,slide:200,duration:0.16,gain:0.04,wave:'sine'}
  ],
  summon:[
    {at:0,kind:'noise',from:340,to:680,duration:0.07,gain:0.04,q:6},
    {at:0.06,kind:'tone',freq:440,duration:0.1,gain:0.034,wave:'triangle'},
    {at:0.14,kind:'tone',freq:659,duration:0.14,gain:0.03,wave:'sine'}
  ],
  undo:[
    {at:0,kind:'noise',from:1200,to:280,duration:0.1,gain:0.05,q:0.8},
    {at:0,kind:'tone',freq:520,slide:-180,duration:0.09,gain:0.018,wave:'triangle'}
  ],
  restart:[
    {at:0,kind:'tone',freq:587,duration:0.1,gain:0.034,wave:'sine'},
    {at:0.09,kind:'tone',freq:392,duration:0.16,gain:0.04,wave:'sine'}
  ],
  life:[
    {at:0,kind:'tone',freq:196,slide:-70,duration:0.16,gain:0.04,wave:'sine'},
    {at:0,kind:'noise',from:200,to:90,duration:0.08,gain:0.03,q:0.8,filter:'lowpass'}
  ],
  hint:[
    {at:0,kind:'tone',freq:784,duration:0.09,gain:0.03,wave:'sine'},
    {at:0.05,kind:'tone',freq:988,duration:0.09,gain:0.028,wave:'sine'},
    {at:0.1,kind:'tone',freq:1175,duration:0.12,gain:0.024,wave:'sine'}
  ],
  hintnone:[
    {at:0,kind:'tone',freq:440,duration:0.1,gain:0.03,wave:'sine'},
    {at:0.08,kind:'tone',freq:330,duration:0.12,gain:0.026,wave:'sine'}
  ],
  hintunknown:[
    {at:0,kind:'tone',freq:523,slide:50,duration:0.14,gain:0.03,wave:'sine'}
  ],
  win:[
    {at:0,kind:'tone',freq:392,duration:0.22,gain:0.04,wave:'sine'},
    {at:0.08,kind:'tone',freq:494,duration:0.22,gain:0.034,wave:'sine'},
    {at:0.16,kind:'tone',freq:587,duration:0.24,gain:0.03,wave:'sine'},
    {at:0.26,kind:'tone',freq:784,duration:0.3,gain:0.028,wave:'sine'}
  ],
  select:[{at:0,kind:'tone',freq:880,duration:0.035,gain:0.018,wave:'sine'}],
  focus:[{at:0,kind:'tone',freq:1175,duration:0.04,gain:0.02,wave:'sine'}],
  blur:[{at:0,kind:'tone',freq:520,duration:0.04,gain:0.014,wave:'sine'}],
  deny:[{at:0,kind:'tone',freq:150,slide:-40,duration:0.07,gain:0.02,wave:'triangle'}],
  'arm-tunnel':[
    {at:0,kind:'noise',from:900,to:240,duration:0.09,gain:0.045,q:0.9},
    {at:0,kind:'tone',freq:392,slide:-120,duration:0.09,gain:0.024,wave:'sine'}
  ],
  'arm-seed':[
    {at:0,kind:'noise',from:420,to:220,duration:0.045,gain:0.045,q:0.7,filter:'lowpass'},
    {at:0,kind:'tone',freq:494,duration:0.08,gain:0.03,wave:'sine'}
  ],
  'arm-summon':[
    {at:0,kind:'noise',from:300,to:640,duration:0.06,gain:0.04,q:1.4},
    {at:0,kind:'tone',freq:660,duration:0.09,gain:0.03,wave:'triangle'}
  ],
  disarm:[{at:0,kind:'tone',freq:480,slide:-140,duration:0.06,gain:0.018,wave:'sine'}],
  heart:[
    {at:0,kind:'tone',freq:523,duration:0.1,gain:0.032,wave:'sine'},
    {at:0.08,kind:'tone',freq:659,duration:0.11,gain:0.03,wave:'sine'},
    {at:0.16,kind:'tone',freq:784,duration:0.16,gain:0.028,wave:'sine'}
  ]
};

function shape(param,when,peak,duration){
  const attack=Math.min(0.018,Math.max(0.008,duration*0.22));
  const end=when+Math.max(duration,attack+0.02);
  param.setValueAtTime(0.0001,when);
  param.exponentialRampToValueAtTime(Math.max(0.0002,peak),when+attack);
  param.exponentialRampToValueAtTime(0.0001,end);
  return end;
}
function playTone(ac,when,event){
  const osc=ac.createOscillator();
  const amp=ac.createGain();
  const duration=event.duration;
  osc.type=event.wave||'sine';
  osc.frequency.setValueAtTime(event.freq,when);
  if(event.slide)osc.frequency.exponentialRampToValueAtTime(Math.max(40,event.freq+event.slide),when+duration);
  const end=shape(amp.gain,when,event.gain,duration);
  osc.connect(amp);amp.connect(ac.destination);
  osc.start(when);osc.stop(end+0.02);
  if(event.wave==='sine'&&event.freq>=500&&event.gain>=0.025){
    const over=ac.createOscillator();
    const overAmp=ac.createGain();
    over.type='sine';
    over.frequency.setValueAtTime(event.freq*2,when);
    const overEnd=shape(overAmp.gain,when,event.gain*0.14,duration*0.7);
    over.connect(overAmp);overAmp.connect(ac.destination);
    over.start(when);over.stop(overEnd+0.02);
  }
}
function playNoise(ac,when,event){
  if(typeof ac.createBuffer!=='function'){
    playTone(ac,when,{kind:'tone',freq:event.from,slide:(event.to||event.from)-event.from,duration:event.duration,gain:event.gain*0.6,wave:'triangle'});
    return;
  }
  const duration=event.duration;
  const length=Math.max(1,Math.ceil(ac.sampleRate*(duration+0.04)));
  const buffer=ac.createBuffer(1,length,ac.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const src=ac.createBufferSource();
  const filter=ac.createBiquadFilter();
  const amp=ac.createGain();
  src.buffer=buffer;
  filter.type=event.filter||'bandpass';
  filter.Q.value=event.q??4;
  filter.frequency.setValueAtTime(Math.max(40,event.from),when);
  if(event.to&&event.to!==event.from)filter.frequency.exponentialRampToValueAtTime(Math.max(40,event.to),when+duration);
  const end=shape(amp.gain,when,event.gain,duration);
  src.connect(filter);filter.connect(amp);amp.connect(ac.destination);
  src.start(when);src.stop(end+0.03);
}
function playEvents(events){
  const ac=audio();
  if(!ac)return;
  const now=ac.currentTime;
  for(const event of events){
    const when=now+(event.at||0);
    if(event.kind==='noise')playNoise(ac,when,event);
    else playTone(ac,when,event);
  }
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
  const events=actionCues[kind];
  if(events)playEvents(events);
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
