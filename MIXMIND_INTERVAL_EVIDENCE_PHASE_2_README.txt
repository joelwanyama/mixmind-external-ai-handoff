MixMind Protected Interval Evidence — Phase 2

Purpose
This update keeps the same conservative Lite threshold, but changes the evidence
question from:
  “Was one point at the beginning of the candidate quiet?”
to:
  “Was the complete protected source interval quiet?”

It checks the complete outgoing and incoming handoff intervals using cached Lite
vocal-activity frames. It adds a 0.25 second diagnostic tail/onset margin.
No threshold has been relaxed and no Lite renderer has been enabled.

Install
1. Stop MixMind.
2. Extract this ZIP into the main MixMind folder and replace files.
3. Start MixMind and press Ctrl + Shift + R.
4. Because the current screenshot says Lite collision analysis is unavailable,
   click Analyze Lite Activity once. This calculates activity only; it does NOT
   prepare stems again.
5. Wait for it to finish, then open the transition and click Audit Source Timing.

Expected result
The audit now also shows:
- Outgoing interval evidence: PASS / FAIL / MISSING
- Incoming interval evidence: PASS / FAIL / MISSING
- the inspected source interval
- maximum and mean vocal activity
- active frames
- tail margin and confidence

A FAIL is not a problem with the update. It means MixMind found vocal activity
somewhere inside the full protected interval, even if the first point was quiet.
