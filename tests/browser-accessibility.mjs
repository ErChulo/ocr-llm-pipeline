/**
 * Real Chromium accessibility check for the actual self-contained file:// app.
 * No participant data, no GGUF download, and no external browser requests.
 * Automated axe checks are complementary to manual keyboard/screen-reader QA.
 */
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('tmp',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
const violations=[];
const externalRequests=[];
const report={origin:'file://',fictionalOnly:true,
  pages:[],violations,externalRequests,startedAt:new Date().toISOString()};
const persist=()=>writeFileSync('tmp/accessibility-audit.json',JSON.stringify(report,null,2));
try{
  await page.route('**/*',async route=>{
    const url=route.request().url();
    if(/^(https?|wss?):/i.test(url)){externalRequests.push(url);await route.abort();}
    else await route.continue();
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href+'#/documents',
    {waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'OCR + LLM Pipeline Studio'})
    .waitFor({timeout:10000});
  async function analyze(name){
    const result=await new AxeBuilder({page})
      .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])
      .analyze();
    const violationsHere=result.violations.map(v=>({
      id:v.id,impact:v.impact,
      nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary?.slice(0,260)}))
    }));
    report.pages.push({name,passes:result.passes.length,
      incomplete:result.incomplete.length,violations:violationsHere});
    violations.push(...violationsHere.map(v=>({page:name,...v})));
    persist();
  }
  for(const [route,label] of [
    ['documents','Documents'],
    ['extract','Extract JSON'],
    ['chat','Local chat'],
    ['settings','Settings']
  ]){
    await page.getByRole('button',{name:label,exact:true}).click();
    await page.waitForFunction(expected=>location.hash==='#/'+expected,route);
    await analyze(route);
  }
  // Modal and focus restoration are part of keyboard acceptance.
  await page.getByRole('button',{name:'Guide',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'User guide'});
  await modal.waitFor({timeout:10000});
  assert.equal(await page.getByRole('button',{name:'Close guide'}).evaluate(
    el=>el===document.activeElement),true,
    'Guide dialog must initially focus its close button');
  // Office setup must be the first view and advance one actionable step
  // without requiring downloads or a model on the managed machine.
  const setup=modal.locator('.guide-office-wizard');
  assert.equal(await setup.isVisible(),true,'Office setup must be the default Guide view');
  assert.match(await setup.innerText(),/two separate local files/i);
  assert.match(await modal.getByRole('status').innerText(),/step 1 of 6/i);
  await modal.getByRole('button',{name:'Next step'}).click();
  assert.match(await modal.getByRole('status').innerText(),/step 2 of 6/i);
  assert.match(await setup.innerText(),/GGUF model is NOT included/);
  for(let step=3;step<=6;step++){
    await modal.getByRole('button',{name:'Next step'}).click();
    assert.match(await modal.getByRole('status').innerText(),
      new RegExp('step '+step+' of 6','i'));
  }
  assert.match(await setup.innerText(),/wholly fictional document only/i);
  await modal.getByRole('button',{name:'Review from step 1'}).click();
  assert.match(await modal.getByRole('status').innerText(),/step 1 of 6/i);
  await modal.getByRole('button',{name:'Using the app'}).click();
  await modal.getByRole('heading',{name:'1. Load a model'}).waitFor();
  assert.equal(await setup.isVisible(),false);
  await modal.getByRole('button',{name:'Office setup'}).click();
  assert.equal(await setup.isVisible(),true);
  await analyze('user-guide-dialog');
  await page.emulateMedia({media:'print'});
  assert.equal(await modal.locator('.guide-print-office').isVisible(),true,
    'Printed guide must include every office setup step');
  assert.equal(await modal.locator('.guide-office-wizard').isVisible(),false,
    'Print must not output only the currently selected screen');
  await page.emulateMedia({media:'screen'});
  assert.equal(await modal.evaluate(el=>el.contains(document.activeElement)),true,
    'Keyboard focus must remain inside the open Guide after navigation');
  await page.keyboard.press('Escape');
  await modal.waitFor({state:'detached',timeout:10000});
  await page.waitForFunction(()=>document.activeElement instanceof HTMLButtonElement &&
    document.activeElement.textContent?.trim()==='Guide',null,{timeout:10000});
  assert.equal(await page.getByRole('button',{name:'Guide',exact:true}).evaluate(
    el=>el===document.activeElement),true,
    'Closing the guide restores focus');
  report.completedAt=new Date().toISOString();
  persist();
  assert.equal(externalRequests.length,0,'A11y test must remain air-gapped');
  assert.deepEqual(violations,[],'WCAG automated violations detected; inspect tmp/accessibility-audit.json');
  console.log('OFFLINE ACCESSIBILITY AUDIT:',JSON.stringify(
    {pages:report.pages.length,violations:violations.length,externalRequests:externalRequests.length}
  ));
}finally{
  persist();
  await browser.close();
}
