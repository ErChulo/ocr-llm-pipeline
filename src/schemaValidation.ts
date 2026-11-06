/**
 * CSP-safe JSON Schema validation for local, user-provided schemas.
 * Hyperjump interprets compiled schemas without eval or Function.
 *
 * The source may contain untrusted schemas. Enforce a local-only reference
 * boundary and bounded complexity so validation cannot fetch external URLs.
 */
import {
  registerSchema, unregisterSchema, validate, setShouldValidateFormat
} from '@hyperjump/json-schema/draft-2020-12';
import '@hyperjump/json-schema/draft-07';
import '@hyperjump/json-schema/formats-lite';
import { BASIC } from '@hyperjump/json-schema/experimental';

export type SchemaResult = { valid: boolean; errors: string[] };

const MAX_SCHEMA_CHARS=50000;
const MAX_NODES=2048;
const MAX_DEPTH=40;
const DIALECT_2020='https://json-schema.org/draft/2020-12/schema';
const ACCEPTED_DIALECTS=new Set([
  DIALECT_2020,
  'http://json-schema.org/draft-07/schema#',
  'https://json-schema.org/draft-07/schema'
]);
let nextSchemaId=0;

function record(value:unknown):value is Record<string,unknown>{
  return value!==null && typeof value==='object' && !Array.isArray(value);
}
function preflightSchema(schema:unknown):Record<string,unknown>{
  if(!record(schema) || schema.type!=='object'){
    throw new Error('The selected JSON Schema must have root type "object".');
  }
  const size=JSON.stringify(schema)?.length??0;
  if(size===0||size>MAX_SCHEMA_CHARS){
    throw new Error('JSON Schema exceeds the 50,000-character safety limit.');
  }
  const visited=new WeakSet<object>();
  let nodes=0;
  function walk(value:unknown,depth:number){
    if(depth>MAX_DEPTH || ++nodes>MAX_NODES){
      throw new Error('JSON Schema is too deeply nested or complex for offline validation.');
    }
    if(value===null || typeof value!=='object')return;
    if(visited.has(value))return;
    visited.add(value);
    const entries=Array.isArray(value)
      ? value.map((item,index)=>[String(index),item] as const)
      : Object.entries(value);
    for(const [key,item] of entries){
      if(key==='$ref'){
        if(typeof item!=='string'||!item.startsWith('#/')){
          throw new Error('Only local JSON Pointer $ref values are allowed. External references are blocked.');
        }
      }
      if(['$id','$dynamicRef','$dynamicAnchor','$recursiveRef','$anchor','$vocabulary'].includes(key)){
        throw new Error(key+' is not supported in untrusted offline schemas.');
      }
      if(key==='$schema' && (typeof item!=='string'||!ACCEPTED_DIALECTS.has(item))){
        throw new Error('Only JSON Schema draft-07 or draft 2020-12 is supported.');
      }
      if(key==='pattern' || key==='patternProperties'){
        throw new Error('Regular-expression schema constraints are disabled pending a regex-safety review.');
      }
      walk(item,depth+1);
    }
  }
  walk(schema,0);
  return Object.hasOwn(schema,'$schema') ? schema : {$schema:DIALECT_2020,...schema};
}
function uniqueSchemaUrl():string{
  return 'https://local-schema.invalid/runtime/'+(++nextSchemaId)+'.schema.json';
}
function errorLines(output:unknown):string[]{
  if(!record(output))return ['The candidate JSON did not match the selected schema.'];
  const raw=output.errors;
  const failures=Array.isArray(raw)?raw:[];
  const messages=failures.slice(0,30).map((x:unknown)=>{
    if(!record(x))return 'JSON Schema rule failed.';
    const where=typeof x.instanceLocation==='string' ? x.instanceLocation : '(root)';
    const constraint=typeof x.keywordLocation==='string' ? x.keywordLocation : 'validation';
    return where+' failed '+constraint;
  });
  return messages.length?messages:['The candidate JSON did not match the selected schema.'];
}
export async function compileLocalSchema(schema:unknown):Promise<void>{
  const safe=preflightSchema(schema);
  const uri=uniqueSchemaUrl();
  registerSchema(safe,uri);
  try {
    await validate(uri);
  } finally {
    unregisterSchema(uri);
  }
}
export async function validateLocalJson(schema:unknown,value:unknown):Promise<SchemaResult>{
  const safe=preflightSchema(schema);
  const uri=uniqueSchemaUrl();
  registerSchema(safe,uri);
  try {
    // No unsafe-eval, no browser network requests.
    setShouldValidateFormat(true);
    const output=await validate(uri,value,BASIC);
    return {valid:output.valid,errors:output.valid?[]:errorLines(output)};
  } finally {
    unregisterSchema(uri);
  }
}
