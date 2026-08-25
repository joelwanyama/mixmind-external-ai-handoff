# MixMind Hybrid Transition Architecture Specification — Version 3

**Status:** Final architecture baseline before Canonical Lite Renderer v2 implementation.  
**Supersedes:** Version 2 where Lite source ownership, handoff, and eligibility behavior differ.

---

## 1. Core Product Rule

MixMind is a master-first, collision-aware transition intelligence engine.

```text
Master analysis decides safe timing and safe windows.
Collision analysis decides whether overlap is safe.
Prepared stem capability enables selective control.
The canonical renderer executes one immutable transition decision.
```

Stems are not automatically better. They are used only when they materially reduce a specific collision risk without reducing musical quality.

---

## 2. Processing Mode Hierarchy

| Mode | Purpose | Execution Rule |
|---|---|---|
| Master Only | Default quality/reliability baseline | Use when no stem recipe clearly improves outcome |
| Lite 2-Stem | Vocal-safe transition assistance | Use only for drift-safe, vocal-safe, low-density window pairs |
| High Quality 4-Stem | Surgical collision control | Use only for justified bounded stem-takeover windows |

### User preparation vs. execution

```text
User selection determines what MixMind prepares.
Per-transition planning determines what MixMind executes.
```

A project prepared with High Quality assets may still execute a Master recipe for a simple safe pair.

---

## 3. Non-Negotiable Rendering Rules

1. Every transition has exactly one canonical execution path.
2. The renderer never chooses timing, mode, recipe, or fallback.
3. Every source has one owner, start, stop, deck, and transition decision ID.
4. Master tracks remain quality foundations outside bounded takeover windows.
5. Requested, feasible, and effective transition durations are always separate.
6. Zero-valued structural markers mean unknown unless explicitly confirmed.
7. Every stem recipe has a prebuilt Master fallback.
8. No renderer silently shortens a requested transition.
9. Source budgets include masters and stems.
10. All seek/stop/pause operations destroy canonical ledger sources before new playback begins.

---

## 4. Canonical Transition Decision Object

Every track pair resolves to one immutable decision object.

### Required groups

```text
Identity:
Decision ID, schema version, source analysis version, origin

Timing:
Global transition start/end
Outgoing/incoming source offsets
Requested/feasible/effective duration
Phrase/downbeat confidence
Snap policy

Compatibility:
BPM, key, energy, window-pair score

Collision:
Vocal, low-end, harmonic, rhythmic, masking, energy
Each with risk, confidence, mitigation, residual risk

Execution:
Selected mode
Recipe
Source list
Source budget
Automation events
Effects/filter plan

Fallback:
Recipe
Trigger conditions
Timing preservation policy

Validation:
Pre-render QC
Post-render QC
Warnings/errors
Explanation
```

---

## 5. Master Analysis and Safe Windows

Master analysis provides:

```text
BPM and confidence
Beat grid and downbeat confidence
Phrase candidates
Global key and confidence
Energy/density/low-end curves
Vocal density estimate
Loudness trim
Fade characteristics
Section candidates with confidence
Safe entry and exit window candidates
```

### Zero-as-unknown rule

```text
0:00 intro/drop/breakdown
≠ confirmed musical timestamp
```

It means:

```text
Unknown / low-confidence marker
```

Such markers cannot anchor complex Lite/High recipes.

---

## 6. Lite 2-Stem Eligibility Gates

Lite requires both vocal and instrumental assets, but readiness alone is not eligibility.

### Hard gates

```text
H1. Assets decoded, aligned, hydrated, and within duration bounds
H2. Requested/feasible/effective duration valid
H3. Phrase/downbeat confidence sufficient
H4. Predicted beat drift over effective overlap within mode threshold
H5. Outgoing vocal-safe exit exists
H6. Incoming safe instrumental or pre-vocal window exists
H7. Lite quality/artifact proxy acceptable
H8. Source budget does not exceed four active sources
H9. Low-end collision is mitigable
H10. Master fallback is ready
```

### Beat drift formula

```text
Drift in beats
=
abs(BPM A − BPM B) / 60 × effective overlap seconds
```

### Starting drift policy

| Context | Maximum drift |
|---|---:|
| Rhythmic/full-range overlap | 0.15 beat |
| Filtered/non-transient overlap | 0.35 beat |
| Ambient/low-transient overlap | 0.75 beat |

These are tunable starting parameters, not final universal constants.

### Conditional confidence policy

```text
Low beat/phrase confidence → reject complex Lite
Low key confidence → prohibit long tonal overlap, not every short reset
Low stem quality → reject Lite
High low-end overlap with no mitigation → reject Lite
```

---

## 7. Lite Vocal-Safe Handoff v2

### Purpose

Use Lite to prevent vocal collision while preserving master quality outside the bounded transition region.

### Source budget

| Source | Role |
|---|---|
| Outgoing master | Primary outgoing sound |
| Incoming instrumental stem | Controlled pre-vocal incoming bed |
| Incoming vocal stem | Delayed incoming vocal |
| Reserved slot | Fallback/takeover/effect reserve |

Maximum normal active Lite sources: **3**.

### Important restriction

During active Lite overlap:

```text
Do not naively crossfade incoming instrumental into incoming master.
```

Incoming master contains the same instrumental content and can create doubled instrumental/timbral artifacts.

### Preconditions

```text
Outgoing vocal is low/ended before incoming vocal stem begins
Incoming instrumental has safe entry window
Incoming vocal entry is safe and phrase aligned
Drift gate passes
Low-end mitigation exists where needed
Master fallback is armed
```

### Event sequence

```text
T0:
Outgoing master active
Incoming instrumental starts at silence
Incoming instrumental is high-passed/filtered if low-end risk exists

T0 → T1:
Incoming instrumental rises to controlled sub-master level
Outgoing master begins controlled fade

T1:
Outgoing vocal is confirmed low or ended
Incoming vocal stem begins at matching source offset

T1 → T2:
Incoming vocal rises
Outgoing master continues toward zero
Incoming instrumental remains controlled

T2:
Outgoing master reaches zero and stops

Post-transition:
Incoming vocal + incoming instrumental continue as Lite representation

Later safe phrase boundary:
Hard swap or very short validated takeover to incoming master
```

### First-version handoff policy

Prefer:

```text
Phrase-aligned hard swap with 10–30 ms anti-click fade
```

over a long incoming instrumental-to-master crossfade.

A short compensated master takeover is deferred until validation proves no timbral doubling or artifact issue.

---

## 8. Master Recipe Selection

When Lite gates fail, choose one prebuilt Master recipe.

| Dominant risk | Master recipe |
|---|---|
| Low collision, safe timing | Equal-power crossfade |
| Low-end collision | EQ handoff / incoming high-pass |
| Dense/harmonic material, short safe window | Short filtered transition |
| BPM/key mismatch, high risk | Echo/reverb reset |
| Multiple risks or uncertain analysis | Phrase-aligned cut |

### Pair A policy

```text
113 → 113 BPM
Same nominal key/energy
```

Lite only if vocal-safe exit, incoming safe instrumental window, and low-end/density gates pass.

Otherwise:

```text
Short Master EQ handoff or Master reset
```

### Pair B policy

```text
113 → 108 BPM
Different key label
High energy
```

Reject Lite overlap without true tempo synchronization.

Use:

```text
Master echo/reset or phrase-aligned cut
```

---

## 9. Source Ledger and Budget

A source stream is any active scheduled source, including masters and stems.

| Mode | Maximum active sources |
|---|---:|
| Master | 2 |
| Lite | 4 |
| High Quality | 8 |

### Ledger lifecycle

```text
Unloaded
Loading
Ready
Armed
Scheduled
Active
Fading
Stopped
Disposed
```

### Ownership rules

```text
One source → one owner
One source → one start event
One source → one stop event
One source → one decision object
```

No source may remain merely because it faded to zero.

---

## 10. QC Before Rendering

Every Lite decision requires:

```text
Source offsets within duration bounds
Requested/feasible/effective duration valid
Predicted drift within threshold
Source budget valid at every event interval
Outgoing vocal-safe exit valid
Incoming vocal-safe entry valid
Low-end overlap mitigated or rejected
No zero/unknown section used as anchor
Fallback source/recipe ready
Source ledger ownership valid
```

### Post-render checks

```text
Unexpected silence
Duplicate source playback
Effective duration match
Clipping/loudness issue
Vocal overlap
Low-end overlap
Source cleanup
```

### Step-down policy

```text
High → Lite → Master
```

Never step upward automatically after QC failure.

---

## 11. Playback Milestones

### Gate A

```text
Canonical Master two-song playback
```

### Gate B

```text
Canonical Lite two-song Vocal-Safe Handoff v2
```

### Gate C

```text
Canonical High Quality two-song bounded takeover
```

### Gate D

```text
Rolling multi-track playback built only after Gate B/C source ownership passes
```

### Gate E

```text
Preview and export consume identical decision object
```

---

## 12. Immediate Implementation Order

```text
1. Retire current generic Lite renderer from normal use
2. Enforce zero-as-unknown in all timing consumers
3. Implement Lite vocal activity/onset/offset analysis
4. Implement Lite instrumental low-band/density analysis
5. Implement drift-over-effective-duration gate
6. Build hard-gated canonical Lite decision
7. Prebuild Master fallback
8. Implement Lite Vocal-Safe Handoff v2
9. Validate two real track pairs
10. Rebuild rolling playback only after two-song success
```

---

## 13. Success Definition

MixMind succeeds when it can honestly choose:

```text
Master because simple is safer
Lite because vocal collision can be reduced
High because surgical stem control is justified
```

and can explain each choice without hidden duration changes, duplicate audio, forced overlap, or false stem claims.
