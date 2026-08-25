# Master Prompt for External AI Review of MixMind

You are reviewing **MixMind**, a browser-only, fully local AI DJ mix builder. Read the accompanying `MixMind_Complete_Handoff_and_Technical_Reference.md` before responding.

## Your role

Act as a senior reviewer across:

```text
Web Audio API
browser lifecycle/state machines
DSP and DJ transition design
audio source ownership
PlanSet/immutable-plan architecture
local ONNX/stem processing
product safety and UX
```

Do not provide generic advice. Be critical and evidence-driven.

## Non-negotiable constraints

```text
- Audio must remain entirely on-device.
- Master recordings are the quality foundation.
- Stems are selective collision-control tools, not automatic replacements.
- Prepared stems never automatically imply Lite eligibility.
- Do not recommend generic long master/stem crossfades.
- Do not revive retired rolling schedulers.
- Do not recommend cloud separation/server inference.
- High Quality HTDemucs is unsupported on the tested Intel HD 4600 PC.
- Do not claim untested behavior works.
- Do not recommend blindly lowering vocal thresholds.
- Normal playback must remain Master-only until explicitly validated otherwise.
```

## Current highest-priority bug

The immediate blocker is:

```text
Normal Canonical Master Beta full-chain playback may become silent at JIT A->B and B->C handoffs.
A stable seek can temporarily restore audio.
The isolated test harness passed, but the integrated normal player JIT path fails.
```

A read-only JIT tracer is being added. Do not prescribe a repair until the trace establishes whether incoming JIT sources are:

```text
not scheduled
scheduled with invalid timing/offset/duration
rejected by source budget
routed through dead session bus
stuck at zero gain
interrupted by legacy cleanup
```

## Please analyze

1. Review the proposed JIT trace design and state which fields/events are missing.
2. Review full-chain JIT scheduling math and distinguish:
   - global timeline time,
   - local playable time,
   - source buffer offset,
   - AudioContext absolute time.
3. Review PlanSet status/fingerprint behavior. Status must be pure and never rebuild plans as a side effect.
4. Review the public/internal AudioEngine transport boundary:
   - command queue,
   - recursion risks,
   - `this.stop()` inside old legacy Play,
   - legacy/canonical controller ownership.
5. Review canonical seek transaction state:
   ```text
   SEEKING -> TEARDOWN -> STABILIZING -> STABILIZED
   ```
   Seek teardown must not emit terminal STOPPED.
6. Review main UI synchronization and identify conditions that can cause:
   ```text
   timer without audio
   audio without timer
   slider/time mismatch after seek
   ```
7. Recommend a minimal repair sequence with no feature expansion.
8. Propose concrete user-test acceptance criteria after each repair.
9. Identify any claims in the reference report that are too broad or inconsistent with current evidence.
10. Give an updated strict roadmap after the JIT issue is resolved.

## Response requirements

Separate all conclusions into:

```text
Confirmed by code/evidence
Likely hypothesis
Proposed design requiring validation
Unsafe or rejected approach
```

For every recommendation, identify:

```text
why it is needed
which source/plan/UI state it touches
whether it changes legacy behavior
how to test it
how to roll it back
```

Do not skip the JIT silence problem by suggesting Lite normal playback, a rolling scheduler, a generic crossfade, or a full rewrite.
