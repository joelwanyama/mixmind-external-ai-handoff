MixMind Forced Master QC Lock Fix

Why this update is needed
“Apply Safe Fallbacks” can deliberately lock a transition to MASTER / Echo Out.
That master safety lock must also block Lite in Pre-Render QC. Previously, a
new Lite calculation could report PASS even when the stored transition remained
locked to the safe Master fallback.

What changes
The immutable canonical decision now treats _forceMasterFallback as a hard Lite
block. Canonical Decision and Pre-Render QC will agree:
  Selected: MASTER
  Lite: BLOCKED

This does not change prepared stems, song analysis, or the existing Echo Out
fallback. It corrects the decision/QC truth shown on screen.

Install
1. Stop MixMind.
2. Extract this ZIP into the main MixMind folder and replace files.
3. Start MixMind, then press Ctrl + Shift + R in the browser.
4. Pause playback and inspect both Echo Out transition bars.

No stem preparation or re-analysis is required.
