import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS} from '../src/content/catalog.js';
import {DIRECTIONS,stepHex} from '../src/engine/rules.js';
import {boardFrame,cellCenter,cellStyle,placeLabel} from '../src/view/layout.js';

const HEX_RATIO=2/Math.sqrt(3);

test('every field draws taller than it is wide, with logical width down the screen',()=>{
  for(const level of LEVELS){
    const frame=boardFrame(level.width,level.height);
    assert.ok(frame.aspect<1,`level ${level.id} is ${level.width} by ${level.height} with aspect ${frame.aspect}`);
    const rows=100/parseFloat(frame.hexWidth);
    assert.ok(Math.abs(rows-(1+(level.height-1)*.75))<1e-6,`level ${level.id} spans ${rows} rows across`);
    const hexW=parseFloat(frame.hexWidth),hexH=parseFloat(frame.hexHeight);
    for(let cell=0;cell<level.width*level.height;cell++){
      const style=cellStyle(cell,level.width,level.height);
      const left=parseFloat(style.left),top=parseFloat(style.top);
      assert.ok(left>=-1e-9&&left+hexW<=100+1e-6,`level ${level.id} cell ${cell} left ${left}`);
      assert.ok(top>=-1e-9&&top+hexH<=100+1e-6,`level ${level.id} cell ${cell} top ${top}`);
    }
  }
  const wide=LEVELS.filter(level=>level.width>=8);
  assert.ok(wide.length>=8);
  assert.ok(wide.every(level=>level.width>=8&&level.width<=11));
});

test('a 7 by 5 field stands seven tall and five wide',()=>{
  const frame=boardFrame(7,5);
  assert.ok(frame.aspect<1,`aspect ${frame.aspect}`);
  const origin=cellStyle(0,7,5);
  const down=cellStyle(1,7,5);
  const across=cellStyle(7,7,5);
  assert.equal(origin.left,'0%');
  assert.equal(origin.top,'0%');
  assert.ok(parseFloat(down.top)>parseFloat(origin.top));
  assert.equal(parseFloat(down.left),0);
  assert.ok(parseFloat(across.left)>parseFloat(origin.left));
});

test('turned hexes are flat topped and still meet their neighbors',()=>{
  const width=11,height=9;
  const frame=boardFrame(width,height);
  const hexW=parseFloat(frame.hexWidth)/100;
  const hexH=parseFloat(frame.hexHeight)/100;
  const pixelRatio=(hexW*frame.aspect)/hexH;
  assert.ok(Math.abs(pixelRatio-HEX_RATIO)<1e-9,`hex pixel ratio ${pixelRatio}`);
  const distance=(a,b)=>{
    const p=cellCenter(a,width,height),q=cellCenter(b,width,height);
    return Math.hypot(p.x-q.x,p.y-q.y);
  };
  for(let cell=0;cell<width*height;cell++){
    const neighbors=[];
    for(const dir of DIRECTIONS){
      const next=stepHex(cell,dir,width,height);
      if(next!==-1)neighbors.push(next);
    }
    assert.ok(neighbors.length>=2);
    for(let other=0;other<width*height;other++){
      if(other===cell)continue;
      const gap=distance(cell,other);
      if(neighbors.includes(other))assert.ok(Math.abs(gap-1)<1e-9,`${cell} to ${other} is ${gap}`);
      else assert.ok(gap>1.2,`${cell} to ${other} is only ${gap}`);
    }
  }
});

test('the first cell stays at the top left and rows run down the tall side',()=>{
  const origin=cellStyle(0,6,5);
  assert.equal(origin.left,'0%');
  assert.equal(origin.top,'0%');
  assert.equal(placeLabel(2,6),'row 3, column 1');
  assert.equal(placeLabel(6,6),'row 1, column 2');
  const shifted=cellCenter(6,6,5);
  const above=cellCenter(0,6,5);
  assert.ok(shifted.y>above.y);
  assert.ok(shifted.x>above.x);
});

test('the board paints flat hexes turned from the pointy art',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  const board=readFileSync(new URL('../src/view/Board.jsx',import.meta.url),'utf8');
  assert.match(board,/boardFrame/);
  assert.match(css,/clip-path:polygon\(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%\)/);
  assert.match(css,/\.hop-hex\{[^}]*translate\(-50%,-50%\) rotate\(90deg\)/);
  assert.match(css,/hop-landing-breathe\{[^}]*rotate\(90deg\)/);
  assert.match(css,/width='49' height='28'/);
  assert.doesNotMatch(css,/width='28' height='48'/);
});
