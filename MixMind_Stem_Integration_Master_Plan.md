# MixMind — Browser-Only, On-Device Stem Mixing
## Technical Implementation Master Plan, Validation Protocol, and Release Gates

**Project:** MixMind  
**Current foundation:** Browser-only, vanilla HTML/JavaScript, Web Audio API, Web Workers, IndexedDB, OPFS, OfflineAudioContext  
**Target capability:** Separate locally imported music into four aligned stems—**vocals, drums, bass, other**—then use those stems safely in automated DJ transitions, preview, seeking, and exported mixes.  
**Primary model target:** HTDemucs v4 four-stem, deployed as a browser-compatible ONNX model and executed through ONNX Runtime Web.  
**Processing policy:** Offline/background preprocessing only; never real-time neural separation in the audio playback path.  
**Status:** Architecture and implementation plan. No model inference is currently integrated into `MixMind_v5.html`.

---

## 1. Outcome Definition

### 1.1 Maximum required product outcome

A user can import local songs into MixMind and, where device capability permits, prepare four stems entirely on-device. Once prepared, MixMind can:

- play each stem independently with sample-accurate synchronization;
- expose per-stem mute, solo, and gain controls;
- automatically plan and execute transitions using up to eight concurrent stem sources (four outgoing, four incoming);
- avoid vocal-on-vocal and bass-on-bass conflicts where possible;
- create drum bridges, bass swaps, acapella overlays, and staged intros;
- seek, preview a transition, and export an offline mix using the same stem-aware audio graph;
- preserve the existing master-track workflow whenever stems are unavailable, incomplete, poor-quality, evicted, or unsupported.

### 1.2 Non-negotiable principles

1. **No user audio leaves the device.** No server upload, cloud inference, remote audio API, or telemetry containing audio content.
2. **Separation is optional and progressive.** A track remains usable immediately in master-track mode while stems prepare.
3. **No false “melody” promise.** The standard fourth output is technically `other`, not an isolated melody. UI wording may be `Other / Melody` only if documentation makes this clear.
4. **No real-time inference during playback.** The source-separation model must complete before stem-aware playback is allowed.
5. **No regression of existing behavior.** Existing master playback, analysis, project recovery, transition preview, seek, long export, and MP3/WAV output remain valid.
6. **Never crash under pressure.** Storage, memory, battery, and unsupported-device cases must degrade to master-only mode with clear guidance.
7. **Never fake readiness.** A stem-ready badge is allowed only after model output, alignment verification, storage validation, and playback hydration checks pass.

---

## 2. Baseline Assessment

The current `MixMind_v5.html` is a browser-local, monolithic application with:

- local file import and full decoding to Web Audio `AudioBuffer` objects;
- BPM, key, energy, beat-grid, downbeat, section, loudness, fingerprint, and texture/vocal-density analysis;
- phrase/bar-aligned automated transitions;
- custom WSOLA time stretching;
- Web Audio live playback, seek reconstruction, transition preview, sidechain/EQ/filter/delay transitions, and offline rendering;
- worker-backed analysis, fingerprinting, loudness measurement, WSOLA, and MP3 encoding;
- IndexedDB metadata persistence;
- OPFS PCM swap storage and hydration;
- File System Access restoration where Chromium supports it.

The current engine has one playable master buffer per track. Stem integration therefore changes a fundamental audio abstraction: **one track becomes a deck containing one to four playable source layers.**

---

## 3. Constraints and Explicit Trade-offs

### 3.1 Browser-only and local-only implication

Standard Demucs deployments use Python/PyTorch and are not directly executable in a web page. MixMind must use a validated browser-compatible model artifact and local inference runtime.

Required runtime direction:

```text
HTDemucs v4 weights / graph
  → audited ONNX export
  → browser-compatible quantized artifact
  → ONNX Runtime Web
  → WebGPU preferred execution provider
  → WASM SIMD/thread fallback where viable
```

### 3.2 Device-class reality

The app must support normal desktop and mobile users, but it cannot guarantee quality-first four-stem inference on every phone.

| Class | Expected behavior |
|---|---|
| Modern desktop Chromium + WebGPU | Preferred full stem-preparation mode |
| Desktop browser without WebGPU | Slower WASM/CPU attempt, with time and memory warning |
| Modern supported mobile | Attempt low-memory chunked mode only after capability check |
| Low-memory / thermal-limited / unsupported device | Master-only mode, clear explanation, no crash |

### 3.3 Quality policy

Quality takes priority over speed. The initial release uses one thoroughly validated four-stem model rather than an expensive multi-model ensemble. A later optional **Ultra Separation** tier may use an ensemble only after its model licensing, hardware requirements, output alignment, and browser runtime behavior are independently validated.

---

## 4. Target System Architecture

```text
                        ┌──────────────────────────────┐
                        │ Local audio import            │
                        │ File → AudioBuffer (master)   │
                        └──────────────┬───────────────┘
                                       │
                   ┌───────────────────▼────────────────────┐
                   │ Existing MixMind analysis pipeline      │
                   │ BPM/key/grid/sections/energy/texture    │
                   └──────────────┬──────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │ Stem preparation queue     │
                    │ one job at a time          │
                    └─────────────┬─────────────┘
                                  │
       ┌──────────────────────────▼──────────────────────────┐
       │ Dedicated StemSeparationWorker                        │
       │ capability check → chunking → ONNX inference →        │
       │ overlap-add → alignment → quality checks              │
       └─────────────┬──────────────────────────┬─────────────┘
                     │                          │
       ┌─────────────▼─────────────┐  ┌────────▼──────────────┐
       │ OPFS stem asset store      │  │ IndexedDB manifest     │
       │ raw PCM + metadata         │  │ status/model/checksum  │
       └─────────────┬─────────────┘  └────────┬──────────────┘
                     │                          │
       ┌─────────────▼──────────────────────────▼─────────────┐
       │ Stem-aware AudioEngine                                │
       │ Deck A: vocals/drums/bass/other → Deck A bus          │
       │ Deck B: vocals/drums/bass/other → Deck B bus          │
       │ Deck DSP → existing master/compressor/limiter         │
       └───────────────────────────────────────────────────────┘
```

---

## 5. Data Model Migration

### 5.1 Existing conceptual model

```js
track.buffer = AudioBuffer;
```

### 5.2 Target track audio model

```js
track.audio = {
  master: {
    buffer: null,              // AudioBuffer when hydrated
    opfsKey: null,
    sampleRate: 0,
    channels: 0,
    length: 0,
    duration: 0
  },
  stems: {
    status: 'none',            // none | queued | processing | ready | failed | unsupported
    failureReason: null,
    modelId: null,
    modelVersion: null,
    sourceFingerprint: null,
    createdAt: null,
    sampleRate: 0,
    channels: 0,
    length: 0,
    duration: 0,
    alignment: {
      startSample: 0,
      referenceLength: 0,
      verified: false,
      maxLengthErrorSamples: null
    },
    quality: {
      status: 'unknown',       // unknown | accepted | warning | rejected
      reconstructionErrorDb: null,
      silenceLeakageDb: null,
      notes: []
    },
    assets: {
      vocals: makeStemAsset('vocals', 'Vocals'),
      drums: makeStemAsset('drums', 'Drums'),
      bass: makeStemAsset('bass', 'Bass'),
      other: makeStemAsset('other', 'Other / Melody')
    }
  }
};

function makeStemAsset(id, displayName) {
  return {
    id,
    displayName,
    status: 'missing',         // missing | storing | stored | hydrated | failed
    opfsKey: null,
    inMemoryBuffer: null,
    sampleRate: 0,
    channels: 0,
    length: 0,
    duration: 0,
    checksum: null,
    defaultGain: 1,
    muted: false,
    solo: false
  };
}
```

### 5.3 Backward compatibility

For the transition period, retain `track.buffer` as a compatibility alias to `track.audio.master.buffer`, then remove it only after all current code paths use the new structure.

```js
function getMasterBuffer(track) {
  return track?.audio?.master?.buffer || track?.buffer || null;
}
```

Every stem path must use an explicit guard:

```js
function isStemReady(track) {
  const s = track?.audio?.stems;
  return !!(
    s?.status === 'ready' &&
    s.alignment?.verified &&
    ['vocals', 'drums', 'bass', 'other'].every(name =>
      s.assets?.[name]?.inMemoryBuffer instanceof AudioBuffer
    )
  );
}
```

---

## 6. Separation Pipeline Design

### 6.1 Capability gate

Before loading the model or allocating output buffers, evaluate:

- browser support for Web Workers, OPFS, IndexedDB, WebAssembly, and SIMD;
- WebGPU availability and adapter/device acquisition;
- `navigator.storage.estimate()` quota and remaining space;
- `navigator.hardwareConcurrency`;
- `navigator.deviceMemory` where exposed, but never depend on it exclusively;
- currently estimated MixMind PCM memory;
- whether export, live playback, or another separation job is active.

Possible result:

```js
{
  allowed: true,
  executionProvider: 'webgpu', // webgpu | wasm | unsupported
  estimatedDiskBytes: 0,
  estimatedPeakMemoryBytes: 0,
  warning: null
}
```

### 6.2 Job queue

Only one inference job runs at a time.

```js
const stemQueue = {
  activeJob: null,
  pendingTrackIds: [],
  cancelledTrackIds: new Set(),
  maxConcurrent: 1
};
```

Queue behavior:

1. Import adds the track as `queued` if Auto Prepare Stems is enabled.
2. User may explicitly prioritize, cancel, retry, or delete a job.
3. Export and stem separation are mutually exclusive.
4. Playback is permitted, but the job pauses if safe resource policy requires it.
5. A failed job records a recoverable reason; it never corrupts existing master audio.

### 6.3 Preprocessing

The worker receives an immutable source PCM snapshot or a transferable copy of source channel data.

Steps:

1. Downmix/retain stereo according to model requirement.
2. Resample to model sample rate using a verified resampler.
3. Normalize only if the chosen model requires it; preserve original gain metadata.
4. Divide into model-sized windows with overlap.
5. Apply a deterministic window function.
6. Record exact mapping from model-domain samples back to source-domain samples.

### 6.4 Inference and chunk reconstruction

For each chunk:

1. Execute ONNX inference.
2. Validate output tensor rank, stem count, channel count, and finite sample values.
3. Apply overlap-add reconstruction with normalized weighting.
4. Write output incrementally to per-stem storage buffers/files.
5. Emit progress without returning full audio arrays to the UI.
6. Check cancellation between chunks.

### 6.5 Postprocessing and alignment

The worker must create four final streams that share the exact source reference grid.

Required rules:

```text
output sample rate = chosen MixMind playback rate
output channels    = master channels, normally stereo
stem start sample  = 0 for all stems
stem length        = source reference length for all stems
```

Postprocessing steps:

1. Resample outputs to the playback rate, if required.
2. Restore leading alignment silence.
3. Pad end frames with zeros to exact reference length.
4. Trim only excess trailing frames.
5. Check samples are finite and within a safe range.
6. Calculate checksums and write manifest metadata.
7. Mark `alignment.verified = true` only when all checks pass.

### 6.6 Cancellation and recovery

Cancellation must:

- stop future inference chunks;
- close worker-side temporary files;
- delete partial OPFS output directory;
- preserve the source master and previous valid stem set;
- return track state to `none` or `failed` with a clear reason.

---

## 7. OPFS and IndexedDB Storage Design

### 7.1 OPFS layout

```text
mixmind-audio/
  {fingerprint}/
    master/
      metadata.json
      ch0.pcm
      ch1.pcm
    stems/
      htdemucs-4s-{modelVersion}/
        manifest.json
        vocals_ch0.pcm
        vocals_ch1.pcm
        drums_ch0.pcm
        drums_ch1.pcm
        bass_ch0.pcm
        bass_ch1.pcm
        other_ch0.pcm
        other_ch1.pcm
```

### 7.2 Manifest example

```json
{
  "schemaVersion": 1,
  "trackFingerprint": "...",
  "modelId": "htdemucs-4s",
  "modelVersion": "1.0.0",
  "createdAt": 0,
  "sampleRate": 44100,
  "channels": 2,
  "length": 10584000,
  "duration": 240,
  "alignment": {
    "startSample": 0,
    "referenceLength": 10584000,
    "verified": true
  },
  "assets": {
    "vocals": { "checksum": "...", "files": ["vocals_ch0.pcm", "vocals_ch1.pcm"] },
    "drums": { "checksum": "...", "files": ["drums_ch0.pcm", "drums_ch1.pcm"] },
    "bass": { "checksum": "...", "files": ["bass_ch0.pcm", "bass_ch1.pcm"] },
    "other": { "checksum": "...", "files": ["other_ch0.pcm", "other_ch1.pcm"] }
  }
}
```

### 7.3 Persistence policy

- IndexedDB holds manifests, status, project references, and UI metadata.
- OPFS holds binary PCM stem content.
- Never serialize PCM stem arrays into `localStorage` or a project JSON.
- A saved project references stems by fingerprint and model version.
- If model version changes, preserve existing stems but mark them as created by an older model.
- A user can explicitly delete stems to reclaim storage.

### 7.4 Storage quota policy

Before separation, calculate a conservative requirement:

```text
master PCM bytes + four stem PCM bytes + temporary buffers + safety margin
```

If quota is inadequate:

1. show projected requirement and available storage;
2. offer cleanup of unused stem sets;
3. offer master-only operation;
4. never start a job likely to fail halfway through because of quota.

---

## 8. Memory and Hydration Policy

### 8.1 Two-deck maximum active window

Only the current and incoming track are allowed to hold hydrated stem sets in ordinary playback:

```text
Deck A: current outgoing track → four stems
Deck B: next incoming track   → four stems
Maximum: eight concurrent stem buffers
```

Everything else stays OPFS-resident.

### 8.2 Hydration state machine

```text
stored → prefetching → hydrated → active → releasePending → stored
```

- Prefetch begins before a transition using a configurable safety look-ahead.
- Stem-aware playback begins only after all four incoming stem buffers are hydrated and alignment-verified.
- If hydration misses deadline, use the preplanned master-track fallback transition.
- After outgoing audio is no longer audible, release its four buffers and retain only OPFS files.

### 8.3 Memory gates

```js
const STEM_PREFETCH_SECONDS = 20;
const MAX_ACTIVE_STEM_DECKS = 2;
const STEM_MEMORY_WARNING_RATIO = 0.60;
const STEM_MEMORY_HARD_STOP_RATIO = 0.75;
const SEPARATION_QUEUE_CONCURRENCY = 1;
```

These values are defaults to be benchmarked, not permanent constants.

### 8.4 Coordinated time-stretching

Current WSOLA behavior must become deck-aware.

- One BPM ratio is chosen for a deck.
- The same ratio is applied to every stem.
- All stem output lengths are forced to a common sample count.
- A complete stretched stem set is cached/evicted as one unit.
- Stem time-stretching must not be performed independently with unconstrained output lengths.

---

## 9. Stem-Aware Web Audio Graph

### 9.1 Deck graph

```text
vocals source → vocals gain ┐
drums source  → drums gain  ├→ deck input/bus → current deck DSP → deck gain
bass source   → bass gain   ┤                                       │
other source  → other gain  ┘                                       ▼
                                                 master/compressor/limiter/destination
```

Create one deck object per timeline track when it becomes active:

```js
{
  trackId,
  startTime,
  duration,
  stemNodes: {
    vocals: { source, gain },
    drums: { source, gain },
    bass: { source, gain },
    other: { source, gain }
  },
  deckInput,
  deckGain,
  lowEQ,
  midEQ,
  highEQ,
  filter,
  delay,
  delayGain,
  stereoPanner
}
```

### 9.2 Source scheduling rules

All four stem `AudioBufferSourceNode`s must use:

- identical scheduled start time;
- identical source offset;
- identical scheduled duration;
- same time-stretch ratio where applicable;
- per-stem gain automation only.

### 9.3 Master-only compatibility graph

If a stem plan is unavailable, construct the current single-source graph. The rest of the AudioEngine must operate through a common deck interface so that master and stem decks can coexist safely.

---

## 10. Automated Stem Transition Planning

### 10.1 Planner contract

The existing compatibility engine remains responsible for song ordering, BPM/key/energy/phrase assessment. A new `StemTransitionPlanner` refines an already selected transition.

```js
const plan = StemTransitionPlanner.plan({
  outgoingTrack,
  incomingTrack,
  baseTransition,
  beatGrid,
  sections,
  stemAvailability,
  stemQuality,
  userPreferences
});
```

### 10.2 Eligibility gate

A stem plan is allowed only when:

- both tracks are stem-ready;
- both stem sets are alignment-verified;
- both stem sets are hydrated or can be safely hydrated before transition;
- beat/phrase confidence meets minimum policy;
- stem quality is accepted or explicitly user-approved;
- user has not selected master-only mode.

Otherwise return:

```js
{ mode: 'master', reason: 'incoming-stems-unavailable' }
```

### 10.3 Required transition templates

1. **Clean vocal handoff**
   - Fade outgoing vocals before incoming vocals arrive.
   - Keep drums/other briefly to preserve momentum.

2. **Drums-first incoming intro**
   - Start incoming drums at phrase boundary.
   - Introduce bass next, `other` next, vocals last.

3. **Bass swap**
   - Never maintain two full-level bass stems by default.
   - Move outgoing bass down before incoming bass rises on a downbeat.

4. **Acapella overlay**
   - Keep outgoing vocal phrase over incoming drums/bass/other.
   - Mute or reduce incoming vocals during overlay.
   - Enforce a short duration and a phrase endpoint.

5. **Drum bridge**
   - Retain outgoing drums while incoming other content enters.
   - Hand drums off on downbeat.

6. **Harmonic protection transition**
   - If key compatibility is weak, delay incoming `other`/melodic material.
   - Use drums and limited bass as bridge material.

7. **Master fallback**
   - Existing transition behavior remains the fallback for every failure path.

### 10.4 Automation representation

Store all timing as normalized transition positions plus explicit gain values:

```js
{
  mode: 'stems',
  template: 'bass-swap',
  durationSeconds: 16,
  outgoing: {
    vocals: [{ at: 0.00, gain: 1 }, { at: 0.30, gain: 0 }],
    drums:  [{ at: 0.00, gain: 1 }, { at: 0.85, gain: 0 }],
    bass:   [{ at: 0.00, gain: 1 }, { at: 0.45, gain: 0 }],
    other:  [{ at: 0.00, gain: 1 }, { at: 0.80, gain: 0 }]
  },
  incoming: {
    vocals: [{ at: 0.00, gain: 0 }, { at: 0.70, gain: 1 }],
    drums:  [{ at: 0.00, gain: 0 }, { at: 0.25, gain: 1 }],
    bass:   [{ at: 0.00, gain: 0 }, { at: 0.45, gain: 1 }],
    other:  [{ at: 0.00, gain: 0 }, { at: 0.40, gain: 1 }]
  }
}
```

Schedule gain events with `AudioParam.setValueAtTime`, `linearRampToValueAtTime`, or `setValueCurveAtTime`; do not use JavaScript `setTimeout` for musical automation.

---

## 11. Required HTML / JavaScript Refactor Sequence

### Milestone A — Safe state-model foundation

- Add `track.audio.master` and `track.audio.stems` schema.
- Add migration for older saved project data.
- Add helper accessors: `getMasterBuffer`, `isStemReady`, `getStemBuffer`.
- Keep all playback master-only.

**Exit gate:** Existing import, analysis, playback, seek, preview, save/load, and export regression tests pass.

### Milestone B — Stem UI and queue management

- Add track status badges: Not Prepared, Queued, Preparing, Ready, Failed, Unsupported.
- Add Prepare / Cancel / Retry / Delete Stems controls.
- Add visible model version and local-storage usage.
- Add per-track queue progress.
- Add global queue controls and device warning dialog.

**Exit gate:** UI state is deterministic under import, cancellation, reload, and project restore.

### Milestone C — OPFS stem assets

- Implement atomic stem-set writing.
- Implement manifest validation.
- Implement hydration/release/eviction for a complete four-stem set.
- Implement deletion and cleanup.

**Exit gate:** Stored stems survive reload; corrupted/partial assets are rejected and cleaned without breaking master playback.

### Milestone D — Browser inference proof of correctness

- Package ONNX Runtime Web locally.
- Build dedicated worker.
- Integrate model asset manifest, checksum validation, and cache status.
- Implement one-song worker inference path.
- Implement cancellation and progress.

**Exit gate:** Golden-reference songs produce aligned, playable four-stem assets with verified reconstruction metrics.

### Milestone E — Manual stem deck playback

- Replace direct single-source assumptions with master-or-stem deck factory.
- Build four-source stem deck.
- Add per-stem gain/mute/solo UI.
- Retain the current master deck implementation as fallback.

**Exit gate:** A user can play a prepared track, mute/solo each stem, seek, stop, and reload without audible synchronization drift.

### Milestone F — Stem-aware live transitions

- Introduce `StemTransitionPlanner`.
- Implement initial templates: clean vocal handoff, drums-first, bass swap, master fallback.
- Update normal schedule, seek schedule, and transition preview together.
- Add hydration deadline fallback.

**Exit gate:** Eight-source overlap transition runs without glitches on qualifying devices and consistently falls back when it cannot.

### Milestone G — Stem-aware offline render and export

- Update `renderOffline` to build the same deck/stem graph.
- Ensure WAV/MP3/video export uses planned stem automation.
- Retain segmented-render support for long mixes.

**Exit gate:** Exported mix null/feature tests agree with scheduled live topology and do not omit stems or effects.

### Milestone H — Quality, safety, accessibility, and release hardening

- Device capability matrix.
- Memory/storage warnings.
- Mobile thermal/battery UX.
- Performance tuning.
- Security review.
- Model/license/attribution review.
- User documentation and recovery instructions.

**Exit gate:** Release acceptance criteria in Section 15 pass.

---

## 12. Rigorous Virtual Test Strategy

Testing is a first-class deliverable, not a final cleanup step. Build a repeatable test harness before enabling automatic stem transitions by default.

### 12.1 Test layers

| Layer | Purpose |
|---|---|
| Unit tests | Deterministic helpers, manifests, state transitions, gain-plan generation |
| Worker integration tests | Model loading, chunk execution, cancellation, error propagation |
| Audio signal tests | Alignment, reconstruction, silence, gain automation, no clipping |
| Browser integration tests | Import, persistence, hydration, playback, seek, preview, export |
| Stress tests | Long libraries, quota pressure, memory pressure, rapid user actions |
| Golden listening tests | Human evaluation of artifacts and musical transition quality |

### 12.2 Synthetic signal test corpus

Generate deterministic WAV fixtures in code. Each fixture must have a known expected result.

1. **Impulse alignment fixture**
   - Single impulse at sample 0 and further known sample indices.
   - Validates no stem start offset and no chunk seam shift.

2. **Sine identifiers fixture**
   - Unique fixed-frequency sine per synthetic source.
   - Validates channel mapping, gain automation, and correct summation.

3. **Click-track fixture**
   - Downbeat clicks with known BPM and bar positions.
   - Validates beat-aligned scheduling and time-stretch alignment.

4. **Stereo polarity fixture**
   - Different left/right content and inverted phase sections.
   - Validates channel preservation and no accidental mono collapse.

5. **Silence boundary fixture**
   - Leading/trailing silence with signal in the middle.
   - Validates padding and exact reference duration.

6. **Long-duration fixture**
   - At least 30–60 minutes synthetic material.
   - Validates segmented rendering, memory release, and no cumulative drift.

### 12.3 Separation-output validation

For each prepared track, calculate:

```text
reconstructed(t) = vocals(t) + drums(t) + bass(t) + other(t)
error(t) = master(t) - reconstructed(t)
```

Measure:

- RMS reconstruction error;
- peak reconstruction error;
- reconstruction error dB;
- per-stem finite-value check;
- equal sample rate/channel count/length check;
- zero-offset alignment check;
- no NaN/Infinity;
- no unexpected DC offset;
- no clipped sample explosion after gain staging.

Initial conservative thresholds must be established empirically against the selected model/export. Any threshold is a release gate, not merely a log message.

### 12.4 Chunk and seam tests

Run the same source with varied chunk sizes and overlaps:

```text
chunk sizes: model minimum, nominal, 2× nominal
overlaps: 25%, 50%, 75%
```

Compare results for:

- audible discontinuities at boundaries;
- transient preservation;
- total length equality;
- reconstruction quality;
- execution time and peak memory.

The chosen operating point must be documented as a quality/performance decision.

### 12.5 Gain automation tests

For every stem transition template:

- render a deterministic offline transition;
- inspect gain envelope at intended sample positions;
- verify only allowed vocal overlap occurs;
- verify bass overlap does not exceed policy;
- verify all gains end at expected levels;
- verify no unintended full-scale clipping;
- compare live scheduling event map to offline rendering event map.

### 12.6 Seek and preview parity tests

For each transition template:

1. Render the complete mix offline.
2. Seek directly to several points before, during, and after a transition.
3. Render the seek reconstruction region.
4. Compare sample timing and planned audible sources against the full render.
5. Preview the same transition and compare its event schedule to full playback.

Expected result: no missing stem, duplicate stem, late start, or wrong gain curve after seeking.

### 12.7 Export parity tests

Build a test matrix:

| Case | Live | Seek | Transition preview | Offline WAV | Offline MP3 |
|---|---:|---:|---:|---:|---:|
| Master-only transition | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vocal handoff | ✓ | ✓ | ✓ | ✓ | ✓ |
| Drums-first intro | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bass swap | ✓ | ✓ | ✓ | ✓ | ✓ |
| Acapella overlay | ✓ | ✓ | ✓ | ✓ | ✓ |
| Long segmented export | N/A | N/A | N/A | ✓ | ✓ |

### 12.8 Stress and fault-injection tests

Automate or manually simulate:

- OPFS quota exhaustion before job start;
- OPFS quota exhaustion mid-job;
- IndexedDB unavailable/failing;
- corrupted model asset checksum;
- corrupted stem PCM file;
- worker crash;
- model inference exception;
- cancellation at every job phase;
- device sleep/backgrounding;
- tab reload while preparing;
- rapid add/remove/reorder timeline actions;
- transition start while incoming stems hydrate too slowly;
- playback start during model download;
- export attempt during separation;
- 50+ source tracks with stems stored but only two decks hydrated;
- long mixes and repeated seek operations;
- browser memory pressure.

Expected behavior in every case: meaningful error state, cleanup of partial assets, and intact master-track workflow.

### 12.9 Browser/device matrix

At minimum, test current stable versions of:

- Chrome desktop: Windows, macOS, Linux;
- Edge desktop: Windows;
- Chrome Android on low/mid/high capability devices;
- Safari macOS;
- Safari iOS/iPadOS;
- Firefox desktop.

Document for each:

- WebGPU availability;
- WASM threaded mode availability;
- OPFS availability;
- File System Access behavior;
- model load success;
- separation duration;
- peak memory;
- battery/thermal observations for mobile;
- fallback behavior.

### 12.10 Human listening protocol

Objective metrics cannot fully assess musical quality. Maintain a curated licensed test set with:

- pop with lead vocals;
- hip-hop with strong bass;
- EDM with dense drums and synths;
- rock with distorted guitars;
- acoustic music;
- jazz/live recordings;
- vocal harmonies/choirs;
- tracks with silence, pickups, and long intros/outros.

For each version, compare master-only and stem-aware transitions blind where possible. Score:

- vocal collision reduction;
- bass conflict reduction;
- phrase naturalness;
- perceived artifacts;
- energy continuity;
- musicality;
- transition preference.

Do not enable a template by default unless it improves median listener preference over the master-only fallback in its intended scenario.

---

## 13. Performance Instrumentation

Add a diagnostics panel and structured event log. Track:

```js
{
  trackId,
  modelId,
  executionProvider,
  modelLoadMs,
  preprocessingMs,
  inferenceMs,
  postprocessingMs,
  totalMs,
  sourceDurationSeconds,
  realtimeFactor,
  peakEstimatedMemoryBytes,
  opfsBytesWritten,
  outputSampleRate,
  outputLength,
  alignmentVerified,
  qualityStatus,
  fallbackReason
}
```

Runtime telemetry must remain local unless the user explicitly opts into anonymized diagnostics. Never collect raw audio or personally identifying filenames by default.

---

## 14. User Experience and Failure Messaging

### Track states

```text
MASTER READY
STEMS QUEUED
PREPARING STEMS — 0–100%
STEMS READY
STEMS READY — STORAGE WARNING
STEMS FAILED — RETRY
STEMS NOT SUPPORTED ON THIS DEVICE
MASTER-ONLY MODE
```

### Required user controls

- Prepare stems
- Cancel preparation
- Retry stems
- Delete stems from local storage
- Prefer stem transitions / Master-only transitions
- Per-stem level, mute, and solo
- Show model and storage details
- Clear all cached models/stems

### Required warnings

- Initial model download size and Wi-Fi recommendation
- Estimated storage required before processing
- Device capability warning
- Low-storage warning
- Battery/thermal warning on mobile
- Quality warning if output validation is weak
- Explicit fallback notification when a planned stem transition becomes master-only

---

## 15. Release Acceptance Criteria

The stem feature is not release-ready until all criteria below pass.

### Functional correctness

- [ ] A supported-device user can prepare four stems entirely locally.
- [ ] Stems persist across reload and restore correctly from OPFS.
- [ ] All four hydrated stems start sample-aligned.
- [ ] Manual mute/solo/gain controls work during playback.
- [ ] Two stem-ready tracks can execute an eight-source transition.
- [ ] Master-only tracks remain fully usable.
- [ ] Seek and transition preview reproduce the correct stem plan.
- [ ] Offline WAV/MP3 export contains the same stem automation plan.
- [ ] Long segmented exports work without seam regression.

### Quality and safety

- [ ] Selected model/export passes reconstruction and alignment tests.
- [ ] No template creates unplanned vocal or bass overlap by default.
- [ ] No uncaught worker, OPFS, Web Audio, or model failures occur in fault tests.
- [ ] Low-capability devices receive a safe, understandable fallback.
- [ ] Partial/corrupt stem output is never marked ready.
- [ ] No user audio is uploaded or logged.

### Performance

- [ ] Separation runs outside the main UI thread.
- [ ] Normal UI remains responsive while preparing stems.
- [ ] Only two stem decks are simultaneously hydrated in normal playback.
- [ ] Memory warning/hard-stop policy is proven under stress.
- [ ] Queue concurrency remains one unless future profiling proves a safe alternative.

### Musical outcome

- [ ] Stem-aware templates show measurable or listener-confirmed improvement over master-only fallback in intended situations.
- [ ] Transition selection remains conservative when confidence or stem quality is low.
- [ ] Full-song guard/master-only behavior remains available as a user choice.

---

## 16. Definition of Done

This task is complete only when MixMind provides a **reliable hybrid system**:

```text
Stem-ready, capable device, safe transition
  → stem-aware automated transition

Stem unavailable, poor-quality, incompatible, late, or constrained device
  → current master-track transition without broken playback
```

The feature succeeds not by forcing stems into every mix, but by using them only when they make a transition more musical, cleaner, and safer than the existing master-track method.

---

## 17. Immediate Next Engineering Action

Begin with **Milestone A** in a copy of the current HTML:

1. introduce the versioned `track.audio` schema;
2. add compatibility helpers and migration code;
3. add stem statuses/UI without changing audio playback;
4. create automated regression fixtures before inserting model inference;
5. only then integrate a verified HTDemucs ONNX worker.

This sequencing protects the existing working mixer while establishing the tested foundation required for the maximum stem-aware outcome.
