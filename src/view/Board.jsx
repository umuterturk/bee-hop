import React,{useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {SHEET_URL,Sprite} from './Sprite.jsx';
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
  flight,reduced,nudge,status,filtered,deadEnds,onCell
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
  const moving=flight&&!reduced&&flight.kind!=='seed'&&settled!==flight.token?flight.to:null;

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
      let motion;
      if(flight.kind==='jump'&&fromEl){
        const start=center(fromEl);
        motion=gsap.fromTo(ghost,{x:start.x,y:start.y,xPercent:-50,yPercent:-50,scale:1,opacity:1},{x:end.x,y:end.y,duration,ease:'power2.out'});
      }else if(flight.kind==='tunnel'&&fromEl){
        const start=center(fromEl);
        motion=gsap.timeline();
        motion.fromTo(ghost,{x:start.x,y:start.y,xPercent:-50,yPercent:-50,scale:1,opacity:1},{scale:.2,opacity:0,duration:.16,ease:'power1.in'});
        motion.fromTo(ghost,{x:end.x,y:end.y,xPercent:-50,yPercent:-50,scale:.2,opacity:0},{scale:1,opacity:1,duration:.22,ease:'power2.out'});
      }else{
        motion=gsap.fromTo(ghost,{x:end.x,y:end.y,xPercent:-50,yPercent:-50,scale:.2,opacity:0},{scale:1,opacity:1,duration:.48,ease:'back.out(1.6)'});
      }
      motion.eventCallback('onComplete',()=>{if(live)setSettled(flight.token);});
      if(flight.kind==='jump'&&flight.over!=null&&flight.jar){
        const overEl=cellRefs.current[flight.over];
        const jarBox=flight.jar.getBoundingClientRect();
        const overBox=overEl?.getBoundingClientRect();
        if(overBox&&jarBox.width){
          bit=document.createElement('span');
          bit.className='hop-bit';
          const painted=spriteStyle('flower',SHEET_URL,22);
          bit.style.width=`${painted.width}px`;
          bit.style.height=`${painted.height}px`;
          bit.style.backgroundImage=painted.backgroundImage;
          bit.style.backgroundRepeat=painted.backgroundRepeat;
          bit.style.backgroundSize=painted.backgroundSize;
          bit.style.backgroundPosition=painted.backgroundPosition;
          document.body.appendChild(bit);
          gsap.fromTo(bit,
            {x:overBox.left+overBox.width/2,y:overBox.top+overBox.height/2,xPercent:-50,yPercent:-50,opacity:1},
            {x:jarBox.left+jarBox.width/2,y:jarBox.top+jarBox.height/2,opacity:0,duration:flight.celebrate?0.7:0.42,ease:'power2.in',onComplete(){bit.remove();}});
        }
      }
    });
    return ()=>{live=false;ctx.revert();bit?.remove();};
  },[flight,reduced]);

  return <div ref={boardRef} className="hop-board" role="group" aria-label={`${width} by ${height} honeycomb`}
    style={{'--board-aspect':metrics.aspect,'--hex-w':`${100/metrics.boardWidth}%`,'--hex-h':`${100/metrics.boardHeight}%`}}>
    {Array.from({length:width*height},(_,cell)=>{
      const bee=round.bees.includes(cell);
      const pollen=round.pollen.includes(cell);
      const hive=round.hives.includes(cell);
      const landing=status==='playing'&&!mode&&jumpSet.has(cell);
      const dead=landing&&deadSet.has(cell);
      const flowerChoice=status==='playing'&&!mode&&choiceSet.has(cell);
      const tool=status==='playing'&&mode&&tools.has(cell);
      const interactive=bee&&status==='playing'||landing||flowerChoice||tool;
      const hinted=hintTo===cell||hintStep?.over===cell;
      const worker=bee&&cell!==round.lead;
      const settledBee=bee&&moving!==cell;
      let tile='hexHoney';
      if(hive&&!pollen&&!(settledBee&&!worker))tile='hexHoneyDrip';
      if(pollen)tile='hexFlower';
      if(landing)tile=dead?'hexStone':hinted||nudge?'hexLandingSparkle':'hexLanding';
      if(tool&&mode==='tunnel')tile='hexPortal';
      if(tool&&mode==='seed')tile='hexHoney';
      if(tool&&mode==='summon')tile='hexHoneyDrip';
      if(settledBee&&!worker)tile='hexBee';
      const mark=settledBee&&worker?'beeWorker':tool&&mode==='seed'?'mango':dead?'stoneMoss':null;
      let label=`Empty hex, ${place(cell,width)}`;
      if(bee)label=`${worker?'Worker bee':'Bee'} at ${place(cell,width)}${cell===selected?', selected':''}`;
      else if(tool&&mode==='tunnel')label=`Burrow to ${place(cell,width)}`;
      else if(tool&&mode==='seed')label=`Plant a flower at ${place(cell,width)}`;
      else if(tool)label=`Call a worker at the hive, ${place(cell,width)}`;
      else if(dead)label=`Dead end at ${place(cell,width)}. Landing leaves no hops`;
      else if(landing)label=`Land at ${place(cell,width)} and collect the flower`;
      else if(flowerChoice)label=`Flower at ${place(cell,width)}. Show its landings`;
      else if(pollen)label=`Flower at ${place(cell,width)}`;
      else if(hive)label=`Hive at ${place(cell,width)}`;
      return <button key={cell} type="button" ref={node=>{cellRefs.current[cell]=node;}}
        className={`hop-cell ${bee?'is-bee':''} ${worker?'is-worker':''} ${cell===selected?'is-selected':''} ${pollen?'is-pollen':''} ${hive?'is-hive':''} ${flowerChoice?'is-flower':''} ${filtered===cell?'is-filtered':''} ${landing?'is-landing':''} ${dead?'is-dead':''} ${tool?`is-tool is-${mode}`:''} ${hinted?'is-hint':''} ${nudge&&landing&&!dead?'is-nudge':''} ${moving===cell?'is-moving':''} ${flight?.kind==='seed'&&flight.to===cell?'is-new':''}`}
        style={cellStyle(cell,width,metrics)} disabled={!interactive} aria-label={label}
        aria-pressed={bee?cell===selected:flowerChoice?filtered===cell:undefined}
        onClick={()=>onCell(cell)}>
        <Sprite name={tile} className="hop-hex"/>
        {mark&&<Sprite name={mark} className={`hop-mark is-${mark}`}/>}
        {bee&&cell===selected&&moving!==cell&&<Sprite name="ringDashed" className="hop-ring"/>}
        {hinted&&!landing&&<Sprite name="sparkleMedium" className="hop-spark"/>}
      </button>;
    })}
    {moving!=null&&<div className="hop-ghost" ref={ghostRef}><Sprite name={moving!==round.lead?'beeWorker':'bee'} className="hop-mark"/></div>}
  </div>;
}
