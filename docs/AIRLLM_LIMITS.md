# Inference architecture: Wllama is not AirLLM

AirLLM streams transformer layer weights in and out of memory.
Wllama uses quantized GGUF models through llama.cpp WebAssembly and
normally requires the model weights and KV cache to fit in browser-managed memory.

Our baseline uses one CPU thread because file:// does not supply COOP/COEP
cross-origin isolation. A 0.5B Q4 GGUF is a sensible initial test.
No 70B/4GB capability is claimed. CPU throughput and browser memory limits
must be measured with actual model loads.

A true AirLLM-style browser runtime needs a layer manifest, bounded WASM
weight arena, model-specific tensor kernels, accurate tokenizer, KV management,
file-range streaming, and numerical regression tests against native reference.
