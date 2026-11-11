import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {Sprite,frameUrl,peekFrame} from './Sprite.jsx';
import {hexTile} from './presentation.js';
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
  flight,reduced,idle,status,filtered,deadEnds,onCell
}){
  const metrics=metricsFor(width,height);
  const boardRef=useRef(null);
  const cellRefs=useRef([]);
  const ghostRef=useRef(null);
  const jumpSet=new Map(jumps.map(move=>[move.to,move]));
  const choiceSet=new Set(pollenChoices);
  const tools=new Set(toolCells);
  const deadSet=deadEnds instanceof Set?deadEnds:new Set(deadEnds||[]);
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
    let live=true;
    const ctx=gsap.context(()=>{
      const start=center(ghost);
      const dx=end.x-start.x;
      const dy=end.y-start.y;
      const lift=flight.celebrate?18:12;
      let motion;
      if(flight.kind==='jump'&&fromEl){
        motion=gsap.timeline();
        motion.fromTo(ghost,{x:0,y:0,scale:1,opacity:1},{x:dx,y:dy-lift,scale:flight.celebrate?1.16:1.08,duration:duration*.62,ease:'power2.out'});
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
      if(flight.kind==='jump'&&flight.over!=null&&flight.jar){
        const overEl=cellRefs.current[flight.over];
        const jarBox=flight.jar.getBoundingClientRect();
        const overBox=overEl?.getBoundingClientRect();
        if(overBox&&jarBox.width){
          const launch=url=>{
            if(!live||!url)return;
            bit=document.createElement('span');
            bit.className='hop-bit';
            const painted=spriteStyle('flower',url,flight.celebrate?36:28);
            bit.style.width=`${painted.width}px`;
            bit.style.height=`${painted.height}px`;
            bit.style.backgroundImage=painted.backgroundImage;
            bit.style.backgroundRepeat=painted.backgroundRepeat;
            bit.style.backgroundSize=painted.backgroundSize;
            bit.style.backgroundPosition=painted.backgroundPosition;
            document.body.appendChild(bit);
            const pop=flight.celebrate?1.6:flight.picked?1.28:1.05;
            const bloom=gsap.timeline();
            bloom.fromTo(bit,
              {x:overBox.left+overBox.width/2,y:overBox.top+overBox.height/2,xPercent:-50,yPercent:-50,scale:.35,opacity:1},
              {scale:pop,duration:flight.celebrate?0.24:0.14,ease:'back.out(2.4)'});
            bloom.to(bit,{
              x:jarBox.left+jarBox.width/2,y:jarBox.top+jarBox.height/2,scale:flight.celebrate?0.72:0.42,opacity:0,
              duration:flight.celebrate?0.74:0.4,ease:'power2.in',onComplete(){bit?.remove();}
            });
          };
          const ready=peekFrame('flower');
          if(ready)launch(ready);
          else frameUrl('flower').then(launch);
        }
      }
    });
    return ()=>{live=false;ctx.revert();if(bit){gsap.killTweensOf(bit);bit.remove();}};
  },[flight,reduced]);

  return <div ref={boardRef} className="hop-board" role="group" aria-label={`${width} by ${height} honeycomb`}
    style={{'--board-aspect':metrics.aspect,'--hex-w':`${100/metrics.boardWidth}%`,'--hex-h':`${100/metrics.boardHeight}%`}}>
    {Array.from({length:width*height},(_,cell)=>{
      const occupied=round.bees.includes(cell);
      const bee=hopping&&(cell===flight.from||cell===flight.to)?false:occupied;
      const pollen=round.pollen.includes(cell);
      const hive=round.hives.includes(cell);
      const landing=status==='playing'&&!mode&&jumpSet.has(cell);
      const dead=landing&&deadSet.has(cell);
      const openLanding=landing&&!dead;
      const flowerChoice=status==='playing'&&!mode&&choiceSet.has(cell);
      const tool=status==='playing'&&mode&&tools.has(cell);
      const interactive=(occupied||bee)&&status==='playing'||landing||flowerChoice||tool;
      const hinted=hintTo===cell||hintStep?.over===cell;
      const worker=bee&&cell!==round.lead;
      const {tile,mark}=hexTile({
        landing,dead,pollen,hive,tool,mode,settledBee:bee,worker
      });
      let label=`Empty hex, ${place(cell,width)}`;
      if(occupied||bee)label=`${worker?'Worker bee':'Bee'} at ${place(cell,width)}${cell===selected?', selected':''}`;
      else if(tool&&mode==='tunnel')label=`Burrow to ${place(cell,width)}`;
      else if(tool&&mode==='seed')label=`Plant a flower at ${place(cell,width)}`;
      else if(tool)label=`Call a worker at the hive, ${place(cell,width)}`;
      else if(dead)label=`Stone trap at ${place(cell,width)}. Landing leaves no hops`;
      else if(landing)label=`Land at ${place(cell,width)} and collect the flower`;
      else if(flowerChoice)label=`Flower at ${place(cell,width)}. Show its landings`;
      else if(pollen)label=`Flower at ${place(cell,width)}`;
      else if(hive)label=`Hive at ${place(cell,width)}`;
      return <button key={cell} type="button" ref={node=>{cellRefs.current[cell]=node;}}
        className={`hop-cell ${bee?'is-bee':''} ${worker?'is-worker':''} ${bee&&cell===selected?'is-selected':''} ${idle&&bee&&cell===selected?'is-idle':''} ${pollen?'is-pollen':''} ${hive?'is-hive':''} ${flowerChoice?'is-flower':''} ${filtered===cell?'is-filtered':''} ${openLanding?'is-landing':''} ${dead?'is-dead':''} ${tool?`is-tool is-${mode}`:''} ${hinted?'is-hint':''} ${flight?.kind==='seed'&&flight.to===cell?'is-new':''}`}
        style={cellStyle(cell,width,metrics)} disabled={!interactive} aria-label={label}
        aria-pressed={bee?cell===selected:flowerChoice?filtered===cell:undefined}
        onClick={()=>onCell(cell)}>
        <Sprite name={tile} className="hop-hex"/>
        {mark&&<Sprite name={mark} className={`hop-mark is-${mark}`}/>}
        {bee&&cell===selected&&<Sprite name="ringDashed" className="hop-ring"/>}
        {hinted&&<Sprite name="sparkleSmall" className="hop-spark"/>}
      </button>;
    })}
    {hopping&&<div className="hop-ghost" ref={ghostRef} style={cellStyle(flight.from??flight.to,width,metrics)}>
      <Sprite name={flight.kind==='summon'||(flight.from!=null&&round.lead!==flight.to)?'beeWorker':'bee'} className="hop-mark"/>
    </div>}
  </div>;
}
