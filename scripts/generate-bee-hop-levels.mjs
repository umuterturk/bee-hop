import {writeFileSync} from 'node:fs';
import {LEVEL_SPECS} from '../src/content/levelSpecs.js';
import {generatePuzzle} from '../src/engine/generator.js';
const output=[];
let prior=null;
for(const spec of LEVEL_SPECS){
 const t=Date.now();const onboarding=spec.id<=5;
 let minDifficulty=-Infinity,maxDifficulty=Infinity;
 const target=spec.target;
 // Onboarding still climbs. The meadow aims at the sine, including the
 // descents, so a later round can be easier than the one before it.
 if(onboarding&&prior)minDifficulty=prior.metrics.difficulty+.2;
 else if(!onboarding){
  minDifficulty=target-.9;
  maxDifficulty=target+1.15;
  // On the way down from a crest, stay under the round just played so the
  // boss remains the high point of the wave.
  const priorSpec=LEVEL_SPECS[spec.id-2];
  if(prior&&priorSpec&&target<priorSpec.target&&prior.metrics.difficulty>target){
   maxDifficulty=Math.min(maxDifficulty,prior.metrics.difficulty-.05);
  }
 }
 const candidates=onboarding?260:48;
 const maxStates=spec.pollen>=12?200000:140000;
 let puzzle;
 try{puzzle=generatePuzzle(spec,{candidates,minDifficulty,maxDifficulty,preferredDifficulty:target,maxStates});}
 catch(e){
  console.log('RETRY_WIDER_BAND',spec.id,String(e).slice(0,120));
  const widerMax=Math.min(target+1.8,maxDifficulty+0.35);
  puzzle=generatePuzzle(spec,{candidates:candidates+40,maxStates,preferredDifficulty:target,minDifficulty:target-1.8,maxDifficulty:widerMax});
 }
 const {witness,solution,...rest}=puzzle;
 output.push({...rest});
 console.log(`${String(spec.id).padStart(2)} ${spec.width}x${spec.height} pollen=${String(spec.pollen).padStart(2)}  D=${puzzle.metrics.difficulty.toFixed(2)} real=${puzzle.metrics.realPaths} wins=${puzzle.metrics.winningPaths} forks=${puzzle.metrics.forks} continue=${puzzle.metrics.continuingFirst} | ${Date.now()-t}ms`);
 prior=puzzle;
 writeFileSync(new URL('../src/content/levels.generated.js',import.meta.url),`// Generated once by scripts/generate-bee-hop-levels.mjs; do not edit by hand.\nexport const GENERATED_LEVELS = ${JSON.stringify(output,null,2)};\n`);
}
console.log('DONE',output.length);
