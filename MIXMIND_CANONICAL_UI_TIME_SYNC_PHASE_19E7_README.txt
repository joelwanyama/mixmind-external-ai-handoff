Canonical UI Time Sync Phase 19E7

Fixes normal slider/time display in Canonical Master Beta. The main UI update
loop now asks the active beta controller for global display time, PlanSet total,
and track starts instead of deriving time solely from original mixStartTime.

Test Canonical Master ON: Play -> normal scrubber seek. The timer and slider
must land at the seek target and continue moving with audible stable audio.
