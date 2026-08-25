# MixMind — Deep Review of All External Responses, Code Evidence, and Revised Plan

**Prepared:** 11 August 2026  
**Purpose:** This document reviews every substantive recommendation contained in the four supplied external materials, checks them against MixMind’s known state and current source code where possible, separates sound advice from speculation or error, and produces a corrected plan suitable for another deep external assessment.

## Materials reviewed

1. **`chat-Creative Excellence in Action.txt`** — long high-level strategic/engineering review.
2. **`MixMind_External_Review_Response.md`** — focused external technical review.
3. **`Audio Transition Architecture Deep Dive.pdf`** — three-page Gemini-style review.
4. **`High-Level Creative Detail.pdf`** — twenty-page Kimi-style review.
5. **Current MixMind implementation and prior status report** — used as the factual baseline, including current source for the gatekeeper, safe-window planner/generator, activity analysis, canonical decision, Lite renderer, source ledger, and seek safety.

This is not a vote-counting exercise. Where multiple reviews repeat a claim, it remains a hypothesis until code evidence or a controlled test supports it.

---

# 1. Bottom-line conclusion

All four reviews agree on the main strategic direction, and that agreement is substantially correct:

```text
Do not force Lite.
Do not relax the gate merely to obtain a green result.
Do not revive failed rolling playback.
Audit timing, expose evidence, find candidates systematically, then test a two-song Lite handoff.
```

However, the new code audit identifies a more precise and important result than the reviews alone:

> MixMind does contain a real time-domain ambiguity/bug risk, but it is not yet proven to explain every rejection. In the current code, safe-window candidates are generated in source-track time and are later added to `getTrackMixStart()`, which is itself a source-track offset. If `mixStart` is non-zero, this double-adds the offset and queries the wrong point of the activity curve.

There are also two additional present-state issues that the external reviews did not fully identify:

1. **Safe-window scoring samples only the start of each phrase window, not the entire candidate interval.** A window can receive a good score even if vocals appear shortly afterward; conversely, the later gate can reject it without explaining the full interval evidence.
2. **The existing `_forceMasterFallback` execution lock must be separated from intrinsic Lite eligibility in future diagnostics.** The lock correctly prevents normal Lite execution, but a candidate finder that uses the exact current execution gate would report all locked transitions as blocked even if fresh analysis has improved. Diagnostics need to show both facts separately:
   - “Would this pair be intrinsically Lite-eligible under current evidence?”
   - “Is execution currently locked to Master fallback?”

Therefore the revised first milestone is not simply “build a large candidate finder.” It is:

```text
1. Establish explicit time domains and audit current mappings.
2. Produce a deterministic, verbose gate trace for a single pair.
3. Separate intrinsic eligibility from execution locks.
4. Build candidate scanning on top of those reliable primitives.
```

The project is not at the point where it should test the new Lite renderer on user music. It is at the point where it should verify whether the decision inputs actually refer to the intended audio intervals.

---

# 2. Ground truth used for this review

## 2.1 What has actually been demonstrated by the user

The following are real user-observed or user-confirmed facts:

- Lite 2-stem preparation works for tested songs.
- Batch preparation works.
- High Quality browser HTDemucs does not run on the tested Intel HD 4600 PC.
- Earlier generic/rolling Lite playback produced bad musical results and transport failures: vocal clashes, instrumental clutter, duplicated playback, seek failures, truncated tracks, and persistent outgoing audio.
- Master fallback decisions now display consistently for tested examples.
- The latest screens show `Lite: BLOCKED`, not a misleading `Lite: PASS`, when a safe Master fallback is active.
- The user has not found a real pair that currently reaches `Lite: PASS`.
- The newest Lite Vocal-Safe Handoff v2 renderer has **not** been audio-tested by the user because no genuine candidate exists.

## 2.2 What is implemented but not proven by listening

- Safe-window generation and pair selection.
- Lite activity/vocal-density analysis.
- Lite gatekeeper eligibility logic.
- Strict test-only Lite Vocal-Safe Handoff v2 renderer.
- Canonical decision/QC plumbing.

These must not be described as musically validated merely because JavaScript syntax checks passed.

## 2.3 Current source-code facts discovered in this review

### `getTrackMixStart(track)` is not global mix time

The name is potentially misleading. Current implementation returns `track.mixStart`, bounded by the original track’s audio duration:

```js
function getTrackMixStart(track) {
  const rawStart = getNonNegativeNumber(track?.mixStart, 0);
  const audioDuration = getTrackAudioDuration(track);
  ...
  return Math.min(rawStart, Math.max(0, audioDuration - minPlayableTail));
}
```

In the present code it is effectively a **source-buffer start offset / local clip offset**, not the global start location of this song in the overall mix.

### `getEffectiveTransitionTiming()` produces local playable-track time

```js
function getEffectiveTransitionTiming(track, transition) {
  const requested = ...;
  const duration = getTrackMixDuration(track);
  const start = snapOverlapStartToBar(track, duration, requested);
  return { start, requested, effective: ... };
}
```

Because `getTrackMixDuration()` subtracts `getTrackMixStart()`, this `start` is local to the playable portion of the source buffer.

For the fallback timing path, this is coherent:

```text
source time = source offset + local transition start
```

### Safe-window generator produces source-track times

`mixmind-safe-window-generator.js` uses:

```js
const dur = getTrackAudioDuration(track);
for (let t = Math.max(first, 0); t < dur; t += phraseInterval) { ... }
```

It reads activity curves at `t`, and activity curves were calculated as:

```js
start: sampleIndex / sampleRate
end: sampleIndex / sampleRate
```

Therefore safe-window candidate `.start` and `.end` are in **source-buffer time**, not local playable-track time and not global mix time.

### Current gatekeeper mapping is inconsistent when `mixStart != 0`

The gatekeeper currently does:

```js
activeTiming = pair && pair.valid
  ? { start: pair.outgoing.start, effective: pair.effectiveDuration }
  : timing;

outTime = getTrackMixStart(outgoing) + activeTiming.start;
inTime = pair && pair.valid
  ? getTrackMixStart(incoming) + pair.incoming.start
  : getTrackMixStart(incoming);
```

When the safe-pair branch is taken, both `pair.outgoing.start` and `pair.incoming.start` are already source-buffer times. Adding `getTrackMixStart()` again is a **double offset** for any track with a non-zero `mixStart`.

This is a real defect/risk. It must be fixed or explicitly normalized before any threshold calibration.

Important qualification: if all currently tested tracks have `mixStart === 0`, this defect does not alone explain their present rejections. The audit must log actual values for a real pair before assigning causation.

### Current safe-window score is not an interval safety proof

The generator obtains values using `energyAt(curve, t)`: it samples at the beginning of a phrase window. It then scores that window:

```js
score = (1 - vocal) * ... + (1 - density) * ... + (1 - low) * ...
```

This does **not** demonstrate that the whole `start..end` interval remains vocal-safe. The later gate checks outgoing safety only at a single `outTime`, while incoming safety checks an interval. This asymmetry is a serious diagnostic and quality limitation.

### Current activity logic does not require absolute zero energy

Some external reviews assume the system blocks any non-zero vocal energy. That is not what the current code does.

- Vocal curves are normalized using the 20th and 90th percentiles of the separated vocal RMS.
- Hysteresis thresholds define vocal intervals.
- `outgoingSafe()` considers a point safe when normalized activity is `< 0.15`.

Therefore, “the system requires absolute zero” is not established. It may still be too strict, but the actual threshold and normalization behavior must be measured from a trace rather than assumed.

---

# 3. Cross-document review method

The request asks for a line-by-line/deep review. The supplied documents are thousands of lines and repeat many arguments. To avoid losing meaning while avoiding a misleading literal paraphrase of every sentence, this report reviews **every substantive claim family in source order**:

- **Accepted** = technically sound and aligned with current product constraints.
- **Accepted with qualification** = correct direction but needs narrower wording, evidence, or a different priority.
- **Not supported / incorrect** = not established by code or technically misleading.
- **Missing consequence** = important implementation impact omitted by the external response.

Repeated statements with the same meaning are grouped but not ignored.

---

# 4. Review of `chat-Creative Excellence in Action.txt`

This is the most comprehensive external response. Its central architecture is excellent, but it sometimes treats proposed design as current implementation and occasionally over-specifies systems before basic measurement exists.

## 4.1 “MixMind is a local evidence-driven transition compiler”

**Verdict: Accepted as a product direction.**

This phrase accurately captures the target system better than “automatic DJ mixer.” It emphasizes that MixMind should compile evidence into a bounded execution plan rather than improvising sources at render time.

**Necessary qualification:** Current normal multi-track playback is not yet such a compiler/executor. It is still mostly legacy master playback. This language must be presented as the **target architecture**, not as a claim that the current live player fully operates that way.

## 4.2 “Zero Lite candidates is a visibility failure”

**Verdict: Accepted with qualification.**

The system lacks sufficient evidence visibility. It currently shows a short reason, but not the evaluated intervals, numeric activity, candidate list, or confidence.

**Correction:** It is also potentially an algorithmic failure, not only a visibility failure. The discovered double-offset risk and point-versus-window scoring defect are concrete correctness concerns. Diagnostics are necessary both for explainability and for repairing possible logic defects.

## 4.3 Possibilities A–E: unsuitable music, narrow search, excessive confidence, coordinate defect, miscalibrated activity

**Verdict: Accepted.**

This is a good hypothesis set. The right priority is:

1. coordinate/domain correctness;
2. raw activity sanity;
3. candidate-search coverage;
4. duration/threshold calibration;
5. acceptance that some tracks are genuinely Master-only.

**Missing consequence:** The execution lock adds a sixth system-level explanation: after `Apply Safe Fallbacks`, `_forceMasterFallback` can correctly block Lite execution even when a fresh intrinsic analysis might be different. A future finder must not conflate this policy lock with musical unsuitability.

## 4.4 Four-state gate: PASS / FAIL / WARN / INSUFFICIENT_EVIDENCE

**Verdict: Accepted.**

This is much better than a boolean `eligible` plus prose reasons.

**Correction:** The response calls this “three-state” in one heading but lists four states. The implementation should use a five-part final classification at the pair level:

```text
LITE_CANDIDATE
MASTER_ONLY_HARD_BLOCK
NEEDS_ANALYSIS
INSUFFICIENT_EVIDENCE
EXECUTION_LOCKED_TO_MASTER
```

Individual checks can have `PASS`, `FAIL`, `WARN`, `MISSING`, and `INVALID_DOMAIN`.

## 4.5 Candidate window generation from multiple musical sources

**Verdict: Accepted with a technical correction.**

Candidate generation should use phrase endings, section endings, vocal gaps, intros, breakdowns, beat-grid positions, and energy changes. Keeping top K candidates with reasons is essential.

**Critical correction:** A candidate must be evaluated over its **entire source interval plus margins**, not only at its start. Current code samples vocal activity at `t` while building the candidate. The future candidate object needs interval aggregates:

```text
max vocal activity
mean vocal activity
vocal-active proportion
nearest vocal onset/offset distance
confidence
```

The candidate finder must not merely expose the existing single-point scoring as though it proves the full window is safe.

## 4.6 Explicit time domain model and typed time values

**Verdict: Strongly accepted.**

This is the highest-value recommendation across all submissions.

The recommendation’s source/local/global distinction is exactly the right direction, but implementation should avoid a costly TypeScript rewrite as a prerequisite. In current JavaScript, use small immutable tagged objects and centralized conversion helpers:

```js
{ value: 132.50, domain: 'source', trackId: '...' }
```

Core rule:

```text
Activity curves are queried only in source-buffer time.
Safe windows are stored in source-buffer time.
Renderer offsets are converted explicitly.
UI can display global time but may not send it to activity queries.
```

## 4.7 PlanEnvelope, fingerprints, freezing, and invalidation

**Verdict: Accepted with staged-scope qualification.**

A fingerprinted sealed decision is the correct long-term answer to the QC/UI mismatch class.

**Correct implementation concept:**

```text
current inputs -> deterministic fingerprint -> cache lookup -> sealed plan
```

All UI/QC/renderer/export consumers should receive the same plan by `planId`.

**Do not overbuild immediately:** Full persisted PlanEnvelope histories, signatures, and comprehensive state machines should follow the coordinate audit and gate traces. The minimal must-have now is:

1. one `getOrBuildPlan()` route;
2. one fingerprint function;
3. deep-frozen plan values;
4. stale-plan refusal in renderer/test UI;
5. explicit lock provenance.

**Critical correction to the response:** A forced-master lock cannot simply “default to true” on any hash change. That would convert every ordinary analysis/timeline change into a permanent Master-only result. The safe behavior is:

```text
Old plan becomes stale.
Renderer refuses stale plan.
A new plan is computed.
Until the new plan exists, normal playback uses safe master behavior.
The new plan independently decides whether Lite is eligible.
```

## 4.8 Renderer signal-flow analysis

**Verdict: Mostly accepted.**

The desired ownership model is correct:

```text
outgoing master -> filtered incoming instrumental underlay -> incoming master
```

The reviews correctly emphasize:

- incoming instrumental must be subordinate;
- no naïve full-master overlap;
- incoming vocal must not enter while outgoing vocal risk remains;
- source ownership must be bounded;
- seek must abort custom Lite state and return to stable master playback.

**Important actual-code finding:** The current Lite v2 renderer fades the outgoing master across the full handoff interval using a cosine curve. It does not leave it at full gain until the takeover. At takeover, it is already near zero. The external concern that the outgoing master might still be full at incoming-master start is a valid code-review check in general, but it is not an accurate description of the current v2 gain schedule.

**Required future improvement:** The plan must explicitly say whether incoming-master takeover occurs:

```text
A. before the first incoming vocal onset; or
B. at/after incoming vocal onset only after outgoing vocal is absent with tail margin.
```

The present gate only confirms an incoming pre-vocal window through the overlap; it does not expose this takeover classification clearly.

## 4.9 Incoming-instrumental gain, HPF, and density-aware mixing

**Verdict: Accepted with DSP corrections.**

Good recommendations:

- do not run incoming instrumental at full level;
- make gain target dependent on density/low-end/loudness evidence;
- use a gentle high-pass filter;
- do not claim HPF repairs beat or key incompatibility.

**Corrections:**

- There is no universally correct “logarithmic fade.” Equal-power/cosine or carefully shaped curves are reasonable; choice must be listening-tested.
- “Phase cancellation in the midrange” is overstated for two unrelated commercial tracks. The ordinary risks are spectral masking, beat/transient interference, and audible filter coloration—not deterministic cancellation.
- Do not change HPF cutoff or Q based only on generic advice. Measure low-end content, keep Q modest, and use a fixed safe starting primitive before adding adaptive complexity.

## 4.10 Calibration dataset, fixtures, policy versioning, and metrics

**Verdict: Strongly accepted.**

The reviews correctly reject blind threshold relaxation. Useful elements are:

- saved local diagnostic traces;
- user listening labels;
- threshold-change log;
- policy version in every plan/trace;
- offline deterministic testing after plan correctness;
- metrics for loudness jump, source count, and boundary artifact.

**Key correction: synthetic positive controls must not depend on Spleeter successfully separating a synthetic mixture.**

A generated drums-plus-“vocal” test can be useful for transport/renderer behavior, but it is not a reliable end-to-end positive control for a Spleeter stem model. For deterministic gate validation, create fixtures with known direct assets and precomputed activity curves:

```text
fixture A source buffer + known vocal curve + known safe outro
fixture B source buffer + known vocal curve + known intro
```

Then test the planner/gate directly. Stem-separation quality should be tested separately using licensed/reference audio.

## 4.11 Multi-track migration and two-deck state machine

**Verdict: Accepted as future architecture, not immediate work.**

The staged sequence is sound:

```text
two-song master baseline
-> candidate diagnostics
-> one real Lite v2 two-song test
-> three-song canonical test harness
-> opt-in canonical normal playback
-> eventual default
```

The state-machine/deck language is useful later, but must not become an excuse to build rolling playback now. The immediate work ends before this stage.

## 4.12 Hidden risks listed in the long review

| External risk | Review verdict | Correct action |
|---|---|---|
| residual vocals in Lite instrumental | Valid | measure residual risk; keep underlay quiet; do not assume “instrumental” is pure |
| outgoing reverb/vocal tails | Valid | add tail margin / interval energy decay evidence |
| drift threshold too permissive | Valid | evaluate drift over actual effective handoff interval |
| loudness jump | Valid | use existing trim/loudness data first; add boundary loudness metrics before a full LUFS project |
| seek race | Valid | add a generation/token guard before broader playback integration |
| memory pressure during all-pair scan | Valid | cache/stream profiles; avoid decoding full stems for scanning |
| model residual/noise floor | Valid hypothesis | expose curve distribution/noise floor; do not blindly subtract floor until validated |

---

# 5. Review of `MixMind_External_Review_Response.md`

This review is concise and technically disciplined. It offers the best immediate falsification experiment, but its statistical confidence about a mapping bug is too high given the small number of tested pairs.

## 5.1 “Mapping defect is higher probability”

**Verdict: Accepted as a priority hypothesis, not a conclusion.**

The reasoning is strong because multiple time domains exist and the gate has an actual double-offset risk. The review correctly says it is cheap to falsify.

**Necessary correction:** Two or three similarly blocked pairs are not enough evidence to conclude that modern music “almost always” contains usable windows or that the same failure reason proves a systemic defect. The user’s songs are vocal-heavy, and the system’s fallback locks can also homogenize what appears in UI. Treat mapping as first test, not proven root cause.

## 5.2 Concrete falsification test: dump activity curve and compare with manual listening

**Verdict: Strongly accepted, with an operational refinement.**

This is the best next measurement.

The debug export should include, for one selected track:

```text
track id / source duration / mixStart
activity window duration
vocal curve arrays or downsampled values
computed noise floor, peak, on/off thresholds
vocal intervals
all candidate source intervals
all actual activity-query source intervals
corresponding local and global display times
```

The user should be able to click `Preview candidate source window`, not manually calculate timestamps.

**Important distinction:** Manual listening is useful ground truth, but should not be the only evidence. A brief vocal ad-lib, reverb tail, or stem residual can be subtle. The diagnosis should show waveform/curve and permit short audition.

## 5.3 Candidate finder: separate detection diagnostics from pair diagnostics

**Verdict: Strongly accepted.**

This is an improvement over a pair-only matrix. Per-track “does the activity curve look sane?” diagnostics are a prerequisite for trusting pair decisions.

A good design is:

```text
Track Evidence Inspector
  - source waveform/time axis
  - vocal activity curve
  - vocal intervals
  - instrumental density / low-end curves
  - selected query marker
  - preview window

Pair Diagnostic Scanner
  - uses those exact profiles
  - evaluates all candidate combinations
  - exposes thresholds and reasons
```

## 5.4 Candidate record must contain numeric evidence

**Verdict: Accepted.**

`activity 0.34 vs threshold 0.15 at source 187.2s` is auditable; “vocal risk high” is not.

Add interval values, not just point values.

## 5.5 Fingerprint instead of dirty flags

**Verdict: Accepted.**

Content fingerprints reduce missed invalidation sites. Include:

```text
track IDs
source/trimming offsets
analysis/activity versions or hashes
transition settings
fallback lock state and provenance
policy version
renderer version when renderer-specific
```

**Qualification:** Hashing entire raw curve data repeatedly may be expensive. Use incrementing analysis/activity version IDs plus relevant settings for the first implementation; later use content hashes if persistence/audit requires them.

## 5.6 Renderer notes: anti-click ramp, outgoing matching fade, drift, seek

**Verdict: Accepted with detail corrections.**

- Use smooth gain automation at the boundary. Correct.
- Check both source ownership and gain automation. Correct.
- Bound drift in actual overlap. Correct.
- Test seek during handoff. Correct.

**Correction:** A “sample-level waveform discontinuity” test is valuable for clicks but should not become the sole quality criterion. Normal musical edits may change waveform phase at a boundary while remaining subjectively acceptable if gain ramps are used. Measure both discontinuity proxy and listen.

## 5.7 Three-song test then opt-in canonical playback

**Verdict: Accepted as later roadmap.**

No action until a single real Lite pair passes evidence and listening validation.

---

# 6. Review of `Audio Transition Architecture Deep Dive.pdf`

This short review agrees with the main plan but contains several recommendations that need explicit correction before implementation.

## 6.1 “100% Lite rejection points directly to coordinate defect”

**Verdict: Not supported as stated.**

A high rejection rate is an alarm, not direct proof. It could result from:

- genuine vocal-dense arrangements;
- limited pair sample size;
- forced Master locks;
- missing/weak activity analysis;
- narrow candidate coverage;
- mapping defect;
- threshold/calibration issues.

The code audit makes mapping a real risk, but causality must be measured.

## 6.2 “Use noise-floor threshold, not absolute zero”

**Verdict: Accepted in principle; inaccurate diagnosis of current code.**

The current code already uses normalized RMS with percentile-derived on/off thresholds and a `< 0.15` normalized outgoing activity test. It does not demand literal zero sample energy.

Nevertheless, the reviewer’s core point is valid: current normalization/noise-floor assumptions require inspection. A future trace must show:

```text
raw vocal RMS
floor (20th percentile)
peak (90th percentile)
normalized curve
on/off thresholds
safe threshold
```

Only then can the team say whether residual bleed causes false blocks.

## 6.3 Headless candidate scan before UI

**Verdict: Accepted.**

Build a deterministic data-producing core first, then UI. The app is browser-local, so “headless” can mean a pure module/test harness that operates on stored profiles rather than a Node-only script. Do not introduce a separate Node analysis runtime that diverges from browser code.

## 6.4 Overlaid synchronized diagnostic curves

**Verdict: Accepted with domain labeling requirement.**

The display should not ambiguously put two songs onto one time axis without labels. Show two aligned local/source axes with an explicit transition-relative overlay, and display conversions. Outgoing at source `2:24` and incoming at source `0:16` are not the same absolute time.

## 6.5 `Object.freeze()` / hash / forced fallback default on edit

**Verdict: Partly accepted.**

Deep-freeze and fingerprint are useful. “Instantly trash plan and default `_forceMasterFallback` to true” is too blunt, as discussed above. Use stale-plan blocking plus a safe master execution fallback until re-planned.

## 6.6 “Snap takeover to zero crossing immediately preceding detected downbeat”

**Verdict: Technically inappropriate as a required rule.**

This should **not** be adopted literally.

Reasons:

- A zero crossing is waveform/channel-specific and may not align across stereo material.
- Moving a musical boundary backward to the preceding zero crossing can be negligible in samples, but implementing it across independently decoded sources is not a substitute for gain ramps.
- Downbeat/phrase alignment is a musical scheduling concern; anti-click safety is a gain-envelope concern.
- The correct first implementation is a scheduled musical boundary plus short smooth equal-power/cosine gain automation. Zero-crossing refinement can be an optional offline-render experiment later, not a hard runtime dependency.

## 6.7 “Phase cancellation during HPF underlay” and “logarithmic fade”

**Verdict: Overstated / not prescriptive enough to implement.**

Different unrelated songs can mask one another and create perceptual clutter, but deterministic phase cancellation is not the primary threat. HPF can introduce phase coloration, but the actionable concerns are gain staging, density, low-end energy, and beat/transient conflict.

Do not blindly choose logarithmic curves. Test equal-power/cosine and a modest underlay gain target first.

## 6.8 “Shadow Mode: developer-only bypass to force blocked render”

**Verdict: Unsafe as written; replace with controlled offline experiment.**

The proposal correctly seeks calibration evidence. But a user-facing or normal live override would repeat the project’s history of unsafe paths.

Approved replacement:

```text
Developer diagnostic experiment only
- never changes canonical execution plan
- never enters normal playback
- requires explicit acknowledgement
- renders offline or isolated two-song preview
- records which exact gate was hypothetically relaxed
- retains Master fallback as default
```

This should happen only after coordinate correctness and candidate traces exist. It must not become a button that lets a non-developer bypass a vocal-collision veto casually.

## 6.9 Priority list

**Verdict: Mostly accepted after reordering.**

Correct order:

```text
P0-A: Time/domain audit and trace for one pair
P0-B: Separate intrinsic eligibility from execution lock
P0-C: Track evidence inspector and candidate/gate trace core
P1: Candidate scanner and UI
P1: Minimal fingerprinted plan cache
P2: deterministic planner fixtures and optional offline diagnostic experiments
P3: renderer listening test after genuine candidate
P4: multi-track migration
```

---

# 7. Review of `High-Level Creative Detail.pdf`

This review has strong product framing and several useful engineering proposals. It also overstates some claims and proposes a few mechanisms that should be deferred or revised.

## 7.1 Product framing: “client-side audio intelligence operating system”

**Verdict: Inspirational but should not guide implementation scope.**

The framing recognizes the difficulty of local browser audio. It is useful for a product narrative, but engineering should keep the immediate target narrow: an auditable two-song transition planner and safe handoff, not a general operating system.

## 7.2 “Zero candidates likely mapping/calibration defect”

**Verdict: Priority hypothesis only.**

Same qualification as above. The review correctly lists mapping, threshold, search boundary, and genuine absence. It should not assign a statistical probability without a larger diverse sample or a positive control.

## 7.3 Coordinate Registry module

**Verdict: Strongly accepted.**

The suggested domains are useful:

```text
SOURCE
TRIM/LOCAL
MIX/GLOBAL
BEAT
PHRASE
```

Practical refinement:

- `BEAT` and `PHRASE` are not independent linear time domains; they are annotations/references that resolve to source time through a beat/phrase map.
- Avoid loose strings scattered everywhere. Use constructors/helpers and assertions.

## 7.4 Graded vocal-risk model and recipe compensation

**Verdict: Partially accepted; defer recipe compensation.**

The current boolean gate needs richer evidence and perhaps graded classification. That is correct.

However, allowing “elevated” vocal risk simply because the renderer can lower instrumental gain or use HPF is dangerous. Filtering an incoming instrumental does not remove the outgoing vocal, and residual vocals can still collide.

Safe policy for this phase:

```text
Hard vocal overlap / uncertain outgoing vocal boundary -> Master only.
Low but nonzero evidence near a short controlled handoff -> diagnostic near-miss,
not automatic Lite eligibility.
```

Only after controlled listening tests demonstrate a safe recipe should a graded band become executable policy.

## 7.5 Transition matrix / diagnostic panel / all candidates

**Verdict: Strongly accepted.**

This is the correct core UX. Add two important labels not fully emphasized in the review:

```text
Intrinsic Lite eligibility: candidate / hard blocked / insufficient evidence
Current execution: Master locked / Master planned / Lite plan sealed
```

This prevents the user from confusing a stored safe fallback with an analysis conclusion about the music.

## 7.6 “Force Test Render at Relaxed Threshold”

**Verdict: Reject for user-facing live product; accept only as internal offline experiment later.**

Same reason as the Shadow Mode assessment.

## 7.7 Decision cache / fingerprint lifecycle

**Verdict: Accepted.**

The explicit invalidation list is useful. The plan cache must include a time-coordinate policy version and the forced-fallback lock provenance.

## 7.8 Renderer recommendations

### Loudness normalization via integrated LUFS to -14 LUFS

**Verdict: Good long-term concern; not immediate must-fix.**

MixMind already has loudness trim/gain. Before creating a full integrated-LUFS implementation, inspect whether current trims provide consistent handoff levels and add a boundary loudness-delta metric. Browser LUFS measurement needs K-weighting, gating, and a defined integration period; it is not a trivial “OfflineAudioContext can measure it” task.

### “Cosine ramp exactly one beat period, clamped to 15–40 ms”

**Verdict: Internally inconsistent.**

At 113 BPM, a beat is around 531 ms; clamping it to 25 ms means the result is not rhythmically informed. Use a fixed short validated boundary ramp (initially 15–30 ms) and test it. Musical timing should choose the takeover point; anti-click automation should be short enough to be inaudible.

### Instrumental fade-out begins one beat before takeover

**Verdict: Not ready to adopt.**

That could be artistically useful but risks removing the underlay too early and makes the precise handoff more complex. First validate a simple bounded overlap with one controlled endpoint. Add musical shaping only after positive test cases.

### HPF 12 dB/octave statement

**Verdict: Reasonable starting suggestion, but Web Audio `BiquadFilterNode` slope is implementation-defined through filter type and does not expose every desired filter design.**

Use gentle Q and verify by ear/spectrum; do not treat 12 dB/octave as a guaranteed property without inspecting browser behavior.

## 7.9 Seek generation counter

**Verdict: Accepted.**

This is a good addition before any broader canonical playback work. It addresses rapid seek races not necessarily covered by current cleanup.

## 7.10 Noise-floor postprocessing / expander gate

**Verdict: Plausible, but must not be installed before evidence.**

Subtracting a vocal-stem noise floor can hide real quiet vocals and produce false passes. First expose the curve and compare it with known audible sections. If a consistent residual floor is demonstrated, introduce a versioned, reversible calibration step with fixtures.

## 7.11 Synthetic test pair

**Verdict: Accepted with the fixture correction already stated.**

Use direct controlled profiles for gate tests. A synthetic audible pair can separately test renderer/transport, but should not be expected to validate stem separation.

## 7.12 Deck-state architecture and preloading next stems

**Verdict: Future-only.**

Two bounded decks are much safer than the retired rolling scheduler. But no preloading or multi-track scheduling should be implemented until the evidence/gate and a real Lite two-song render are validated.

---

# 8. Consensus map: what all reviews agree on, and the corrected interpretation

| Topic | Consensus | Correct final position |
|---|---|---|
| Master-first architecture | Strong agreement | Keep it. This is non-negotiable. |
| Do not force Lite merely because stems exist | Strong agreement | Keep as hard product rule. |
| Do not revive rolling paths | Strong agreement | Keep old modules disabled. |
| Coordinate audit | Strong agreement | Highest immediate engineering task. Actual double-offset risk exists. |
| Candidate finder | Strong agreement | Build after audit primitives; it must show all evaluated intervals and raw metrics. |
| More than boolean gate | Strong agreement | Add gate trace, explicit evidence status, and execution-lock distinction. |
| Plan fingerprint/cache | Strong agreement | Build minimal version before normal canonical playback; do not over-engineer persistence first. |
| Synthetic positive control | Broad agreement | Use deterministic planner fixtures, not Spleeter-dependent synthetic separation. |
| Threshold relaxation | Reviews say do not blindly relax | Correct. No relaxation before source-time trace and ground truth. |
| Shadow/force test mode | Two reviews propose it | Reject as normal/user-facing behavior; consider later offline developer experiment only. |
| Zero crossing takeover | One review proposes it | Do not make it a requirement. Use smooth gain ramps at musical boundary. |
| Loudness normalization | Several note it | Measure boundary delta first; defer full LUFS implementation. |
| Three-song/deck state | Broad agreement | Future stage only after real candidate and two-song validation. |

---

# 9. Revised target architecture

The next architecture should be described as **evidence-first, lock-aware transition planning**:

```text
Track assets / master analysis / Lite activity
        |
        v
Explicit time-domain resolver
        |
        v
Track Evidence Inspector
        |
        v
Candidate interval generator (source time only)
        |
        v
Pair candidate evaluator + Gate Trace
        |
        +--> intrinsic eligibility classification
        |
        +--> current execution lock / master fallback status
        |
        v
Fingerprint-sealed transition plan
        |
        +--> QC + UI + renderer + export consume same plan ID
        |
        v
Canonical two-song renderer only when plan is Lite candidate and sealed
```

## 9.1 Separate two questions that current UI conflates

### Question 1: Musical/technical eligibility

```text
Given current source analysis and current policy, can this pair safely execute Lite v2?
```

Possible answer:

```text
candidate / hard blocked / needs analysis / insufficient evidence / invalid mapping
```

### Question 2: Current execution policy

```text
What will normal playback do right now?
```

Possible answer:

```text
master fallback locked / master planned / Lite plan sealed / stale plan
```

This distinction solves the issue where applying a safe fallback correctly changes execution to Master, but later prevents diagnostics from discovering whether a different fresh plan could be eligible.

---

# 10. Exact first implementation sequence

## Phase 1 — Do not change thresholds or renderer behavior

### 1. Create a time-coordinate module

Proposed file:

```text
mixmind-time-coordinate.js
```

Minimum API:

```js
const TimeDomain = Object.freeze({ SOURCE:'source', LOCAL:'local', GLOBAL:'global' });

function sourceTime(track, seconds) { ... }
function localTime(track, seconds) { ... }
function localToSource(track, local) { ... }
function sourceToLocal(track, source) { ... }
function assertSourceInterval(track, interval) { ... }
```

Requirements:

- explicit `trackId`, `domain`, `start`, and `end` for every audit interval;
- reject negative/beyond-buffer values;
- no activity lookup with a bare number in new diagnostics code;
- document `track.mixStart` as source offset/local playable start.

### 2. Repair/normalize gatekeeper mapping

The safe-pair branch should treat pair starts as source times directly:

```text
outTime = pair.outgoing.start
inTime  = pair.incoming.start
```

The fallback timing branch should convert local transition start to source:

```text
outTime = localToSource(outgoing, timing.start)
inTime  = localToSource(incoming, 0)
```

This must be implemented only after a small code review confirms the pair planner’s output contract. The contract should be documented in code:

```text
SafeWindowPairPlanner returns source-time intervals.
```

### 3. Add one-pair audit export

Proposed file:

```text
mixmind-transition-coordinate-audit.js
```

For selected pair, output JSON/visible panel with:

```text
track source duration
mixStart / trim offset
requested overlap / effective overlap
fallback timing local start -> source start
safe-pair candidate source intervals
actual outgoing/incoming activity query intervals
vocal activity max/mean at query
vocal intervals nearby
all domain conversions
```

### 4. Add deterministic gate trace

Do not build full matrix yet. Modify/extend the gatekeeper to return checks such as:

```js
{
  id: 'outgoing_vocal_safe_interval',
  status: 'PASS' | 'FAIL' | 'MISSING' | 'INVALID_DOMAIN',
  hard: true,
  observed: { max: 0.23, mean: 0.11, activeFraction: 0.42 },
  threshold: { max: 0.15 },
  sourceInterval: { start: 142.0, end: 143.5, domain:'source' },
  reason: '...'
}
```

A trace must be created from one canonical function and reused by UI, QC, candidate finder, and renderer plan generation.

### Phase-1 acceptance test

For one pair, the user can see exactly:

```text
“MixMind examined outgoing source 2:24.00–2:25.50.
The vocal curve was max 0.31, mean 0.18; threshold is max < 0.15.
This is why the exit is blocked.”
```

If the panel instead shows an impossible/out-of-range or musically wrong interval, fix mapping before proceeding.

## Phase 2 — Make interval evidence correct

### 5. Repair safe-window evaluation from point checks to interval checks

Current flaw:

```text
Candidate scoring samples activity at the beginning of a phrase window.
```

New logic must aggregate every 250 ms analysis frame across each proposed interval, including tail margin. This alone can change candidate quality and explanation substantially.

Outgoing candidate condition should assess:

```text
full exit interval + outgoing tail margin
```

Incoming candidate condition should assess:

```text
full instrumental lead interval until takeover/vocal onset
```

Do not simply use `< 0.15` at one timestamp.

### 6. Add per-track Evidence Inspector

Show curve, intervals, query markers, and a raw preview button. This lets the user validate the model’s interpretation before the pair finder decides all songs are unsuitable.

## Phase 3 — Candidate discovery

### 7. Build pure Candidate Finder core

Proposed file:

```text
mixmind-lite-candidate-finder.js
```

Inputs:

```text
track evidence profiles
current policy version
intrinsic gate (without forced execution lock)
```

Outputs:

```text
all directed pairs
candidate interval pairs
rejection checks
nearest miss
classification
```

It must retain top K candidates and top K near misses. It must never decode/reseparate audio during scan.

### 8. Add Candidate Finder UI

Show:

```text
Lite candidates
Master-only hard blocks
Needs activity analysis
Insufficient evidence
Execution locked to Master
```

Include simple summary, expandable evidence, and a raw-window preview. Do not include a normal “force Lite” action.

## Phase 4 — Plan lifecycle

### 9. Add minimal sealed plan cache

Plan fingerprint includes:

```text
outgoing/incoming IDs
track source offsets
master-analysis version
Lite activity version
transition settings
safe-window policy version
gate policy version
forced-fallback lock state/provenance
```

Use one getter for all consumers. A stale plan cannot render/export.

## Phase 5 — Only then test Lite v2

### 10. Obtain a genuine candidate

A candidate must result from the normal intrinsic trace, not a forced threshold bypass.

### 11. Two-song test protocol

Test:

```text
full transition listen
stop during handoff
pause/resume
seek before / during / after handoff
rapid seek regression
source-ledger count
full completion
offline export parity after live behavior is stable
```

Only after this passes should three-song harness work begin.

---

# 11. Specific technical test suite

## T1 — Existing safe-pair double-offset regression

Create a mock track:

```text
source duration: 240 s
mixStart: 12 s
safe pair outgoing source start: 180 s
```

Expected gate query:

```text
180 s
```

Must not query `192 s`.

## T2 — Fallback local-to-source conversion

```text
mixStart: 12 s
fallback local transition start: 160 s
expected source query: 172 s
```

## T3 — Interval vocal check

Create activity frames:

```text
candidate start activity: 0.02
candidate middle activity: 0.55
```

Expected: candidate fails. This catches the present point-sampling weakness.

## T4 — Incoming pre-vocal duration

```text
incoming vocal onset: source 3.0 s
requested handoff: 4.0 s
```

Expected: reject, even if source `0.0` alone is silent.

## T5 — Forced master lock separation

Given intrinsically eligible evidence plus a current Master lock:

```text
intrinsic classification: LITE_CANDIDATE
execution classification: MASTER_LOCKED
normal renderer: cannot run Lite
candidate finder: displays candidate plus lock
```

## T6 — Missing activity

Expected:

```text
NEEDS_LITE_ACTIVITY_ANALYSIS
```

not “vocal unsafe.”

## T7 — Synthetic deterministic planner fixture

Use direct profiles, not Spleeter output:

```text
A: known vocal-free source 20–28 s
B: known pre-vocal source 0–8 s
same BPM/key, adequate confidence
```

Expected:

```text
LITE_CANDIDATE
```

## T8 — Renderer boundary / transport test

Only after T7 and a genuine audio candidate. Confirm source count <= 3, no duplicate sources after stop/seek, and clean master fallback on seek.

---

# 12. What must not be done

1. Do not lower the vocal threshold before T1–T4 are complete.
2. Do not force Lite on a blocked user pair.
3. Do not make a live user-facing gate bypass button.
4. Do not reactivate rolling modules.
5. Do not claim zero candidates proves a mapping bug.
6. Do not claim all vocal-heavy music should contain Lite-safe windows.
7. Do not replace interval analysis with a scoring-only model.
8. Do not add full LUFS normalization, multi-deck preload, or High Quality 4-stem work ahead of evidence correctness.
9. Do not allow a Master fallback lock to hide intrinsic eligibility in diagnostics forever.
10. Do not treat `LITE STEMS READY` as `LITE ELIGIBLE`.

---

# 13. Updated external-review prompt

Use this prompt with the next reviewer together with this document and the original technical report:

```text
Perform a deep independent review of MixMind using the attached original report and the follow-up review-of-reviews document.

Important factual constraints:
- All audio processing must remain on-device in the browser.
- Master recordings are the quality foundation; stems are selective controls.
- High Quality browser HTDemucs is unsupported on the tested Intel HD 4600 PC.
- Old rolling/generic Lite paths failed and must remain retired.
- The new Lite v2 renderer is not audio-tested; do not claim it works.
- No Lite pair has yet passed the real gate.
- A safe Master fallback lock prevents current normal Lite execution, but future diagnostics must distinguish that execution lock from intrinsic musical eligibility.

Review the following specific source-code findings:
1. Safe-window candidates are generated in source time.
2. The current gatekeeper adds `getTrackMixStart()` to those source-time values, which double-offsets any track whose `mixStart` is non-zero.
3. Safe-window scoring samples at a candidate start point rather than proving the entire interval safe.
4. Current activity logic uses normalized RMS / a <0.15 threshold, not literal zero energy.

Please assess:
- whether the proposed time-domain repair is correct;
- the best minimal data model for source/local/global time safety in plain browser JavaScript;
- how intrinsic eligibility and execution fallback locks should coexist;
- what must be included in a deterministic gate trace;
- how to build a candidate finder without introducing duplicate eligibility logic;
- which proposed external suggestions should be rejected or deferred (e.g., live force bypass, zero-crossing requirement, Spleeter-dependent synthetic positive control);
- a safe prioritized implementation and test plan.

Be critical. Identify any incorrect assumptions in this report. Separate verified facts, plausible hypotheses, and untested proposals.
```

---

# 14. Final assessment

The external reviews broadly point MixMind in the correct direction: evidence first, master first, conservative execution, and staged validation. Their most useful shared contribution is the insistence that MixMind must become observable before it becomes more permissive.

The additional code audit makes the work more concrete:

```text
The time problem is not merely theoretical.
A double-offset path exists for safe-pair activity queries.
The candidate score is also not yet an interval proof.
The forced Master lock needs diagnostic separation from intrinsic eligibility.
```

These are the next problems to solve. Once source-time evidence is correct and visible, MixMind can honestly determine whether its current library has no Lite candidates, whether it has false negatives, or whether the activity model needs carefully measured calibration. Until then, Master / Echo Out remains the correct safe production behavior.
