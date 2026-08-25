# MixMind — Technical, Product, and Architecture Status Report for External AI Review

**Report date:** 11 August 2026  
**Purpose:** Give an external technical reviewer complete context to audit MixMind’s architecture, implementation history, real test evidence, unresolved risks, and the best next engineering steps.  
**Important:** Distinguish carefully between **implemented**, **user-tested**, **static-code checked**, **unverified**, and **failed/retired** paths.

---

## 1. Executive summary

MixMind is a browser-based, fully local AI DJ-mixing application. It analyzes uploaded songs, builds a timeline, proposes transitions, previews/exports mixes, and can prepare on-device stems. It is designed to run entirely in the user’s browser without uploading audio for analysis or stem separation.

The central product problem discovered during real listening tests was that “stems are prepared” did not mean “a stem transition is safe.” Earlier Lite stem experiments produced overlapping vocals, noisy instrumental clashes, poor handoffs, duplicated playback, broken seeking, and truncated songs. The project has therefore pivoted to a conservative **master-first, collision-aware transition intelligence architecture**.

The intended governing principle is:

```text
Master analysis decides where and when a transition can happen.
Collision analysis decides what must be avoided.
Prepared stem capability determines what can be controlled.
One canonical renderer executes one immutable transition decision.
```

The system is now good at recognizing and explaining why a risky pair should remain a short **Master / Echo Out** fallback. It is deliberately refusing to use Lite stems for every pair tested so far. This is safer than the earlier behavior, but creates the next major product issue: the gate currently has **zero confirmed Lite-eligible real-world pairs** among the user’s tested vocal-heavy songs. MixMind now needs a candidate-discovery and diagnostics layer to determine whether this reflects genuinely unsuitable arrangements or overly conservative/incorrect activity and safe-window logic.

No generic stem renderer or rolling multi-track stem playback should be reactivated until this is resolved.

---

## 2. User, devices, constraints, and non-negotiable product rules

### User / deployment context

- The user is the sole developer and has limited developer experience.
- Primary deployment machine:
  - Windows PC
  - 16 GB RAM
  - Intel HD Graphics 4600
  - Chrome and Edge
  - Edge reports WebGPU hardware acceleration
- Secondary device:
  - Samsung Galaxy Note 20 Ultra
  - Android 13
  - Chrome/Samsung Internet
  - 6 GB RAM

### Device conclusions from actual tests

- Browser-local HTDemucs 4-stem inference was attempted on the Windows PC and **failed**.
  - WebGPU error:
    ```text
    ERROR_CODE: 9, ERROR_MESSAGE: Could not find an implementation for
    ConstantOfShape(9) node with name '/real_istft/ConstantOfShape'
    ```
  - WASM fallback error:
    ```text
    Can't create a session. ERROR_CODE: 6, ERROR_MESSAGE: std::bad_alloc
    ```
  - Conclusion: High Quality HTDemucs 4-stem local inference is **not viable on this tested Intel HD 4600 PC**.
- Android should be considered a master-track/fallback test device, not a reliable local HTDemucs device.

### Product constraints

1. **Audio remains fully on-device.** No audio upload, cloud separation, or server inference.
2. Open-source models only; quality should be best possible when hardware permits.
3. The user explicitly wants **master analysis and stems used together**, not stems used as an automatic replacement for masters.
4. Lite 2-stem should be developed before High Quality 4-stem playback.
5. Do not claim a feature works unless it was actually user-tested.
6. Do not make the user re-run audio/stem analysis unnecessarily. Prefer persistence hydration, activity backfill, or only the missing analysis layer.
7. Do not reactivate old rolling playback paths; they caused serious playback failures.

---

## 3. Original application foundation

MixMind began as a large browser-local HTML/JavaScript app (roughly 15,000 lines in the original single-file form). It uses:

```text
Web Audio API
AudioBuffer
AudioContext
OfflineAudioContext
Web Workers
IndexedDB
OPFS (Origin Private File System)
File System Access API where available
embedded MP3 encoder
```

Original capabilities include:

- BPM and beat-grid analysis
- downbeat estimation
- musical key estimation
- energy curves
- section detection
- loudness trimming
- master-track vocal density estimates
- song sequencing
- transition suggestions
- preview, full-mix playback, and export

The present served application is:

```text
/home/user/index.html
```

The app is modularized through many externally loaded JavaScript files appended to the HTML. This is practical for iterative repair but produces load-order and integration technical debt.

---

## 4. Product modes and stem-preparation UX

The desired user-facing modes are:

```text
1. Master Only
2. Lite 2-Stem: Vocals + Instrumental
3. High Quality 4-Stem: Vocals + Drums + Bass + Other
```

The selected user experience is project-level preparation:

```text
STEM PREPARATION
  Master Only / Demucs 4-Stem / Lite 2-Stem
  Prepare All Songs
```

### Critical distinction

```text
User selection controls which assets MixMind prepares.
Per-transition planning controls what mode/recipe actually executes.
```

Thus, a `LITE STEMS READY` badge means the assets exist. It does **not** mean a given transition may use Lite stems.

### Confirmed Lite preparation success

Lite 2-stem uses a Spleeter-style FP16 ONNX package:

```text
sherpa-onnx-spleeter-2stems-fp16.tar.bz2
```

The initial Windows archive extraction failed because `tar.exe` could not invoke bzip2. A Python extraction helper was added:

```text
extract_lite2_models.py
```

The user reported actual success:

```text
Lite stems ready
batch preparation is confirmed
```

Lite assets are:

```text
vocals
instrumental / accompaniment
```

The preparation UI reports stages such as:

```text
LITE: Loading Lite model
LITE: Preparing audio
LITE: Loading Lite models
LITE: Separating vocals and instrumental
LITE: Aligning output audio
LITE: Saving Lite stems
LITE STEMS READY
```

---

## 5. High Quality 4-stem architecture and limitation

An HTDemucs 4-stem foundation was implemented with:

- versioned track-audio schema
- four assets: vocals, drums, bass, other
- strict readiness requirements
- OPFS storage and IndexedDB references
- ONNX Runtime manifest and worker lifecycle
- model cache/checksum intent
- resampling browser sample rate ↔ model 44.1 kHz
- HTDemucs adapter/worker

Selected model:

```text
StemSplitio/htdemucs-onnx
Pinned revision: d54ed9eb60e258ea82131c6ee14578628816456a
```

The model download succeeded:

```text
Model size: 301.8 MB
SHA-256: 68d0bf16428ef66e692cdff8a9ccf28f1ef3f69440d57e58605a4cc55fcc5e74
```

However, runtime inference is unsupported on the user’s tested Windows hardware/browser. The app now has friendly failure handling directing the user to master-track transitions:

```text
This device/browser cannot allocate enough memory for high-quality local stems.
MixMind will use smart master-track transitions.
```

**Review requirement:** Do not recommend pretending High Quality mode is usable on this PC. It remains future work for capable hardware.

---

## 6. Important master-track playback and UI repairs already completed

The following repairs are complete and some were user-tested:

### Preview/timing/gain

1. Single-track preview timer was changed to use `AudioContext.currentTime`.
2. Preview gain double-attenuation was fixed:
   ```text
   Old: preview gain 0.7 × master gain 0.7 = 0.49
   New: preview gain 1.0; master volume applied once
   ```
3. Starting a single-track preview stops active full-mix playback.

### Bass Swap silence defect

Old behavior faded outgoing full track in first half and incoming full track only in second half, creating a midpoint silence. New behavior uses a full equal-power overlap plus EQ/HPF bass exchange.

### WSOLA repair

Old code returned plain AudioBuffer-like wrappers and mono-only worker output. It was changed to produce genuine, multi-channel `AudioBuffer` output.

### Player/UI repairs

- Removed duplicate top Mix transport.
- Lower visualizer player is the one active transport, with:
  ```text
  Stop, Play/Pause, time, VU, mute, volume, mix scrubber, tick/ruler
  ```
- Removed Energy Arc at user request.
- Visualizer remeasures when Mix tab opens to fix hidden-tab zero-size initialization.
- Advanced Mix timeline is force-rendered when opening Mix/Advanced to avoid stale duration display.

### Master analysis synchronization

Timeline copies now include:

```text
densityCurve
vocalCurve
textureSummary
vocalRisk
densityRisk
introVocalRisk
outroVocalRisk
```

Standard-worker missing intro/outro texture fields are normalized. A `0:00` section is treated as unknown/low confidence, not proof of a verified section.

### Timing truth UI

The app explains:

```text
Use From / Use Until = source-song time
Mix Position = global mix time
Requested duration
Effective overlap
Global Mix Start
```

---

## 7. HTML and script integrity work

Several parser/runtime defects were fixed:

1. An inline JavaScript comment literally contained `</script>`, prematurely ending a script block and leaking text onto the Home page.
2. Four injected Cloudflare challenge scripts containing `window.__CF$cv$params` were removed.
3. Hot-cue nested quote syntax was repaired with `JSON.stringify(cueId)`.
4. A script syntax audit at the repair point found:
   ```text
   21 script blocks
   0 syntax failures
   ```

### Remaining technical debt: script load order

Some modules initially captured dependencies before later scripts loaded. This caused components such as Safe Window Pair Planner, Lite Gatekeeper, Transition QC, and Canonical Lite Renderer to permanently see undefined/stale dependencies.

Dynamic runtime resolution was added in relevant modules including:

```text
mixmind-canonical-transition.js
mixmind-canonical-lite-renderer.js
mixmind-transition-qc.js
```

The current application still has many external scripts appended late. A future refactor should consolidate modules and formalize dependencies rather than continuing to stack wrappers.

---

## 8. The actual audio-quality problem that triggered the architecture shift

The user heard the following in real Lite experiments:

1. Two vocals overlapping.
2. Outgoing song staying loud too long into the incoming song.
3. Different beats drifting and sounding wrong.
4. Both instrumentals clashing/noisy.
5. Transition points sometimes acceptable but improvable.
6. Strange handoffs.
7. Outgoing song persisting too strongly into the new song.

The project’s conclusion is that a simple stem crossfade cannot solve this. In particular:

```text
Filter sweep cannot fix beat incompatibility.
Stems being ready does not make a transition Lite-eligible.
Percentage BPM difference alone is not a safe-overlap measure.
0:00 is not proof of a real section.
Fallback must be planned before rendering, not generated while audio fails.
```

For BPM drift, the governing calculation is:

```text
drift in beats = |(BPM1 - BPM2) / 60| × overlap seconds
```

Example previously observed:

```text
113 BPM -> 108 BPM
5 BPM difference
0.0833 beats/second
3 seconds = 0.25 beat
6 seconds = 0.50 beat
12 seconds = 1.00 beat
32 seconds = 2.67 beats
```

Therefore long unwarped overlaps must be rejected for such a pair.

---

## 9. Failed or retired playback paths — do not reactivate

The following paths caused user-observed failures and must remain disabled/retired:

```text
Experimental Lite Full-Mix toggle
Old Lite rolling scheduler
Old High rolling scheduler
Unlimited Lite rolling test
mixmind-canonical-lite-rolling.js
mixmind-canonical-lite-rolling-test-ui.js
mixmind-canonical-rolling-renderer.js
mixmind-canonical-rolling-test-ui.js
mixmind-lite2-rolling-mix.js
```

Observed failures included:

```text
tracks truncating at approximately 16 seconds
duplicate playback
seek causing duplicate playback
unresponsive Stop/Pause
outgoing song persisting into next song
clashing/noisy Lite transitions
```

**External reviewer instruction:** Do not recommend “just fix the rolling scheduler” or re-enable these scripts. The next valid path is two-song controlled validation first, then a new rolling architecture later.

---

## 10. Canonical Architecture Specification (authoritative target)

The intended Version 3 pipeline is:

```text
Master Analysis
  -> Safe Window Generator
  -> Collision Risk Engine
  -> Per-Transition Mode Selector
  -> Immutable Canonical Transition Decision Object
  -> Recipe Primitive Builder
  -> Canonical Renderer
  -> Quality Control
  -> Planned Fallback
```

The main technical documents are:

```text
MixMind_Hybrid_Transition_Architecture_Spec.md
MixMind_Hybrid_Transition_Architecture_Spec_v2.md
MixMind_Hybrid_Transition_Architecture_Spec_v3.md
MixMind_Implementation_Status_Report.md
MixMind_Hybrid_Transition_Expert_Review_Prompt.md
```

### Governing master-first rules

```text
Master recordings are the quality foundation.
Stems are selective transition tools, not automatic full replacements.
Master analysis decides where and when.
Stem mode decides what can enter, leave, or be reduced at that point.
```

### Transition-score concept

```text
Transition Score =
  BPM Compatibility
+ Key Compatibility
+ Phrase Alignment
+ Energy Continuity
+ Intro/Outro Suitability
- Vocal Collision Risk
- Low-End Collision Risk
- Harmonic Collision Risk
- Rhythmic Collision Risk
- Spectral Masking Risk
- Arrangement Density Risk
```

### Lite v2 rules

1. Lite is only considered after a hard eligibility gate passes.
2. Outgoing master remains the primary outgoing source.
3. Incoming instrumental begins silent/low and filtered if needed.
4. Incoming vocal is not allowed during the confirmed pre-vocal window.
5. Incoming master must not naively overlap incoming instrumental.
6. Later incoming-master ownership requires a phrase-safe hard swap or a short validated anti-click takeover.
7. A master fallback is prebuilt and selected before rendering.

---

## 11. Lite collision analysis and safe-window foundations

### Implemented modules

```text
mixmind-lite2-collision-analysis.js
mixmind-lite-activity-toolbar.js
mixmind-lite-activity-button-ui.js
mixmind-safe-window-generator.js
mixmind-safe-window-pair-planner.js
mixmind-lite-gatekeeper.js
```

### Lite activity analysis computes

- vocal activity curve
- vocal intervals
- vocal boundary confidence
- instrumental density curve
- low-end curve

The UI includes a permanent top toolbar button:

```text
Analyze Lite Activity
```

There are also per-song controls such as:

```text
Re-Analyze Lite Activity
```

This is intentionally separate from stem preparation. It can backfill the analysis missing from a newly assembled timeline without re-separating audio.

### Safe Window Generator / Pair Planner

Safe windows use:

```text
phrase timing
first beat
Lite vocal activity
Lite instrumental density
low-end energy
track duration
section confidence
```

The pair planner returns data like:

```text
outgoing safe window
incoming safe window
requested duration
effective duration
window-pair score
vocal/density/low-end values
```

### Lite gatekeeper hard checks

`mixmind-lite-gatekeeper.js` evaluates, among other conditions:

- both Lite stems are ready
- Lite collision analysis exists for both tracks
- valid effective duration
- predicted beat drift at or below threshold
- phrase and beat confidence
- valid safe-window pair
- outgoing vocal-safe exit confirmed
- incoming pre-vocal instrumental window confirmed
- low-end risk
- key confidence for longer tonal overlap

The gate returns:

```text
eligible: true/false
reasons: []
warnings: []
timing
safePair
drift
phraseConfidence
beatConfidence
outgoingVocal
incomingVocalSafe
keyConfidence
```

---

## 12. Canonical transition decision, fallback, and QC

### Relevant modules

```text
mixmind-canonical-transition.js
mixmind-master-fallback-selector.js
mixmind-transition-qc.js
mixmind-canonical-decision-ui.js
mixmind-transition-qc-ui.js
mixmind-apply-safe-fallbacks.js
```

### Canonical Decision Object

The canonical decision includes:

- pair identity
- requested, feasible, and effective durations
- global timing
- source offsets
- safe windows
- proposed timing
- BPM/key/energy compatibility
- collision summary
- execution mode and recipe
- source budget
- fallback recipe and reason
- Lite eligibility gate
- validation status/warnings/errors

It is intended to be the immutable source of truth for execution and UI explanation.

### Safe master fallback policy

Implemented fallback selection rules:

```text
low beat/phrase confidence -> Hard Cut, effective 0.2 s
drift > 0.15 beats -> Echo Out, effective 1.5 s
no confirmed safe vocal phrase / unsafe vocal gate -> Echo Out, effective 1.5 s
weak harmonic confidence/risk -> Echo Out, effective 1.5 s
low-end risk -> EQ Swap, maximum 4 s
otherwise -> selected master transition type
```

### Apply Safe Fallbacks repair

A bug initially treated every stored transition as manual, so no automatic transition could be changed. This was repaired:

```text
Only transitions with _manual === true are preserved.
setTransitionType() writes _manual: !guardForced.
```

Applying safe fallbacks changed examples such as:

```text
Long Crossfade -> Echo Out
Filter Sweep -> Echo Out
```

A subsequent defect left a `LITE VOCAL` badge even after a master fallback. The safe-fallback path now writes:

```text
_forceMasterFallback: true
```

The hybrid planner immediately returns MASTER when this lock is present.

### QC screen

The UI displays:

```text
Pre-Render QC
Master: PASS/BLOCKED
Lite: PASS/BLOCKED
Lite drift: N beats
reasons
```

### Important QC consistency fixes confirmed by user screenshots

A sequence of issues was found and fixed:

1. QC could recompute Lite eligibility against a later forced master transition, yielding a false `Lite: PASS` even when the canonical decision used a Lite rejection.
2. Canonical Decision UI and QC could be built from different planner calls during one panel render.
3. `_forceMasterFallback` was not itself treated as a hard Lite block by QC.

The current rule is:

```text
A stored safe Master fallback lock is authoritative.
It must force Lite to BLOCK until a new canonical planning process deliberately replaces it.
```

### Latest user-confirmed results

The user’s screenshots confirmed correct, consistent QC for two master fallback examples:

#### Pair: In My Head -> Lucid Dreams

```text
113 BPM -> 113 BPM
11A -> 11A
high compatibility (shown as 98%)
Master / Echo Out / 1.5 s
Lite: BLOCKED
Reason: no confirmed vocal-safe phrase window
Lite drift: 0.000 beats
```

This is important: matching BPM/key does not override a missing vocal-safe exit.

#### Pair: Lucid Dreams -> Righteous

```text
113 BPM -> 97 BPM
11A -> 8B
compatibility shown as 39%
Master / Echo Out / 1.5 s
Lite: BLOCKED
Lite drift: 0.400 beats
Reasons: predicted BPM drift is too high; incoming pre-vocal instrumental window is not confirmed
```

Screenshots later showed the canonical fallback, explanation, and QC all agreeing.

---

## 13. Newest Lite Vocal-Safe Handoff v2 renderer (implemented but NOT yet audio-tested by user)

A package named:

```text
MixMind_Lite_Vocal_Safe_Handoff_V2_Update.zip
```

was prepared after the decision/QC consistency work.

Relevant files:

```text
mixmind-canonical-lite-renderer.js
mixmind-canonical-lite-test-ui.js
mixmind-source-ledger.js
mixmind-seek-safety.js
```

### Purpose

This replaces the previous generic Canonical Lite two-song test rendering approach. It is deliberately **test-only** and does not alter ordinary multi-track playback.

### Preconditions

It will refuse to start unless:

1. The test timeline has exactly two songs.
2. Both songs have Lite stems ready and hydratable.
3. The canonical decision selects `lite`.
4. The canonical Lite gate is eligible.
5. A valid safe-window pair exists.
6. Lite QC passes.

### Source ownership / intended signal flow

```text
Outgoing master
  -> [approved bounded overlap] + incoming instrumental only
  -> controlled anti-click takeover
  -> incoming master
```

Detailed behavior:

1. Outgoing master plays as the quality foundation.
2. Incoming instrumental begins at zero gain, fades in under the outgoing master, and is high-pass filtered (approximately 180 Hz reducing toward 95 Hz).
3. Incoming vocal is withheld during the gate-confirmed pre-vocal window.
4. At the safe boundary, incoming master begins with a very short anti-click gain ramp.
5. Incoming instrumental fades to zero at the same boundary.
6. No long generic incoming-master + incoming-instrumental overlap is intentionally created.

### Source budget

The renderer uses the source ledger and enforces a maximum of three active sources:

```text
outgoing master
incoming instrumental
incoming master takeover
```

### Static validation performed

Syntax checks and source-level architecture checks passed for:

- strict Lite gate requirement
- outgoing-master ownership
- filtered incoming instrumental
- controlled incoming-master takeover
- max source budget 3
- no rolling scheduler code in this renderer

### Test status

**Not audio-tested on the user’s PC yet.**

It cannot be meaningfully tested until a pair actually reaches `Lite: PASS`. The user’s current tested pairs are correctly blocked, so forcing the renderer would violate the architecture.

---

## 14. Earlier canonical renderer and transport work

### Canonical Master two-song test

A canonical Master renderer/test UI was created. User confirmed:

```text
Canonical Master two-song test: passed
```

### Earlier Canonical Lite two-song test/export

Before the newly rewritten strict Lite Vocal-Safe Handoff v2, user confirmed that a canonical Lite two-song test and canonical Lite WAV export path passed basic testing:

```text
Canonical Lite two-song test: passed
Canonical Lite two-song export: passed
controls/seek tests passed
```

This should **not** be interpreted as proof that the old generic Lite mixing quality was good; prior generic Lite transitions still had listening-quality and scheduler problems. It only indicates limited two-song playback/export mechanics functioned in those test paths.

### Source ledger

`mixmind-source-ledger.js` tracks source registration and cleanup.

Intended budgets:

```text
Canonical Master: max 2 sources
Canonical Lite: max 3 sources (budget 4)
High Quality future path: up to 8 sources
```

Seeking invokes `ledger.stopAll()` and custom source cleanup before resuming with the stable master path.

### Seek safety

The custom canonical/hybrid playback path tears down sources on seek, clears custom mode, and resumes via stable master scheduling. This was added after duplicate playback and unresponsive controls were observed.

### Playback-plan synchronization

`mixmind-playback-plan-sync.js` compares:

```text
AudioEngine.totalDuration
vs
calculateTimelineDuration()
```

If timing differs by more than 0.1 second while playback is active, MixMind stops stale playback and tells the user that the next Play will use the updated timeline. A later user screenshot showed player and timeline both at `10:44`, suggesting this repair worked in that case.

---

## 15. Current real-world candidate problem

### Latest attempted two-song pair

The user created a dedicated two-song timeline:

```text
Blood On My Jeans (SPOTISAVER) -> I Want It (SPOTISAVER)
113 BPM -> 113 BPM
11A -> 11A
Lite stems ready for both
```

Initially QC correctly said Lite collision analysis was unavailable. The user then clicked `Analyze Lite Activity`; no stem re-preparation was needed.

After activity analysis, QC showed:

```text
Master: PASS
Lite: BLOCKED
Reason: No confirmed vocal-safe phrase window exists.
Lite drift: 0.000 beats
Master / Echo Out / 1.5 s
```

This pair is therefore not a valid Lite test candidate under current rules.

### User’s current concern

The user reports they have not found any song pair beyond the already shared examples that reaches `Lite: PASS`.

This is now the central unresolved product/engineering question:

```text
Are the user’s tested vocal-heavy songs genuinely unsuitable for a Lite vocal-safe handoff?
OR
Is Lite activity analysis / safe-window generation / timing mapping too conservative or producing false negatives?
```

The user should not be expected to manually guess songs forever. The next proper feature is a **Lite Candidate Finder + Gate Diagnostics** layer.

---

## 16. Proposed next implementation: Lite Candidate Finder + Gate Diagnostics

This is proposed, **not implemented yet**.

### Objective

Automatically scan all possible directed pairs in the library/timeline and classify them. Do not make users manually construct random two-song timelines to discover whether Lite is possible.

### Desired output per pair

```text
Pair identity
Master recommendation
Lite eligibility: candidate / blocked / needs analysis / insufficient evidence
Outgoing safe exit time and confidence
Incoming safe entry time and confidence
Requested and feasible/effective overlap
Predicted beat drift in beats
Key compatibility and confidence
Vocal collision evidence
Low-end/density evidence
Exact machine-readable rejection reasons
```

### Categories

1. **Lite Test Candidate**
   - all hard Lite gates pass
   - eligible for controlled two-song Lite v2 testing

2. **Master Only**
   - legitimate safety rejection, exact reason shown

3. **Needs Lite Activity Analysis**
   - stems exist but activity data is absent

4. **Insufficient Evidence**
   - analysis confidence too low; not treated as safe

### Critical diagnostic requirement

The finder must distinguish:

```text
“No safe window actually exists”
from
“Safe-window generation could not prove one because input confidence/mapping is wrong.”
```

It should expose raw/derived evidence sufficiently for auditing:

- current selected offset versus candidate offsets
- vocal activity curves/intervals around candidate windows
- mapping from timeline offset to source-track time
- safe-window scoring components
- pair planner candidate list, not only the final winner
- reason and confidence for every rejected candidate window

### Do not do this

Do not simply lower vocal thresholds until a pair passes. That would risk recreating the user’s reported vocal collisions. Calibration should be based on visible evidence and actual listening validation.

---

## 17. Potential architecture concerns for external review

The reviewer should specifically investigate these topics.

### A. Is the safe-window / gate implementation too binary?

The current hard requirements are intentionally conservative. The reviewer should assess whether:

- outgoing vocal safety threshold is realistic for modern vocal-heavy tracks,
- candidate search covers enough exits/phrase boundaries,
- required safe duration is excessive,
- confidence thresholds may create false negatives,
- activity curves are calibrated correctly,
- the app is checking the correct source-track time rather than global mix time.

Any recommendation to relax a threshold must preserve a hard veto for demonstrably overlapping vocals and should be backed by a listening/measurement plan.

### B. Correctness of time-coordinate mapping

The gatekeeper uses functions including:

```text
getTrackMixStart(track)
getEffectiveTransitionTiming(outgoing, transition)
SafeWindowPairPlanner.choose(outgoing, incoming, transition)
```

It derives times such as:

```text
outTime = getTrackMixStart(outgoing) + activeTiming.start
inTime = getTrackMixStart(incoming) + safePair.incoming.start
```

The external reviewer should carefully audit whether these values are consistently **source-song time** and do not accidentally mix global-mix time, track trim time, and timeline offset. A mapping error could make activity checks inspect the wrong portion of a song and explain why nearly every pair is blocked.

### C. Immutable decision semantics

The canonical decision object is intended to be the single source of truth, but it is currently built on demand in UI/rendering code. Recent fixes ensure a single open panel shares one object between Canonical Decision and QC. The reviewer should propose a stronger plan lifecycle:

- plan identity/version/fingerprint,
- invalidation on track analysis, activity, timing, or transition edits,
- persisted decision snapshots where appropriate,
- guarantee that renderer, UI, export, and QC consume the exact same plan.

### D. Forced master fallback semantics

Current behavior intentionally treats `_forceMasterFallback` as a hard Lite block. Review whether and how re-optimization should explicitly clear/recompute that lock; it should never silently become eligible because a different late calculation occurs.

### E. Current normal playback is still legacy master path

Normal multi-track playback does not yet execute the complete canonical decision architecture. Canonical two-song tests exist, but the legacy master playback path remains the normal route. The reviewer should propose a safe migration plan only after two-song Lite v2 is audio-validated.

### F. Renderer behavior / handoff

Review the new Lite v2 model:

```text
outgoing master -> filtered incoming instrumental -> incoming master
```

Consider:

- correct gain curves,
- audible discontinuities at takeover,
- whether the anti-click ramp is enough,
- whether master tempo/beat phase can remain acceptable at the permitted drift,
- robust cancellation/seek/stop semantics,
- gain staging and loudness consistency,
- whether incoming vocal should ever be separately introduced or should remain implicit in incoming-master takeover only.

No recommendation should revert to a generic long crossfade of outgoing master, incoming master, and incoming stems.

### G. Candidate Finder UX

Review how to make diagnostics understandable to a non-developer user without hiding important evidence. The app should say what it knows, what it cannot prove, and what assets/data are missing.

---

## 18. Relevant files and scripts

### Core application

```text
/home/user/index.html
```

### Stem and model modules

```text
mixmind-stem-config.js
mixmind-lite-2stem-foundation.js
mixmind-lite2-config.js
mixmind-lite2-pipeline.js
mixmind-lite2-status-ui.js
mixmind-lite2-transition-preview.js
mixmind-lite2-persistence.js
mixmind-lite2-auto-fallback.js
mixmind-stem-status-summary.js
mixmind-stem-batch-ui.js
mixmind-lite-2stem-adapter.js
mixmind-lite-2stem-worker.js
mixmind-htdemucs-4s-adapter.js
mixmind-stem-separation-worker.js
```

### Decision/collision/QC modules

```text
mixmind-hybrid-transition-planner.js
mixmind-master-fallback-selector.js
mixmind-canonical-transition.js
mixmind-transition-qc.js
mixmind-canonical-decision-ui.js
mixmind-transition-qc-ui.js
mixmind-apply-safe-fallbacks.js
mixmind-lite2-collision-analysis.js
mixmind-lite-gatekeeper.js
mixmind-safe-window-generator.js
mixmind-safe-window-pair-planner.js
mixmind-lite-activity-toolbar.js
mixmind-lite-activity-button-ui.js
```

### Canonical renderer/safety modules

```text
mixmind-canonical-master-renderer.js
mixmind-canonical-master-test-ui.js
mixmind-canonical-lite-renderer.js
mixmind-canonical-lite-test-ui.js
mixmind-canonical-lite-export.js
mixmind-source-ledger.js
mixmind-seek-safety.js
mixmind-playback-plan-sync.js
```

### Windows support scripts

```text
START_MIXMIND_WINDOWS.bat
mixmind_local_server.py
INSTALL_MIXMIND_STEMS_WINDOWS.bat
install_mixmind_stems_windows.ps1
INSTALL_MIXMIND_LITE2_WINDOWS.bat
install_mixmind_lite2_windows.ps1
extract_lite2_models.py
apply_wasm_compatibility_fix.ps1
APPLY_WASM_COMPATIBILITY_FIX.bat
```

---

## 19. Current state: completed, validated, unvalidated, and blocked

### Completed and/or user-confirmed

- Master player/preview/timing/UI repairs described above.
- HTML/script integrity repairs.
- Master-analysis timeline data synchronization.
- Lite model installation/preparation and batch preparation.
- User-confirmed Lite stems ready.
- High Quality HTDemucs installer/model download (but not usable for local inference on tested PC).
- Lite collision analysis foundation and manual/top-toolbar trigger.
- Safe-window generator/pair-planner foundation.
- Canonical transition decision foundation.
- Master fallback selector and Apply Safe Fallbacks UI.
- Decision/fallback/QC explanation UI.
- Decision/QC forced-master consistency confirmed by screenshots.
- Canonical Master two-song test passed.
- Earlier Canonical Lite two-song basic test passed.
- Earlier canonical Lite WAV export passed.
- Source-ledger/seek safety tests reported passed.
- Player/timeline timing synchronization appeared fixed in user screenshots.

### Implemented but not yet user audio-tested

- Strict **Lite Vocal-Safe Handoff v2** two-song test renderer.
- It is intentionally untestable until an actual Lite-eligible pair exists.

### Correctly blocked / unsupported

- Browser-local High Quality HTDemucs on Intel HD 4600.
- Generic/rolling Lite and High playback paths.
- Lite test execution for all currently shared song pairs.

### Not yet implemented

- Lite Candidate Finder + Gate Diagnostics.
- A data-backed calibration workflow for activity thresholds.
- Full integration of canonical decision/renderer into normal multi-track playback.
- Safe reconstruction of rolling playback using a new deck-state architecture after two-song validation.
- Canonical High Quality 4-stem renderer for capable hardware.
- Export parity for final canonical renderers.
- Comprehensive module/dependency refactor.

---

## 20. Recommended next-order plan

1. **Build Lite Candidate Finder + Gate Diagnostics.**
   - Scan all pairs and expose actual rejection evidence.
2. **Audit time-coordinate mapping and safe-window candidate coverage.**
   - Establish whether the absence of Lite candidates is real or a false-negative defect.
3. **Use a proven Lite candidate for a two-song Lite Vocal-Safe Handoff v2 listening test.**
   - Test normal start, stop, pause, seek, transition, and full completion.
   - Test only controlled two-song playback first.
4. **Tune only evidence-supported thresholds/logic.**
   - Never relax vocal collision gates merely to make a demo pass.
5. **Add deterministic render/export parity for validated Lite v2.**
6. **Only after all of the above, design a new rolling multi-track architecture.**
   - Do not revive retired rolling modules.
7. **Develop High Quality 4-stem renderer only on hardware able to run HTDemucs.**

---

## 21. Prompt to give an external AI reviewer

Copy the text below together with this report:

```text
You are reviewing MixMind, a browser-only, on-device AI DJ-mixing application.
Please perform a deep technical, product, DSP, Web Audio, and systems-architecture review of the attached report.

Do not give generic advice. Treat these rules as mandatory:
- Master recordings are the quality foundation.
- Stems are selective collision-control tools, not an automatic full replacement.
- Prepared stems do not imply Lite eligibility.
- Do not recommend generic long stem/master crossfades.
- Do not recommend re-enabling the failed rolling schedulers.
- Audio must remain entirely on-device.
- High Quality HTDemucs is not viable on the tested Intel HD 4600 PC.
- Any recommended Lite eligibility relaxation must preserve vocal-collision safety and include a validation method.
- Do not claim untested playback works.

Analyze in depth:
1. Whether the safe-window/gate logic is likely too strict or may have a time-coordinate/mapping defect.
2. The correct design for a candidate finder and diagnostics interface.
3. The immutable canonical decision lifecycle and invalidation strategy.
4. The safety and likely audio behavior of the Lite Vocal-Safe Handoff v2 renderer.
5. How to test and calibrate gate thresholds without reintroducing vocal/instrumental clashes.
6. A safe path from two-song canonical tests to normal multi-track playback.
7. Exact prioritized implementation recommendations, including data structures, algorithms, invariants, failure handling, and test cases.

Call out contradictions, hidden risks, missing metrics, and any places where the report’s design may be wrong. Clearly separate must-fix issues from optional improvements.
```

---

## 22. Bottom line

MixMind has made real progress from unsafe generic stem blending toward a explainable and conservative transition-planning system. The immediate challenge is not “make Lite run more often.” It is:

```text
Prove whether the system is correctly finding no safe Lite windows,
or diagnose why it is failing to discover real safe windows.
```

The next step is therefore transparent candidate discovery and evidence-level gate diagnostics, followed by a real two-song Lite v2 listening test only when the system can justify that a pair is safe.
