import { test } from 'node:test';
import assert from 'node:assert/strict';
import {compileLocalSchema,validateLocalJson} from '../src/schemaValidation.ts';

const s={type:'object',properties:{
  age:{type:'integer',minimum:0,maximum:130},
  form:{type:'string',enum:['SLA','JS50']}
},required:['age'],additionalProperties:false};

test('CSP-safe validator enforces required properties, types, bounds and enums',async()=>{
 await compileLocalSchema(s);
 assert.equal((await validateLocalJson(s,{age:65,form:'SLA'})).valid,true);
 const invalid=await validateLocalJson(s,{age:'65',form:'fictional'});
 assert.equal(invalid.valid,false);
 assert.ok(invalid.errors.length>0);
 assert.equal((await validateLocalJson(s,{age:150})).valid,false);
 assert.equal((await validateLocalJson(s,{age:65,unexpected:1})).valid,false);
});
test('support local $defs pointers and nested arrays without network lookups',async()=>{
 const schema={type:'object',properties:{ages:{
   type:'array',items:{$ref:'#/$defs/age'},minItems:2
 }},required:['ages'],$defs:{age:{type:'integer',minimum:50}}};
 assert.equal((await validateLocalJson(schema,{ages:[55,65]})).valid,true);
 assert.equal((await validateLocalJson(schema,{ages:[30,65]})).valid,false);
});
test('block remote $ref and remote or dynamic schema identity',async()=>{
 for(const schema of [
  {type:'object',properties:{a:{$ref:'https://external.invalid/schema'}}},
  {type:'object',$id:'https://external.invalid/schema'},
  {type:'object',properties:{a:{$dynamicRef:'#something'}}},
  {type:'object',properties:{a:{pattern:'^(a+)+$'}}}
 ]){
  await assert.rejects(compileLocalSchema(schema),/blocked|not supported|disabled/);
 }
});
test('refuse root non-object, oversize and unsupported dialects',async()=>{
 await assert.rejects(compileLocalSchema({type:'array'}),/root type/);
 await assert.rejects(compileLocalSchema({type:'object',description:'x'.repeat(51000)}),/safety limit/);
 await assert.rejects(compileLocalSchema({type:'object',$schema:'http://example.invalid/dialect'}),/Only JSON Schema/);
});
test('empty object candidate passes optional schema and errors are not silently ignored',async()=>{
 const schema={type:'object',properties:{n:{type:'number'}},required:['n']};
 assert.equal((await validateLocalJson(schema,{})).valid,false);
 assert.equal((await validateLocalJson(schema,{n:5})).valid,true);
});
