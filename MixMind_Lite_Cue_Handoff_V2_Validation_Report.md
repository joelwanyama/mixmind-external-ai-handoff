# MixMind Lite Vocal-Safe Handoff v2 — Controlled Validation Report

**Date:** 13 August 2026

## Scope

This report records only the verified behavior of the **test-only, two-song sealed cue harness**. It does not claim that normal Mix playback, multi-track Lite playback, rolling playback, or export parity is ready.

## Validated architecture

```text
Master analysis / safe-window evidence
-> intrinsic Lite candidate scan
-> drift-limited feasible overlap
-> sealed Lite test plan
-> bounded cue harness
-> outgoing master + filtered incoming instrumental
-> incoming master takeover
```

## Safety conditions used

- Source-time coordinate audit and playable-range enforcement.
- Full protected-interval vocal evidence.
- Strict unwarped beat-drift limit of approximately 0.15 beats.
- 108 BPM <-> 113 BPM candidates constrained to approximately **1.79 seconds** effective overlap.
- Three-source maximum:
  1. outgoing master,
  2. incoming instrumental,
  3. incoming master.
- Cue harness has no Pause or Seek. It intentionally uses Start/Restart and Stop only.
- Cue-session output bus isolates cue audio from the shared MixMind master graph.

## User-tested candidate directions

### A. Cigarettes -> All Girls Are The Same

**Plan:** `lite-test-46fa07c7`  
**Direction:** track 2 -> track 1  
**Effective overlap:** approximately 1.79 seconds, drift-limited.

### Listening result

| Criterion | User result |
|---|---|
| Incoming song audible | Pass |
| Vocal overlap | None heard |
| Outgoing song remained too loud | No |
| Instrumental clutter/noise | None heard |
| Click/pop/silence/abrupt handoff | None heard |
| Audible BPM timing problem | None heard |

### Transport result

| Test | Result |
|---|---|
| Full cue completion | Pass |
| Stop during PRE-ROLL | Pass |
| Stop during UNDERLAY | Pass |
| Stop during POST-HANDOFF | Pass |
| No later scheduled audio after Stop | Pass |
| Rapid Start / Stop / Restart | Pass |
| Source budget / completion cleanup | Pass: 0/3 after completion |

### B. All Girls Are The Same -> Cigarettes

**Plan:** `lite-test-2d3a7d2c`  
**Direction:** track 1 -> track 2  
**Effective overlap:** approximately 1.79 seconds, drift-limited.

### Listening result

| Criterion | User result |
|---|---|
| Incoming song audible | Pass |
| Vocal overlap | None heard |
| Outgoing song remained too loud | No |
| Instrumental clutter/noise | None heard |
| Click/pop/silence/abrupt handoff | None heard |
| Audible BPM timing problem | None heard |

### Transport result

| Test | Result |
|---|---|
| Full cue completion | Pass |
| Stop during UNDERLAY | Pass |
| No later scheduled incoming-master audio | Pass |

## Cue-harness hardening achieved during validation

The validation process found and repaired:

1. Full-song test timing was unsuitable for a transition inspection harness.
2. Cue harness now begins with a bounded pre-roll before the sealed transition point.
3. AudioParam automation overlap was repaired by ending underlay gain automation before the separate takeover fade.
4. Master/stem buffer selection now verifies real AudioBuffer availability.
5. Cue panel exposes plan ID, pair direction, state, phase, source count, timing, and errors.
6. A dedicated cue-session bus now routes cue audio before MixMind master gain.
7. Cue Stop disconnects session output first, then stops sources and clears session state.
8. Stop control uses pointer-down because animation-frame panel rendering could replace ordinary click targets during a click.

## What is now verified

MixMind has demonstrated that **two genuine, evidence-approved, drift-limited Lite 2-stem handoffs can be executed cleanly in an isolated two-song cue harness**, in both directions, on the user’s Windows PC.

## What is not verified

Do not claim any of the following yet:

- normal Mix player uses sealed Lite plans;
- normal multi-track playback is canonical;
- rolling playback is safe;
- arbitrary cue Pause/Seek is supported;
- WAV/export output matches the cue renderer;
- automatic Lite eligibility is reliable on large/different libraries;
- High Quality HTDemucs is viable on this hardware.

## Recommended next engineering phase

Do not move directly to normal multi-track Lite playback.

1. Freeze the cue harness as a regression test.
2. Formalize the current in-memory sealed plan into a durable PlanEnvelope:
   - plan ID,
   - input fingerprint,
   - policy versions,
   - source offsets,
   - gate trace,
   - fallback,
   - stale-plan behavior.
3. Add gate-trace/candidate evidence persistence and user-visible plan status.
4. Add offline export parity for the same sealed two-song plan.
5. Only after cue/export parity, migrate **Master-only** normal playback to canonical plans.
6. Only after that, consider allowing one sealed Lite pair inside normal playback.

Retired rolling modules must remain disabled.
