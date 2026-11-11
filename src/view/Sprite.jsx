import React,{useSyncExternalStore} from 'react';
import sheetUrl from '../../assets/sprite-sheet.png';
import {createSheetLibrary} from './sheet.js';
import {SPRITES,spriteFitStyle,spriteStyle} from './sprites.js';

export const SHEET_URL=sheetUrl;

function loadSheet(src){
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>resolve(image);
    image.onerror=()=>reject(new Error('Sprite sheet failed to load'));
    image.src=src;
  });
}

function sliceFrame(image,box){
  const canvas=document.createElement('canvas');
  canvas.width=box.w;
  canvas.height=box.h;
  const context=canvas.getContext('2d');
  if(!context)return Promise.reject(new Error('Sprite frame failed to encode'));
  context.drawImage(image,box.x,box.y,box.w,box.h,0,0,box.w,box.h);
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(!blob)reject(new Error('Sprite frame failed to encode'));
      else resolve(URL.createObjectURL(blob));
    },'image/png');
  });
}

const library=createSheetLibrary({load:loadSheet,slice:sliceFrame});
let revision={map:new Map()};
const listeners=new Set();

function publishFrames(entries){
  const map=new Map(revision.map);
  let changed=false;
  for(const [name,url] of entries){
    if(url&&map.get(name)!==url){
      map.set(name,url);
      changed=true;
    }
  }
  if(!changed)return;
  revision={map};
  listeners.forEach(listener=>listener());
}

function subscribe(listener){
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}

function getSnapshot(){
  return revision;
}

export function frameUrl(name){
  const box=SPRITES[name];
  if(!box)return Promise.reject(new Error(`Unknown sprite: ${name}`));
  return library.frame(sheetUrl,name,box);
}

export function peekFrame(name){
  return library.peek(sheetUrl,name);
}

function useFrame(name){
  const snap=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
  return snap.map.get(name)||'';
}

Promise.allSettled(Object.keys(SPRITES).map(async name=>[name,await frameUrl(name)])).then(results=>{
  publishFrames(results.flatMap(result=>result.status==='fulfilled'?[result.value]:[]));
});

export function Sprite({name,width,className=''}){
  const url=useFrame(name);
  const style=width==null?spriteFitStyle(name,url):spriteStyle(name,url,width);
  return <span className={`hop-sprite ${className}`} style={style} aria-hidden="true"/>;
}

export function SpriteButton({name,className='',children,...props}){
  const url=useFrame(name);
  return <button type="button" className={`hop-sprite-button${className?` ${className}`:''}`} style={spriteFitStyle(name,url)} {...props}>{children}</button>;
}

export const SpriteSurface=React.forwardRef(function SpriteSurface({name,width,as:Tag='div',className,style,children,...props},ref){
  const url=useFrame(name);
  const painted=width==null?spriteFitStyle(name,url):spriteStyle(name,url,width);
  return <Tag ref={ref} className={className} style={{...painted,...style}} {...props}>{children}</Tag>;
});
