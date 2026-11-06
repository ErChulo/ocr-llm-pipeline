/** SHA-256 of the actual local input file bytes. No network or storage. */
export async function sha256Bytes(bytes:ArrayBuffer|Uint8Array):Promise<string>{
  if(!globalThis.crypto?.subtle)throw new Error('Secure file fingerprinting is unavailable in this browser.');
  const source=bytes instanceof Uint8Array
    ? Uint8Array.from(bytes).buffer
    : bytes;
  const digest=await globalThis.crypto.subtle.digest('SHA-256',source);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
