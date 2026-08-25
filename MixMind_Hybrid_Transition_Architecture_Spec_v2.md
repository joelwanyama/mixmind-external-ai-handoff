# MixMind Hybrid Transition Architecture Specification — Version 2

**Status:** Implementation-ready architecture baseline.  
**Supersedes:** Version 1 Hybrid Transition Architecture Specification.  
**Purpose:** Define deterministic master-led, collision-aware transition planning and rendering before further playback implementation.

---

## 1. Product Definition

MixMind is a collision-aware transition intelligence engine.

```text
Master analysis determines safe musical timing.
Collision analysis identifies what must be avoided.
Prepared stem capability determines what can be controlled.
One canonical renderer executes one resolved transition decision.
Quality control validates the result and triggers a pre-defined fallback.
```

MixMind is not stem-first. It is master-first.

---

## 2. Architectural Layers

### 2.1 Master Analysis Layer

Answers:

```text
Which songs can follow one another?
Which exit and entry windows are safe?
Where should a transition begin?
How long can it safely last?
How should energy move across the mix?
```

### 2.2 Collision Risk Layer

Answers:

```text
What collision risks exist at this exact window pair?
How confident is each risk estimate?
Can the risk be mitigated with available assets?
```

### 2.3 Execution Mode Layer

Answers:

```text
Use Master, Lite, or High Quality recipe?
Which selected stems are justified?
What fallback must exist?
```

### 2.4 Canonical Renderer Layer

Answers:

```text
Which sources start?
Which sources stop?
Which gain/filter/effect curves execute?
When does source ownership change?
```

The renderer must not select mode, timing, duration, or fallback.

---

## 3. User Preparation Choice vs. Per-Transition Selection

### User chooses prepared capability

```text
Master Only
Lite 2-Stem preparation
High Quality 4-Stem preparation
```

The selected project mode determines which assets MixMind attempts to prepare for all uploaded tracks.

### MixMind chooses execution per transition

For each pair, MixMind selects:

```text
Master recipe
Lite recipe
High Quality recipe
```

Example:

```text
Project prepared with High Quality assets.

Track A → Track B: Master recipe is safest.
Track B → Track C: Lite vocal/instrumental recipe is sufficient.
Track C → Track D: High Quality bass/drum/vocal recipe is justified.
```

Prepared capability must never be confused with selected execution mode.

---

## 4. Master Analysis Contract

Each master track analysis must provide, with confidence where applicable:

```text
Track identity and full duration
BPM and BPM confidence
Half/double-time candidates
Tempo stability / drift estimate
Global key and key confidence
Beat grid
Downbeat confidence
Bar and phrase intervals
Energy curve and energy score
Master vocal activity estimate
Master density estimate
Low-end activity estimate
Loudness / trim
Fade-in / fade-out estimate
Section candidates and section confidence
Safe entry windows
Safe exit windows
```

### Confidence interpretation

| Confidence | Range | Required behavior |
|---|---:|---|
| High | 0.80–1.00 | Full eligible behavior |
| Medium | 0.50–0.79 | Conservative recipe/weighted influence |
| Low | Below 0.50 | No complex long blend; step down |

Specific low-confidence policy:

```text
Low beat/downbeat confidence → no long blend
Low phrase confidence → no complex takeover recipe
Low key confidence → reduce harmonic weighting
Low section confidence → do not trust section label
Low stem confidence → do not use corresponding stem
Low tempo stability → reset/cut/master recipe
```

---

## 5. Safe Window Contract

A section marker is not a transition decision. MixMind operates on safe windows.

### Outgoing safe window

```text
Start/end
Phrase/downbeat confidence
Vocal activity
Vocal phrase completion confidence
Density
Energy slope
Low-end activity
Harmonic density
Local key and confidence when available
Tonal/percussive classification
Available tail duration
Fade-safe duration
Section confidence
```

### Incoming safe window

```text
Start/end
Phrase/downbeat confidence
Vocal onset risk
First vocal entry estimate
Density
Energy slope
Low-end activity
Harmonic density
Local key and confidence when available
Tonal/percussive classification
Available intro duration
First strong bass/drum entry estimate
Maximum safe pre-vocal duration
Section confidence
```

### Window pair score

```text
Timing compatibility
+ musical compatibility
+ collision safety
+ confidence
+ mode suitability
- complexity penalty
```

The complexity penalty means Master wins when a stem recipe does not clearly improve expected quality.

---

## 6. Requested, Feasible, and Effective Duration

Every transition stores three durations:

```text
Requested duration
Feasible duration
Effective duration
```

Definitions:

```text
Requested: user or planner target
Feasible: duration supported by safe source windows
Effective: duration actually rendered
```

Rules:

1. Snapping must never move later than the requested overlap point.
2. MixMind must never silently shorten a transition.
3. UI displays requested and effective duration.
4. If feasible duration is shorter, MixMind either:
   - selects a shorter safe recipe,
   - selects an earlier safe window,
   - uses a reset/cut,
   - or asks for manual override.

---

## 7. Collision Risk Contract

Every collision category contains:

```text
Risk score
Confidence score
Recommended mitigation
Residual risk after mitigation
```

### Required categories

```text
Vocal collision
Low-end collision
Harmonic collision
Rhythmic collision
Density/spectral masking collision
Energy discontinuity
```

### Risk policy

| Risk | Confidence | Behavior |
|---|---:|---|
| Low | High | Allow normal recipe |
| Low | Low | Allow conservatively |
| Medium | High | Mitigate |
| Medium | Low | Conservative mitigation |
| High | High | Avoid long overlap or step down |
| High | Low | Simple/reset recipe |
| Critical | Any | No blend; cut/reset/fallback |

---

## 8. Tempo and Harmonic Policy

### Tempo

```text
0–2% difference: excellent blend range
2–4%: normal blend range
4–6%: controlled stretch range
6–8%: conservative stretch/reset range
Above 8%: no long blend; reset/cut/master recipe
```

Half/double-time relationships are recognized as possible perceived-tempo relationships, but initially use reset-style transitions rather than automatic long blends.

### Key and harmony

```text
High key confidence: normal harmonic weight
Medium key confidence: reduced harmonic weight
Low key confidence: treat as weak/unknown
```

Use local window harmonic context when available:

```text
Strong tonal
Weak tonal
Percussive/non-tonal
```

Long tonal overlap requires stronger harmonic compatibility than drum-only or percussive overlap.

---

## 9. Mode Policies

### 9.1 Master Recipe

**Sources:** Outgoing master and incoming master only.

**Recipes:**

```text
Equal-power crossfade
EQ handoff
Filter transition
Echo/reverb reset
Phrase-aligned cut
```

**Use when:**

```text
Low collision risk
Stem unavailable/degraded
Timing uncertain
Source quality uncertain
Simple blend expected to sound best
```

### 9.2 Lite Recipe

**Sources:** Outgoing master, incoming instrumental, incoming master.

**Purpose:** Vocal-safe entry without replacing full master playback.

#### Canonical Lite sequence

```text
1. Outgoing master is the initial quality foundation.
2. Incoming instrumental enters at master-derived transition start.
3. Outgoing master fades according to canonical timing.
4. Incoming master enters at a vocal-safe phrase/downbeat point.
5. Incoming instrumental fades to zero as incoming master becomes dominant.
6. Outgoing master reaches zero/stops at canonical transition end.
```

#### Lite recipe constraints

```text
Incoming master offset = incoming instrumental offset + delayed entry duration
Incoming master delay must be phrase aligned
Incoming master delay must remain within maximum safe pre-vocal window
Incoming instrumental/master overlap must be bounded and crossfaded
No bass/drum-specific claims
Fallback preserves timing with master EQ/filter/crossfade recipe
```

Initial maximum Lite incoming-master delay:

```text
2–8 bars depending on confidence and available intro
```

### 9.3 High Quality Recipe

**Sources:** Masters plus selected stem sources under a total stream budget.

**Purpose:** Solve collision categories that Lite/Master cannot safely solve.

#### High Quality takeover window

Every stem action must include:

```text
Start/end
Selected source/stem
Master behavior
Stem gain curve
Gain compensation
Fallback behavior
```

#### Initial High recipes only

```text
Vocal handoff
Bass handoff
Drum bridge
Master fallback
```

Other creative recipes remain deferred.

---

## 10. Source Stream Budget

A source stream is any active scheduled audio source, including master and stem sources.

| Mode | Maximum total active sources |
|---|---:|
| Master | 2 |
| Lite | 4 |
| High Quality | 8 |

Rules:

```text
Masters count toward source budget.
No recipe may exceed budget.
If budget cannot be met, step down mode.
No indefinite master/stem parallel playback.
Stem/master coexistence only inside explicit takeover windows.
```

---

## 11. Canonical Transition Decision Object

Every transition must resolve to one immutable decision object.

### Identity

```text
Decision ID
Schema version
Analysis version
Project version
Created timestamp
Decision origin: automatic / manual / override
```

### Timing

```text
Global transition start/end
Outgoing source offset
Incoming source offset
Requested duration
Feasible duration
Effective duration
Snap policy
Phrase/downbeat confidence
```

### Compatibility

```text
BPM score
Key score
Energy score
Window pair score
Master timing confidence
```

### Collision summary

```text
Vocal risk/confidence/mitigation/residual
Low-end risk/confidence/mitigation/residual
Harmonic risk/confidence/mitigation/residual
Rhythmic risk/confidence/mitigation/residual
Density risk/confidence/mitigation/residual
Energy risk/confidence/mitigation/residual
```

### Execution

```text
Selected mode
Selected recipe
Required sources
Source budget
Stem takeover windows
Automation primitives
Effect parameters
Loudness/trim policy
```

### Fallback

```text
Fallback recipe
Fallback triggers
Fallback timing preservation policy
Fallback explanation
```

### Validation

```text
Pre-render result
Post-render result
Warnings
Errors
QC report
```

Renderer rules:

```text
Renderer never changes mode.
Renderer never chooses fallback.
Renderer never infers missing timing.
Preview, playback, and export consume the same decision object.
```

---

## 12. Renderer State Machine

```text
Idle
Preparing
Decision Ready
Assets Hydrating
Scheduled
Playing
Transitioning
Fallback
Stopping
Stopped
Failed
```

The state machine owns:

```text
Source creation
Source start/stop
Automation scheduling
Deck cleanup
Hydration/release
Fallback activation
Clock state
```

No UI module or renderer may independently create competing playback sources.

---

## 13. Deck and Resource Manager

### Deck states

```text
Empty
Assigned
Hydrating
Ready
Playing
Transitioning
Releasing
Released
Failed
```

### Two-deck rolling rule

```text
Deck A: current outgoing track
Deck B: current incoming track
After A transition ends: release A
Hydrate next track into freed deck slot
Prepare next canonical decision object
```

### Hydration policy

```text
Hydrate only assets required by selected decision.
Do not hydrate full library.
If hydration fails, execute pre-defined fallback.
Release assets after no longer audible.
```

---

## 14. Quality Control

### Pre-planning QC

```text
Analysis confidence
Safe window validity
Asset availability
Resource budget
Stem quality proxy
```

### Pre-render QC

```text
Decision completeness
Source offsets within bounds
Effective duration valid
Automation curves valid
Required assets hydrated
Fallback defined
```

### Post-render QC

```text
Unexpected silence
Duplicate source detection
Clipping/true peak
Loudness continuity
Beat alignment
Vocal overlap
Low-end overlap
Effective overlap match
```

### Step-down policy

```text
High → Lite → Master
Never step up automatically after a quality failure.
```

---

## 15. UI Contract

### Prepared vs selected state

UI must distinguish:

```text
Prepared capability
Selected execution mode
Fallback mode
Reason
Confidence
Risk
```

Example:

```text
Prepared: High Quality 4-Stem
Selected: Master Recipe
Reason: Master blend is safer; bass stem confidence is low.
```

### Transition Details display

```text
Global start
Outgoing/incoming offsets
Requested/feasible/effective duration
Mode
Recipe
Collision summary
Confidence
Fallback
Explanation
```

### Track Details display

```text
Master analysis state
Lite state
High state
Available capabilities
Section-confidence interpretation
```

### Override policy

User overrides trigger revalidation.

```text
Unsafe override → warning
Hard-gate violation → require confirmation or block
Updated setting → new decision object version
```

---

## 16. Sequencing Policy

### Current algorithm direction

Move from greedy local ordering toward beam search.

### Sequence objective

```text
Transition compatibility
+ target energy arc adherence
+ BPM path quality
+ key path quality
+ window availability
+ user constraints
- weak transition penalty
- artist/genre repetition penalty
```

A poor transition should be penalized heavily because overall mix quality is constrained by its weakest link.

### Deferred

```text
Genetic algorithm
Reinforcement learning
Behavior-learning engine
```

---

## 17. Acceptance Gates

### Gate A — Master two-song

```text
Correct clock
No gap
No duplicate sources
Correct requested/effective duration
Correct timing display
Stop/pause/resume/seek behavior
```

### Gate B — Lite two-song

```text
Master-derived timing
Incoming instrumental entry
Incoming master handoff
No instrumental/master doubling
Outgoing source stops correctly
Master fallback works
```

### Gate C — High two-song

```text
Explicit takeover window
Source budget respected
No master/stem doubling
Stem quality gate
Master fallback
```

### Gate D — Rolling three-song

```text
Two decks maximum
Correct release/hydration
No clock reset
No gap
No duplicate playback
```

### Gate E — Export parity

```text
Same decision object
Same timing
Same recipe
Same fallback behavior
Same effective duration
```

---

## 18. Migration Plan

### Retire

```text
Competing experimental schedulers
Hidden/unverified full-mix toggles
Renderer-local planning logic
Multiple playback wrappers
```

### Retain

```text
Stable master scheduler as fallback
Master analysis
Lite preparation/storage
High preparation/storage
OPFS persistence
Timeline/track status UI
Transition preview foundation
```

### Implement in order

```text
Canonical data contracts
Canonical Master two-track renderer
Canonical Lite two-track renderer
Canonical High two-track renderer
Rolling three-track renderer
Export parity
```

---

## 19. Immediate Next Executable Target

```text
Two Lite-ready tracks
→ one immutable canonical decision object
→ master-derived timing
→ incoming instrumental entry
→ incoming master phrase-safe handoff
→ outgoing master stop at effective transition end
→ no duplicate sources
→ master fallback if any gate fails
```

No additional rolling, four-stem, or creative recipes should be added until this target passes real browser acceptance testing.
