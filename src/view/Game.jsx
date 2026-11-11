import React,{useEffect,useRef,useState} from 'react';
import {LEVELS,WAVE_NAMES} from '../content/catalog.js';
import {inventoryFor} from '../content/campaign.js';
import {legalJumps,seedTargets,statusOf,summonTargets,tunnelTargets} from '../engine/abilities.js';
import {commit,newRound,spendDance,toBoard,undo} from '../session/round.js';
import {findHint} from '../session/hint.js';
import {loadProgress,saveProgress} from '../session/progress.js';
import {HEART_CAP,applyLifeRestart,attemptLocked,freshHearts,grantHeart,heartWait,refillHearts} from '../session/hearts.js';
import {track} from '../services/analytics.js';
import {playCue,setMusic,unlockAudio} from '../services/audio.js';
import {buzz} from '../services/haptics.js';
import {boardNote,boosterCallout,earnedBadges,pollenLeft,stuckChoice} from './presentation.js';
import Board from './Board.jsx';
import {Sprite,SpriteButton,SpriteSurface} from './Sprite.jsx';

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
  const restarting=useRef(false);
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
  const toolCells=mode==='tunnel'?tunnelTargets(board,selected):mode==='seed'?seedTargets(board,selected):mode==='summon'?summonTargets(board):[];
  const hintStep=hint?.outcome==='win'?hint.steps[hint.layer]:null;
  const reduced=progress.settings.reduceMotion;
  const undoAvailable=round.past.length>0&&(round.undoLeft===null||round.undoLeft>0);
  const note=boardNote({status,hint,mode,filtered:filtered!=null,level,round,jumpCount:jumps.length,otherJumps,undoAvailable});
  const noHops=status==='playing'&&!mode&&jumps.length===0&&otherJumps===0;
  const callout=boosterCallout({
    status,mode,jumpCount:jumps.length,otherJumps,charges:round.charges,undoAvailable
  });
  const waveName=WAVE_NAMES[level.wave];
  const waveStart=level.wave*5;
  const hearts=refillHearts(progress.hearts,now);
  const locked=attemptLocked(hearts,round);
  const stuck=stuckChoice({undoAvailable,hearts});
  const lifeOffer=applyLifeRestart(hearts,round,status,now);
  const waitLabel=heartWait(hearts,now);
  useEffect(()=>{track('level_start',{levelId:level.id,wave:level.wave,boss:level.boss});acted.current=false;restarting.current=false;},[level.id,deal]);
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
    if(reduced||status!=='playing')return undefined;
    const timer=setTimeout(()=>setNudge(true),5000);
    return ()=>clearTimeout(timer);
  },[level.id,deal,round.turns,mode,selected,reduced,status]);
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
  function payForLeave(){
    const current=roundRef.current;
    return applyLifeRestart(refillHearts(hearts,Date.now()),current,statusOf(toBoard(current)),Date.now());
  }
  function openLevel(nextLevel,result){
    const fresh=newRound(nextLevel);
    if(result.lifePaid)fresh.lifePaid=true;
    roundRef.current=fresh;
    setLevelId(nextLevel.id);
    setRound(fresh);
    resetSelection(fresh);
    setDeal(value=>value+1);
    setHelp(false);
  }
  function goto(id){
    if(locked||id<1||id>LEVELS.length||id>progress.unlocked||restarting.current)return;
    const result=payForLeave();
    if(!result.ok)return;
    restarting.current=true;
    if(result.spendsLife)setProgress(prev=>({...prev,hearts:result.hearts}));
    openLevel(LEVELS[id-1],result);
  }
  function restart(){
    if(restarting.current)return;
    const result=payForLeave();
    if(!result.ok)return;
    restarting.current=true;
    if(result.spendsLife)setProgress(prev=>({...prev,hearts:result.hearts}));
    openLevel(level,result);
    track('restart',{levelId:level.id,spentLife:result.spendsLife});
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
      token:current.turns+1,celebrate:next.pollen.length===0,picked:next.pollen.length<current.pollen.length,jar:jarRef.current
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
    return <div className={`hop-booster is-${id} ${disabled?'is-unavailable':''} ${callout===id?'is-callout':''}`}>
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
        <div className="hop-level-badge">
          {level.boss&&<Sprite name="crown" width={16} className="hop-boss-crown"/>}
          <span>{level.boss?'Boss':'Level'}</span><strong>{String(level.id).padStart(2,'0')}</strong>
        </div>
      </div>
      <div ref={jarRef} className={`hop-objective ${jarPulse?'is-pulse':''}`} onAnimationEnd={()=>setJarPulse(0)} aria-label={`${pollenLeft(round)} flowers left`}>
        <span className="hop-objective-art">
          <Sprite name="flower" width={36}/>
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

    <div className={`hop-stage ${noHops?'is-no-hops':''}`}>
      <Board key={deal} width={level.width} height={level.height} round={round} selected={selected} jumps={jumps}
        pollenChoices={allJumps.map(move=>move.over)} toolCells={toolCells} hintStep={hintStep} mode={mode}
        flight={flight} reduced={reduced} idle={nudge} status={status}
        filtered={filtered} onCell={onCell}/>
    </div>

    <p className="hop-note" aria-live="polite">{locked?`Out of hearts · ${waitLabel}`:note}</p>

    <div className="hop-dock" role="toolbar" aria-label="Boosters">
      {booster('undo','buttonUndo','Undo',{
        count:round.undoLeft,aria:undoLabel,disabled:locked||!undoAvailable,
        onClick:doUndo
      })}
      {booster('restart','buttonRestart','Restart',{
        aria:lifeOffer.spendsLife?'Restart, costs a life':'Restart',
        disabled:locked||!lifeOffer.ok,
        onClick:()=>{poke();restart();}
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
    </div>

    {help&&<div className="hop-sheet-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)setHelp(false);}}>
      <section className="hop-sheet" role="dialog" aria-label="How to play">
        <h2>{level.name}</h2>
        <p className="hop-wave-label">{waveName}{level.boss?' · Boss':''}</p>
        <p>Every hop crosses one flower and lands on the hex just past it. A soft green tint marks a landing.</p>
        <p>Undo rewinds one move. Restart, under the field, plays it again. Hint shows a landing that clears the field.</p>
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
        <p className="hop-wave-label" id="hop-options-label">Options</p>
        <div className="hop-settings" role="group" aria-labelledby="hop-options-label">
          <label><input type="checkbox" checked={progress.settings.sound} onChange={event=>patchSettings({sound:event.target.checked})}/> Sound</label>
          <label><input type="checkbox" checked={progress.settings.music} onChange={event=>patchSettings({music:event.target.checked})}/> Music</label>
          <label><input type="checkbox" checked={progress.settings.haptics} onChange={event=>patchSettings({haptics:event.target.checked})}/> Haptics</label>
          <label><input type="checkbox" checked={progress.settings.reduceMotion} onChange={event=>patchSettings({reduceMotion:event.target.checked})}/> Reduce motion</label>
          <button type="button" className="hop-option" disabled={locked||!lifeOffer.ok} onClick={()=>{setHelp(false);restart();}}>{lifeOffer.spendsLife?'Lose a life and restart':'Restart field'}</button>
          <button type="button" className="hop-option" disabled={hearts.count>=HEART_CAP} onClick={()=>setProgress(prev=>({...prev,hearts:grantHeart(prev.hearts,Date.now())}))}>New life</button>
        </div>
      </section>
    </div>}

    {status==='won'&&<div className="hop-overlay" role="presentation">
      <section className="hop-win" role="dialog" aria-labelledby="hop-win-title">
        <p className="hop-kicker">Field cleared</p>
        <SpriteSurface name="bannerGold" className="hop-win-banner">
          <Sprite name="sparkleSmall" width={22} className="hop-win-spark is-left"/>
          <h2 id="hop-win-title">Sweet success</h2>
          <Sprite name="sparkleMedium" width={28} className="hop-win-spark is-right"/>
        </SpriteSurface>
        <p>{round.turns} {round.turns===1?'hop':'hops'}.</p>
        {badges.length>0&&<ul className="hop-badges">{badges.map(badge=><li key={badge.id}><Sprite name={BADGE_SPRITE[badge.id]} width={22}/>{badge.name}</li>)}</ul>}
        <SpriteSurface as="button" ref={nextRef} type="button" className="hop-next" disabled={locked} onClick={()=>goto(level.id===LEVELS.length?1:level.id+1)} name="buttonGold">
          {level.id===LEVELS.length?'Play the first field':'Next field'}
        </SpriteSurface>
      </section>
    </div>}

    {status==='stuck'&&<div className="hop-overlay" role="presentation">
      <section className="hop-stuck-card" role="dialog" aria-labelledby="hop-stuck-title">
        <p className="hop-kicker">{stuck.title}</p>
        <h2 id="hop-stuck-title" style={{margin:'6px 0 0',fontFamily:'"Lilita One",system-ui,sans-serif',fontSize:28,fontWeight:400,color:'#7a4e12'}}>Stuck!</h2>
        <p>{stuck.body}{!stuck.canRestart&&waitLabel?` ${waitLabel}`:''}</p>
        <div className="hop-stuck-actions">
          {stuck.canUndo&&<SpriteSurface as="button" type="button" className="hop-next" name="buttonGold" onClick={doUndo}>Undo</SpriteSurface>}
          {stuck.canUndo
            ?<button type="button" className="hop-ghost-btn" disabled={!stuck.canRestart} onClick={restart}>Lose a life</button>
            :<SpriteSurface as="button" type="button" className="hop-next" name="buttonGold" disabled={!stuck.canRestart} onClick={restart}>Lose a life</SpriteSurface>}
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
