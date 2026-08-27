MixMind Phase 21B - JIT Tracer Enable() Fix
============================================

Status: CODE-CHECKED (syntax + node functional tests). NOT YET USER-TESTED.

Problem
-------
User ran the Phase 21 JIT trace procedure exactly as instructed
(enable -> Canonical Master ON -> Rebuild -> Play -> let A->B go silent ->
JIT Trace) and got "Canonical JIT Trace (0 events)" / console dump '[]'.

Root cause (reproduced and proven in node against the shipped file)
-------------------------------------------------------------------
mixmind-beta-jit-tracer.js defined its state (enabled flag + events array)
AS PROPERTIES on an object that was then wrapped in Object.freeze(T).
The IIFE runs in strict mode ('use strict'), so the first statement of
enable() - `this.enabled=true` - throws:

    TypeError: Cannot assign to read only property 'enabled' of object '#<Object>'

Result: enable() could never succeed; the flag stayed false; every
MixMindBetaJitTracer.log() call in mixmind-canonical-master-beta.js was a
silent no-op; every trace was 0 events. The tracer had never been run
before, so the bug was never caught. This says NOTHING about the
A->B/B->C silence root cause - the evidence run must be repeated.

Fix
---
mixmind-beta-jit-tracer.js (versioned ?v=jit-trace-20260827-2 in index.html):
- `enabled` flag and `events` array moved into the closure (unfrozen).
- The frozen object now exposes only the API plus a read-only `enabled`
  getter (MixMindBetaJitTracer.enabled is still readable for verification).
- enable()/disable() log a one-line console.info confirmation so the user
  gets visible feedback that enabling worked.
- API surface unchanged: enable, disable, log, dump, show.
- No playback/scheduling/gain/PlanSet logic touched anywhere.

Verification performed (code-check level)
-----------------------------------------
- node --check: syntax OK.
- node functional suite (10/11 pass; the 1 "fail" is a test-harness
  artifact: in node's sloppy mode a write to the frozen API silently no-ops
  instead of throwing, and the getter was confirmed to still return the
  correct live state afterwards, so freeze integrity holds):
  * enable() does not throw
  * .enabled reflects real state after enable/disable cycles
  * log() captures events with event/ctxTime/state fields intact
  * log() ignored while disabled; re-enable clears events
  * log() safe when AudioEngine / MixMindCanonicalMasterBeta are absent
- Reproduction of the ORIGINAL bug: old file's enable() throws the
  TypeError above and enabled stays false (proven, not assumed).

Re-test procedure (user, Windows PC, http://localhost:8765/)
-------------------------------------------------------------
1. Back up E:\job\mixmind (BACKUP_MIXMIND_BEFORE_UPDATE.bat).
2. Copy index.html + mixmind-beta-jit-tracer.js (+ this txt) into
   E:\job\mixmind, overwriting.
3. RESET_AND_START_MIXMIND_WINDOWS.bat, open the app, hard reload (Ctrl+Shift+R).
4. Console: MixMindBetaJitTracer.enable()
   MUST print: [MixMindJitTracer] enabled - capturing read-only JIT events.
   (Optional check: MixMindBetaJitTracer.enabled -> true)
5. Stop -> Canonical Master: ON -> Rebuild Master Plans -> normal Play from 0:00.
6. Let A->B (and B->C if 3 tracks) go silent; touch nothing.
7. JIT Trace toolbar button -> panel appears with events.
8. Console: copy(JSON.stringify(MixMindBetaJitTracer.dump(),null,2)) -> send it.
9. Cleanup: Stop -> Canonical Master: OFF.

Expected this time: at minimum FULL_CHAIN_START + DECK_SCHEDULED(TRACK_A);
if the JIT path runs, TRACK_B_JIT_TRIGGER + DECK_SCHEDULED(TRACK_B).
If it is STILL 0 events after the green enable confirmation, that changes
the diagnosis (start() never executed) and we investigate routing next.
