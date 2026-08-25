# MixMind Sealed Lite Cue — Export Parity Validation

**Date:** 14 August 2026

## Current validated plan

```text
Direction: Cigarettes (SPOTISAVER) -> All Girls Are The Same (SPOTISAVER)
Current candidate source timing:
  Outgoing source start: 224.00s
  Incoming source start: 0.00s
Effective Lite overlap: 2.25s
BPM delta in current metadata: 0
Drift: 0.000 beats
```

## Why this plan was found

The Candidate Landscape Evidence Inspector established:

```text
A six-second protected interval failed because incoming vocal activity begins
inside longer candidate windows.

A shorter duration ladder found fully proven candidates at:
  2.25s
  2.00s
  1.75s
  1.50s
```

The selected 2.25-second candidate had:

```text
Outgoing evidence: PASS
  max vocal activity: 0.000
  active frames: 0/10

Incoming evidence: PASS
  max vocal activity: 0.014
  active frames: 0/10

Drift: 0.000 beats
```

## Live cue validation

User confirmed during the current sealed cue run:

```text
Incoming song audible after actual handoff: PASS
Vocal overlap: none heard
Outgoing song too loud: no
Instrumental clutter/noise: none heard
Click/pop/silence/abrupt handoff: none heard
BPM timing: good
```

The cue's initial outgoing-only pre-roll was correctly identified as intentional test context, not a transition defect.

## Transport validation

The bounded cue harness previously passed:

```text
Completion cleanup
PRE-ROLL Stop
UNDERLAY Stop
POST-HANDOFF Stop
Rapid Start / Stop / Restart
No delayed scheduled audio after Stop
Cue output bus isolation
```

## Offline export parity

The user exported the exact sealed cue plan through OfflineAudioContext and confirmed all listening checks passed.

```text
Offline WAV matches live cue behavior: PASS
Incoming audibility: PASS
No vocal overlap: PASS
No outgoing loudness problem: PASS
No clutter/noise: PASS
No click/pop/silence: PASS
BPM timing: PASS
```

## Verified scope

MixMind has now validated both live and offline execution of a sealed, short Lite Vocal-Safe Handoff plan.

```text
Candidate discovery -> sealed PlanEnvelope -> live cue -> offline cue WAV
```

## Remaining limits

This does not yet validate:

```text
Normal multi-track Lite playback
Normal Mix player use of sealed Lite plans
Rolling playback
Full-mix export parity across many transitions
Pause/seek in the cue harness
High Quality 4-stem processing/playback
```

## Recommended next phase

Migrate normal playback to consume canonical **Master-only** plan envelopes first. Do not insert Lite into normal multi-track playback yet.

Requirements for that migration:

```text
Each adjacent pair has a current PlanEnvelope.
Master fallback recipe is prebuilt.
Stale plans are rejected/replanned before playback.
Source ownership and ledger rules remain bounded.
Normal player timing/UI reflects canonical plan timing.
Legacy playback remains an explicit fallback during initial migration.
```
