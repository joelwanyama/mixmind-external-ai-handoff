# MixMind Hybrid Transition Architecture Specification

**Status:** Authoritative target architecture for the next implementation phase.  
**Purpose:** Replace overlapping experimental stem playback paths with one collision-aware, master-led transition system.  
**Scope:** Product, audio, analysis, planning, rendering, quality-control, and migration requirements. No source code is included.

---

## 1. Product Principle

MixMind is a **collision-aware transition intelligence engine**.

It does not use stems merely because stems exist. It first understands a collection of songs as master recordings, chooses musically safe timing, detects transition risk, then applies the lightest reliable processing mode needed to improve that transition.

```text
Master analysis determines where and when.
Stem capability determines what can be controlled.
Collision analysis determines what must be avoided.
The renderer executes one selected recipe.
```

The priority order is:

```text
Musical timing
→ original master sound quality
→ collision avoidance
→ selective stem control
→ creative effects
```

---

## 2. Non-Negotiable Rules

1. **Master recordings are the quality foundation.**
   - Do not replace full master playback with separated stems by default.
   - Stems are selective transition tools.

2. **A transition has one canonical execution path.**
   - Master recipe, Lite recipe, or High Quality recipe.
   - Never run competing schedulers, duplicate deck sources, or conflicting gain automation.

3. **User selection controls preparation availability, not forced execution.**
   - User selects Master Only, Lite preparation, or High Quality preparation.
   - Per-transition planning chooses the actual safest mode.

4. **Confidence and quality gates are hard constraints.**
   - Bad separation, low beat confidence, invalid phrase timing, or unsafe stretch cannot be rescued by a high creative score.

5. **Master fallback is always valid.**
   - Every failed/uncertain stem plan returns to a stable master transition.

6. **No stem state is called ready before validation.**
   - Audio alignment, local persistence, and hydration status must be valid.

7. **The rolling player keeps no more than two active track decks.**
   - Maximum high-stem playback window: eight source streams.
   - Maximum Lite playback window: four source streams.

---

## 3. Processing Modes

### 3.1 Master Only

**Assets available:** Full master recording only.

**Capabilities:**

- Equal-power crossfade.
- Conservative EQ transition.
- Filter transition.
- Delay/echo tail.
- Phrase-aligned cut/reset.
- Master loudness trim.
- Conservative tempo handling.

**Use when:**

- No stems exist.
- Stem confidence is low.
- Tempo mismatch exceeds safe range.
- Source is noisy/dense/artifact-prone.
- A simple master blend is already safer than a stem recipe.

### 3.2 Lite 2-Stem

**Assets available:** Vocals and instrumental.

**Capabilities:**

- Vocal handoff.
- Vocal clash avoidance.
- Incoming instrumental-first entry.
- Delayed incoming vocal.
- Outgoing vocal tail.
- Instrumental duck/filter.
- Short acapella/instrumental overlay when confidence permits.

**Not permitted:**

- True bass swap.
- True drum swap.
- True melody/other swap.
- Independent low-end manipulation.
- Claims of four-stem control.

**Use when:**

- Vocal collision is the dominant risk.
- Full four-stem mode is unavailable or unnecessary.
- Transition has compatible master timing and a safe instrumental entry window.

### 3.3 High Quality 4-Stem

**Assets available:** Vocals, drums, bass, other.

**Capabilities:**

- Vocal handoff/tail/duck.
- Drum entry/bridge/swap.
- Bass handoff/swap.
- Harmonic other-stem reduction.
- Delayed melodic/harmonic entry.
- Controlled acapella/instrumental/drum recipes.

**Use when:**

- Stem reliability is accepted.
- Collision risk cannot be safely handled by Lite or master-only mode.
- Master analysis has identified a phrase-safe transition window.

---

## 4. Master Analysis Contract

Master analysis is the strategic layer. It should produce data independent of stem mode.

### Required master analysis outputs

```text
Track identity and duration
BPM and BPM confidence
Half/double-time candidates
Global key and key confidence
Beat grid
Downbeat estimate and confidence
Bar and phrase timing
Energy curve
Overall energy score
Loudness/trim
Master vocal-density estimate
Master arrangement-density estimate
Structural section candidates
Safe entry-window candidates
Safe exit-window candidates
Transition confidence
```

### Interpretation rules

- A zero-valued section marker means no confident marker was found; it is not a confirmed musical event.
- Low key confidence must reduce the influence of harmonic scoring.
- Low beat/phrase confidence must prohibit complex long blends.
- Master analysis is the source of truth for global timeline placement.

---

## 5. Safe Window Model

MixMind must move from isolated marker values to scored transition windows.

### Outgoing window candidate properties

```text
Window start/end
Phrase alignment confidence
Downbeat confidence
Vocal activity
Density
Energy slope
Low-end activity
Harmonic density
Available tail duration
Section classification confidence
```

### Incoming window candidate properties

```text
Window start/end
Phrase alignment confidence
Downbeat confidence
Vocal onset risk
Density
Energy slope
Low-end activity
Harmonic density
Available intro duration
Section classification confidence
```

### Window pairing objective

A transition candidate is:

```text
Outgoing safe exit window
+
Incoming safe entry window
+
Phrase/downbeat alignment
+
Desired energy movement
+
Available stem capability
```

The engine must never allow snapping to move the transition later than the required overlap point. This prevents requested transition duration from silently becoming shorter than actual audible overlap.

---

## 6. Collision Risk Model

Collision is not binary. Every category has:

```text
Risk score
Confidence score
Recommended mitigation
```

### 6.1 Vocal collision

Inputs:

- Outgoing vocal activity.
- Incoming vocal activity.
- Vocal phrase confidence where available.
- Vocal separation quality.
- Vocal density.

Mitigations:

- Master: sparse-window selection, shorter blend, echo/reset.
- Lite: incoming instrumental-first entry, delayed incoming vocal.
- High: vocal handoff, vocal tail, vocal ducking.

### 6.2 Low-end collision

Inputs:

- Master low-band energy.
- Bass stem confidence where available.
- Incoming/outgoing energy.
- Key/harmonic confidence.

Mitigations:

- Master: EQ/high-pass handoff.
- Lite: filtered instrumental handoff only.
- High: true bass handoff or swap.

### 6.3 Harmonic collision

Inputs:

- Key compatibility.
- Key confidence.
- Harmonic density.
- Other-stem activity where available.
- Tonal versus percussive transition window classification.

Mitigations:

- Master: shorter blend, filter/echo/reset.
- Lite: shorter instrumental overlap, instrumental ducking.
- High: reduce outgoing other/harmonic content.

### 6.4 Rhythmic collision

Inputs:

- BPM relationship.
- Beat/downbeat confidence.
- Percussive density.
- Groove/transient compatibility where available.

Mitigations:

- Master: short blend or reset.
- Lite: master/EQ-led transition.
- High: drum bridge or drum swap.

### 6.5 Arrangement-density and masking collision

Inputs:

- Master density curve.
- Vocal activity.
- Spectral descriptors.
- Stem activity where available.

Mitigations:

- Use sparse entry/exit windows.
- Delay vocal entry.
- Duck/filter outgoing material.
- Shorten overlap.

### 6.6 Energy discontinuity

Inputs:

- Current global energy arc target.
- Outgoing/incoming energy.
- Section energy slope.
- Desired mix style.

Mitigations:

- Change blend length.
- Use reset.
- Maintain rhythmic bed.
- Select alternate entry window.
- Change sequence candidate.

---

## 7. Tempo and Key Policy

### Tempo policy

```text
Within ±2%: excellent blend range
±2–4%: normal blend range
±4–6%: controlled stretch range
±6–8%: conservative stretch/reset range
Beyond ±8%: no long stem blend; reset/cut/master fallback
```

Half/double-time relationships may be recognized as perceived-tempo candidates, but should initially route to reset-style transitions rather than automatic long blends.

### Key policy

```text
High confidence: use harmonic compatibility normally
Medium confidence: reduce key weighting
Low confidence: treat key as weak/unknown
```

Key incompatibility does not always prohibit a transition. It prohibits long tonal overlap when harmonic content is strong.

Automatic deliberate semitone/energy-boost key clashes are deferred until a user-controlled creative mode exists.

---

## 8. Sequencing Model

### Current direction

Track sequencing should become a constrained global path problem rather than greedy nearest-neighbor ordering.

### Inputs

```text
Pairwise compatibility
BPM path
Key confidence/path
Energy arc target
Vocal density
Artist repetition
Genre/timbre adjacency
User locks and must-play tracks
Target mix duration
```

### Recommended next algorithm

```text
Beam search over partial sequences
```

This should preserve several candidate sequence paths rather than commit to the locally best next song.

### Deferred algorithms

```text
Genetic algorithms
Reinforcement learning
User-behavior learning
```

These are not required until MixMind has reliable user-edit data and a privacy-safe feedback model.

---

## 9. Project-Level User Choice and Per-Transition Execution

### User controls

The user selects what MixMind prepares:

```text
Master Only
Lite 2-Stem preparation
High Quality 4-Stem preparation
```

The user may prepare all tracks in batch.

### Per-transition selector

For each transition, MixMind selects one execution mode:

```text
Master recipe
Lite recipe
High Quality recipe
```

Example:

```text
Project prepared with High Quality stems.

Pair A → B:
Master crossfade is safest.

Pair B → C:
Lite-style vocal handoff is enough.

Pair C → D:
Four-stem bass/drum/vocal recipe is needed.
```

This avoids forcing complex stem processing where it does not improve quality.

---

## 10. Canonical Transition Decision Object

Every transition must produce one authoritative decision object containing:

```text
Outgoing track
Incoming track
Global transition start
Outgoing source offset
Incoming source offset
Requested duration
Effective duration
Master compatibility score
Collision risk summary
Master timing confidence
Selected execution mode
Selected recipe
Automation requirements
Fallback recipe
Explanation text
```

This object must be used by:

```text
Timeline UI
Transition details
Preview renderer
Normal playback renderer
Offline export renderer
Quality-control renderer
```

No renderer should independently guess a different transition mode or timing.

---

## 11. Canonical Rendering Architecture

### Rule

Only one execution path may render a transition.

```text
Master recipe
OR
Lite recipe
OR
High Quality recipe
```

### Master recipe

- Master source A.
- Master source B.
- Equal-power gain path.
- Optional broad EQ/filter/delay/reset action.

### Lite recipe

- Outgoing master remains the quality foundation.
- Incoming instrumental may enter before incoming master.
- Outgoing master fades at master-derived timing.
- Incoming master enters only at a vocal-safe point.
- Incoming instrumental fades into incoming master.

### High Quality recipe

- Master tracks remain normal continuity foundation unless a specific isolated action is justified.
- High stems are used selectively for vocals, drums, bass, or other control.
- Do not automatically replace both full masters with full stem reconstructions.

---

## 12. Playback Scheduling Policy

### Stage 1: Two-song hybrid playback

Acceptance requirement:

```text
Exactly two tracks
One canonical transition decision
Correct timing
No duplicate playback
No silence gap
Correct stop/cleanup
Master fallback works
```

### Stage 2: Three-song rolling playback

```text
Deck A + Deck B active
After A ends, release A
Hydrate Deck C
Schedule B → C using the canonical decision object
```

### Stage 3: Full mix

```text
Two active decks maximum
Look-ahead hydration
No all-library stem hydration
No competing legacy scheduler
```

---

## 13. Quality Control Requirements

Before preview/export completion, validate:

```text
Requested versus effective overlap
Unexpected silence gap
Source overlap duration
Clipping/limiter activity
Loudness continuity
Beat/downbeat alignment
Vocal overlap risk
Low-end overlap risk
Stem quality status
Transition decision confidence
```

If a transition fails validation:

```text
Change window
Shorten overlap
Select lower-complexity recipe
Step down: High → Lite → Master
```

Never step up automatically after quality failure.

---

## 14. UI Requirements

### Mix overview

Show:

```text
Track order
Global mix positions
Energy path
Transition mode badges
Warnings
Prepared stem status
```

### Transition detail panel

Show:

```text
Master timing
Global transition start
Source offsets
Requested duration
Effective overlap
Collision summary
Selected execution mode
Recipe explanation
Fallback reason
Confidence
```

### Track detail panel

Show separate state for:

```text
Master analysis confidence
High Quality four-stem status
Lite two-stem status
Actual capabilities available
```

### Manual overrides

User can override:

```text
Track order
Transition timing
Transition type
Transition duration
Stem execution mode
Mix start/end
BPM/key/energy metadata
```

---

## 15. Migration Plan

### Remove or retire

- Competing experimental rolling schedulers.
- Multiple overlapping playback wrappers.
- Hidden/full-mix experimental toggles that are not verified.
- Per-renderer transition mode decisions.

### Retain

- Stable master scheduler as fallback.
- Master analysis pipeline.
- Lite preparation/storage pipeline.
- High Quality preparation/storage infrastructure.
- Timeline/track status UI.
- Transition preview foundations.
- OPFS persistence.

### Build next

1. Canonical decision object.
2. Canonical two-track renderer.
3. Master recipe.
4. Lite recipe inside master timing.
5. High Quality recipe inside master timing.
6. Two-song test gates.
7. Rolling scheduler.
8. Export parity.

---

## 16. Acceptance Gates

### Gate A: Master only

```text
Correct player clock
No silent gaps
Correct effective overlap
Correct side-panel timing data
```

### Gate B: Lite two-song transition

```text
Master timing followed
Incoming instrumental entry works
Incoming vocal delayed safely
Outgoing source ends at transition end
No duplicate master/stem sources
```

### Gate C: High Quality two-song transition

```text
Selected stem action matches plan
No low-end/vocal collision beyond policy
Artifact gate passes
Master fallback succeeds when quality fails
```

### Gate D: Rolling three-song playback

```text
No more than two active decks
Correct release/hydration sequence
No clock reset
No gaps or duplicate playback
```

### Gate E: Export parity

```text
Offline render uses same decision object
Preview and export use equivalent timing/recipe
```

---

## 17. Immediate Implementation Priority

The next code work must be:

```text
Canonical Hybrid Playback Consolidation
```

The first executable target is:

```text
Two Lite-ready tracks
→ master-derived timing
→ Lite vocal/instrumental recipe
→ normal Play
→ validated stop/cleanup
→ master fallback on uncertainty
```

Only after this passes in the real browser should three-song rolling playback be rebuilt.
