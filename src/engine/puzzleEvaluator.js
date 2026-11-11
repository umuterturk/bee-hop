import {legalMoves,playMove} from './rules.js';

/** An exact acyclic decision-DAG evaluator: a capture always removes one pollen.
 * bigints avoid rounding/saturation of route counts. State budgets are explicit:
 * truncated results MUST NOT be treated as exact or used to publish levels. */
export function evaluatePuzzle(initial,{maxStates=175000}={}){
 const cache=new Map();let visited=0,truncated=false;
 const ONE=1n,ZERO=0n;
 const pack=s=>s.bee+':'+s.pollen.join(',');
 function scan(s){
  if(!s.pollen.length)return {terminal:'won',totalPaths:ONE,realPaths:ONE,
    winningPaths:ONE,depthSum:ZERO,winDepthSum:ZERO,
    winningFirst:0,continuingFirst:0,legalFirst:0,
    decisions:0,deepTraps:0,forced:0,leafFailures:ZERO,
    maxTrapDepth:0,minTrapDepth:Infinity};
  const key=pack(s);
  if(cache.has(key))return cache.get(key);
  if(visited>=maxStates){truncated=true;return null;}visited++;
  const moves=legalMoves(s);
  if(!moves.length){const result={terminal:'stuck',totalPaths:ONE,realPaths:ONE,winningPaths:ZERO,
    depthSum:ZERO,winDepthSum:ZERO,winningFirst:0,continuingFirst:0,legalFirst:0,
    decisions:0,deepTraps:0,forced:0,leafFailures:ONE,maxTrapDepth:0,minTrapDepth:0};cache.set(key,result);return result;}
  let totalPaths=ZERO,realPaths=ZERO,winningPaths=ZERO,depthSum=ZERO,winDepthSum=ZERO;
  let continuingFirst=0,winningFirst=0,deepTraps=0,maxTrapDepth=0,minTrapDepth=Infinity;
  let leafFailures=ZERO;
  const children=[];
  for(const m of moves){
   const child=scan(playMove(s,m));if(!child)return null;
   children.push({m,child});
   totalPaths+=child.totalPaths;
   depthSum+=child.depthSum+child.totalPaths;
   winningPaths+=child.winningPaths;
   winDepthSum+=child.winDepthSum+child.winningPaths;
   leafFailures+=child.leafFailures;
   const continueMove=child.terminal!=='stuck';
   if(continueMove){continuingFirst++;realPaths+=child.realPaths;}
   if(child.winningPaths>ZERO)winningFirst++;
   if(continueMove&&child.winningPaths===ZERO)deepTraps++;
   if(child.leafFailures>ZERO){
    maxTrapDepth=Math.max(maxTrapDepth,1+child.maxTrapDepth);
    minTrapDepth=Math.min(minTrapDepth,1+child.minTrapDepth);
   }
  }
  // If every move is immediately fatal, this partial route has one meaningful
  // endpoint; no immediately losing move is counted as a useful branch.
  if(!continuingFirst)realPaths=ONE;
  const result={terminal:'playing',totalPaths,realPaths,winningPaths,depthSum,winDepthSum,
    winningFirst,continuingFirst,legalFirst:moves.length,deepTraps,
    decisions:Number(continuingFirst>1),forced:Number(continuingFirst===1),
    leafFailures,maxTrapDepth,minTrapDepth};
  cache.set(key,result);return result;
 }
 const result=scan(initial);
 if(!result||truncated)return {exact:false,truncated:true,visited};
 // Visit each reachable DAG state once to record the distribution of choices.
 let forks=0,forcedStates=0,choiceStates=0,winningForks=0,deepTraps=0,
   maxTrapDepth=0,totalProductive=0,totalWinningChoices=0;
 for(const info of cache.values()){
  if(info.terminal!=='playing')continue;
  choiceStates++;
  if(info.continuingFirst>=2)forks++;
  if(info.continuingFirst===1)forcedStates++;
  if(info.winningFirst>=2)winningForks++;
  deepTraps+=info.deepTraps;
  maxTrapDepth=Math.max(maxTrapDepth,info.maxTrapDepth);
  totalProductive+=info.continuingFirst;
  totalWinningChoices+=info.winningFirst;
 }
 const len=initial.pollen.length;
 const winMoves=Number(result.winningPaths);
 const realMoves=Number(result.realPaths);
 const winProbability=Number(result.winningPaths)/Number(result.totalPaths);
 // Engineered difficulty index. The major penalty is the percentage of viable
 // routes that fail, with independent bonuses for decision forks and trap depth.
 // Size is included but cannot create challenge without decisions.
 const difficulty=+(len*.22+Math.log2(1+realMoves/Math.max(1,winMoves))*.75+
    Math.log2(1+forks)*.55+Math.min(6,maxTrapDepth)*.27+
    (1-winProbability)*.50).toFixed(3);
 return {exact:true,visited,winningPaths:result.winningPaths.toString(),
   realPaths:result.realPaths.toString(),totalPaths:result.totalPaths.toString(),
   winningFirst:result.winningFirst,continuingFirst:result.continuingFirst,
   legalFirst:result.legalFirst,winningRate:+winProbability.toFixed(8),
   forks,forcedStates,choiceStates,winningForks,deepTraps,maxTrapDepth,
   difficulty,captures:len,avgTerminalDepth:Number(result.depthSum)/Number(result.totalPaths),
   avgWinDepth:len};
}
