const box=(x,y,w,h)=>Object.freeze({x,y,w,h})

export const SPRITE_SHEET=Object.freeze({
  width:1448,
  height:1086,
  src:'assets/sprite-sheet.png'
})

// 40% alpha connected-component bounds. A lower cut merges neighbors whose glows touch.
export const SPRITES=Object.freeze({
  hexHoney:box(23,21,184,208),
  hexLandingSparkle:box(223,17,193,211),
  hexLanding:box(422,16,197,215),
  hexFlower:box(630,18,186,209),
  hexHoneyDrip:box(832,19,182,206),
  hexBee:box(1030,19,189,210),
  hexStone:box(1236,20,186,209),
  bee:box(37,240,176,194),
  beeWorker:box(249,243,159,182),
  flower:box(436,263,178,149),
  hexPortal:box(643,251,166,184),
  mango:box(858,267,128,146),
  stoneMoss:box(1030,259,174,176),
  hexHoneyDripAlt:box(1244,256,169,179),
  wreath:box(27,442,160,156),
  ringDashed:box(195,464,127,122),
  sparkleLarge:box(353,480,83,87),
  sparkleMedium:box(471,461,62,66),
  sparkleSmall:box(517,524,45,46),
  jarEmpty:box(590,446,146,152),
  jarHalf:box(752,446,143,152),
  jarFull:box(910,446,145,152),
  heart:box(1075,479,109,93),
  heartOutline:box(1204,477,109,99),
  leaf:box(1331,470,88,104),
  buttonUndo:box(17,616,137,139),
  buttonRestart:box(160,616,137,139),
  buttonHint:box(302,616,136,139),
  buttonTunnel:box(444,616,136,140),
  buttonSeed:box(585,616,138,140),
  buttonWorker:box(727,616,139,140),
  buttonPause:box(871,631,114,116),
  buttonHelp:box(993,631,114,116),
  buttonLeaf:box(1116,637,157,102),
  buttonCrown:box(1280,637,156,102),
  bubble:box(18,777,190,149),
  drip:box(238,805,139,89),
  bannerGold:box(404,778,471,127),
  bannerPurple:box(891,789,378,104),
  crown:box(1293,790,133,93),
  buttonGold:box(778,901,602,170),
  barHoney:box(64,933,627,122)
})

function cssNum(value){
  return `${Math.round(value*1000)/1000}`
}
function cssPx(value){
  return `${cssNum(value)}px`
}
export function spriteFitStyle(name,url){
  const sprite=SPRITES[name]
  if(!sprite)throw new Error(`Unknown sprite: ${name}`)
  const spanX=SPRITE_SHEET.width-sprite.w
  const spanY=SPRITE_SHEET.height-sprite.h
  return {
    backgroundImage:`url('${url}')`,
    backgroundRepeat:'no-repeat',
    backgroundSize:`${cssNum(SPRITE_SHEET.width/sprite.w*100)}% ${cssNum(SPRITE_SHEET.height/sprite.h*100)}%`,
    backgroundPosition:`${cssNum(spanX?sprite.x/spanX*100:0)}% ${cssNum(spanY?sprite.y/spanY*100:0)}%`,
    aspectRatio:`${sprite.w} / ${sprite.h}`
  }
}

export function spriteStyle(name,url,displayWidth){
  const sprite=SPRITES[name]
  if(!sprite)throw new Error(`Unknown sprite: ${name}`)
  const width=displayWidth??sprite.w
  const scale=width/sprite.w
  return {
    width,
    height:sprite.h*scale,
    backgroundImage:`url('${url}')`,
    backgroundRepeat:'no-repeat',
    backgroundSize:`${cssPx(SPRITE_SHEET.width*scale)} ${cssPx(SPRITE_SHEET.height*scale)}`,
    backgroundPosition:`${cssPx(-sprite.x*scale)} ${cssPx(-sprite.y*scale)}`
  }
}
