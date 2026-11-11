import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Sprite,frameUrl,peekFrame} from './Sprite.jsx';
import {collectBurst,hexTile} from './presentation.js';
import {spriteStyle} from './sprites.js';

function metricsFor(width,height){
  const boardWidth=width+.5;
  const boardHeight=1+(height-1)*.75;
  return {boardWidth,boardHeight,aspect:boardWidth/(boardHeight*2/Math.sqrt(3))};
}
function cellStyle(cell,width,metrics){
  const row=Math.floor(cell/width),col=cell%width;
  return {
    left:`${(col+(row%2)*.5)/metrics.boardWidth*100}%`,
    top:`${row*.75/metrics.boardHeight*100}%`,
    '--cell-i':row*width+col
  };
}
function place(cell,width){
  return `row ${Math.floor(cell/width)+1}, column ${cell%width+1}`;
}

export default function Board({
  width,height,round,selected,jumps,pollenChoices,toolCells,hintStep,mode,
  flight,reduced,idle,status,filtered,onCell
}){
  const metrics=metricsFor(width,height);
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
    const duration=flight.celebrate?0.62:0.26;
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
      const lift=flight.celebrate?18:12;
      let motion;
      if(flight.kind==='jump'&&fromEl){
        motion=gsap.timeline();
        motion.fromTo(ghost,{x:0,y:0,scale:1,opacity:1},{x:dx,y:dy-lift,scale:flight.celebrate?1.22:flight.picked?1.14:1.08,duration:duration*.62,ease:'power2.out'});
        motion.to(ghost,{x:dx,y:dy,scale:1,duration:duration*.38,ease:'bounce.out'});
      }else if(flight.kind==='tunnel'&&fromEl){
        motion=gsap.timeline();
        motion.to(ghost,{scale:.2,opacity:0,duration:.16,ease:'power1.in'});
        motion.set(ghost,{x:dx,y:dy});
        motion.to(ghost,{scale:1,opacity:1,duration:.24,ease:'back.out(1.8)'});
      }else{
        motion=gsap.fromTo(ghost,{scale:.2,opacity:0},{scale:1,opacity:1,duration:.48,ease:'back.out(1.8)'});
      }
      motion.eventCallback('onComplete',()=>{if(live)setSettled(flight.token);});
      if(flight.kind==='jump'&&flight.over!=null&&flight.picked){
        const overEl=cellRefs.current[flight.over];
        const overBox=overEl?.getBoundingClientRect();
        if(overBox){
          const originX=overBox.left+overBox.width/2;
          const originY=overBox.top+overBox.height/2;
          burstAt(originX,originY,flight.celebrate?1.2:1,0);
          if(flight.celebrate)burstAt(originX,originY,.8,Math.PI/8);
          const jarBox=flight.jar?.getBoundingClientRect();
          if(jarBox?.width){
            const launch=url=>{
              if(!live||!url)return;
              bit=document.createElement('span');
              bit.className='hop-bit';
              paintBit(bit,'flower',url,flight.celebrate?44:34);
              document.body.appendChild(bit);
              const pop=flight.celebrate?2.05:1.75;
              const bloom=gsap.timeline();
              bloom.fromTo(bit,
                {x:originX,y:originY,xPercent:-50,yPercent:-50,scale:.3,rotation:0,opacity:1},
                {scale:pop,rotation:flight.celebrate?-14:10,duration:flight.celebrate?0.26:0.16,ease:'back.out(2.8)'});
              bloom.to(bit,{
                x:jarBox.left+jarBox.width/2,y:jarBox.top+jarBox.height/2,scale:flight.celebrate?0.72:0.4,rotation:0,opacity:0,
                duration:flight.celebrate?0.78:0.46,ease:'power2.in',onComplete(){
                  bit?.remove();
                  if(live)burstAt(jarBox.left+jarBox.width/2,jarBox.top+jarBox.height/2,flight.celebrate?0.7:0.5,Math.PI/10);
                }
              });
            };
            const ready=peekFrame('flower');
            if(ready)launch(ready);
            else frameUrl('flower').then(launch);
          }
        }
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
    style={{'--board-aspect':metrics.aspect,'--hex-w':`${100/metrics.boardWidth}%`,'--hex-h':`${100/metrics.boardHeight}%`}}>
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
      let label=`Empty hex, ${place(cell,width)}`;
      if(occupied||bee)label=`${worker?'Worker bee':'Bee'} at ${place(cell,width)}${cell===selected?', selected':''}`;
      else if(tool&&mode==='tunnel')label=`Burrow to ${place(cell,width)}`;
      else if(tool&&mode==='seed')label=`Plant a flower at ${place(cell,width)}`;
      else if(tool)label=`Call a worker at the hive, ${place(cell,width)}`;
      else if(landing)label=`Land at ${place(cell,width)} and collect the flower`;
      else if(flowerChoice)label=`Flower at ${place(cell,width)}. Show its landings`;
      else if(pollen)label=`Flower at ${place(cell,width)}`;
      else if(hive)label=`Hive at ${place(cell,width)}`;
      return <button key={cell} type="button" ref={node=>{cellRefs.current[cell]=node;}}
        className={`hop-cell ${bee?'is-bee':''} ${worker?'is-worker':''} ${bee&&cell===selected?'is-selected':''} ${idle&&bee&&cell===selected?'is-idle':''} ${pollen?'is-pollen':''} ${hive?'is-hive':''} ${flowerChoice?'is-flower':''} ${filtered===cell?'is-filtered':''} ${landing?'is-landing':''} ${tool?`is-tool is-${mode}`:''} ${hinted?'is-hint':''} ${flight?.kind==='seed'&&flight.to===cell?'is-new':''}`}
        style={cellStyle(cell,width,metrics)} disabled={!interactive} aria-label={label}
        aria-pressed={bee?cell===selected:flowerChoice?filtered===cell:undefined}
        onClick={()=>onCell(cell)}>
        <Sprite name={tile} className="hop-hex"/>
        {bee&&cell===selected&&<Sprite name="ringDashed" className="hop-ring"/>}
        {mark&&<Sprite name={mark} className={`hop-mark is-${mark}`}/>}
        {bee&&cell===selected&&<Sprite name="sparkleSmall" className="hop-bee-glint"/>}
        {hinted&&<Sprite name="sparkleSmall" className="hop-spark"/>}
      </button>;
    })}
    {hopping&&<div className="hop-ghost" ref={ghostRef} style={cellStyle(flight.from??flight.to,width,metrics)}>
      <Sprite name={flight.kind==='summon'||(flight.from!=null&&round.lead!==flight.to)?'beeWorker':'bee'} className={`hop-mark is-${flight.kind==='summon'||(flight.from!=null&&round.lead!==flight.to)?'beeWorker':'bee'}`}/>
    </div>}
  </div>;
}
