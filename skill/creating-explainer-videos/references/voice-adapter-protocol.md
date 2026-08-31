# Executable voice adapters

Read this reference when synthesizing narration, diagnosing a provider, recovering an interrupted run, or adding a trusted host adapter.

## Built-in commands

```powershell
explainer-video-skill narration adapters --json
explainer-video-skill narration doctor <project-dir> --adapter edge-tts --json
explainer-video-skill narration synthesize <project-dir> --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
explainer-video-skill narration recover <project-dir> --adapter edge-tts --voice zh-CN-YunxiNeural --allow-network --json
```

`synthesize` and `recover` normalize the canonical narration, synthesize only invalid or missing cues, normalize audio to 48 kHz stereo PCM WAV, trim provider silence, measure speech with ffprobe, add deterministic gaps, write `.publish/narration.wav`, and rebuild measured cue timing.

`recover` is not a blind retry. It verifies the input hash, audio hash, byte size, and probeable duration before reusing a cue.

## Adapter choices

| Adapter | Real speech | Network | Cost gate | Purpose |
| --- | --- | --- | --- | --- |
| `edge-tts` | yes | yes | `--allow-network` | Reference Chinese narration adapter using host Python |
| `fixture-tts` | no | no | none | Deterministic integration tests only |
| `host-command` | provider-defined | declared by config | network and paid/unknown gates | Explicitly trusted external adapter |

Install Edge TTS in the host Python environment before using it:

```powershell
python -m pip install edge-tts
python -m edge_tts --version
```

`fixture-tts` produces synthetic audio and writes `testOnly: true` into timing evidence. It cannot satisfy the real-audio production gate and must never be described as narration.

## Authorization matrix

Authorization is checked before the first uncached provider call:

- Network adapter: require `--allow-network`.
- Cost `paid` or `unknown`: also require `--authorize-provider-cost`.
- All cues valid in cache: no provider call and no new provider authorization.

Permission flags authorize only this invocation. They do not turn a declarative extension into executable authority and do not authorize unrelated paid calls.

Provider credentials stay in environment variables or the host credential store used by the adapter. Do not write credentials into `toolchain.json`, `.publish/tts-adapter.json`, narration cache, request JSON, shell history, logs, or publishing artifacts.

## Canonical narration and cache

The input hash includes adapter ID, cue ID, normalized text, language, voice, rate, pitch, and output format. Changing one cue invalidates only that cue. A valid cache row records:

- cue ID and input SHA-256;
- normalized WAV path, byte count, and SHA-256;
- measured speech duration;
- attempt count and optional provider task ID.

Cache rows are written atomically after each completed cue. On failure, inspect the reported cue and preserve valid rows. Do not delete the whole cache or resubmit successful paid tasks merely to simplify recovery.

Default gaps are 0.12 seconds inside a scene, 0.28 seconds between scenes, and 0.9 seconds after the final cue. Timing duration includes the following gap; `speechDuration` and `gapAfter` remain recorded separately.

## Trusted host-command protocol

Host adapters are executable code and therefore do not live inside v1 declarative extensions. Configure one explicitly at `.publish/tts-adapter.json` or `toolchain/tts-adapter.json`:

```json
{
  "schemaVersion": 1,
  "protocolVersion": 1,
  "id": "local-voice-model",
  "executable": "C:/absolute/path/adapter.exe",
  "executableSha256": "64-lowercase-hex-characters",
  "args": [],
  "network": false,
  "cost": "none"
}
```

The runtime verifies the executable hash before every run. Updating the executable requires a deliberate config hash update and review.

The executable is invoked as:

```text
adapter [configured args] --request <request.json> --response <response.json>
```

Request version 1:

```json
{
  "protocolVersion": 1,
  "requestId": "stable-input-derived-id",
  "cue": {
    "id": "C01",
    "text": "canonical spoken text",
    "language": "zh-CN",
    "voice": "provider voice id",
    "rate": "+0%",
    "pitch": "+0Hz"
  },
  "output": {
    "audioPath": "absolute path under project .publish/narration",
    "format": "wav",
    "sampleRate": 48000,
    "channels": 2
  }
}
```

Response version 1:

```json
{
  "protocolVersion": 1,
  "status": "completed",
  "audioPath": "the exact requested output path",
  "providerTaskId": "optional durable provider task id",
  "diagnostics": []
}
```

The runtime rejects malformed responses, mismatched output paths, empty WAVs, path escape, missing executable hashes, and incompatible protocol versions.

## Human audio gate

Provider completion proves only that an audio file was returned. Listen to the complete normalized master for wrong words, names, abbreviations, literal symbols, clipping, unnatural pauses, rate changes, and repeated/missing cues before animation lock. After the final mux, listen again to the exact hashed candidate.
