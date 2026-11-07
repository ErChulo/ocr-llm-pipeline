/**
 * Build-time release-policy assertions for standalone file:// HTML.
 * This is defense in depth, not a comprehensive runtime security audit.
 */
import assert from 'node:assert/strict';

export function assertOfflineSecurityPolicy(html){
  assert.equal(typeof html,'string');
  const metas=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
  const cspMetas=metas.filter(meta=>
    /\bhttp-equiv\s*=\s*["']Content-Security-Policy["']/i.test(meta));
  assert.equal(cspMetas.length,1,'Exactly one release Content Security Policy is required.');
  const match=cspMetas[0].match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i);
  assert.ok(match,'The release CSP must have a quoted content attribute.');
  const directives=new Map();
  for(const part of match[2].split(';')){
    const tokens=part.trim().split(/\s+/).filter(Boolean);
    if(!tokens.length)continue;
    const name=tokens.shift().toLowerCase();
    assert.ok(!directives.has(name),'Duplicate CSP directive: '+name);
    directives.set(name,tokens);
  }
  function exactlyNone(name){
    assert.deepEqual(directives.get(name),["'none'"],
      name+' must completely deny nonlocal content.');
  }
  for(const name of ['default-src','base-uri','object-src','form-action']){
    exactlyNone(name);
  }
  const allowed={
    'connect-src':new Set(['data:','blob:',"'none'"]),
    'worker-src':new Set(['blob:',"'none'"]),
    'child-src':new Set(['blob:',"'none'"]),
    'img-src':new Set(['data:','blob:',"'none'"]),
    'font-src':new Set(['data:',"'none'"]),
    'style-src':new Set(["'unsafe-inline'","'none'"]),
    'script-src':new Set(["'unsafe-inline'","'wasm-unsafe-eval'",'blob:',"'none'"])
  };
  for(const [name,whitelist] of Object.entries(allowed)){
    const tokens=directives.get(name);
    assert.ok(tokens?.length,'Missing offline CSP directive: '+name);
    assert.ok(tokens.every(token=>whitelist.has(token)),
      'CSP '+name+' permits an unauthorized source or unsafe evaluation.');
  }
  assert.doesNotMatch(html,/<script\b[^>]*\bsrc\s*=/i,
    'Release HTML must not load external JavaScript assets.');
  assert.doesNotMatch(html,/<link\b[^>]*\brel\s*=\s*["'](?:stylesheet|modulepreload|preload|prefetch)/i,
    'Release HTML must not fetch external style or preload assets.');
  assert.doesNotMatch(html,/<(?:iframe|embed|object)\b/i,
    'Release HTML must not embed external frames or objects.');
  assert.doesNotMatch(html,/<meta\b[^>]*\bhttp-equiv\s*=\s*["']refresh["']/i,
    'Release HTML must not redirect through meta refresh.');
  return directives;
}
