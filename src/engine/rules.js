/** Pure rules for an odd-row offset honeycomb. Six axial movement directions. */
export const DIRECTIONS = Object.freeze([[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]);
const rowOf=(i,w)=>Math.floor(i/w),colOf=(i,w)=>i%w;
export function stepHex(cell,[dq,dr],width,height){
 if(cell<0||cell>=width*height)return -1;
 const r=rowOf(cell,width),q=colOf(cell,width)-Math.floor(r/2),nr=r+dr;
 const nc=q+dq+Math.floor(nr/2);
 return nr>=0&&nr<height&&nc>=0&&nc<width?nr*width+nc:-1;
}
export function legalMoves(state){
 const {width,height,bee,pollen}=state,occupied=new Set(pollen),moves=[];
 for(const dir of DIRECTIONS){
  let cell=stepHex(bee,dir,width,height);
  while(cell!==-1&&!occupied.has(cell))cell=stepHex(cell,dir,width,height);
  if(cell===-1)continue;
  const over=cell;cell=stepHex(cell,dir,width,height);
  while(cell!==-1&&!occupied.has(cell)){
   moves.push({from:bee,over,to:cell});cell=stepHex(cell,dir,width,height);
  }
 }
 return moves;
}
export const selectableMoves=(moves,selectedPollen=null)=>selectedPollen===null?moves:moves.filter(m=>m.over===selectedPollen);
export function playMove(state,move){
 const found=legalMoves(state).find(m=>m.to===move?.to&&m.over===move?.over&&m.from===move?.from);
 return found?{...state,bee:found.to,pollen:state.pollen.filter(x=>x!==found.over)}:state;
}
export function statusOf(s){return !s.pollen.length?'won':legalMoves(s).length?'playing':'stuck';}
export function verifyPath(s,moves){
 if(!Array.isArray(moves))return false;
 for(const m of moves){const next=playMove(s,m);if(next===s)return false;s=next;}
 return statusOf(s)==='won';
}
/** Fast memoized first-solution DFS used for hints. Can also verify a puzzle. */
export function solvePuzzle(state,{maxStates=400000}={}){
 let visited=0,truncated=false;const dead=new Set();
 function dfs(s){
  if(!s.pollen.length)return [];
  const key=s.bee+':'+s.pollen.join(',');
  if(dead.has(key))return null;
  if(++visited>maxStates){truncated=true;return null;}
  for(const m of legalMoves(s)){
   const next=playMove(s,m),tail=dfs(next);
   if(tail)return [m,...tail];
  }
  if(!truncated)dead.add(key);
  return null;
 }
 const moves=dfs(state);return {solvable:!!moves,moves,visited,truncated};
}
