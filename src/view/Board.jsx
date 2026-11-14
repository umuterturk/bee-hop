import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Sprite,frameUrl,peekFrame} from './Sprite.jsx';
import {collectBurst,hexTile} from './presentation.js';
import {boardFrame,cellStyle,placeLabel} from './layout.js';
import {spriteStyle} from './sprites.js';

function tapBurst(element){
  if(!element)return;
  const box=element.getBoundingClientRect();
  const ring=document.createElement('span');
  ring.className='hop-tap-ring';
  const size=Math.round(Math.max(box.width,box.height)*1.08);
  ring.style.width=`${size}px`;
  ring.style.height=`${size}px`;
  document.body.appendChild(ring);
  gsap.fromTo(ring,
    {x:box.left+box.width/2,y:box.top+box.height/2,xPercent:-50,yPercent:-50,scale:.28,opacity:.95},
    {scale:1.7,opacity:0,duration:.36,ease:'power2.out',onComplete(){ring.remove();}}
  );
}

export default function Board({
  width,height,round,selected,jumps,pollenChoices,toolCells,hintStep,mode,
  flight,reduced,idle,status,filtered,onCell
}){
  const frame=boardFrame(width,height);
  const boardRef=useRef(null);
  const cellRefs=useRef([]);
  const ghostRef=useRef(null);
  const jumpSet=new Map(jumps.map(move=>[move.to,move]));
  const choiceSet=new Set(pollenChoices);
  const tools=new Set(toolCells);
  const hintTo=hintStep?.to??hintStep?.hive;
  const [settled,setSettled]=useState(null);
  const hopping=flight&&!reduced&&flight.kind!=='seed'&&settled!==flight.token;

  useEffect(()=>{
    if(!flight||reduced||flight.kind==='seed')return undefined;
    const board=boardRef.current;
    const ghost=ghostRef.current;
    const toEl=cellRefs.current[flight.to];
    if(!board||!ghost||!toEl)return undefined;
    const origin=board.getBoundingClientRect();
    const center=element=>{
      const box=element.getBoundingClientRect();
      return {x:box.left-origin.left+box.width/2,y:box.top-origin.top+box.height/2};
    };
    const end=center(toEl);
    const fromEl=flight.from==null?null:cellRefs.current[flight.from];
    const duration=flight.celebrate?0.74:0.42;
    let bit=null;
    const sparks=[];
    let live=true;
    const paintBit=(node,sprite,url,size)=>{
      const painted=spriteStyle(sprite,url,size);
      node.style.width=`${painted.width}px`;
      node.style.height=`${painted.height}px`;
      node.style.backgroundImage=painted.backgroundImage;
      node.style.backgroundRepeat=painted.backgroundRepeat;
      node.style.backgroundSize=painted.backgroundSize;
      node.style.backgroundPosition=painted.backgroundPosition;
    };
    const burstAt=(x,y,scale,turnOffset)=>{
      const specs=collectBurst(scale,turnOffset);
      const names=[...new Set(specs.map(spec=>spec.sprite))];
      const launch=urls=>{
        if(!live)return;
        for(const spec of specs){
          const url=urls[spec.sprite];
          if(!url)continue;
          const node=document.createElement('span');
          node.className='hop-burst';
          paintBit(node,spec.sprite,url,spec.size);
          document.body.appendChild(node);
          sparks.push(node);
          const spin=gsap.timeline({delay:spec.delay});
          spin.fromTo(node,
            {x,y,xPercent:-50,yPercent:-50,scale:.2,opacity:0,rotation:0},
            {scale:1.25,opacity:1,duration:.16,ease:'back.out(2.8)'});
          spin.to(node,{
            x:x+spec.dx,y:y+spec.dy,scale:.15,opacity:0,rotation:spec.spin,
            duration:.62,ease:'power2.out',onComplete(){node.remove();}
          });
        }
      };
      const ready={};
      const missing=[];
      for(const name of names){
        const url=peekFrame(name);
        if(url)ready[name]=url;
        else missing.push(name);
      }
      if(!missing.length)launch(ready);
      else Promise.all(missing.map(async name=>[name,await frameUrl(name)])).then(entries=>{
        if(!live)return;
        launch({...ready,...Object.fromEntries(entries)});
      });
    };
    const ctx=gsap.context(()=>{
      const start=center(ghost);
      const dx=end.x-start.x;
      const dy=end.y-start.y;
      const lift=flight.celebrate?36:28;
      let motion;
      let flowerFlying=false;
      if(flight.kind==='jump'&&fromEl){
        motion=gsap.timeline();
        motion.to(ghost,{scaleX:1.2,scaleY:.8,duration:.07,ease:'power1.in'});
        motion.to(ghost,{x:dx,y:dy-lift,scaleX:.86,scaleY:1.24,duration:duration*.52,ease:'power2.out'});
        motion.to(ghost,{x:dx,y:dy,scaleX:1.28,scaleY:.7,duration:duration*.3,ease:'power3.in'});
        motion.to(ghost,{scaleX:1,scaleY:1,duration:.18,ease:'back.out(2.8)'});
      }else if(flight.kind==='tunnel'&&fromEl){
        motion=gsap.timeline();
        motion.to(ghost,{scale:.2,opacity:0,duration:.16,ease:'power1.in'});
        motion.set(ghost,{x:dx,y:dy});
        motion.to(ghost,{scale:1,opacity:1,duration:.24,ease:'back.out(1.8)'});
      }else{
        motion=gsap.fromTo(ghost,{scale:.2,opacity:0},{scale:1,opacity:1,duration:.48,ease:'back.out(1.8)'});
      }
      motion.eventCallback('onComplete',()=>{
        if(live)setSettled(flight.token);
        if(flight.picked&&!flowerFlying)flight.onArrive?.();
      });
      if(flight.kind==='jump'&&flight.over!=null&&flight.picked){
        const overEl=cellRefs.current[flight.over];
        const overBox=overEl?.getBoundingClientRect();
        if(overBox){
          const originX=overBox.left+overBox.width/2;
          const originY=overBox.top+overBox.height/2;
          burstAt(originX,originY,flight.celebrate?1.45:1.25,0);
          if(flight.celebrate)burstAt(originX,originY,1,Math.PI/8);
          const jarBox=flight.jar?.getBoundingClientRect();
          if(jarBox?.width){
            flowerFlying=true;
            const launch=url=>{
              if(!live||!url){flight.onArrive?.();return;}
              bit=document.createElement('span');
              bit.className='hop-bit';
              paintBit(bit,'flower',url,flight.celebrate?56:48);
              document.body.appendChild(bit);
              const jarX=jarBox.left+jarBox.width/2;
              const jarY=jarBox.top+jarBox.height/2;
              const pop=flight.celebrate?2.5:2.2;
              const bloom=gsap.timeline();
              bloom.fromTo(bit,
                {x:originX,y:originY,xPercent:-50,yPercent:-50,scale:.25,rotation:-16,opacity:1},
                {scale:pop,rotation:14,duration:.22,ease:'back.out(3.4)'});
              bloom.to(bit,{y:originY-34,scale:pop*.84,rotation:6,duration:.12,ease:'power1.out'});
              bloom.to(bit,{
                x:jarX,y:jarY,scale:flight.celebrate?.92:.6,rotation:0,opacity:1,
                duration:flight.celebrate?.68:.46,ease:'power2.in',
                onComplete(){flight.onArrive?.();}
              });
              bloom.to(bit,{
                scale:.14,opacity:0,duration:.12,ease:'power1.in',onComplete(){
                  bit?.remove();
                  if(live)burstAt(jarX,jarY,flight.celebrate?.95:.7,Math.PI/10);
                }
              });
            };
            const ready=peekFrame('flower');
            if(ready)launch(ready);
            else frameUrl('flower').then(url=>{if(live)launch(url);});
          }else{flowerFlying=true;flight.onArrive?.();}
        }else{flowerFlying=true;flight.onArrive?.();}
      }
    });
    return ()=>{
      live=false;
      ctx.revert();
      if(bit){gsap.killTweensOf(bit);bit.remove();}
      for(const node of sparks){gsap.killTweensOf(node);node.remove();}
    };
  },[flight,reduced]);

  return <div ref={boardRef} className="hop-board" role="group" aria-label={`${width} by ${height} honeycomb`}
    style={{'--board-aspect':frame.aspect,'--hex-w':frame.hexWidth,'--hex-h':frame.hexHeight}}>
    {Array.from({length:width*height},(_,cell)=>{
      const occupied=round.bees.includes(cell);
      const bee=hopping&&(cell===flight.from||cell===flight.to)?false:occupied;
      const pollen=round.pollen.includes(cell);
      const hive=round.hives.includes(cell);
      const landing=status==='playing'&&!mode&&jumpSet.has(cell);
      const flowerChoice=status==='playing'&&!mode&&choiceSet.has(cell);
      const tool=status==='playing'&&mode&&tools.has(cell);
      const interactive=(occupied||bee)&&status==='playing'||landing||flowerChoice||tool;
      const hinted=hintTo===cell||hintStep?.over===cell;
      const worker=bee&&cell!==round.lead;
      const {tile,mark}=hexTile({
        landing,pollen,hive,tool,mode,settledBee:bee,worker
      });
      const piece=mark==='bee'||mark==='beeWorker'?null:mark;
      let label=`Empty hex, ${placeLabel(cell,width)}`;
      if(occupied||bee)label=`${worker?'Worker bee':'Bee'} at ${placeLabel(cell,width)}${cell===selected?', selected':''}`;
      else if(tool&&mode==='tunnel')label=`Burrow to ${placeLabel(cell,width)}`;
      else if(tool&&mode==='seed')label=`Plant a flower at ${placeLabel(cell,width)}`;
      else if(tool)label=`Call a worker at the hive, ${placeLabel(cell,width)}`;
      else if(landing)label=`Land at ${placeLabel(cell,width)} and collect the flower`;
      else if(flowerChoice)label=`Flower at ${placeLabel(cell,width)}. Show its landings`;
      else if(pollen)label=`Flower at ${placeLabel(cell,width)}`;
      else if(hive)label=`Hive at ${placeLabel(cell,width)}`;
      return <button key={cell} type="button" ref={node=>{cellRefs.current[cell]=node;}}
        className={`hop-cell ${bee?'is-bee':''} ${worker?'is-worker':''} ${bee&&cell===selected?'is-selected':''} ${idle&&bee&&cell===selected?'is-idle':''} ${pollen?'is-pollen':''} ${hive?'is-hive':''} ${flowerChoice?'is-flower':''} ${filtered===cell?'is-filtered':''} ${landing?'is-landing':''} ${tool?`is-tool is-${mode}`:''} ${hinted?'is-hint':''} ${flight?.kind==='seed'&&flight.to===cell?'is-new':''}`}
        style={cellStyle(cell,width,height)} disabled={!interactive} aria-label={label}
        aria-pressed={bee?cell===selected:flowerChoice?filtered===cell:undefined}
        onPointerDown={event=>{if(!reduced&&(landing||tool||flowerChoice))tapBurst(event.currentTarget);}}
        onClick={()=>onCell(cell)}>
        <Sprite name={tile} className="hop-hex"/>
        {(landing||(tool&&(mode==='summon'||mode==='tunnel')))&&<Sprite name="sparkleSmall" className="hop-landing-spark"/>}
        {piece&&<Sprite name={piece} className={`hop-mark is-${piece}`}/>}
        {hinted&&<Sprite name="sparkleSmall" className="hop-spark"/>}
      </button>;
    })}
    {round.bees.map(cell=>{
      if(hopping&&(cell===flight.from||cell===flight.to))return null;
      const worker=cell!==round.lead;
      const picked=cell===selected;
      return <div key={`bee-${cell}`} className={`hop-bee-pin ${picked?'is-selected':''} ${idle&&picked?'is-idle':''} ${worker?'is-worker':''}`} style={cellStyle(cell,width,height)} aria-hidden="true">
        {picked&&<Sprite name="ringDashed" className="hop-ring"/>}
        <Sprite name={worker?'beeWorker':'bee'} className={`hop-mark is-${worker?'beeWorker':'bee'}`}/>
        {picked&&<Sprite name="sparkleSmall" className="hop-bee-glint"/>}
      </div>;
    })}
    {hopping&&<div className="hop-ghost" ref={ghostRef} style={cellStyle(flight.from??flight.to,width,height)}>
      <Sprite name={flight.kind==='summon'||(flight.from!=null&&round.lead!==flight.to)?'beeWorker':'bee'} className={`hop-mark is-${flight.kind==='summon'||(flight.from!=null&&round.lead!==flight.to)?'beeWorker':'bee'}`}/>
    </div>}
  </div>;
}
