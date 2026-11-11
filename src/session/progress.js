import {hiveCell,inventoryFor} from '../content/campaign.js';
import {LEVELS} from '../content/catalog.js';

export const PROGRESS_KEY='bee-hop.progress.v1';
const LEGACY_KEY='bee-hop.best-level.v2';

export function freshProgress(){
  return {
    v:1,
    unlocked:1,
    badges:{},
    settings:{sound:true,music:false,haptics:true,reduceMotion:prefersReduced()},
    resume:null
  };
}
export function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}
export function browserStorage(){
  try{return globalThis.localStorage||memoryStorage();}
  catch{return memoryStorage();}
}
function prefersReduced(){
  try{return typeof globalThis.matchMedia==='function'&&!!globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  catch{return false;}
}
function clampLevel(value){
  const n=Number(value);
  return Number.isInteger(n)&&n>=1&&n<=LEVELS.length?n:1;
}
function validRound(round,level){
  if(!round||typeof round!=='object')return false;
  const cells=level.width*level.height;
  const bees=round.bees,pollen=round.pollen,charges=round.charges;
  if(!Array.isArray(bees)||bees.length<1||bees.length>2)return false;
  if(new Set(bees).size!==bees.length)return false;
  if(!bees.every(cell=>Number.isInteger(cell)&&cell>=0&&cell<cells))return false;
  if(!Array.isArray(pollen)||new Set(pollen).size!==pollen.length)return false;
  if(pollen.some(cell=>bees.includes(cell)||!Number.isInteger(cell)||cell<0||cell>=cells))return false;
  const grant=inventoryFor(level);
  if(!charges||['tunnel','seed','worker'].some(key=>!Number.isInteger(charges[key])||charges[key]<0||charges[key]>grant[key]))return false;
  if(grant.undo===null?round.undoLeft!==null:!Number.isInteger(round.undoLeft)||round.undoLeft<0||round.undoLeft>grant.undo)return false;
  if(grant.dance===null?round.danceLeft!==null:!Number.isInteger(round.danceLeft)||round.danceLeft<0||round.danceLeft>grant.dance)return false;
  if(!Array.isArray(round.past)||round.past.length>48)return false;
  if(!bees.includes(round.lead))return false;
  if(!round.past.every(snap=>snap&&Array.isArray(snap.bees)&&snap.bees.includes(snap.lead)&&Array.isArray(snap.pollen)&&snap.charges&&Number.isInteger(snap.goal)&&typeof snap.usedTool==='boolean'&&Number.isInteger(snap.turns)))return false;
  if(!Number.isInteger(round.goal)||round.goal<level.pollen.length||round.goal<round.pollen.length)return false;
  const hive=grant.worker?hiveCell(level):-1;
  const expected=hive>=0?[hive]:[];
  if(!Array.isArray(round.hives)||round.hives.length!==expected.length||round.hives.some((cell,i)=>cell!==expected[i]))return false;
  if(round.width!==level.width||round.height!==level.height)return false;
  return true;
}
export function loadProgress(storage=browserStorage()){
  const blank=freshProgress();
  try{
    const raw=storage.getItem(PROGRESS_KEY);
    if(!raw){
      const legacy=clampLevel(storage.getItem(LEGACY_KEY));
      return legacy>1?{...blank,unlocked:legacy}:blank;
    }
    const parsed=JSON.parse(raw);
    const settings={...blank.settings,...(parsed.settings||{})};
    const unlocked=clampLevel(parsed.unlocked);
    const badges={};
    if(parsed.badges&&typeof parsed.badges==='object'){
      for(const [key,list] of Object.entries(parsed.badges)){
        if(Array.isArray(list))badges[key]=list.filter(id=>typeof id==='string');
      }
    }
    let resume=null;
    if(parsed.resume&&Number.isInteger(parsed.resume.levelId)){
      const level=LEVELS[parsed.resume.levelId-1];
      if(level&&parsed.resume.levelId<=unlocked&&validRound(parsed.resume.round,level)){
        resume={levelId:level.id,round:parsed.resume.round};
      }
    }
    return {v:1,unlocked,badges,settings,resume};
  }catch{
    return blank;
  }
}
export function saveProgress(progress,storage=browserStorage()){
  try{storage.setItem(PROGRESS_KEY,JSON.stringify(progress));return true;}
  catch{return false;}
}
