import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEVELS} from '../src/content/catalog.js';
import {legalJumps,statusOf} from '../src/engine/abilities.js';
import {boardNote,boosterCallout,collectBurst,hexTile,stuckChoice} from '../src/view/presentation.js';

test('playing with no landings never asks for a green hex',()=>{
  const round={turns:4,usedUndo:false,bees:[32],pollen:[20],charges:{tunnel:0,seed:1,worker:0},past:[1]};
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[24],round,
    jumpCount:0
  });
  assert.doesNotMatch(note,/green hex/i);
  assert.match(note,/No hops/i);
  assert.match(note,/Plant a flower|booster|undo/i);
});

test('playing with landings still points at a green hex',()=>{
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[0],
    round:{turns:1,usedUndo:false,bees:[0],pollen:[1]},jumpCount:3
  });
  assert.match(note,/green hex/i);
});

test('a seed charge is the callout when the bee has no hop',()=>{
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:0,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),'seed');
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:4,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),null);
  assert.equal(boosterCallout({
    status:'playing',mode:null,jumpCount:0,otherJumps:2,
    charges:{tunnel:0,seed:1,worker:0},undoAvailable:true
  }),null);
});

test('a selected bee with no hops points at the other bee',()=>{
  const note=boardNote({
    status:'playing',hint:null,mode:null,filtered:false,level:LEVELS[25],
    round:{turns:2,usedUndo:false,bees:[0,10],pollen:[1],charges:{tunnel:0,seed:1,worker:0}},
    jumpCount:0,otherJumps:3
  });
  assert.match(note,/other bee/);
  assert.doesNotMatch(note,/green hex|Plant a flower/i);
});

test('calling a worker highlights the hive with the green landing hex',()=>{
  const quiet=hexTile({hive:true});
  assert.equal(quiet.tile,'hexHoney');
  assert.equal(quiet.mark,'crown');
  const target=hexTile({hive:true,tool:true,mode:'summon'});
  assert.equal(target.tile,'hexLanding');
  assert.equal(target.mark,'crown');
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  assert.match(css,/\.hop-cell\.is-tool\.is-summon\{[^}]*hop-landing-pulse/);
  assert.match(css,/\.hop-cell\.is-tool\.is-summon \.hop-hex\{[^}]*hop-landing-breathe/);
});

test('honey cells stay honey, landings use the green hex, and flowers use a flower tile',()=>{
  const empty=hexTile({});
  assert.equal(empty.tile,'hexHoney');
  assert.equal(empty.mark,null);
  const live=hexTile({landing:true});
  assert.equal(live.tile,'hexLanding');
  assert.equal(live.mark,null);
  const trap=hexTile({landing:true,dead:true});
  assert.equal(trap.tile,'hexLanding');
  assert.equal(trap.mark,null);
  const flower=hexTile({pollen:true});
  assert.equal(flower.tile,'hexFlower');
  assert.equal(flower.mark,'flower');
  const bee=hexTile({settledBee:true,worker:false});
  assert.equal(bee.tile,'hexHoney');
  assert.equal(bee.mark,'bee');
});

test('valid landings pulse a bright green glow and the bee draws above its ring',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/has-landings[\s\S]{0,220}brightness/);
  assert.doesNotMatch(css,/\.hop-cell\.is-dead\{[^}]*grayscale/);
  assert.doesNotMatch(css,/saturate\(1\.35\)/);
  assert.match(css,/hop-landing-pulse/);
  assert.match(css,/\.hop-cell\.is-landing\{[^}]*drop-shadow/);
  const bee=css.match(/\.hop-mark\.is-bee,\.hop-mark\.is-beeWorker\{[^}]*z-index:\s*(\d+)/);
  const ring=css.match(/\.hop-ring\{[^}]*z-index:\s*(\d+)/);
  assert.ok(bee&&ring);
  assert.ok(Number(bee[1])>Number(ring[1]));
});

test('restart sits under the field with undo and hint',()=>{
  const source=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  const dock=source.slice(source.indexOf('aria-label="Boosters"'),source.indexOf('hop-sheet-backdrop'));
  assert.match(dock,/buttonRestart/);
  assert.match(dock,/'Restart'/);
  assert.match(dock,/restart\(\)/);
  const sheetStart=source.indexOf('hop-sheet-backdrop');
  const sheet=source.slice(sheetStart,source.indexOf("status==='won'",sheetStart));
  assert.match(sheet,/buttonRestart/);
  assert.match(sheet,/Restart field/);
  assert.match(sheet,/restart\(\)/);
});

test('the bee stays bee-sized with a soft shadow',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  const bee=css.match(/\.hop-mark\.is-bee,\.hop-mark\.is-beeWorker\{[^}]*\}/);
  assert.ok(bee);
  assert.match(bee[0],/width:\s*86%/);
  assert.match(bee[0],/drop-shadow\(0 0 6px #ffe56ae6\)/);
  assert.doesNotMatch(bee[0],/#2a1608|#3a2208/);
  assert.doesNotMatch(css,/width:\s*(108|116|124|128)%/);
  assert.doesNotMatch(css,/hop-bee-shadow/);
  const board=readFileSync(new URL('../src/view/Board.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(board,/hop-bee-shadow/);
});

test('a flower mark is centered in its hex instead of pushed down',()=>{
  const board=readFileSync(new URL('../src/view/Board.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(board,/hop-landing-spark"\/>\}\}/);
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  const flower=css.match(/\.hop-mark\.is-flower\{[^}]*\}/);
  assert.ok(flower);
  assert.match(flower[0],/width:\s*84%/);
  assert.doesNotMatch(flower[0],/drop-shadow/);
});

test('a stuck field lets the player spend a life, including the last one',()=>{
  const choice=stuckChoice({undoAvailable:false,hearts:{count:1}});
  assert.equal(choice.canRestart,true);
  assert.equal(choice.canUndo,false);
  assert.match(choice.body,/life/i);
  const withUndo=stuckChoice({undoAvailable:true,hearts:{count:3}});
  assert.equal(withUndo.canRestart,true);
  assert.equal(withUndo.canUndo,true);
  assert.match(withUndo.body,/undo/i);
  const waiting=stuckChoice({undoAvailable:false,hearts:{count:0}});
  assert.equal(waiting.canRestart,false);
  assert.match(waiting.body,/life/i);
});

test('a stuck board spends a life only when the player chooses to restart',()=>{
  const source=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  assert.match(source,/applyLifeRestart/);
  assert.match(source,/Lose a life/);
  assert.doesNotMatch(source,/status!=='stuck'[\s\S]{0,220}spendHeart/);
});

test('collecting a flower plans a sparkle burst',()=>{
  const burst=collectBurst();
  assert.ok(burst.length>=6);
  assert.ok(burst.every(bit=>bit.sprite.startsWith('sparkle')));
  const places=new Set(burst.map(bit=>`${bit.dx},${bit.dy}`));
  assert.equal(places.size,burst.length);
  const board=readFileSync(new URL('../src/view/Board.jsx',import.meta.url),'utf8');
  assert.match(board,/collectBurst/);
  assert.match(board,/picked/);
  const pin=board.indexOf('hop-bee-pin');
  const ring=board.indexOf('ringDashed',pin);
  const mark=board.indexOf('hop-mark is-',pin);
  assert.ok(pin!==-1&&ring!==-1&&mark!==-1&&ring<mark);
  assert.match(board,/onArrive/);
  assert.match(board,/scaleX/);
});

test('the honeycomb fills the gameplay width so every cell is as large as the field allows',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  const view=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  const hop=css.match(/\.hop\{[^}]*\}/);
  const stage=css.match(/\.hop-stage\{[^}]*\}/);
  const board=css.match(/\.hop-board\{[^}]*\}/);
  assert.ok(hop);
  assert.ok(stage);
  assert.ok(board);
  assert.match(hop[0],/--board-max:calc\(\(100dvh - var\(--fit-chrome\)\) \* var\(--board-aspect/);
  assert.match(hop[0],/width:min\(100%, calc\(var\(--board-max\) \+ var\(--fit-gutter\)\)\)/);
  assert.doesNotMatch(hop[0],/max-width:\s*520px/);
  assert.match(stage[0],/width:\s*100%/);
  assert.match(stage[0],/overflow:\s*hidden/);
  assert.match(board[0],/width:\s*100%/);
  assert.match(board[0],/aspect-ratio:\s*var\(--board-aspect/);
  assert.doesNotMatch(board[0],/100cqw|play-reserve|max-height/);
  assert.doesNotMatch(css,/--play-reserve/);
  assert.match(view,/style=\{\{'--board-aspect':boardFrame\(level\.width,level\.height\)\.aspect\}\}/);
});

test('the meadow shows around the board, with icon-only boosters outside it',()=>{
  const css=readFileSync(new URL('../src/view/game.css',import.meta.url),'utf8');
  const view=readFileSync(new URL('../src/view/Game.jsx',import.meta.url),'utf8');
  assert.match(css,/assets\/bg-1\.webp/);
  assert.doesNotMatch(css,/bg-1\.png|no-repeat fixed/);
  assert.doesNotMatch(css,/\.hop-panel\{/);
  assert.doesNotMatch(view,/hop-panel|hop-tool-label/);
  assert.match(css,/\.hop\{[^}]*background:transparent/);
  const play=view.slice(view.indexOf('className={`hop '),view.indexOf('hop-sheet-backdrop'));
  const stage=play.indexOf('hop-stage');
  const dock=play.indexOf('aria-label="Boosters"');
  const stageClose=play.indexOf('</div>',stage);
  assert.ok(stage!==-1&&dock!==-1&&stageClose!==-1&&stage<stageClose&&stageClose<dock);
  assert.match(play,/booster\('seed','buttonSeed','Pollen'/);
  const round=css.match(/\.hop-dock \.hop-sprite-button\{[^}]*\}/);
  assert.ok(round);
  assert.match(round[0],/border-radius:\s*50%/);
  const dockRule=css.match(/(?:^|\n)\.hop-dock\{[^}]*\}/);
  assert.ok(dockRule);
  assert.match(dockRule[0],/background:\s*#fffaf0d4/);
  assert.match(css,/\.hop-booster\.is-unavailable\{[^}]*opacity/);
});

test('the screenshot board (last flower, bee off-line) is still playing with zero hops',()=>{
  const board={width:8,height:7,bees:[32],pollen:[20],charges:{tunnel:0,seed:1,worker:0},hives:[],blocked:[]};
  assert.equal(legalJumps(board).length,0);
  assert.equal(statusOf(board),'playing');
});
