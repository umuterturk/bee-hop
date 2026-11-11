import React,{useEffect,useRef,useState} from 'react';
import {LEVELS,WAVE_NAMES} from '../content/catalog.js';
import {inventoryFor} from '../content/campaign.js';
import {legalJumps,seedTargets,statusOf,summonTargets,tunnelTargets} from '../engine/abilities.js';
import {commit,newRound,spendDance,toBoard,undo} from '../session/round.js';
import {findHint} from '../session/hint.js';
import {loadProgress,saveProgress} from '../session/progress.js';
import {HEART_CAP,freshHearts,heartWait,refillHearts,spendHeart} from '../session/hearts.js';
import {track} from '../services/analytics.js';
import {playCue,setMusic,unlockAudio} from '../services/audio.js';
import {buzz} from '../services/haptics.js';
import {boardNote,boosterCallout,deadEndCells,earnedBadges,pollenLeft} from './presentation.js';
import Board from './Board.jsx';
import {SHEET_URL,Sprite,SpriteButton} from './Sprite.jsx';
import {spriteFitStyle} from './sprites.js';

const BADGE_SPRITE={pure:'heart',clean:'leaf',boss:'crown'};

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
  const [nudge,setNudge]=useState(false);
  const [deal,setDeal]=useState(0);
  const [jarPulse,setJarPulse]=useState(0);
  const [now,setNow]=useState(()=>Date.now());
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
  const boardJumps=legalJumps(board);
  const allJumps=boardJumps.filter(move=>move.bee===selected);
  const jumps=filtered==null?allJumps:allJumps.filter(move=>move.over===filtered);
  const otherJumps=boardJumps.length-allJumps.length;
  const deadEnds=status==='playing'&&!mode?deadEndCells(board,jumps):new Set();
  const toolCells=mode==='tunnel'?tunnelTargets(board,selected):mode==='seed'?seedTargets(board,selected):mode==='summon'?summonTargets(board):[];
  const hintStep=hint?.outcome==='win'?hint.steps[hint.layer]:null;
  const reduced=progress.settings.reduceMotion;
  const note=boardNote({status,hint,mode,filtered:filtered!=null,level,round,jumpCount:jumps.length,otherJumps});
  const noHops=status==='playing'&&!mode&&jumps.length===0&&otherJumps===0;
  const callout=boosterCallout({
    status,mode,jumpCount:jumps.length,otherJumps,charges:round.charges,
    undoAvailable:round.past.length>0&&(round.undoLeft===null||round.undoLeft>0)
  });
  const waveName=WAVE_NAMES[level.wave];
  const waveStart=level.wave*5;
  const hearts=refillHearts(progress.hearts,now);
  const locked=hearts.count<=0;
  const waitLabel=heartWait(hearts,now);
  const prevUnlocked=level.id>1&&level.id-1<=progress.unlocked?level.id-1:null;
  const nextUnlocked=level.id<LEVELS.length&&level.id+1<=progress.unlocked?level.id+1:null;

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
    if(status!=='stuck')return;
    track('level_stuck',{levelId:level.id});
    if(roundRef.current.failedHeart)return;
    const marked={...roundRef.current,failedHeart:true};
    roundRef.current=marked;
    setRound(marked);
    setProgress(prev=>({...prev,hearts:spendHeart(prev.hearts,Date.now())}));
  },[status,level.id,deal]);
  useEffect(()=>{
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    const next=refillHearts(progress.hearts,now);
    if(next.count===progress.hearts?.count&&next.nextAt===progress.hearts?.nextAt)return;
    setProgress(prev=>({...prev,hearts:refillHearts(prev.hearts,Date.now())}));
  },[now,progress.hearts]);
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
    setMode(null);setFiltered(null);setHint(null);setFlight(null);setSelectedBee(bee);
  }
  function chargeAttempt(){
    const current=roundRef.current;
    if(current.failedHeart||statusOf(toBoard(current))==='won')return false;
    if(current.turns===0&&!current.usedUndo&&!current.usedTool&&current.past.length===0)return false;
    const marked={...current,failedHeart:true};
    roundRef.current=marked;
    setRound(marked);
    setProgress(prev=>({...prev,hearts:spendHeart(prev.hearts,Date.now())}));
    return true;
  }
  function goto(id){
    if(locked||id<1||id>LEVELS.length||id>progress.unlocked)return;
    if(chargeAttempt()&&hearts.count<=1)return;
    const nextLevel=LEVELS[id-1];
    const fresh=newRound(nextLevel);
    roundRef.current=fresh;
    setLevelId(id);setRound(fresh);resetSelection(fresh);setDeal(value=>value+1);setHelp(false);
  }
  function restart(){
    if(locked)return;
    if(chargeAttempt()&&hearts.count<=1)return;
    const fresh=newRound(level);
    roundRef.current=fresh;
    setRound(fresh);resetSelection(fresh);setDeal(value=>value+1);
    track('restart',{levelId:level.id});
    playCue('undo',progress.settings.sound);
  }
  function play(action){
    const current=roundRef.current;
    if(locked||statusOf(toBoard(current))!=='playing')return;
    const next=commit(current,action);
    if(next===current)return;
    roundRef.current=next;
    setRound(next);
    setHint(null);setFiltered(null);setMode(null);
    const bee=action.type==='summon'?action.hive:action.to??selected;
    if(action.type!=='seed')setSelectedBee(bee);
    if(next.pollen.length<current.pollen.length)setJarPulse(value=>value+1);
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
    if(locked)return;
    const next=undo(roundRef.current);
    if(next===roundRef.current)return;
    const cleared=statusOf(toBoard(next))==='stuck'?next:{...next,failedHeart:false};
    roundRef.current=cleared;
    setRound(cleared);setHint(null);setFiltered(null);setMode(null);setFlight(null);
    setSelectedBee(cleared.bees.includes(beeRef.current)?beeRef.current:cleared.lead);
    track('undo',{levelId:level.id,left:cleared.undoLeft});
    playCue('undo',progress.settings.sound);
  }
  function doHint(){
    if(locked)return;
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
    if(locked)return;
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
  function booster(id,sprite,label,{count,disabled,pressed,onClick,aria}){
    return <div className={`hop-booster is-${id} ${callout===id?'is-callout':''}`}>
      <SpriteButton name={sprite} className={`hop-tool is-${id}`} aria-label={aria||label} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
        {count!=null&&<span className="hop-count">{count}</span>}
      </SpriteButton>
      <span className="hop-tool-label">{label}</span>
    </div>;
  }

  const badges=status==='won'?earnedBadges(round,level):[];
  const undoLabel=round.undoLeft==null?'Undo':`Undo ${round.undoLeft}`;
  const hintLabel=round.danceLeft==null?'Hint':`Hint ${round.danceLeft}`;

  return <div className={`hop ${level.boss?'is-boss':''} ${reduced?'is-reduced':''} ${locked?'is-tired':''} ${noHops?'is-no-hops':''}`} data-status={status} data-level={level.id}
    onPointerDown={poke}>
    <header className="hop-hud">
      <div className="hop-hud-level">
        <button type="button" className="hop-hud-nav" aria-label="Previous level" disabled={!prevUnlocked||locked} onClick={()=>goto(prevUnlocked)}>‹</button>
        <div className="hop-level-badge">
          {level.boss&&<Sprite name="crown" width={28} className="hop-boss-crown"/>}
          <span>{level.boss?'Boss':'Level'}</span><strong>{String(level.id).padStart(2,'0')}</strong>
        </div>
        <button type="button" className="hop-hud-nav" aria-label="Next level" disabled={!nextUnlocked||locked} onClick={()=>goto(nextUnlocked)}>›</button>
      </div>
      <div ref={jarRef} className={`hop-objective ${jarPulse?'is-pulse':''}`} onAnimationEnd={()=>setJarPulse(0)} aria-label={`${pollenLeft(round)} flowers left`}>
        <span className="hop-objective-art">
          <Sprite name="flower" width={28}/>
        </span>
        <p><strong>{pollenLeft(round)}</strong><span>left</span></p>
      </div>
      <div className="hop-hud-right">
        <div className="hop-hearts" aria-label={`${hearts.count} of ${HEART_CAP} hearts`}>
          <div className="hop-heart-row">
            {Array.from({length:HEART_CAP},(_,index)=><span key={index} className="hop-heart-slot">
              <Sprite name={index<hearts.count?'heart':'heartOutline'} width={22}/>
              {waitLabel&&index===hearts.count&&<span className="hop-heart-wait">{waitLabel}</span>}
            </span>)}
          </div>
        </div>
        <SpriteButton name="buttonHelp" className="hop-help-button" aria-label="How to play" aria-expanded={help} onClick={()=>setHelp(value=>!value)}/>
      </div>
    </header>

    <div className={`hop-stage ${jumps.length&&!mode?'has-landings':''} ${noHops?'is-no-hops':''}`}>
      <Board key={deal} width={level.width} height={level.height} round={round} selected={selected} jumps={jumps}
        pollenChoices={allJumps.map(move=>move.over)} toolCells={toolCells} hintStep={hintStep} mode={mode}
        flight={flight} reduced={reduced} nudge={nudge&&jumps.length===1} status={status}
        filtered={filtered} deadEnds={deadEnds} onCell={onCell}/>
    </div>

    <p className="hop-note" aria-live="polite">{locked?`Out of hearts · ${waitLabel}`:note}</p>

    <div className="hop-dock" role="toolbar" aria-label="Boosters">
      {booster('undo','buttonUndo','Undo',{
        count:round.undoLeft,aria:undoLabel,disabled:locked||!round.past.length||(round.undoLeft!==null&&round.undoLeft<=0),
        onClick:doUndo
      })}
      {grant.tunnel>0&&booster('tunnel','buttonTunnel','Tunnel',{
        count:round.charges.tunnel,aria:`Tunnel, ${round.charges.tunnel} left`,pressed:mode==='tunnel',
        disabled:locked||round.charges.tunnel<=0,
        onClick:()=>{poke();setFiltered(null);setMode(mode==='tunnel'?null:'tunnel');}
      })}
      {grant.seed>0&&booster('seed','buttonSeed','Seed',{
        count:round.charges.seed,aria:`Seed, ${round.charges.seed} left`,pressed:mode==='seed',
        disabled:locked||round.charges.seed<=0,
        onClick:()=>{poke();setFiltered(null);setMode(mode==='seed'?null:'seed');}
      })}
      {grant.worker>0&&booster('summon','buttonWorker','Worker',{
        count:round.charges.worker,aria:`Worker, ${round.charges.worker} left`,pressed:mode==='summon',
        disabled:locked||round.charges.worker<=0,
        onClick:()=>{poke();setFiltered(null);setMode(mode==='summon'?null:'summon');}
      })}
      {booster('hint','buttonHint','Hint',{
        count:round.danceLeft,
        aria:hint?.outcome==='win'&&hint.layer+1<hint.steps.length?'Look ahead':hintLabel,
        disabled:locked||status!=='playing'||(round.danceLeft!==null&&round.danceLeft<=0),
        onClick:doHint
      })}
      {booster('restart','buttonRestart','Restart',{aria:'Restart',disabled:locked,onClick:restart})}
    </div>

    {help&&<div className="hop-sheet-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)setHelp(false);}}>
      <section className="hop-sheet" role="dialog" aria-label="How to play">
        <h2>{level.name}</h2>
        <p className="hop-wave-label">{waveName}{level.boss?' · Boss':''}</p>
        <p>Every hop crosses one flower and lands on a glowing green hex past it.</p>
        <p>A pebble on a green hex is a trap — landing there leaves no hops. Undo rewinds one move. Hint shows a landing that clears the field.</p>
        <p>If no green hexes appear, the bee cannot hop from here. Use a booster or undo. Every field can still be cleared without boosters.</p>
        <p className="hop-wave-label" id="hop-levels-label">Levels in this wave</p>
        <div className="hop-tabs" role="group" aria-labelledby="hop-levels-label">
          <button type="button" disabled={level.wave===0} aria-label="Previous wave" onClick={()=>goto(waveStart-4)}>‹</button>
          {LEVELS.slice(waveStart,waveStart+5).map(entry=><button key={entry.id} type="button"
            className={`${entry.id===level.id?'is-active':''} ${entry.boss?'is-boss':''}`}
            aria-pressed={entry.id===level.id} disabled={entry.id>progress.unlocked}
            onClick={()=>goto(entry.id)}>{entry.id}</button>)}
          <button type="button" disabled={level.wave===7||waveStart+6>progress.unlocked} aria-label="Next wave" onClick={()=>goto(waveStart+6)}>›</button>
        </div>
        <div className="hop-settings">
          <label><input type="checkbox" checked={progress.settings.sound} onChange={event=>patchSettings({sound:event.target.checked})}/> Sound</label>
          <label><input type="checkbox" checked={progress.settings.music} onChange={event=>patchSettings({music:event.target.checked})}/> Music</label>
          <label><input type="checkbox" checked={progress.settings.haptics} onChange={event=>patchSettings({haptics:event.target.checked})}/> Haptics</label>
          <label><input type="checkbox" checked={progress.settings.reduceMotion} onChange={event=>patchSettings({reduceMotion:event.target.checked})}/> Reduce motion</label>
        </div>
      </section>
    </div>}

    {status==='won'&&<div className="hop-overlay" role="presentation">
      <section className="hop-win" role="dialog" aria-labelledby="hop-win-title">
        <p className="hop-kicker">Field cleared</p>
        <div className="hop-win-banner" style={spriteFitStyle('bannerGold',SHEET_URL)}>
          <Sprite name="sparkleSmall" width={22} className="hop-win-spark is-left"/>
          <h2 id="hop-win-title">Sweet success</h2>
          <Sprite name="sparkleMedium" width={28} className="hop-win-spark is-right"/>
        </div>
        <p>{round.turns} {round.turns===1?'hop':'hops'}.</p>
        {badges.length>0&&<ul className="hop-badges">{badges.map(badge=><li key={badge.id}><Sprite name={BADGE_SPRITE[badge.id]} width={22}/>{badge.name}</li>)}</ul>}
        <button ref={nextRef} type="button" className="hop-next" style={spriteFitStyle('buttonGold',SHEET_URL)} disabled={locked} onClick={()=>goto(level.id===LEVELS.length?1:level.id+1)}>
          {level.id===LEVELS.length?'Play the first field':'Next field'}
        </button>
      </section>
    </div>}

    {status==='stuck'&&<div className="hop-overlay" role="presentation">
      <section className="hop-stuck-card" role="dialog" aria-labelledby="hop-stuck-title">
        <p className="hop-kicker">No hops left</p>
        <h2 id="hop-stuck-title" style={{margin:'6px 0 0',fontFamily:'"Lilita One",system-ui,sans-serif',fontSize:28,fontWeight:400,color:'#7a4e12'}}>Stuck!</h2>
        <p>Undo a move or restart the field.</p>
        <div className="hop-stuck-actions">
          <button type="button" className="hop-next" style={spriteFitStyle('buttonGold',SHEET_URL)} disabled={locked||!round.past.length||(round.undoLeft!==null&&round.undoLeft<=0)} onClick={doUndo}>Undo</button>
          <button type="button" className="hop-ghost-btn" disabled={locked} onClick={restart}>Restart</button>
        </div>
      </section>
    </div>}

    {debug&&<details className="hop-debug">
      <summary>Design numbers</summary>
      <p>Difficulty {level.metrics.difficulty.toFixed(2)} · winning routes {level.metrics.winningPaths} · forks {level.metrics.forks}</p>
      <button type="button" onClick={()=>{const reset={...progress,unlocked:1,badges:{},resume:null,hearts:freshHearts()};saveProgress(reset);setProgress(reset);const fresh=newRound(LEVELS[0]);roundRef.current=fresh;setLevelId(1);setRound(fresh);resetSelection(fresh);setDeal(value=>value+1);}}>Reset progress</button>
    </details>}
  </div>;
}
