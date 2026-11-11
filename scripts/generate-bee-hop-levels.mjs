import {writeFileSync} from 'node:fs';
import {LEVEL_SPECS} from '../src/content/levelSpecs.js';
import {generatePuzzle} from '../src/engine/generator.js';
const output=[];
let prior=null,waveStart=null,prevBoss=null;
for(const spec of LEVEL_SPECS){
 const t=Date.now();const onboarding=spec.wave===0;
 let minDifficulty=-Infinity,maxDifficulty=Infinity;
 if(prior&&prior.wave===spec.wave)minDifficulty=prior.metrics.difficulty+(onboarding?.2:spec.boss?.42:.17);
 else if(waveStart&&prevBoss){
  minDifficulty=waveStart.metrics.difficulty+.30;
  maxDifficulty=prevBoss.metrics.difficulty-.35;
 }
 const target=spec.target;
 const candidates=spec.id<=10?260:spec.id<=20?170:spec.id<=30?85:spec.id<=35?65:spec.id<=39?42:55;
 const maxStates=spec.id>=37?200000:120000;
 let puzzle;
 try{puzzle=generatePuzzle(spec,{candidates,minDifficulty,maxDifficulty,preferredDifficulty:target,maxStates});}
 catch(e){
  console.log('RETRY_NO_HARD_BOUND',spec.id,String(e).slice(0,120));
  puzzle=generatePuzzle(spec,{candidates,maxStates,preferredDifficulty:target});
 }
 const {witness,solution,...rest}=puzzle;
 output.push({...rest});
 console.log(`${String(spec.id).padStart(2)} ${spec.width}x${spec.height} pollen=${String(spec.pollen).padStart(2)}  D=${puzzle.metrics.difficulty.toFixed(2)} real=${puzzle.metrics.realPaths} wins=${puzzle.metrics.winningPaths} forks=${puzzle.metrics.forks} continue=${puzzle.metrics.continuingFirst} | ${Date.now()-t}ms`);
 if(spec.phase===0)waveStart=puzzle;
 if(spec.boss||spec.id===5)prevBoss=puzzle;
 prior=puzzle;
 writeFileSync(new URL('../src/content/levels.generated.js',import.meta.url),`// Generated once by scripts/generate-bee-hop-levels.mjs; do not edit by hand.\nexport const GENERATED_LEVELS = ${JSON.stringify(output,null,2)};\n`);
}
console.log('DONE',output.length);
