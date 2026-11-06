# AirLLM-style browser inference: separate research phase

**Status: design only, not implemented in AirStream v0.1.0.** The current app's *real* GGUF inference is handled by Wllama, which normally needs its quantized model resident in browser-managed memory. Split GGUF files are file-transfer shards, not per-transformer-block inference offload.

## Actual target behavior

Given one token's current hidden state \(h_0\), for an \(L\)-layer autoregressive decoder:

\[
 h_{\ell+1} = F_\ell(h_\ell, K_\ell, V_\ell; W_\ell), \quad \ell=0,\ldots,L-1.
\]

Keep only the current activations, KV cache, and *one* transformer block's weights in resident memory. For each decode step, fetch the next layer by byte ranges from user-selected local files, execute it, release that layer's weights, then proceed to the next. Repeat the sequence for each generated token.

This is AirLLM's principal **layer-wise inference strategy**, rather than merely loading a GGUF file in multiple pieces.

## Proposed implementation

1. **Manifest and storage.** An explicitly versioned weight manifest maps `{layer, tensors, file, byteOffset, byteLength, dtype, shape, checksum}`. Use file-picker `File` handles and `File.slice(start,end)` for each tensor range. No network or OPFS is required if the user re-selects files each session.
2. **Bounded arena.** A fixed-size WebAssembly `Memory` region or preallocated JS `ArrayBuffer` acts as a reusable weight buffer. Byte ranges are copied in, consumed, and overwritten when advancing to the next layer. Target memory: `max(layer bytes) + KV bytes + activation bytes + runtime overhead` (plus browser temporary copies).
3. **Inference kernels.** Implement and validate RMSNorm, RoPE, grouped-query attention, f16/f32 matvec, quantized matmul/dequantization, SwiGLU and logits. An exported WASM ABI must define tensor strides, quantizer formats, alignment and error codes. Keep architecture-specific graph generation separate from kernels.
4. **Tokenization.** Support model-specific tokens and chat templates, including BOS/EOS and special token logic. Byte-pair encoding must match the chosen model exactly.
5. **KV cache.** KV cache remains resident or uses independent block paging. It scales with layers × context × attention heads and is the limiting term for long contexts; page only if numerical correctness and acceptable latency are established.
6. **Scheduling.** Add a pipelined double-buffer option (prefetch `layer ℓ+1` while computing `layer ℓ`) only after correctness and memory accounting are established. This increases peak resident weights to approximately two layers.
7. **Testing.** For each supported model, compare token logits, perplexity, and generated tokens to a pinned native reference. Validate prefill, autoregressive decode, long prompts, cancellation and memory peaks with browser performance traces. Include deterministic synthetic tiny-model fixtures that can run in CI.

## Fundamental trade-off

At each generated token, the engine rereads approximately the model weight bytes for all layers. At \(B\) bytes of weights and effective local file-read bandwidth \(r\), the theoretical I/O lower bound alone is \(B/r\) seconds per token, before kernel time. Large full-precision models can therefore have very low throughput despite low **resident** memory. Browsers have limits on `ArrayBuffer`, WASM memory, CPU utilization and file access that may make large models impractical.

## Suggested milestone after v0.1.0

Implement a *small* reference decoder (e.g., a single known family and a small tensor checkpoint) with WASM kernels and a shard manifest. Do not claim 70B in 4 GB or equivalent capability until empirically verified on target browsers. Keep the existing Wllama backend as a baseline for correctness comparison and a functional fallback.
