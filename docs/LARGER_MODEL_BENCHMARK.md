# Larger offline GGUF model benchmark

An independent GitHub Actions workflow measures practical local-model extraction at 1.5B and 3B parameters. On its first commit, the workflow tests the official Qwen2.5-1.5B-Instruct Q4_K_M. The 3B test is available through the manual workflow selection.

| Model | Published GGUF size | SHA-256 |
|---|---:|---|
| Qwen2.5-1.5B-Instruct Q4_K_M | 1.12 GB | `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e` |
| Qwen2.5-3B-Instruct Q4_K_M | 2.1 GB | `626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d` |

Hashes are published on the official model file pages at https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/main/qwen2.5-1.5b-instruct-q4_k_m.gguf and https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/blob/main/qwen2.5-3b-instruct-q4_k_m.gguf.

The networked CI runner downloads and checksum-verifies the selected model. The standalone app runs from `file://` with all browser HTTP(S) and WebSocket requests blocked. The model weights are not committed or uploaded as artifacts.

Measurements: model file size, load time, known-answer score, full synthetic document import, JSON extraction, evidence review, export and elapsed time.

The larger model may fail due to runner memory, browser WASM limits, or CPU performance. Failure is reported rather than weakening the offline design.

Model size alone does not determine whether it will run on a user's workstation. RAM, browser memory, context, KV cache, quantization, and WebAssembly support matter. CI success does not establish PBGC workstation approval.
## Verified 1.5B result (November 6, 2026)

[CI run 42281102968](https://github.com/ErChulo/ocr-llm-pipeline/actions/runs/42281102968) completed successfully. It verified the official 1.5B model's SHA-256, loaded 1,117,320,736-byte weights in the offline browser in 8,701 ms, and completed the synthetic document → JSON → evidence review → browser export workflow with **zero network requests**.

However, the independent four-field known-answer quality test scored **3/4**, not 4/4. This is a quality limitation; the passing workflow only establishes the end-to-end application path. The next diagnostic addition shows missing, incorrect and unsupported field names without treating these as verified facts. A 3B run remains untested.
