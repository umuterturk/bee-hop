import React,{useEffect,useRef,useState} from 'react';
import {LEVELS,WAVE_NAMES} from '../content/catalog.js';
import {inventoryFor} from '../content/campaign.js';
import {legalJumps,seedTargets,statusOf,summonTargets,tunnelTargets} from '../engine/abilities.js';
import {commit,newRound,spendDance,toBoard,undo} from '../session/round.js';
import {findHint} from '../session/hint.js';
import {loadProgress,saveProgress} from '../session/progress.js';
import {track} from '../services/analytics.js';
import {playCue,setMusic,unlockAudio} from '../services/audio.js';
import {buzz} from '../services/haptics.js';
import {boardNote,earnedBadges,jarFill,pollenLeft} from './presentation.js';
import Board from './Board.jsx';
import {SHEET_URL,Sprite,SpriteButton} from './Sprite.jsx';
import {spriteFitStyle} from './sprites.js';

const BADGE_SPRITE={pure:'heart',clean:'leaf',boss:'crown'};
function jarName(fill){
  if(fill>=1)return 'jarFull';
  if(fill>0)return 'jarHalf';
  return 'jarEmpty';
}

function boot(){
  const saved=loadProgress();
  const levelId=saved.resume?.levelId||saved.unlocked;
  const level=LEVELS[levelId-1];
  const round=saved.resume?.round||newRound(level);
  return {saved,levelId,round};
}

export default function Game(){
  const [{saved,levelId:initialLevel,round:initialRound}]=useState(boot);
  const [progress,setProgress]=useState(saved);
  const [levelId,setLevelId]=useState(initialLevel);
  const [round,setRound]=useState(initialRound);
  const [mode,setMode]=useState(null);
  const [selectedBee,setSelectedBee]=useState(initialRound.bees[0]);
  const [filtered,setFiltered]=useState(null);
  const [hint,setHint]=useState(null);
  const [flight,setFlight]=useState(null);
  const [help,setHelp]=useState(false);
  const [zoom,setZoom]=useState(false);
  const [nudge,setNudge]=useState(false);
  const [deal,setDeal]=useState(0);
  const [debug]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('debug'));
  const roundRef=useRef(round);
  const modeRef=useRef(mode);
  const beeRef=useRef(selectedBee);
  const filterRef=useRef(filtered);
  const hintToken=useRef(0);
  const audioReady=useRef(false);
  const acted=useRef(false);
  const jarRef=useRef(null);
  const nextRef=useRef(null);
  roundRef.current=round;
  modeRef.current=mode;
  beeRef.current=selectedBee;
  filterRef.current=filtered;

  const level=LEVELS[levelId-1];
  const grant=inventoryFor(level);
  const board=toBoard(round);
  const status=statusOf(board);
  const selected=round.bees.includes(selectedBee)?selectedBee:round.bees[0];
  const allJumps=legalJumps(board).filter(move=>move.bee===selected);
  const jumps=filtered==null?allJumps:allJumps.filter(move=>move.over===filtered);
  const toolCells=mode==='tunnel'?tunnelTargets(board,selected):mode==='seed'?seedTargets(board,selected):mode==='summon'?summonTargets(board):[];
  const hintStep=hint?.outcome==='win'?hint.steps[hint.layer]:null;
  const reduced=progress.settings.reduceMotion;
  const note=boardNote({status,hint,mode,filtered:filtered!=null,level,round});
  const waveName=WAVE_NAMES[level.wave];
  const waveStart=level.wave*5;

  useEffect(()=>{track('level_start',{levelId:level.id,wave:level.wave,boss:level.boss});acted.current=false;},[level.id,deal]);
  useEffect(()=>{
    if(status!=='won')return;
    const current=roundRef.current;
    if(current.celebrated)return;
    const badges=earnedBadges(current,level);
    const marked={...current,celebrated:true};
    roundRef.current=marked;
    setRound(marked);
    setProgress(prev=>{
      const unlocked=Math.max(prev.unlocked,Math.min(LEVELS.length,level.id+1));
      const owned=new Set(prev.badges[level.id]||[]);
      for(const badge of badges)owned.add(badge.id);
      return {...prev,unlocked,badges:{...prev.badges,[level.id]:[...owned]}};
    });
    track('level_complete',{levelId:level.id,turns:current.turns,usedUndo:current.usedUndo,usedTool:current.usedTool,badges:badges.map(badge=>badge.id)});
  },[status,level,deal]);
  useEffect(()=>{
    if(status==='stuck')track('level_stuck',{levelId:level.id});
  },[status,level.id,deal]);
  useEffect(()=>{saveProgress({...progress,resume:{levelId:level.id,round:roundRef.current}});},[progress,round,level.id]);
  useEffect(()=>{
    if(status==='won')nextRef.current?.focus({preventScroll:true});
  },[status,level.id,deal]);
  useEffect(()=>{
    setNudge(false);
    if(reduced)return undefined;
    const timer=setTimeout(()=>setNudge(true),4000);
    return ()=>clearTimeout(timer);
  },[level.id,deal,round.turns,mode,reduced]);
  useEffect(()=>()=>{hintToken.current+=1;setMusic(false);},[]);
  useEffect(()=>{
    if(!help)return undefined;
    const onKey=event=>{if(event.key==='Escape')setHelp(false);};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[help]);

  function poke(){
    if(audioReady.current)return;
    audioReady.current=true;
    unlockAudio();
    if(progress.settings.music)setMusic(true);
  }
  function patchSettings(partial){
    setProgress(prev=>({...prev,settings:{...prev.settings,...partial}}));
    if('music' in partial&&audioReady.current)setMusic(partial.music);
  }
  function resetSelection(nextRound,bee=nextRound.bees[0]){
    setMode(null);setFiltered(null);setHint(null);setFlight(null);setSelectedBee(bee);setZoom(false);
  }
  function goto(id){
    if(id<1||id>LEVELS.length||id>progress.unlocked)return;
    const nextLevel=LEVELS[id-1];
    const fresh=newRound(nextLevel);
    roundRef.current=fresh;
    setLevelId(id);setRound(fresh);resetSelection(fresh);setDeal(value=>value+1);
  }
  function restart(){
    const fresh=newRound(level);
    roundRef.current=fresh;
    setRound(fresh);resetSelection(fresh);setDeal(value=>value+1);
    track('restart',{levelId:level.id});
    playCue('undo',progress.settings.sound);
  }
  function play(action){
    const current=roundRef.current;
    if(statusOf(toBoard(current))!=='playing')return;
    const next=commit(current,action);
    if(next===current)return;
    roundRef.current=next;
    setRound(next);
    setHint(null);setFiltered(null);setMode(null);
    const bee=action.type==='summon'?action.hive:action.to??selected;
    if(action.type!=='seed')setSelectedBee(bee);
    setFlight({
      kind:action.type,from:action.bee??null,to:action.to??action.hive,over:action.over??null,
      token:current.turns+1,celebrate:next.pollen.length===0,jar:jarRef.current
    });
    if(!acted.current){acted.current=true;track('first_action',{levelId:level.id,type:action.type});}
    track(action.type,{levelId:level.id});
    playCue(action.type==='jump'?'jump':action.type,progress.settings.sound);
    if(next.pollen.length<current.pollen.length)playCue('pollen',progress.settings.sound);
    if(next.pollen.length===0)playCue('win',progress.settings.sound);
    buzz(next.pollen.length===0?28:12,progress.settings.haptics);
  }
  function doUndo(){
    const next=undo(roundRef.current);
    if(next===roundRef.current)return;
    roundRef.current=next;
    setRound(next);setHint(null);setFiltered(null);setMode(null);setFlight(null);
    setSelectedBee(next.bees.includes(beeRef.current)?beeRef.current:next.lead);
    track('undo',{levelId:level.id,left:next.undoLeft});
    playCue('undo',progress.settings.sound);
  }
  function doHint(){
    const current=roundRef.current;
    const deeper=hint?.outcome==='win'&&hint.layer+1<hint.steps.length;
    if(current.danceLeft!==null&&current.danceLeft<=0)return;
    const token=++hintToken.current;
    const spent=spendDance(current);
    roundRef.current=spent;
    setRound(spent);
    if(deeper){
      const step=hint.steps[hint.layer+1];
      setHint({...hint,layer:hint.layer+1});
      if(step?.bee!=null)setSelectedBee(step.bee);
      setFiltered(step?.type==='jump'?step.over:null);
      setMode(step?.type==='jump'||!step?null:step.type);
      track('hint',{levelId:level.id,outcome:'win',layer:hint.layer+1});
      return;
    }
    setHint({outcome:'looking',steps:[],layer:0});
    setTimeout(()=>{
      if(hintToken.current!==token)return;
      const solved=findHint(toBoard(current));
      if(hintToken.current!==token)return;
      const step=solved.steps?.[0];
      setHint({...solved,layer:0});
      if(solved.outcome==='win'&&step?.bee!=null)setSelectedBee(step.bee);
      setFiltered(step?.type==='jump'?step.over:null);
      setMode(step?.type==='jump'||!step?null:step.type);
      track('hint',{levelId:level.id,outcome:solved.outcome,layer:0});
    },30);
  }
  function onCell(cell){
    poke();
    const current=roundRef.current;
    if(statusOf(toBoard(current))!=='playing')return;
    if(current.bees.includes(cell)){setSelectedBee(cell);setFiltered(null);return;}
    const bee=current.bees.includes(beeRef.current)?beeRef.current:current.bees[0];
    const active=modeRef.current;
    if(active==='tunnel')return play({type:'tunnel',bee,to:cell});
    if(active==='seed')return play({type:'seed',bee,to:cell});
    if(active==='summon')return play({type:'summon',hive:cell});
    const moves=legalJumps(toBoard(current)).filter(move=>move.bee===bee);
    const landings=(filterRef.current==null?moves:moves.filter(move=>move.over===filterRef.current)).filter(move=>move.to===cell);
    if(landings.length===1)return play(landings[0]);
    if(moves.some(move=>move.over===cell))setFiltered(filterRef.current===cell?null:cell);
  }
  function toolButton(id,sprite,label,left){
    return <SpriteButton name={sprite} className={`hop-tool is-${id}`} aria-label={`${label}, ${left} left`} aria-pressed={mode===id} disabled={left<=0}
      onClick={()=>{poke();setFiltered(null);setMode(mode===id?null:id);}}><span className="hop-count">{left}</span></SpriteButton>;
  }

  const badges=status==='won'?earnedBadges(round,level):[];
  const undoLabel=round.undoLeft==null?'Undo':`Undo ${round.undoLeft}`;
  const hintLabel=round.danceLeft==null?'Hint':`Hint ${round.danceLeft}`;

  return <div className={`hop ${level.boss?'is-boss':''} ${reduced?'is-reduced':''}`} data-status={status} data-level={level.id}
    onPointerDown={poke}>
    <header className="hop-top">
      <div>
        <p className="hop-brand">Bee Hop</p>
        <p className="hop-wave-name">{waveName}{level.boss?' · Boss':''}</p>
      </div>
      <div className="hop-level-badge">
        {level.boss&&<Sprite name="crown" width={36} className="hop-boss-crown"/>}
        <span>{level.boss?'Boss':'Level'}</span><strong>{String(level.id).padStart(2,'0')}</strong>
      </div>
      <SpriteButton name="buttonHelp" className="hop-help-button" aria-label="How to play" aria-expanded={help} onClick={()=>setHelp(value=>!value)}/>
    </header>
    <div className="hop-title-row" style={spriteFitStyle(level.boss?'bannerPurple':'bannerGold',SHEET_URL)}>
      <h1>{level.name}</h1>
    </div>
    <div className="hop-tabs" aria-label="Levels in this wave">
      <button type="button" disabled={level.wave===0} aria-label="Previous wave" onClick={()=>goto(waveStart-4)}>‹</button>
      {LEVELS.slice(waveStart,waveStart+5).map(entry=><button key={entry.id} type="button"
        className={`${entry.id===level.id?'is-active':''} ${entry.boss?'is-boss':''}`}
        aria-pressed={entry.id===level.id} disabled={entry.id>progress.unlocked}
        onClick={()=>goto(entry.id)}>{entry.id}</button>)}
      <button type="button" disabled={level.wave===7||waveStart+6>progress.unlocked} aria-label="Next wave" onClick={()=>goto(waveStart+6)}>›</button>
    </div>
    <div className="hop-goal">
      <div ref={jarRef}><Sprite name={jarName(jarFill(round))} width={52} className="hop-jar"/></div>
      <p><strong>{pollenLeft(round)}</strong><span>left</span></p>
    </div>
    {help&&<section className="hop-sheet" role="dialog" aria-label="How to play">
      <p>Every hop crosses one flower and lands on any green hex past it.</p>
      <p>Undo rewinds one move. Restart restores the field. Hint shows a landing that clears it, and never moves for you.</p>
      <p>Some fields offer Tunnel, Seed, or a Worker. Every field can be cleared without them.</p>
      <div className="hop-settings">
        <label><input type="checkbox" checked={progress.settings.sound} onChange={event=>patchSettings({sound:event.target.checked})}/> Sound</label>
        <label><input type="checkbox" checked={progress.settings.music} onChange={event=>patchSettings({music:event.target.checked})}/> Music</label>
        <label><input type="checkbox" checked={progress.settings.haptics} onChange={event=>patchSettings({haptics:event.target.checked})}/> Haptics</label>
        <label><input type="checkbox" checked={progress.settings.reduceMotion} onChange={event=>patchSettings({reduceMotion:event.target.checked})}/> Reduce motion</label>
      </div>
    </section>}
    <Board width={level.width} height={level.height} round={round} selected={selected} jumps={jumps}
      pollenChoices={allJumps.map(move=>move.over)} toolCells={toolCells} hintStep={hintStep} mode={mode}
      flight={flight} reduced={reduced} nudge={nudge&&jumps.length===1} zoom={zoom} status={status}
      filtered={filtered} onCell={onCell}/>
    {level.width>=7&&<button type="button" className="hop-zoom" onClick={()=>setZoom(value=>!value)}>{zoom?'Fit the field':'Enlarge the field'}</button>}
    <p className="hop-note" aria-live="polite">{note}</p>
    {status==='won'&&<section className="hop-win" role="dialog" aria-labelledby="hop-win-title">
      <p className="hop-kicker">Field cleared</p>
      <div className="hop-win-banner" style={spriteFitStyle('bannerGold',SHEET_URL)}>
        <Sprite name="sparkleSmall" width={22} className="hop-win-spark is-left"/>
        <h2 id="hop-win-title">Sweet success</h2>
        <Sprite name="sparkleMedium" width={28} className="hop-win-spark is-right"/>
      </div>
      <p>{round.turns} {round.turns===1?'hop':'hops'}.</p>
      {badges.length>0&&<ul className="hop-badges">{badges.map(badge=><li key={badge.id}><Sprite name={BADGE_SPRITE[badge.id]} width={22}/>{badge.name}</li>)}</ul>}
      <button ref={nextRef} type="button" className="hop-next" style={spriteFitStyle('buttonGold',SHEET_URL)} onClick={()=>goto(level.id===LEVELS.length?1:level.id+1)}>
        {level.id===LEVELS.length?'Play the first field':'Next field'}
      </button>
    </section>}
    {status==='stuck'&&<p className="hop-stuck" style={spriteFitStyle('bubble',SHEET_URL)}>No hops left from here.</p>}
    <div className="hop-tools">
      <SpriteButton name="buttonUndo" aria-label={undoLabel} onClick={doUndo} disabled={!round.past.length||(round.undoLeft!==null&&round.undoLeft<=0)}>
        {round.undoLeft!=null&&<span className="hop-count">{round.undoLeft}</span>}
      </SpriteButton>
      {grant.tunnel>0&&toolButton('tunnel','buttonTunnel','Tunnel',round.charges.tunnel)}
      {grant.seed>0&&toolButton('seed','buttonSeed','Seed',round.charges.seed)}
      {grant.worker>0&&toolButton('summon','buttonWorker','Worker',round.charges.worker)}
    </div>
    <div className="hop-secondary">
      <SpriteButton name="buttonHint" aria-label={hint?.outcome==='win'&&hint.layer+1<hint.steps.length?'Look ahead':hintLabel} onClick={doHint} disabled={status!=='playing'||(round.danceLeft!==null&&round.danceLeft<=0)}>
        {round.danceLeft!=null&&<span className="hop-count">{round.danceLeft}</span>}
      </SpriteButton>
      <SpriteButton name="buttonRestart" aria-label="Restart" onClick={restart}/>
    </div>
    {debug&&<details className="hop-debug">
      <summary>Design numbers</summary>
      <p>Difficulty {level.metrics.difficulty.toFixed(2)} · winning routes {level.metrics.winningPaths} · forks {level.metrics.forks}</p>
      <button type="button" onClick={()=>{saveProgress({...progress,unlocked:1,badges:{},resume:null});goto(1);setProgress(prev=>({...prev,unlocked:1,badges:{},resume:null}));}}>Reset progress</button>
    </details>}
  </div>;
}
