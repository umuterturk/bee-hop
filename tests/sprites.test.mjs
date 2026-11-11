import test from 'node:test';
import assert from 'node:assert/strict';
import {SPRITE_SHEET,SPRITES,spriteFitStyle,spriteStyle} from '../src/view/sprites.js';

test('every painted frame sits inside the sheet and has its own box',()=>{
  const seen=new Set();
  assert.equal(SPRITE_SHEET.width,1448);
  assert.equal(SPRITE_SHEET.height,1086);
  assert.equal(SPRITE_SHEET.src,'assets/sprite-sheet.png');
  for(const [name,frame] of Object.entries(SPRITES)){
    assert.ok(frame.w>0,name);
    assert.ok(frame.h>0,name);
    assert.ok(frame.x>=0&&frame.y>=0,name);
    assert.ok(frame.x+frame.w<=SPRITE_SHEET.width,name);
    assert.ok(frame.y+frame.h<=SPRITE_SHEET.height,name);
    const key=`${frame.x},${frame.y},${frame.w},${frame.h}`;
    assert.equal(seen.has(key),false,name);
    seen.add(key);
  }
});
test('spriteStyle scales a cropped frame to the display width',()=>{
  const style=spriteStyle('hexHoney','/frames/hexHoney.png',92);
  assert.equal(style.width,92);
  assert.equal(style.height,104);
  assert.equal(style.backgroundRepeat,'no-repeat');
  assert.equal(style.backgroundPosition,'0 0');
  assert.equal(style.backgroundSize,'100% 100%');
  assert.equal(style.backgroundImage,"url('/frames/hexHoney.png')");
  assert.throws(()=>spriteStyle('missing','/frames/hexHoney.png',92),/missing/);
});
test('spriteFitStyle fills its box with one cropped frame',()=>{
  const style=spriteFitStyle('hexHoney','/frames/hexHoney.png');
  assert.equal(style.backgroundRepeat,'no-repeat');
  assert.equal(style.backgroundImage,"url('/frames/hexHoney.png')");
  assert.equal(style.aspectRatio,'184 / 208');
  assert.equal(style.backgroundSize,'100% 100%');
  assert.equal(style.backgroundPosition,'0 0');
  assert.throws(()=>spriteFitStyle('missing','/frames/hexHoney.png'),/missing/);
});
test('a sprite paints nothing until its shared frame is ready',()=>{
  const style=spriteFitStyle('heart','');
  assert.equal(style.backgroundImage,'none');
  assert.equal(style.backgroundSize,'100% 100%');
});
