# Master Prompt: MixMind Hybrid Transition Architecture Review

You are acting as a senior audio DSP engineer, professional DJ transition designer, music-information-retrieval specialist, and real-time browser audio architect.

I am building **MixMind**, a browser-based automated DJ mixing application. I need you to analyze a real technical/musical problem in its transition engine and propose a technically sound strategy.

Do **not** give generic advice. Be precise. Distinguish:

- facts that follow from the architecture and observations;
- assumptions that need validation;
- near-term implementation steps;
- future/advanced research ideas;
- unsafe or misleading approaches that should be rejected.

Do not provide source code unless explicitly requested later. Focus first on architecture, audio logic, decision rules, validation, and implementation sequence.

---

# 1. Product Goal

MixMind is not intended to be a simple crossfader or a stem-separation product.

Its intended product identity is:

> A collision-aware transition intelligence engine that analyzes full master tracks, determines musically safe timing, identifies collision risks, and uses the lightest reliable stem capability only when it genuinely improves a transition.

The system has three processing levels:

| Mode | Available Sources | Intended Purpose |
|---|---|---|
| Master Only | Outgoing master + incoming master | High-reliability default and fallback |
| Lite 2-Stem | Vocals + Instrumental | Vocal collision prevention and instrumental-led entry |
| High Quality 4-Stem | Vocals + Drums + Bass + Other | Surgical vocal, drum, bass, and harmonic control |

Critical principle:

> Master recordings should remain the sound-quality foundation. Stems should be selective transition tools, not automatic full-master replacements.

---

# 2. Current Master Analysis Role

Master analysis currently attempts to determine:

- BPM and BPM confidence;
- global key and key confidence;
- beat grid;
- downbeat/phrase information;
- energy curve and scalar energy;
- intro, drop, breakdown, and outro candidates;
- loudness/trim;
- master vocal-density/texture estimate;
- transition compatibility score;
- automatic song order and transition suggestions.

The intended division of responsibility is:

```text
Master analysis decides where and when a transition can happen.
Stem mode decides what elements can enter, leave, or be reduced at that point.
```

Known master-analysis caveat:

- Some songs have low-confidence structural analysis, with intro/drop/breakdown values displayed as 0:00.
- Zero should mean “not confidently detected,” not a confirmed musical section.
- Key confidence may be medium or low.
- Existing transition timing may be phrase/downbeat aligned but still needs further safe-window improvement.

---

# 3. Current Lite 2-Stem Model

Lite mode creates:

```text
Vocals
Instrumental / accompaniment
```

It does **not** create separate drums, bass, or other/melody stems.

Therefore Lite must never claim to perform:

- true bass swap;
- true drum swap;
- true other/melody swap;
- true isolated low-end control.

Lite’s valid intended use is:

- vocal handoff;
- vocal collision avoidance;
- incoming instrumental-first entry;
- delayed incoming master/vocal entry;
- vocal/instrumental overlay only when safe;
- filtered instrumental overlap.

---

# 4. The Actual Failure Observed in Real Testing

Lite stems successfully prepared and were marked ready. Playback was technically stable after source/seek repairs, but the musical transition quality was poor.

The user observed:

1. Two vocals overlap.
2. Outgoing song remains loud too far into incoming song.
3. Both instrumentals overlap and clash/noise occurs.
4. Low end can become muddy.
5. Transition points are sometimes acceptable but could be better.
6. Strange handoff/timbral change happens.
7. In multi-song rolling tests, earlier source lifecycle bugs caused duplicate playback and track truncation; those experimental rolling paths have been retired pending rebuild.

Two real examples:

## Pair A

```text
Armed And Dangerous
→ Blood On My Jeans

113 BPM → 113 BPM
Key 11A → Key 11A
Energy 9 → Energy 9
```

The application rated this highly compatible, but the user heard vocal overlap and instrumental clutter during a long transition.

## Pair B

```text
Blood On My Jeans
→ All Girls Are The Same

113 BPM → 108 BPM
Key 11A → Key 8B
Energy 9 → Energy 10
```

The application selected a Filter Sweep / Lite Vocal-style transition. The user heard beat mismatch, prolonged outgoing audio, and noisy/clashing overlap.

Important technical fact:

The current Lite renderer does **not** perform true tempo synchronization of incoming instrumental/master to the outgoing master.

For 113 BPM versus 108 BPM:

```text
BPM difference = 5 BPM
Beat-rate difference = 5 / 60 = 0.0833 beats per second
```

Therefore approximate drift is:

| Overlap Duration | Beat Drift |
|---:|---:|
| 3 seconds | 0.25 beat |
| 6 seconds | 0.50 beat |
| 12 seconds | 1.00 beat |
| 32 seconds | 2.67 beats |

This means long unwarped Lite overlap is not rhythmically safe for that pair.

---

# 5. Current Lite Rendering Concept and Its Problem

The current Lite concept was approximately:

```text
Outgoing master begins as quality foundation
Incoming instrumental begins at transition start
Outgoing master fades across transition
Incoming master begins later
Incoming instrumental fades into incoming master
```

This is conceptually reasonable, but current execution is too generic.

It does not yet reliably use:

- actual outgoing vocal phrase ending;
- actual incoming vocal onset;
- incoming instrumental density;
- low-end activity;
- harmonic density;
- overlap-duration-dependent BPM drift;
- per-pair Lite eligibility;
- per-pair recipe selection;
- explicit fallback selection.

As a result, Lite can be chosen merely because Lite assets are ready, even when master-only reset/cut/EQ transition would be better.

---

# 6. Critical Architectural Constraints

## 6.1 One canonical execution path

Each transition must execute exactly one recipe:

```text
Master recipe
OR
Lite recipe
OR
High Quality recipe
```

Never allow competing schedulers or duplicated master/stem source paths.

## 6.2 Master quality foundation

Do not automatically replace both master tracks with separated stems.

## 6.3 Source stream budget

A source stream means any active scheduled audio source, including masters and stems.

Initial maximum total active source budgets:

| Mode | Maximum Active Sources |
|---|---:|
| Master | 2 |
| Lite | 4 |
| High Quality | 8 |

## 6.4 Fallback

Every stem recipe must include a planned master fallback.

Fallback should preserve, where possible:

- global transition start;
- source offsets;
- effective overlap;
- phrase/downbeat alignment.

## 6.5 Tempo policy

Without true tempo synchronization, overlap safety must depend on predicted beat drift over the actual overlap duration, not only BPM percentage difference.

## 6.6 Effective duration policy

Every transition must distinguish:

```text
Requested duration
Feasible duration
Effective rendered duration
```

Never silently shorten requested duration.

---

# 7. Current Canonical Architecture Goal

The intended long-term chain is:

```text
Master Analysis
→ Safe Window Generator
→ Collision Risk Engine
→ Per-Transition Mode Selector
→ Immutable Canonical Transition Decision Object
→ Recipe Primitive Builder
→ Canonical Renderer
→ Quality Control
→ Planned Fallback
```

The renderer should be as “dumb” as possible. It should not independently choose timing, mode, recipe, or fallback.

---

# 8. Required Collision Categories

For every candidate transition window, score both risk and confidence for:

```text
Vocal collision
Low-end collision
Harmonic collision
Rhythmic collision
Arrangement density / spectral masking
Energy discontinuity
```

The system should use hard gates before creative scoring.

Example:

```text
High vocal risk + low vocal-boundary confidence
→ do not attempt complex Lite vocal handoff
→ choose conservative master recipe
```

---

# 9. Requested Analysis

Provide a detailed recommendation for how MixMind should solve the Lite transition quality problem.

Address all of the following.

## A. Validate or challenge the core premise

Is master-assisted Lite rendering the correct strategy?

If yes, specify the exact source ownership sequence.

If no, propose a better architecture and explain why.

## B. Define precise Lite eligibility gates

What must be true before Lite is selected?

Include:

- BPM drift over effective duration;
- phrase/downbeat confidence;
- outgoing vocal condition;
- incoming vocal condition;
- incoming instrumental density;
- low-end risk;
- harmonic/key confidence;
- stem artifact/quality proxy;
- maximum safe overlap duration.

Distinguish hard exclusions from soft scoring factors.

## C. Define exact Lite handoff semantics

Specify, in audio timeline order:

- outgoing master behavior;
- incoming instrumental start time/offset/gain/filter;
- incoming master entry time/offset/gain;
- incoming instrumental fade-out;
- outgoing master fade/stop;
- maximum allowed overlap;
- required source budget;
- fallback behavior.

Avoid vague phrases such as “fade later.” Use explicit event sequencing and conditions.

## D. Recommend Master-only alternatives

For unsafe Lite pairs, specify when to use:

- equal-power crossfade;
- EQ handoff;
- high-pass/low-pass transition;
- echo/reverb reset;
- phrase-aligned cut.

Apply this specifically to the two example pairs above.

## E. Define a minimum viable collision engine

What signals can be implemented now, in a browser, without requiring impossible ground truth or advanced research?

Separate:

- immediate practical signals;
- later advanced signals.

## F. Define validation/QC before rendering

What should MixMind check before allowing a Lite recipe?

Include:

- source duration;
- effective duration;
- predicted drift;
- stream budget;
- active source ownership;
- vocal overlap;
- low-end overlap;
- fallback readiness.

## G. Define testing strategy

Give a test matrix for:

- vocal-heavy same-BPM tracks;
- different-BPM tracks;
- incompatible-key tracks;
- sparse instrumental intros;
- dense vocal intros;
- stop/pause/seek behavior;
- preview/export parity.

## H. Identify wrong assumptions

List any assumptions in this current design that should be rejected or changed.

---

# 10. Response Format Required

Use this structure:

1. Executive verdict.
2. What is definitely wrong now.
3. What is correct and should remain.
4. Recommended Lite recipe timeline.
5. Lite hard gates.
6. Master fallback decision tree.
7. Minimum viable collision engine.
8. Two example-pair decisions.
9. Source budget/ownership rules.
10. Validation/QC checklist.
11. Testing plan.
12. Phased implementation order.
13. Risks and assumptions to reject.

Do not write code unless explicitly requested in a later prompt.
