MixMind Phase 22 - Stabilized Continuation (v3-parity slider seek in Canonical)
================================================================================

Status: CODE-CHECKED + SMOKE-TESTED (4 scenarios / 36 assertions, node harness
with real tracer + ledger + edited beta module). NOT YET USER-TESTED.

Context
-------
User decision (2026-08-27): Canonical Master becomes the daily driver. The
blocker was slider seek: the Phase 19B "Abort-and-Stabilize" design tore down
the whole chain and played only ONE track from the seek point, stopping when
that track ended. v3 (MixMind_frontend_v3.html) instead continues the whole
mix from the seek point (scheduleMixFrom). User: "it worked fine in the
attached html". Phase 22 brings v3 parity to Canonical.

Also note: the original A->B/B->C JIT silence is USER-VERIFIED RESOLVED in a
clean deployment (full chain from 0:00, untouched, played well throughout).
Retired as not reproducible in the verified build (original cause was never
proven; the Phase 21 tracer was broken when first attempted, so no early
evidence exists).

Design (mixmind-canonical-master-beta.js, ?v=master-beta-20260827-8)
--------------------------------------------------------------------
One mechanism change: seekGlobal() no longer builds a one-shot stable run.
It re-bases the sealed plan's timebase:

    t0' = seekWallTime - target        (global time T maps to "now")

- The seeked track (owner) resumes from its seek offset and plays to the end
  of its PLANNED span (outgoing transition end), not the raw buffer remainder.
- The existing JIT chain watcher is generalized from hardcoded A/B/C to a loop
  over remaining boundaries k = owner .. last, with one guard:
  transitions with e[k].globalStart <= target were passed by the seek and are
  skipped. Every later boundary fires on the re-based timebase with the
  EXACT same handoff code as plain playback (deck + enter + echo + probes).
- Plain playback (start()) is the same code path with first=0, target=0 -
  behavior is provably unchanged (regression scenario S1).
- getDisplayTime() simplifies to ctx.currentTime - t0, which for a re-based
  run continues the mix-relative clock from the seek point (slider stays on
  the full-mix scale, v3-style).
- Last-track seeks have no remaining boundaries: they play out to the end of
  the track and complete (the old one-shot behavior, which is correct there).
- Seeking into an overlap region lands on the incoming track (owner rule,
  unchanged); its outgoing handoff still fires; the passed one is skipped.

What intentionally changed vs Phase 19B
---------------------------------------
19B "Abort-and-Stabilize" (seek = one track, then stop) is REPLACED by
continuation, per explicit user request. The 19B-verified seek test cases
(Seek A/B/C, A+5s etc.) now continue the mix instead of stopping at the
track end - same landing behavior, plus the rest of the chain.

Smoke test (node, mock Web Audio with working onended lifecycle)
----------------------------------------------------------------
S1 plain 3-track chain: byte-equivalent behavior to Phase 21C
   (deck A dur 5.5; B at A+4 dur 5.5; C at A+8 full buffer; 16 probes;
   RUNNING -> COMPLETED). PASS.
S2 play then seek t=2 (mid track 0): REBASED_RUN{target:2,first:0}; resumed
   deck offset 2 dur 3.5; B handoff at plan spacing, C handoff 4s after B;
   plan spacing preserved; COMPLETED. PASS.
S3 play then seek t=5.5 (mid track 1): owner 1, offset 1.5, dur 4; B handoff
   correctly SKIPPED (passed by seek); C handoff fired; COMPLETED. PASS.
S4 play then seek t=9 (last track): owner 2, offset 1, dur 11; no handoffs;
   COMPLETED. PASS.
36/36 assertions passed, 0 probe errors in all scenarios.

User verification (5 quick checks - that's all)
-----------------------------------------------
Prereq: install, Canonical Master ON, Rebuild Master Plans.
1. Plain play from 0:00, touch nothing: full chain to the end, sound through
   every transition. (regression)
2. Play; ~20s in, click the slider at an earlier point in track A: audio
   plays from there, the A->B transition still happens (echo/fade), B plays
   to the end. (THE new behavior)
3. Play; wait until track B is clearly playing; click the slider inside the
   B region: plays from that point in B and continues (B->C if 3 tracks).
4. Click the slider inside the LAST track: plays to the end of that track,
   then stops (nothing follows it).
5. Stop works any time; then Canonical Master OFF: normal (legacy) play +
   slider still behaves like v3.

If any check misbehaves: run MixMindBetaJitTracer.enable() first, repeat that
one check, JIT Trace toolbar button, paste the dump - the new REBASED_RUN and
STABLE_SEEK_SOURCE(rebased:true) events show exactly where it diverged.
