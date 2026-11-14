/** Levels 1–5 are the onboarding ramp. After that the meadow is 8×8.
 * Flower counts and the difficulty target ride one sine: valleys on
 * levels 10 and 30, crests (the bosses) on levels 20 and 40.
 * The index itself is unchanged; it is the one in puzzleEvaluator. */
export const BOSS_INTERVAL = 20;
export const ONBOARDING_LEVELS = 5;
export const MEADOW_SIZE = Object.freeze([8, 8]);
const MEADOW_POLLEN_LOW = 6;
const MEADOW_POLLEN_SPAN = 8;
const MEADOW_TARGET_LOW = 6.2;
const MEADOW_TARGET_SPAN = 6.4;
const ONBOARDING_TARGETS = Object.freeze([0.95, 1.5, 2.1, 2.8, 3.6]);

export const WAVE_SIZES = Object.freeze([
  [4, 4], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8], [8, 8]
]);
export const WAVE_NAMES = Object.freeze([
  'First Flights', 'Golden Meadow', 'Sunflower Fields', 'Wild Clover',
  'Honey Ridge', 'Amber Labyrinth', 'Royal Orchard', 'The Grand Hive'
]);

/** 0 on the valley floor, 1 on a boss crest. Levels 6–9 stay on the
 * floor so the 8×8 meadow opens gently, then the sine runs. */
export function difficultyWave(id){
  if(id<10)return 0;
  const wave=(1+Math.sin((2*Math.PI*(id-15))/BOSS_INTERVAL))/2;
  if(wave<1e-12)return 0;
  if(1-wave<1e-12)return 1;
  return wave;
}
export function pollenFor(id){
  if(id<=ONBOARDING_LEVELS)return id;
  // Round onto the sine. Only the boss crest keeps the full 14;
  // the rounds beside it stay at 13 so the crest can stand above them.
  const count=Math.round(MEADOW_POLLEN_LOW+MEADOW_POLLEN_SPAN*difficultyWave(id));
  if(bossFor(id))return MEADOW_POLLEN_LOW+MEADOW_POLLEN_SPAN;
  return Math.min(count,MEADOW_POLLEN_LOW+MEADOW_POLLEN_SPAN-1);
}
export function targetFor(id){
  if(id<=ONBOARDING_LEVELS)return ONBOARDING_TARGETS[id-1];
  return +(MEADOW_TARGET_LOW+MEADOW_TARGET_SPAN*difficultyWave(id)).toFixed(3);
}
export function bossFor(id){
  return id>ONBOARDING_LEVELS&&id%BOSS_INTERVAL===0;
}

export const LEVEL_SPECS = Object.freeze(Array.from({length: 40}, (_, i) => {
  const id=i+1, wave=Math.floor(i/5), phase=i%5;
  const meadow=id>ONBOARDING_LEVELS;
  const [width,height]=meadow?MEADOW_SIZE:id===1?[3,3]:WAVE_SIZES[0];
  const waveNames = [
    ['First Flight','Warm Breeze','A Little Further','Twin Trails','Finding the Hive'],
    ['New Nectar','Sunlit Paths','Pollen Crossroads','The Long Jump','Golden Meadow'],
    ['Blue Petals','Three Roads','The Hidden Turn','Crossing Lines','Sunflower Field'],
    ['Wild Paths','Clover Fork','Roundabout','One More Jump','Clover Boss'],
    ['First Ridge','Windy Route','Forked Trail','The Amber Trap','High Ridge'],
    ['Amber Morning','Narrow Escape','Twin Corridors','Honey Labyrinth','Honey Clearing'],
    ['Royal Paths','Garden Gates','Secret Passage','Queen’s Trial','Orchard Gate'],
    ['The Final Garden','Distant Flowers','Honey Horizons','Last Decision','The Grand Hive Boss']
  ];
  return Object.freeze({
    id,wave,phase,name:waveNames[wave][phase],width,height,
    pollen:pollenFor(id),seed:1009+id*7919,boss:bossFor(id),target:targetFor(id)
  });
}));
