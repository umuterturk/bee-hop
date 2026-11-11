// Checks the Bee Hop site artifact. Gameplay rules are covered by npm test.
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';

const out=resolve(process.argv[2]||'dist');
for(const file of ['index.html','manifest.webmanifest','icon.svg'])
  assert.ok(existsSync(join(out,file)),`Missing ${file}`);
const html=readFileSync(join(out,'index.html'),'utf8');
assert.match(html,/id="bee-hop-build"/,'Always-visible build label missing');
assert.match(html,/v1\.0\.0\s*·\s*(?:[a-f0-9]{8}|local)/,'Build SHA was not injected');
assert.ok(!html.includes('__BEEHOP_COMMIT__'),'Unreplaced build marker');
assert.match(html,/manifest\.webmanifest/,'PWA manifest link missing');
const manifest=JSON.parse(readFileSync(join(out,'manifest.webmanifest'),'utf8'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,'./');
assert.ok(manifest.icons?.length,'Manifest needs an icon');
const assetsDir=join(out,'assets');
const bundles=existsSync(assetsDir)
  ?readdirSync(assetsDir).filter(name=>/\.(js|css)$/.test(name)).map(name=>join(assetsDir,name))
  :[];
for(const file of bundles){
  const text=readFileSync(file,'utf8');
  assert.doesNotMatch(text,/(?:src|href)=["']\/[A-Za-z0-9._/-]+\.(?:png|jpg|webp|svg|gif)/,'Root-absolute media URL in '+file);
  assert.doesNotMatch(text,/url\(\s*['"]?\/[A-Za-z0-9._/-]+\.(?:png|jpg|webp|svg|gif)/,'Root-absolute CSS url() in '+file);
}
console.log('Bee Hop release artifact ok');
