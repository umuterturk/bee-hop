import React from 'react';

export function FlowerMark(){
  return <svg className="hop-flower" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="16" r="11" fill="#ffe27a"/>
    <circle cx="48" cy="28" r="11" fill="#ffd15a"/>
    <circle cx="42" cy="46" r="11" fill="#f6c24a"/>
    <circle cx="22" cy="46" r="11" fill="#ffd15a"/>
    <circle cx="16" cy="28" r="11" fill="#ffe9a3"/>
    <circle cx="32" cy="32" r="10" fill="#8d5a2b"/>
    <circle cx="29" cy="29" r="3" fill="#f2c16a"/>
  </svg>;
}
export function HiveMark(){
  return <svg className="hop-hive" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M16 48 V30 a16 16 0 0 1 32 0 V48" fill="#f6d7a4" stroke="#7a4b22" strokeWidth="3"/>
    <path d="M24 48 V34 h16 V48" fill="#fff6e4" stroke="#7a4b22" strokeWidth="3"/>
    <circle cx="32" cy="40" r="2.5" fill="#7a4b22"/>
  </svg>;
}
export function BeeMark({worker=false}){
  return <svg className="hop-bee-art" viewBox="0 0 90 90" aria-hidden="true">
    <ellipse cx="34" cy="30" rx="18" ry="12" fill={worker?'#d7ecff':'#f4fbff'} transform="rotate(-32 34 30)"/>
    <ellipse cx="58" cy="28" rx="17" ry="11" fill={worker?'#c5e2ff':'#e7f7ff'} transform="rotate(26 58 28)"/>
    <ellipse cx="45" cy="52" rx="26" ry="22" fill={worker?'#f0a202':'#ffc44d'} stroke="#6b3d16" strokeWidth="3"/>
    <path d="M31 34 Q40 52 32 70 M52 32 Q62 48 56 68" fill="none" stroke="#5c3714" strokeWidth="9"/>
    <circle cx="36" cy="46" r="3" fill="#24180f"/>
    <circle cx="56" cy="46" r="3" fill="#24180f"/>
    <path d="M40 57 Q46 62 52 57" fill="none" stroke="#5c3714" strokeWidth="2.5" strokeLinecap="round"/>
    {worker?<path d="M28 24 h10 l-2 8 h-6 z" fill="#2f6f9f"/>:<path d="M34 28 L28 18 M58 28 L64 18" stroke="#6b3d16" strokeWidth="3" strokeLinecap="round"/>}
  </svg>;
}
export function Jar({fill}){
  const honeyY=68-(46*Math.max(0,Math.min(1,fill)));
  return <svg className="hop-jar" viewBox="0 0 64 84" aria-hidden="true">
    <rect x="20" y="6" width="24" height="8" rx="3" fill="#c4842a"/>
    <path d="M14 18 h36 v42 c0 12-8 18-18 18 s-18-6-18-18 V18 z" fill="#fffaf0" stroke="#b87422" strokeWidth="3"/>
    <clipPath id="hop-jar-honey"><path d="M17 22 h30 v38 c0 9-6 14-15 14 s-15-5-15-14 V22 z"/></clipPath>
    <g clipPath="url(#hop-jar-honey)">
      <rect x="16" y={honeyY} width="32" height="52" fill="#f0b429"/>
      <rect x="16" y={honeyY} width="32" height="4" fill="#ffe08a"/>
    </g>
  </svg>;
}
