MixMind Playable Safe-Window Fix — Phase 1.1

Why this update exists
The first source-time audit found a real example:
- Incoming playable source offset: 17.778 seconds
- Previous safe-pair incoming candidate: 11.861 seconds

That candidate was before the point where the timeline item is allowed to begin.
It could not be a valid playable Lite handoff.

What this update fixes
- Safe-window candidates are now generated only inside each track item's
  playable source range.
- Pair planning rejects windows before a configured Drop Start / source offset.
- Canonical decision proposed timing keeps valid safe-pair coordinates as source
  time and does not add their offsets again.
- The test-only Lite v2 renderer uses the same source-time contract.
- No threshold is relaxed. If this makes Lite remain blocked, that is the correct
  result until interval evidence/candidate diagnostics are added.

What did not change
- No stems are re-prepared.
- No new playback path is enabled.
- Normal multi-track playback is unchanged.
- No rolling module is enabled.

Install
1. Stop MixMind and close its browser tab.
2. Extract this ZIP into the main MixMind folder.
3. Replace files if Windows asks.
4. Start MixMind normally.
5. Press Ctrl + Shift + R once in the browser.
6. Open the same transition and click Audit Source Timing again.

Expected audit result
The Incoming corrected query must no longer be before Incoming offset.
For example, if Incoming offset is 17.778 seconds, a valid selected incoming
safe-pair query must be 17.778 seconds or later.
