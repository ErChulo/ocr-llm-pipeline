import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('all direct runtime and build dependencies have exact versions',()=>{
 for(const group of ['dependencies','devDependencies']){
   for(const [name,version] of Object.entries(manifest[group])){
     assert.match(version,/^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/,
       'Unpinned dependency: '+name+' @ '+version);
   }
 }
});
