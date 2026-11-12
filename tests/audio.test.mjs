import test from 'node:test';
import assert from 'node:assert/strict';
import {actionCues,peaceBed,peaceScore,playCue,setMusic} from '../src/services/audio.js';

const SCALE=new Set([196,220,247,294,330,392]);

test('the peace loop is one G-pentatonic phrase that resolves home',()=>{
  const total=peaceScore.melody.reduce((sum,[,beats])=>sum+beats,0);
  assert.equal(total,peaceScore.beats);
  assert.equal(peaceScore.beats%8,0);
  assert.ok(peaceScore.bpm>=60&&peaceScore.bpm<=84);
  const last=peaceScore.melody.at(-1);
  assert.deepEqual(last,[196,4]);
  for(const [freq,beats] of peaceScore.melody){
    assert.ok(SCALE.has(freq),String(freq));
    assert.ok(beats>0);
  }
  assert.equal(peaceScore.chords.length,peaceScore.bass.length);
  assert.deepEqual(peaceScore.chords[0],peaceScore.chords.at(-1));
  for(const chord of peaceScore.chords){
    assert.equal(chord.length,3);
    assert.ok(chord.includes(196));
    assert.deepEqual([...chord].sort((a,b)=>a-b),chord);
  }
});

test('the bed changes chord every two bars and pulses on the downbeat',()=>{
  assert.equal(peaceBed(0).bass,98);
  assert.equal(peaceBed(0).change,true);
  assert.deepEqual(peaceBed(0).chord,[196,247,294]);
  assert.equal(peaceBed(1).bass,0);
  assert.equal(peaceBed(4).bass,98);
  assert.equal(peaceBed(4).change,false);
  assert.deepEqual(peaceBed(8).chord,[165,196,262]);
  assert.equal(peaceBed(8).bass,131);
  assert.deepEqual(peaceBed(16).chord,[165,196,247]);
  assert.equal(peaceBed(16).bass,165);
  assert.deepEqual(peaceBed(24).chord,[196,247,294]);
  assert.deepEqual(peaceBed(32),peaceBed(0));
  assert.deepEqual(peaceBed(-4),peaceBed(28));
});

test('every board action has its own short voice',()=>{
  const actions=['jump','pollen','tunnel','seed','summon','undo','restart','life','hint','hintnone','hintunknown','win','select','focus','blur','deny','arm-tunnel','arm-seed','arm-summon','disarm','heart'];
  assert.deepEqual(Object.keys(actionCues).sort(),actions.sort());
  const seen=new Set();
  for(const [name,events] of Object.entries(actionCues)){
    assert.ok(events.length>0,name);
    const key=JSON.stringify(events);
    assert.equal(seen.has(key),false,name);
    seen.add(key);
    for(const event of events){
      assert.ok(event.duration>0&&event.duration<=0.32,name);
      assert.ok(event.gain>0&&event.gain<=0.06,name);
      assert.ok((event.at||0)>=0,name);
    }
  }
  const sweep=name=>actionCues[name].find(event=>event.kind==='noise');
  assert.ok(sweep('jump').to>sweep('jump').from);
  assert.ok(sweep('undo').to<sweep('undo').from);
  assert.ok(sweep('tunnel').to<sweep('tunnel').from);
  const tones=name=>actionCues[name].filter(event=>event.kind==='tone').map(event=>event.freq);
  assert.ok(tones('pollen').at(-1)>tones('pollen')[0]);
  assert.ok(tones('hint').at(-1)>tones('hint')[0]);
  assert.ok(tones('hintnone').at(-1)<tones('hintnone')[0]);
  assert.ok(tones('win').at(-1)>tones('win')[0]);
  assert.ok(tones('restart').at(-1)<tones('restart')[0]);
  assert.ok(tones('life')[0]<tones('select')[0]);
  assert.deepEqual(tones('win'),[392,494,587,784]);
});

test('music stays silent when the platform has no audio context',()=>{
  const previous=globalThis.AudioContext;
  const webkit=globalThis.webkitAudioContext;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  try{
    assert.doesNotThrow(()=>setMusic(false));
    assert.doesNotThrow(()=>setMusic(true));
    assert.doesNotThrow(()=>setMusic(false));
    assert.doesNotThrow(()=>playCue('jump',true));
    assert.doesNotThrow(()=>playCue('win',false));
    assert.doesNotThrow(()=>playCue('missing',true));
  }finally{
    if(previous)globalThis.AudioContext=previous;
    if(webkit)globalThis.webkitAudioContext=webkit;
  }
});

test('turning music on schedules the meadow and turning it off stops the bed',async()=>{
  const made=[];
  class Param{
    constructor(){this.value=0;this.events=[];}
    setValueAtTime(value){this.value=value;this.events.push(value);}
    exponentialRampToValueAtTime(value){this.value=value;this.events.push(value);}
    cancelScheduledValues(){}
  }
  class Node{
    connect(){return this;}
    start(){this.started=true;}
    stop(){this.stopped=true;}
  }
  class Osc extends Node{
    constructor(){
      super();
      this.frequency=new Param();
      this.frequency.value=440;
      made.push(this);
    }
  }
  class Gain extends Node{
    constructor(){super();this.gain=new Param();}
  }
  class Filter extends Node{
    constructor(){super();this.frequency=new Param();this.Q=new Param();}
  }
  class Ctx{
    constructor(){this.currentTime=0;this.state='running';this.destination={};}
    resume(){this.state='running';}
    createOscillator(){return new Osc();}
    createGain(){return new Gain();}
    createBiquadFilter(){return new Filter();}
  }
  const previous=globalThis.AudioContext;
  globalThis.AudioContext=Ctx;
  try{
    setMusic(true);
    const freqs=made.flatMap(osc=>osc.frequency.events);
    assert.ok(freqs.includes(294));
    assert.ok(freqs.includes(98));
    assert.equal(freqs.includes(392),false);
    const living=()=>made.filter(osc=>osc.started&&!osc.stopped);
    assert.ok(living().length>=4);
    const count=made.length;
    setMusic(true);
    assert.equal(made.length,count);
    setMusic(false);
    await new Promise(resolve=>setTimeout(resolve,600));
    assert.equal(living().length,0);
  }finally{
    if(previous)globalThis.AudioContext=previous;
    else delete globalThis.AudioContext;
  }
});
