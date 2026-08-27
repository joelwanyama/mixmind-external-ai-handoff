MixMind Phase 21C - Read-only Boundary Gain/Signal Probes
==========================================================

Status: CODE-CHECKED + SMOKE-TESTED (node harness with real tracer/ledger/beta
modules). NOT YET USER-TESTED.

Why this exists
---------------
Phase 21 trace (user run, 6 events) proved for the A->B boundary:
  * TRACK_B_JIT_TRIGGER fired (runGlobal 148.31, 5s early window OK)
  * TRACK_B deck scheduled: sourceOffset 0, sourceDuration 227.532 ==
    bufferDuration (valid, full buffer), sourceWhen == t0+globalStart exactly
  * busConnected true throughout; ledger 1->2 within budget (no false rejection)
Rules out: C-1 (tick never fires), C-4 (stale ledger/budget), C-6 (invalid
offset/duration), C-2 (stale timebase - all offsets mutually consistent).
The scheduling side is clean. What the trace CANNOT see (Web Audio fact:
AudioParam automation is not enumerable) is the actual gain values, the
signal actually flowing, and whether the transport stays alive at the
boundary. Remaining suspects: enter()/echo() automation not taking effect,
downstream mute (masterGain), or transport-level teardown mid-run.

What was added (mixmind-canonical-master-beta.js, ?v=master-beta-20260827-7)
-----------------------------------------------------------------------------
Strictly read-only instrumentation, armed ONLY while the JIT tracer is
enabled (MixMindBetaJitTracer.enabled). Normal playback with the tracer off
is byte-for-byte the same code path as before (probe code returns
immediately).

At each JIT boundary (A->B and B->C), after deck()+enter()+echo():
  * two new AnalyserNode taps are connected (read-only: B-incoming gain
    output, session bus output). Existing routing is NOT modified.
  * 8 samples at tRel = -0.5, 0, 0.1, 0.3, 0.75, 1.5, 3, 6 seconds relative
    to the boundary, each logged as GAIN_PROBE with:
      inGain   incoming deck gain .value (actual automation result)
      outGain  outgoing deck gain .value
      inRms    signal RMS at incoming gain output (is B producing audio?)
      busRms   signal RMS at session bus output
      busOut   session bus out gain .value
      master   AudioEngine.masterGain.gain.value (downstream mute check)
      isMuted  AudioEngine.isMuted
      compDb / limDb  compressor/limiter reduction in dB
      ctxState, betaState, legacyPlaying (AudioEngine.isPlaying),
      mode (mainEngine.mode), ledger count
The STABLE_SEEK path (known-good, user-verified) arms the same probes as
GAIN_PROBE_CONTROL at tRel 0.3/1/3/6 - a built-in control so a healthy
reading can be compared side by side in the same trace.
Probe analyser taps are disconnected in teardown(); all probe code is
try/catch wrapped so a probe bug can never affect playback.

Verification (code-check + smoke test)
--------------------------------------
* node --check: syntax OK.
* Node smoke test (real 21B tracer + real ledger + edited beta module, mock
  Web Audio with working onended lifecycle): full 3-track chain ran;
  DECK_SCHEDULED x3, TRACK_B_JIT_TRIGGER, TRACK_C_JIT_TRIGGER, 16x
  GAIN_PROBE (8 per boundary), 0 probe errors, no control probe without
  seek, RUNNING emitted. PASS.

Healthy reading (what we expect if everything works)
----------------------------------------------------
  tRel -0.5 : inGain 1.0 (pre-automation default) / inRms 0 (B not started),
              outGain = trim, busRms > 0, master 0.7, betaState RUNNING,
              legacyPlaying true, mode CANONICAL_BETA
  tRel  0   : inGain 0 (enter() setValueAtTime takes effect)
  tRel 0.1  : inGain ~0.4*trim (mid 0.25s ramp), inRms rising
  tRel 0.3+ : inGain = trim, inRms > 0 and sustained; outGain -> 0 by 0.75
  tRel 3/6  : inGain = trim, inRms > 0 (B still playing)

Diagnosis map (what each breakage means)
----------------------------------------
  inGain stuck at 0 / wrong value          -> enter() automation defect
  inGain = trim but inRms = 0              -> B source producing no signal
  inRms > 0 but busRms = 0                 -> bus tap/routing anomaly
  busRms > 0 but master = 0 or isMuted     -> downstream mute at boundary
  busRms > 0, master 0.7, compDb very
  negative                                  -> compressor limiting hard
  betaState != RUNNING or legacyPlaying
  flips false mid-run                      -> transport teardown at boundary
  mode != CANONICAL_BETA                   -> coordinator state lost

Re-test procedure (user, Windows PC, http://localhost:8765/)
------------------------------------------------------------
1. Back up (BACKUP_MIXMIND_BEFORE_UPDATE.bat).
2. Copy index.html + mixmind-canonical-master-beta.js (+ this txt) into
   E:\job\mixmind, overwriting.
3. RESET_AND_START_MIXMIND_WINDOWS.bat, open app, Ctrl+Shift+R.
4. Console: MixMindBetaJitTracer.enable()
   (must print: [MixMindJitTracer] enabled - capturing read-only JIT events.)
5. Stop -> Canonical Master: ON -> Rebuild Master Plans.
6. OPTIONAL control run (skip if unsure - step 7 alone is enough):
   Press Play, wait ~3 seconds, click ONCE anywhere on the progress slider
   (the run jumps smoothly to that point), wait ~8 seconds, press Stop.
   This records a GAIN_PROBE_CONTROL baseline for comparison.
7. Normal Play from 0:00 (fresh full chain). Let A->B go silent (and B->C
   if 3 tracks). Keep playing for ~8 seconds past the LAST boundary
   (probes finish at boundary+6s), then Stop.
8. JIT Trace toolbar button; then console:
   copy(JSON.stringify(MixMindBetaJitTracer.dump(),null,2)) -> send it here.
   (Do NOT re-run enable() before the dump - events from both runs
   accumulate in the same buffer. Re-enabling would erase them.)
9. Cleanup: Canonical Master: OFF.

The dump will contain GAIN_PROBE sequences for every boundary. Whatever one
line deviates from "healthy reading" is the defect - and we fix exactly
that, and nothing else.
