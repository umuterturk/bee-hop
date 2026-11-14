/** Ability-aware board. Ordinary jumps match rules.js when one bee is present.
 * Tunnel, Seed and Worker spend a charge and never refund it. Undo and
 * Waggle Dance are not actions here. */
import {DIRECTIONS,stepHex} from './rules.js';

export function axial(cell,width){
  const r=Math.floor(cell/width);
  return [cell%width-Math.floor(r/2),r];
}
export function hexDistance(a,b,width){
  const [q1,r1]=axial(a,width),[q2,r2]=axial(b,width);
  const dq=q1-q2,dr=r1-r2;
  return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;
}
function sorted(values){return [...values].sort((a,b)=>a-b);}

export function legalJumps(state){
  const {width,height,bees,pollen}=state;
  const pollenSet=new Set(pollen),beeSet=new Set(bees),moves=[];
  for(const bee of bees){
    for(const dir of DIRECTIONS){
      let cell=stepHex(bee,dir,width,height);
      while(cell!==-1&&!pollenSet.has(cell)&&!beeSet.has(cell))cell=stepHex(cell,dir,width,height);
      if(cell===-1||!pollenSet.has(cell))continue;
      const over=cell;
      cell=stepHex(cell,dir,width,height);
      while(cell!==-1&&!pollenSet.has(cell)&&!beeSet.has(cell)){
        moves.push({type:'jump',bee,over,to:cell});
        cell=stepHex(cell,dir,width,height);
      }
    }
  }
  return moves;
}
function emptyCells(state,bee){
  const blocked=new Set([...(state.blocked||[]),...state.pollen,...state.bees]);
  const cells=[];
  for(let cell=0;cell<state.width*state.height;cell++){
    if(cell!==bee&&!blocked.has(cell))cells.push(cell);
  }
  return cells;
}
export function tunnelTargets(state,bee){
  if(!state.bees.includes(bee)||state.charges.tunnel<=0)return [];
  return emptyCells(state,bee).filter(cell=>hexDistance(bee,cell,state.width)<=3);
}
export function seedTargets(state,bee){
  if(!state.bees.includes(bee)||state.charges.seed<=0)return [];
  return emptyCells(state,bee).filter(cell=>hexDistance(bee,cell,state.width)<=2);
}
export function summonTargets(state){
  if(state.charges.worker<=0||state.bees.length>=2)return [];
  const blocked=new Set([...(state.blocked||[]),...state.pollen,...state.bees]);
  return (state.hives||[]).filter(cell=>!blocked.has(cell));
}
/** Tool hexes that leave the bee with at least one hop. */
export function openingTargets(state,bee,tool){
  const cells=tool==='seed'?seedTargets(state,bee):tool==='tunnel'?tunnelTargets(state,bee):tool==='summon'?summonTargets(state):[];
  return cells.filter(cell=>{
    const action=tool==='summon'?{type:'summon',hive:cell}:{type:tool,bee,to:cell};
    return legalJumps(step(state,action)).length>0;
  });
}
function placeBee(bees,from,to){return sorted(bees.map(bee=>bee===from?to:bee));}

export function step(state,action){
  if(!action)return state;
  if(action.type==='jump'){
    const found=legalJumps(state).find(move=>move.bee===action.bee&&move.over===action.over&&move.to===action.to);
    if(!found)return state;
    return {...state,bees:placeBee(state.bees,found.bee,found.to),pollen:state.pollen.filter(cell=>cell!==found.over)};
  }
  if(action.type==='tunnel'){
    if(!tunnelTargets(state,action.bee).includes(action.to))return state;
    return {...state,bees:placeBee(state.bees,action.bee,action.to),charges:{...state.charges,tunnel:state.charges.tunnel-1}};
  }
  if(action.type==='seed'){
    if(!seedTargets(state,action.bee).includes(action.to))return state;
    return {...state,pollen:sorted([...state.pollen,action.to]),charges:{...state.charges,seed:state.charges.seed-1}};
  }
  if(action.type==='summon'){
    if(!summonTargets(state).includes(action.hive))return state;
    return {...state,bees:sorted([...state.bees,action.hive]),charges:{...state.charges,worker:state.charges.worker-1}};
  }
  return state;
}
export function statusOf(state){
  if(!state.pollen.length)return 'won';
  if(legalJumps(state).length)return 'playing';
  if(state.bees.some(bee=>tunnelTargets(state,bee).length||seedTargets(state,bee).length))return 'playing';
  if(summonTargets(state).length)return 'playing';
  return 'stuck';
}
/** One winning action sequence, or a proven miss, or an unfinished search.
 * Truncation is unknown — never certified unsolvable. */
export function solveAbilities(state,{maxStates=80000}={}){
  let visited=0,truncated=false;
  const dead=new Set();
  const keyOf=s=>`${s.bees.join('.')}|${s.pollen.join('.')}|${s.charges.tunnel},${s.charges.seed},${s.charges.worker}`;
  function actions(s){
    return [
      ...legalJumps(s),
      ...s.bees.flatMap(bee=>tunnelTargets(s,bee).map(to=>({type:'tunnel',bee,to}))),
      ...s.bees.flatMap(bee=>seedTargets(s,bee).map(to=>({type:'seed',bee,to}))),
      ...summonTargets(s).map(hive=>({type:'summon',hive}))
    ];
  }
  function dfs(s){
    if(!s.pollen.length)return [];
    const key=keyOf(s);
    if(dead.has(key))return null;
    if(++visited>maxStates){truncated=true;return null;}
    for(const action of actions(s)){
      const tail=dfs(step(s,action));
      if(tail)return [action,...tail];
    }
    if(!truncated)dead.add(key);
    return null;
  }
  const actionsFound=dfs(state);
  return {solvable:!!actionsFound,actions:actionsFound,visited,truncated};
}
