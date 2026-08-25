# MixMind — Complete Product, UI, Technical Architecture, and Current-State Reference

**Prepared:** 15 August 2026  
**Purpose:** A self-contained reference for an external AI, developer, or reviewer to understand what MixMind is, how it works, what has been tested, what is unfinished, and which engineering rules must be preserved.

---

# 1. Product identity

## 1.1 What MixMind is

MixMind is a fully local, browser-based AI DJ mix builder. A user loads audio files into the browser, analyzes them, arranges them into a timeline, chooses or accepts transition recommendations, listens to mixes, and exports audio.

MixMind is not intended to be a simple long-crossfade application. Its target is an **evidence-first transition engine**:

```text
Master analysis decides where and when a transition can happen.
Collision analysis decides what must be avoided.
Prepared stem capability determines what can be controlled.
A sealed plan decides what executes.
One renderer executes the sealed plan.
```

## 1.2 Non-negotiable product rules

```text
1. Audio stays fully on-device.
2. Master recordings are the quality foundation.
3. Stems are selective collision-control tools, not automatic replacements.
4. Stem readiness is not transition eligibility.
5. No generic long master/stem crossfades.
6. Do not revive failed rolling scheduler modules.
7. Do not claim untested playback works.
8. Do not force a blocked Lite transition.
9. No cloud upload or server inference.
10. High Quality HTDemucs is unsupported on the tested Intel HD 4600 PC.
```

## 1.3 Intended modes

```text
Master Only
Lite 2-Stem: Vocals + Instrumental
High Quality 4-Stem: Vocals + Drums + Bass + Other
```

The user chooses which stem assets to prepare. Per-transition planning decides which mode actually executes.

```text
Assets prepared != transition eligible
```

---

# 2. User/device deployment profile

## Primary user machine

```text
Windows PC
16 GB RAM
Intel HD Graphics 4600
Edge and Chrome
Local Python server at http://localhost:8765/
```

## Secondary device

```text
Samsung Galaxy Note 20 Ultra
Android 13
Chrome / Samsung Internet
6 GB RAM
```

## Hardware outcome

The high-quality browser HTDemucs path downloaded successfully but failed at runtime on the Windows PC.

Observed errors included:

```text
Could not find an implementation for ConstantOfShape(9)
std::bad_alloc
```

Conclusion:

```text
High Quality four-stem HTDemucs must remain unavailable on the tested Intel HD 4600 PC.
```

Lite 2-stem preparation was successfully installed and user-tested.

---

# 3. Application UI and buttons

The UI has evolved over many repairs. Some controls are normal user controls; some are diagnostic/development controls added during the architecture work.

## 3.1 Top navigation

```text
Home
Mix
Song Order
Export
```

### Home

Home provides the simpler project-facing view, library/upload workflow, and standard player card depending on the current UI state.

### Mix

Mix is the advanced timeline/editor view. It shows:

```text
Track Library
Live visualizer
Master player controls
Global mix scrubber/timing ruler
Timeline tracks
Transition bars
Selected track/transition detail panel
Mix Settings
```

### Song Order

Used to arrange tracks before or while constructing the timeline.

### Export

Used for normal project export. It remains primarily legacy/master export. Sealed cue WAV export is separate and test-only.

## 3.2 Primary top-toolbar buttons

| Button | Meaning | Current scope |
|---|---|---|
| Relink Audio | Reconnect original local files after restore/browser eviction | Important because master AudioBuffers are not guaranteed to persist indefinitely in memory |
| Transfer All → Mixer | Copies/refreshes library songs into the active mixer timeline | Use when library and mixer timeline differ |
| Create My Mix | Builds/refreshes a mix from current configured tracks | Normal project action |
| Analyze All | Runs master-track analysis across current audio | BPM/key/energy/sections etc. |
| Analyze Lite Activity | Creates/backs-fills Lite vocal/instrumental activity evidence | Does not re-separate stems |
| Scan Lite Pairs | Read-only pair scan using Lite candidate logic | Diagnostic/candidate discovery |
| Plan History | Shows local sealed-plan snapshots saved after future plan sealing | Read-only; does not restore or force plans |
| Test Master Plan | Direct canonical Master two-song test | Development/test-only control |
| Test 3-Track Master Chain | Test-only sealed three-track canonical Master chain | Development/test-only control |
| Canonical Master Beta | Opens full-timeline canonical Master Beta panel | Development/beta controller; separate from normal legacy Play until feature flag is enabled |
| Canonical Master: OFF/ON | Explicit feature-flag setting | OFF must remain default; ON is experimental normal-player integration |
| Rebuild Master Plans | Explicitly builds/seals a current Master PlanSet | Required after stale-plan refusal |
| Transport Audit | Read-only public/internal transport boundary diagnostics | Development control |
| JIT Trace | Shows Canonical Master Beta JIT trace events after tracer is enabled | Development control |
| Auto-Sort | Sorts library/timeline according to app heuristics | Normal UI control |
| Auto-Sequence | Creates suggested order/sequence | Normal UI control |
| Download Mix | Normal project export/download path | Legacy/master path remains primary |
| Clear | Clears current project/timeline state | Use cautiously |
| Save Metadata | Saves project metadata | User should keep copies outside browser storage |
| Load Metadata | Restores saved project metadata | May require Relink Audio after restore |

## 3.3 Player controls

The normal player includes:

```text
Play/Pause
Stop
Time display
Volume/Mute
VU meters
Global timeline scrubber
Timeline ticks/ruler
```

### Important normal-player engine modes

```text
Legacy playback
Canonical Master Beta (only when feature flag is ON)
```

Lite is intentionally disabled in normal playback at current project state.

## 3.4 Transition bars

Transition bars appear between timeline tracks and show examples such as:

```text
Echo Out · MASTER
Filter Sweep · MASTER
Long Crossfade · MASTER
```

They can be opened to reveal:

```text
Compatibility
Duration
Effective overlap
Global Mix Start
BPM difference
Key compatibility
Preview/optimization options
Canonical Decision
Pre-Render QC
```

## 3.5 Stem Preparation controls

The project supports user-facing stem preparation conceptually as:

```text
Master Only
Lite 2-Stem
Demucs 4-Stem
Prepare All Songs
```

Lite preparation status can show:

```text
LITE STEMS READY
```

This means assets are prepared. It does not mean a Lite transition is allowed.

## 3.6 Lite diagnostics controls

### Analyze Lite Activity

Calculates from hydrated Lite stem buffers:

```text
vocal activity curve
vocal intervals
vocal boundary confidence
instrumental density curve
low-end curve
```

### Scan Lite Pairs

Scans directed pairs. It can report:

```text
LITE CANDIDATE
MASTER ONLY
NEEDS ACTIVITY
NEEDS AUDIO
INVALID MAPPING
```

### Inspect Evidence

Available in pair-scan rows. It shows candidate landscape information including:

```text
requested duration
BPM delta
drift-limited duration
windows tested
outgoing/incoming source starts
effective candidate duration
full gate reasons
outgoing/incoming interval evidence
maximum vocal activity
active frame counts
drift in beats
```

### Seal Lite Test Plan

For current green candidates only. Creates a sealed in-memory PlanEnvelope plus automatic snapshot.

### Sealed Lite Cue Test

Test-only cue harness controls:

```text
Start / Restart (8s cue)
STOP CUE NOW
Download Plan Snapshot
Export Sealed Cue WAV
```

Seek/Pause are intentionally disabled in this cue harness.

## 3.7 Master diagnostics controls

### Audit Master Plans

Builds/inspects a Master PlanSet. It shows each adjacent pair:

```text
Master QC result
execution recipe
fallback recipe
effective duration
global transition start
reason
```

### Test Master Plan

A controlled two-song canonical Master test. It should use the sealed Master plan when correctly loaded.

### Test 3-Track Master Chain

Bounded three-track test-only harness:

```text
A -> B -> C
JIT incoming deck scheduling
maximum 2 Master sources
Echo Out recipes
Stop only in Phase 19A
```

Later phases add fixed seek target tests:

```text
Seek A / Seek B / Seek C
A +5s / B +5s / C +5s
```

### Canonical Master Beta

Full timeline beta controller, separate from normal Play unless the feature flag is ON. It is intended to consume sealed Master PlanSets with a two-source budget.

## 3.8 Mix Settings

### Crossfade Curve

Typical options affect standard crossfades. Recommended default:

```text
Equal Power
```

Echo Out has its own short recipe behavior, so the crossfade curve is less important for sealed Echo Out plans.

### Default Duration

Requested automatic duration, often displayed in bars. It is not a guaranteed execution duration.

```text
Requested 8 bars may become 1.50s Echo Out
or 1.50–2.25s short Lite handoff
```

### Auto-Analyze

Runs master analysis after upload.

### Analysis Quality

```text
Fast
Balanced
Deep
```

Deep is recommended for current evidence-first planning because it improves master analysis confidence.

### Full-Song Guard

When enabled it restricts transition behavior to preserve near-full tracks and crossfade-only behavior. It can conflict with safety-selected Echo Out plans.

Recommended current development setting:

```text
OFF
```

### Seek Snapping

```text
Beat Grid
Bar
Phrase
Off
```

| Setting | Meaning |
|---|---|
| Beat Grid | Snap manual seek/edit positions to nearest beat |
| Bar | Snap to nearest bar; recommended current default |
| Phrase | Snap to larger phrase boundaries; useful for large arrangement edits |
| Off | Exact time; useful for diagnosis but risky for normal musical editing |

Seek snapping affects manual normal-player seeking/edits. It does not create Lite candidates or override sealed recipe timing. Cue harnesses intentionally disable arbitrary seek.

---

# 4. Master analysis foundation

MixMind master analysis includes or intends to include:

```text
BPM
beat grid
first beat/downbeat
key
energy
energy curve
sections
intro/drop/breakdown/outro markers
loudness trim
master vocal density/texture
track duration/source offsets
```

Important data copied to timeline tracks includes:

```text
densityCurve
vocalCurve
textureSummary
vocalRisk
densityRisk
introVocalRisk
outroVocalRisk
```

## 4.1 Time domains

MixMind must distinguish:

```text
source time: seconds inside original decoded audio buffer
local time: seconds after track playable source start / trim offset
global time: seconds inside whole DJ timeline
transition time: seconds relative to transition start
```

The critical rule is:

```text
Lite activity curves and safe windows are queried in source-buffer time.
```

## 4.2 Time-coordinate repair

A real defect was found and repaired:

```text
Safe pair windows are generated in source-buffer time.
Old gate code could add getTrackMixStart() again.
For nonzero mixStart this double-offset activity queries.
```

Example observed audit:

```text
Incoming playable offset: 17.778s
Old selected safe candidate: 11.861s
```

That candidate was before the playable start of the timeline item and was invalid.

Current corrections:

```text
safe pair starts are source times directly
safe windows are restricted to playable source range
fallback local timing converts explicitly to source time
coordinate audit exposes legacy/corrected query deltas
```

---

# 5. Lite 2-stem system

## 5.1 Assets

Lite uses:

```text
vocals
instrumental/accompaniment
```

Model preparation was user-tested successfully.

## 5.2 Why stems are not automatic

Earlier generic Lite/rolling attempts caused:

```text
overlapping vocals
outgoing track too loud
instrumental clutter
beat drift
strange handoffs
duplicate playback
truncated tracks
seek duplication
unresponsive controls
```

Therefore:

```text
Prepared Lite stems are capability, not permission.
```

## 5.3 Lite activity evidence

The current activity analysis is based on vocal stem RMS and instrumental features. It uses percentile normalization and hysteresis rather than literal zero-energy logic.

Important current threshold behavior:

```text
Outgoing vocal-safe point/interval threshold approximately < 0.15 normalized activity
```

The activity model may have residual/bleed limitations. Threshold changes must be evidence-based and versioned.

---

# 6. Safe windows, candidate landscape, and Lite gate

## 6.1 Core drift formula

```text
drift beats = abs(BPM_out - BPM_in) / 60 * overlap seconds
```

The Lite unwarped drift safety cap used in current candidate work is approximately:

```text
0.15 beats
```

## 6.2 Duration ladder repair

A major false-negative was identified:

```text
A pair may fail 6-second vocal-safe proof
but pass a 1.50–2.25 second proof.
```

Current candidate landscape evaluates a duration ladder:

```text
feasible maximum
then decrements by 0.25 seconds
down to a 1.50 second minimum Lite duration
```

No vocal threshold was lowered.

## 6.3 Example validated short candidate

Current validated example:

```text
Cigarettes -> All Girls Are The Same
Outgoing source start: 224.00s
Incoming source start: 0.00s
Effective Lite overlap: 2.25s
BPM delta under current metadata: 0
Outgoing evidence: PASS, max vocal 0.000, active frames 0/10
Incoming evidence: PASS, max vocal 0.014, active frames 0/10
```

Longer 6-second candidates failed because incoming vocals entered inside the longer protected interval.

## 6.4 Candidate landscape limitations and current work

Current landscape now retains many combinations but is still incomplete relative to the ideal target. Future work should add:

```text
safe-run-first candidate generation
vocal boundary candidates
finer temporal candidate resolution
full range diagnostic search
all rejection codes
nearest miss numeric ranking
search coverage metadata
validated golden pair replay
```

---

# 7. Canonical decisions, fallback, QC, and plans

## 7.1 Master fallback policy

Current intended rules include:

```text
low beat/phrase confidence -> Hard Cut around 0.2s
drift too high -> Echo Out around 1.5s
no confirmed vocal-safe phrase -> Echo Out around 1.5s
weak harmonic confidence/risk -> Echo Out around 1.5s
low-end risk -> EQ Swap up to 4s
otherwise -> selected Master recipe
```

## 7.2 Canonical decision consistency repair

A prior defect produced contradictory plans:

```text
Execution: master-crossfade
Fallback: Echo Out
Reason: long blend unsafe
```

This was repaired. For Master execution, canonical execution recipe now aligns with the fallback recipe:

```text
Execution: master / Echo Out
Fallback: Echo Out
```

## 7.3 Pre-Render QC

QC displays:

```text
Master: PASS/BLOCKED
Lite: PASS/BLOCKED
Lite drift
reasons
```

A series of fixes ensured QC, Canonical Decision UI, and forced Master fallback agree for the currently displayed decision.

## 7.4 Forced Master fallback lock

`_forceMasterFallback` is an execution lock. It must block Lite execution. A future diagnosis system should distinguish:

```text
intrinsic Lite eligibility
from
current execution lock
```

Automatic safety locks should be tied to their plan/fingerprint and become stale after relevant input change. User-forced Master locks should persist until explicitly cleared.

---

# 8. PlanEnvelope and snapshots

## 8.1 Lite PlanEnvelope

Sealed Lite test plans include:

```text
plan ID
fingerprint
policy versions
pair IDs
source timing
safe pair
effective duration
intrinsic gate result
execution mode
source budget
prebuilt Master fallback
```

## 8.2 Automatic plan snapshots

Each future sealed Lite plan saves a local JSON snapshot containing:

```text
PlanEnvelope
timeline order
track metadata view
transition metadata
safe timing
policy/fingerprint data
```

The user can download a plan snapshot.

Snapshots are read-only. They do not automatically restore stale plans.

## 8.3 Master PlanSet

A Master PlanSet contains one Master plan per adjacent timeline pair.

For each plan:

```text
plan ID
fingerprint
Master recipe
effective duration
fallback
Master QC
source budget 2
```

It also contains:

```text
track start times
global transition schedule
total canonical duration
```

## 8.4 Current PlanSet lifecycle work

The project is actively repairing PlanSet lifecycle behavior.

Important target policy:

```text
MISSING -> explicit Rebuild Master Plans
SEALED/current -> Canonical Master allowed
STALE -> refuse canonical playback until explicit rebuild
INVALID -> refuse canonical playback
```

A regression occurred because status checking called `build()` as a side effect. The intended repair is:

```text
status/fingerprint comparison must be pure
build/rebuild must be explicit only
```

---

# 9. Renderer validation history

## 9.1 Canonical Lite Vocal-Safe Handoff v2

Signal flow:

```text
outgoing master
-> filtered/low-level incoming instrumental
-> short anti-click incoming master takeover
```

Current successful cue validation included both directions for a two-song pair.

User listening outcomes included:

```text
Incoming track audible: PASS
No vocal overlap: PASS
No outgoing-loudness problem: PASS
No clutter/noise: PASS
No click/pop/silence: PASS
Good BPM timing: PASS
```

## 9.2 Cue transport validation

Validated in the isolated cue harness:

```text
full completion
Stop during PRE-ROLL
Stop during UNDERLAY
Stop during POST-HANDOFF
rapid Start/Stop/Restart
no delayed audio after Stop
session-bus isolation
```

Cue Pause and arbitrary Seek remain intentionally unsupported.

## 9.3 Offline cue WAV parity

A sealed cue plan was rendered with `OfflineAudioContext` and user-tested. Live cue and offline WAV matched in listening criteria for the validated plan.

This validates only a short sealed cue export, not full multi-transition mix export.

## 9.4 Canonical Master validation

Validated separately:

```text
two-song canonical Master plan playback
Master Echo Out recipe
three-track Master PlanSet chain
Stop at A->B and B->C
fixed track-boundary seeks
exact +5s seeks in test Beta
```

## 9.5 Normal Canonical Master Beta

At one point it passed:

```text
normal Play
normal Stop
normal seek
slider/timer synchronization
legacy/canonical feature flag switch
```

However, later Phase 20 lifecycle changes introduced a full-chain JIT silence regression:

```text
Track A plays
silence at JIT A->B
seek temporarily restores stable audio
silence at subsequent JIT boundary
```

This is currently unresolved. Canonical Master normal mode should be treated as experimental/blocked until JIT diagnostics identify and repair the failure.

---

# 10. Three-track Canonical Master architecture

## 10.1 Validated isolated chain

The test-only chain used:

```text
Track A -> Track B -> Track C
sealed Master PlanSet
Echo Out transitions
session output bus
maximum 2 Master sources
JIT Track C scheduling
Stop-only first phase
then Abort-and-Stabilize seek phase
```

## 10.2 Required runtime ownership

```text
Timeline / PlanSet: immutable planning data
Deck A / Deck B: only active runtime deck objects
Session bus: owns audible canonical chain output
Source ledger: tracks scheduled/active/ended source nodes
```

Future design must not reuse old rolling modules.

## 10.3 Seek policy

```text
Seek = Abort and Stabilize
```

For canonical test/Beta mode:

```text
abort chain
stop sources
kill delay/send outputs
disconnect old session bus
select owning Master track by sealed transition boundary
calculate source offset
start exactly one stable Master source
schedule no future chain
```

---

# 11. Normal Canonical Master Beta integration

## 11.1 Intended feature flag

```text
Canonical Master: OFF  -> legacy normal playback
Canonical Master: ON   -> sealed Master PlanSet normal playback, if current
```

Lite must remain disabled in normal playback.

## 11.2 Intended public/internal boundary

```text
Public AudioEngine.play/stop/seek
-> serialized coordinator
-> legacy internals OR canonical beta internals
```

Internal methods must never call public transport methods.

Target internals:

```text
_legacyPlayInternal
_legacyStopInternal
_legacySeekInternal
_teardownLegacyTransportInternal
canonical startInternal
canonical stopInternal
canonical seekInternal
```

## 11.3 Current normal-beta regression

Current normal Canonical Master Beta full-chain JIT path may fail at transitions. The current JIT trace diagnostic is intended to identify whether the cause is:

```text
JIT tick not firing
state/token mismatch
source budget rejection
bad source offset/duration
zero/missing gain automation
stale/disconnected session bus
legacy teardown interference
```

Do not change source offsets, gain, routing, or policy blindly. Run JIT diagnostics first.

---

# 12. Legacy playback status

Legacy playback remains the stable default.

Recent transport boundary work added/aimed to add:

```text
legacy internal aliases
public command queue
transport diagnostics
feature flag state
```

Legacy normal Play/Stop/Seek has been user-tested successfully during earlier boundary tests. Any future transport refactor must keep legacy default behavior intact and recoverable by switching Canonical Master OFF.

---

# 13. Retired/blocked paths

Do not reactivate:

```text
Experimental Stem Full-Mix toggle
Old Lite rolling scheduler
Old High rolling scheduler
Unlimited Lite rolling test
mixmind-canonical-lite-rolling.js
mixmind-canonical-lite-rolling-test-ui.js
mixmind-canonical-rolling-renderer.js
mixmind-canonical-rolling-test-ui.js
mixmind-lite2-rolling-mix.js
```

Even if files remain in the repository, they are not valid active playback paths.

---

# 14. Current known issues and risks

## Critical current issue

```text
Normal Canonical Master Beta JIT full-chain handoff silence.
```

The isolated chain passed, but integrated normal beta may fail at JIT incoming track handoffs.

Required immediate action:

```text
Run read-only JIT tracer.
Do not patch offsets/gain/bus blindly.
Compare failed JIT incoming deck with successful stable seek deck.
```

## Other risks

```text
Browser storage persistence may not be granted; save metadata and snapshots.
PlanSet status must stay pure.
External scripts can suffer load-order dependencies.
Dynamic toolbar injection has been unreliable; prefer static markup/direct bindings.
Main normal playback integration is still experimental.
```

---

# 15. File architecture

## Core application

```text
index.html
```

Large browser-local application containing primary UI, AudioEngine, analysis, legacy scheduling, settings, and many historical modules.

## Important current external modules

```text
mixmind-time-coordinate.js
mixmind-interval-evidence.js
mixmind-lite2-collision-analysis.js
mixmind-lite-gatekeeper.js
mixmind-safe-window-generator.js
mixmind-safe-window-pair-planner.js
mixmind-lite-candidate-landscape.js
mixmind-candidate-landscape-ui.js
mixmind-lite-candidate-finder.js
mixmind-plan-envelope.js
mixmind-plan-snapshots.js
mixmind-plan-history-ui.js
mixmind-master-plan-set.js
mixmind-master-plan-set-cache.js
mixmind-master-plan-audit.js
mixmind-canonical-transition.js
mixmind-master-fallback-selector.js
mixmind-transition-qc.js
mixmind-source-ledger.js
mixmind-canonical-master-renderer.js
mixmind-canonical-master-beta.js
mixmind-three-track-master-harness.js
mixmind-beta-jit-tracer.js
mixmind-public-transport-coordinator.js
mixmind-main-playback-coordinator.js
mixmind-main-playback-internals.js
mixmind-legacy-transport-internal.js
mixmind-transport-boundary-audit.js
mixmind-cue-test-harness.js
mixmind-sealed-cue-export.js
```

## Deployment files

```text
START_MIXMIND_WINDOWS.bat
RESET_AND_START_MIXMIND_WINDOWS.bat
mixmind_local_server.py
```

The local server is expected to serve:

```text
http://localhost:8765/
```

It should set proper isolation/cache headers for browser-local processing.

## Model/install files

```text
INSTALL_MIXMIND_STEMS_WINDOWS.bat
install_mixmind_stems_windows.ps1
INSTALL_MIXMIND_LITE2_WINDOWS.bat
install_mixmind_lite2_windows.ps1
extract_lite2_models.py
apply_wasm_compatibility_fix.ps1
APPLY_WASM_COMPATIBILITY_FIX.bat
```

---

# 16. Recommended next engineering order

## Immediate

```text
1. Recover/keep Canonical Master OFF for normal reliable use.
2. Enable JIT tracer.
3. Reproduce uninterrupted normal Canonical Master A->B silence.
4. Inspect Track B JIT trace.
5. Repair only evidence-proven JIT defect.
```

## Then

```text
6. Validate normal Canonical Master full-chain A->B and B->C.
7. Re-validate normal Stop, normal exact seek, Play after seek, and feature toggle.
8. Validate pure stale-plan refusal/rebuild again.
```

## Only after stable normal Master

```text
9. Create PlanSet-level offline Master export parity.
10. Validate multiple Master plan sets and longer timelines.
11. Consider one sealed Lite transition in normal playback, with Lite still tightly gated.
```

## Never skip

```text
No Lite normal playback before normal Master is stable.
No rolling scheduler revival.
No blind threshold changes.
No implicit stale-plan rebuild during playback.
```

---

# 17. Important reports in this package

```text
MixMind_External_Technical_and_Product_Review_Report.md
MixMind_Review_of_External_Responses_and_Validated_Next_Plan.md
MixMind_Lite_Cue_Handoff_V2_Validation_Report.md
MixMind_Sealed_Lite_Cue_Export_Parity_Report.md
MixMind_Three_Track_Canonical_Master_Validation_Report.md
MixMind_Three_Track_Master_Seek_Validation_Report.md
MixMind_Normal_Canonical_Master_Beta_Validation_Report.md
```

These documents preserve detailed validation history, external review conclusions, and current constraints.

---

# 18. Bottom line

MixMind has made real, user-tested progress:

```text
It can discover short evidence-approved Lite candidates.
It can execute sealed Lite cue handoffs cleanly.
It can export matching sealed cue WAV output.
It can execute and stop/seek sealed Master PlanSet harnesses.
It can run a normal Canonical Master Beta path, but the current full-chain JIT silence regression remains unresolved.
```

The next correct task is not feature expansion. It is JIT evidence collection and repair in the integrated Canonical Master Beta path.
