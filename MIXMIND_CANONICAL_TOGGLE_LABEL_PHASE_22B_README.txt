MixMind Phase 22B - Canonical Toggle Label Sync
===============================================

Status: CODE-CHECKED. Trivial UI fix; verify in 5 seconds.

Problem (proven by code read)
-----------------------------
The Canonical Master toggle's choice PERSISTS correctly:
MixMindMainPlaybackCoordinator saves canonicalMasterPlaybackBeta to
localStorage (key mixmind.canonicalMasterBeta.settings.v1) and restores it
at module load; Play routes Canonical when the saved setting is ON.
BUT the toolbar button label is static HTML ("Canonical Master: OFF") and
nothing synced it at load. Result: after a reload with saved setting ON,
the engine runs Canonical while the button displays OFF - and a user who
clicks it "to enable" actually disables it. With Canonical now the daily
driver (Phase 22), this is a live foot-gun.

Fix
---
index.html only: a DOMContentLoaded script syncs #canonicalMasterModeBtn's
label to MixMindMainPlaybackCoordinator.getSettings().canonicalMasterPlaybackBeta.
No module changes; index.html is served no-store so a normal reload picks it up.

Verify (5 seconds)
------------------
1. Copy index.html into E:\job\mixmind (overwrite).
2. Reload the page (Ctrl+Shift+R).
3. The button must read "Canonical Master: ON" (your saved choice) - and the
   engine plays Canonical when you press Play. Toggle works as before.
