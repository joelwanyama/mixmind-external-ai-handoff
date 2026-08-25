MixMind Lite Vocal-Safe Handoff v2 — Test-Only Update

What this is
A replacement for the old generic Canonical Lite two-song test renderer.
It does NOT change normal multi-track playback and does NOT restore any rolling
or experimental full-mix scheduler.

Hard requirements before it can run
- Exactly two songs are in the test timeline.
- Both have Lite stems prepared and hydrated.
- The immutable canonical decision selects LITE.
- The Lite collision gate passes: confirmed vocal-safe outgoing exit, confirmed
  incoming pre-vocal instrumental window, safe drift, and a valid safe-window pair.

What it renders
1. Outgoing master remains the quality foundation.
2. Only incoming instrumental enters during the approved overlap; it starts
   silent, fades in below full level, and is high-pass filtered.
3. Incoming vocals are withheld during the gate-confirmed pre-vocal window.
4. At the safe handoff boundary, incoming master takes over with only a very
   short anti-click ramp. It is not a generic master/stem blend.
5. Source ledger maximum: 3 active sources.

What happens for the songs currently shown in MixMind
The test remains unavailable. That is correct: both currently examined pairs are
MASTER / Echo Out fallbacks and Lite is blocked. Do not force Lite on them.

Install
1. Stop MixMind.
2. Extract this ZIP into the main MixMind folder, replacing files.
3. Start MixMind and press Ctrl + Shift + R in the browser.

No stem preparation or re-analysis is needed for this update.
