MixMind QC Gate Alignment Update

Purpose
This update fixes an on-screen contradiction where a Canonical Decision could correctly select MASTER / Echo Out because Lite was unsafe, while the Pre-Render QC line incorrectly displayed “Lite: PASS”.

What changed
The immutable canonical decision now saves the exact Lite eligibility gate used by the planner. The QC panel reads that saved gate instead of re-evaluating Lite against a later forced master fallback transition.

Expected result after updating
For a transition whose Canonical Decision says that no confirmed vocal-safe phrase window exists, Pre-Render QC must display:
  Lite: BLOCKED
and show the matching Lite safety reason.

Install on Windows
1. Close MixMind / stop the local server if it is running.
2. Extract this ZIP into your MixMind folder.
3. Allow Windows to replace existing files.
4. Start MixMind normally.
5. In Edge or Chrome, press Ctrl + Shift + R once to force a fresh reload.
6. Open the Mix tab, click the In My Head -> Lucid Dreams transition, and inspect Pre-Render QC.

No songs need to be reanalysed and no stems need to be prepared again.
