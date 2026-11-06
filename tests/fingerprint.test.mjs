import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sha256Bytes } from '../src/fingerprint.ts';
test('SHA-256 fingerprint is deterministic for local bytes',async()=>{
 const checksum=await sha256Bytes(new TextEncoder().encode('abc'));
 assert.equal(checksum,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(checksum.length,64);
});
test('different source contents cannot share the same test fingerprint',async()=>{
 const a=await sha256Bytes(new TextEncoder().encode('age 65'));
 const b=await sha256Bytes(new TextEncoder().encode('age 55'));
 assert.notEqual(a,b);
});
