import test from 'node:test';
import assert from 'node:assert/strict';
import {SPRITES} from '../src/view/sprites.js';
import {createSheetLibrary} from '../src/view/sheet.js';

const SRC='/assets/sprite-sheet.png';

test('the sprite sheet is loaded once and every frame is cut from it',async()=>{
  let loads=0;
  let slices=0;
  const image={id:'sheet'};
  const library=createSheetLibrary({
    load(src){
      loads+=1;
      assert.equal(src,SRC);
      return Promise.resolve(image);
    },
    slice(source,box){
      slices+=1;
      assert.equal(source,image);
      return Promise.resolve(`frame:${box.x},${box.y},${box.w},${box.h}`);
    }
  });
  const names=Object.keys(SPRITES);
  const first=await Promise.all(names.map(name=>library.frame(SRC,name,SPRITES[name])));
  const [again,duplicate]=await Promise.all([
    library.frame(SRC,'bee',SPRITES.bee),
    library.frame(SRC,'bee',SPRITES.bee)
  ]);
  assert.equal(loads,1);
  assert.equal(slices,names.length);
  assert.equal(again,first[names.indexOf('bee')]);
  assert.equal(duplicate,again);
  assert.equal(library.peek(SRC,'bee'),again);
  assert.equal(library.peek(SRC,'missing'),'');
});

test('a failed sheet load can be tried again',async()=>{
  let loads=0;
  const library=createSheetLibrary({
    load(){
      loads+=1;
      if(loads===1)return Promise.reject(new Error('offline'));
      return Promise.resolve('image');
    },
    slice(image){return image;}
  });
  await assert.rejects(()=>library.frame(SRC,'bee',SPRITES.bee),/offline/);
  assert.equal(library.peek(SRC,'bee'),'');
  assert.equal(await library.frame(SRC,'bee',SPRITES.bee),'image');
  assert.equal(loads,2);
  assert.equal(await library.frame(SRC,'heart',SPRITES.heart),'image');
  assert.equal(loads,2);
});
