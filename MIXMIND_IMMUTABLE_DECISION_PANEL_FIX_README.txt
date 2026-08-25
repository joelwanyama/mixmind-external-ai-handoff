MixMind Immutable Decision Panel Fix

This update makes the Canonical Decision panel and Pre-Render QC read ONE
canonical decision object during the same panel render. They can no longer show
information from separately recomputed planner calls.

Expected behavior
- If a decision says Lite is BLOCKED, the Canonical Decision panel and QC say so.
- If Lite passes its eligibility gate but MASTER is selected for another explicit
  reason, the panel reports the exact decision reason without inventing a Lite
  rejection.
- Existing Echo Out master fallbacks and your analysed/stem-prepared songs are
  not changed by this display-consistency fix.

Install
1. Stop MixMind.
2. Extract this ZIP into the main MixMind folder, replacing files.
3. Start MixMind.
4. Press Ctrl + Shift + R once in the browser.
5. Pause playback, click each Echo Out transition bar, and compare Canonical
   Decision with Pre-Render QC.

No re-analysis or stem preparation is required.
