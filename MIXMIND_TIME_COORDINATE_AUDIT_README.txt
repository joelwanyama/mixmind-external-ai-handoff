MixMind Time-Coordinate Audit — Phase 1

Purpose
This is the first evidence-only repair from the external architecture reviews.
It makes the Lite gate use the correct time contract when a Safe Window Pair is
present and adds a read-only audit panel.

What changed
- Adds explicit source/local/global time helpers.
- Treats Safe Window Pair starts as source-buffer time. They are no longer
  offset a second time by the playable source start.
- Keeps fallback timing conversion explicit: local playable time -> source time.
- Adds an “Audit Source Timing” button in an opened transition panel.
- Lets you download the audit as JSON for further external review.

What did NOT change
- No stems are re-prepared.
- No Lite threshold is relaxed.
- No Lite transition is forced.
- No renderer gain, normal playback, fallback, or rolling behavior is changed.

Install
1. Stop MixMind.
2. Extract this ZIP into the main MixMind folder and replace files.
3. Start MixMind.
4. Press Ctrl + Shift + R once in Chrome or Edge.
5. Open Mix and click a transition bar.
6. In the right panel, click “Audit Source Timing”.
7. Send a screenshot of the audit text, or use “Download Coordinate Audit JSON”.

How to read it
- Delta 0.000s: that selected track has no extra source offset; this mapping
  defect is dormant for that side of the transition.
- Delta greater than 0: the former safe-pair query would have inspected a later,
  incorrect source position by that many seconds. The corrected gate now checks
  the safe-pair source time itself.
