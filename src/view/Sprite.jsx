import React from 'react';
import sheetUrl from '../../assets/sprite-sheet.png';
import {spriteFitStyle,spriteStyle} from './sprites.js';

export const SHEET_URL=sheetUrl;

export function Sprite({name,width,className=''}){
  const style=width==null?spriteFitStyle(name,sheetUrl):spriteStyle(name,sheetUrl,width);
  return <span className={`hop-sprite ${className}`} style={style} aria-hidden="true"/>;
}

export function SpriteButton({name,className='',children,...props}){
  return <button type="button" className={`hop-sprite-button${className?` ${className}`:''}`} style={spriteFitStyle(name,sheetUrl)} {...props}>{children}</button>;
}
