/** Designer targets. L1-5 is a linear onboarding ramp; each later five-level
 * wave holds the board size constant, with a boss in its final position. */
export const WAVE_SIZES = Object.freeze([
  [4,4], [5,5], [6,5], [7,6], [8,7], [9,7], [10,8], [11,9]
]);
export const WAVE_NAMES = Object.freeze([
  'First Flights', 'Golden Meadow', 'Sunflower Fields', 'Wild Clover',
  'Honey Ridge', 'Amber Labyrinth', 'Royal Orchard', 'The Grand Hive'
]);
export const LEVEL_SPECS = Object.freeze(Array.from({length: 40}, (_, i) => {
  const id=i+1, wave=Math.floor(i/5), phase=i%5;
  if (id === 1) return Object.freeze({id, wave, name:'First Flight', width:3, height:3,
    pollen:1, seed:1009, boss:false, target:0, phase});
  const [width,height] = WAVE_SIZES[wave];
  const pollen = wave===0 ? id : [4,5,6,7,8][phase] + (wave-1);
  const waveNames = [
    ['First Flight','Warm Breeze','A Little Further','Twin Trails','Finding the Hive'],
    ['New Nectar','Sunlit Paths','Pollen Crossroads','The Long Jump','Golden Meadow Boss'],
    ['Blue Petals','Three Roads','The Hidden Turn','Crossing Lines','Sunflower Boss'],
    ['Wild Paths','Clover Fork','Roundabout','One More Jump','Clover Boss'],
    ['First Ridge','Windy Route','Forked Trail','The Amber Trap','Ridge Boss'],
    ['Amber Morning','Narrow Escape','Twin Corridors','Honey Labyrinth','Labyrinth Boss'],
    ['Royal Paths','Garden Gates','Secret Passage','Queen’s Trial','Orchard Boss'],
    ['The Final Garden','Distant Flowers','Honey Horizons','Last Decision','The Grand Hive Boss']
  ];
  return Object.freeze({id,wave,phase,name:waveNames[wave][phase],width,height,pollen,
    seed:1009+id*7919,boss:id>5 && phase===4,
    target:wave===0?[0.95,1.5,2.1,2.8,3.6][phase]:[2.3,3.15,4.05,5,6.4][phase]+wave*1.1});
}));
