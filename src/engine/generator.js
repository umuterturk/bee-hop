import {DIRECTIONS,stepHex,verifyPath,legalMoves,solvePuzzle} from './rules.js';
import {evaluatePuzzle} from './puzzleEvaluator.js';
export function randomGenerator(seed){
 let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;
  t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);
  return ((t^(t>>>14))>>>0)/4294967296;};
}
export function reverseBuild(spec,rng){
 const {width,height}=spec;
 let bee=Math.floor(rng()*width*height);const pollen=[],witness=[];
 for(let step=0;step<spec.pollen;step++){
  const occupied=new Set(pollen),candidates=[];
  for(const d of DIRECTIONS){
   let at=bee;const intermediate=[];
   while(true){
    at=stepHex(at,d,width,height);
    if(at<0||occupied.has(at))break;
    for(const over of intermediate)candidates.push({source:at,over,dest:bee});
    intermediate.push(at);
   }
  }
  if(!candidates.length)return null;
  // Prefer a mixture of short and long jumps, and avoid immediate symmetry.
  const pick=candidates[Math.floor(rng()*candidates.length)];
  pollen.push(pick.over);bee=pick.source;
  witness.unshift({from:pick.source,over:pick.over,to:pick.dest});
 }
 const s={width,height,bee,pollen:pollen.sort((a,b)=>a-b),witness};
 return verifyPath(s,witness)?s:null;
}
/** Bounded candidate search with exact evaluation. Never accept a truncated
 * analysis. When no target-quality candidate exists, choose the best evaluated
 * exact puzzle, not an uncertified fallback. */
export function generatePuzzle(spec,{candidates=90,maxStates=150000,minDifficulty=-Infinity,maxDifficulty=Infinity,preferredDifficulty=spec.target}={}){
 const rng=randomGenerator(spec.seed);
 let best=null,rank=-Infinity,examined=0,truncated=0;
 for(let i=0;i<candidates;i++){
  const s=reverseBuild(spec,rng);if(!s)continue;
  const opening=legalMoves(s);
  if(spec.pollen>2&&opening.length<2)continue;
  const e=evaluatePuzzle(s,{maxStates});
  if(!e.exact){truncated++;continue;}examined++;
  if(e.difficulty<minDifficulty||e.difficulty>maxDifficulty)continue;
  const wins=Number(e.winningPaths),real=Number(e.realPaths);
  if(!wins)continue;
  const d=e.difficulty;
  const error=Math.abs(d-preferredDifficulty);
  // Prefer genuine forks and helpful traps; penalize trivial linear routes.
  const interesting=Math.min(10,e.forks)*.12+Math.min(6,e.maxTrapDepth)*.1+
    Math.min(4,e.winningFirst)*.1;
  const bossRatio=Number(e.winningPaths)/Number(e.realPaths);
  const score=-error*2+interesting+(e.continuingFirst>=2?.18:0)+
    (spec.boss?(1-bossRatio)*1.6:0)-
    (spec.id>2&&e.forks===0?1.5:0)-
    (spec.boss&&real===wins?1.6:0);
  if(score>rank){best={...s, id:spec.id,name:spec.name,wave:spec.wave,
    boss:spec.boss,metrics:e};rank=score;}
 }
 if(!best)throw new Error('No fully evaluated puzzle for level '+spec.id+' (visited '+examined+', truncated '+truncated+')');
 const solution=solvePuzzle(best,{maxStates}).moves;
 if(!verifyPath(best,solution))throw new Error('No validated witness for '+spec.id);
 return {...best,solution};
}
