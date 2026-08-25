Canonical Seek Transaction Fix — Phase 19E6

Fixes normal Canonical Master Beta seek state transitions. Internal seek teardown
now emits non-terminal SEEK/TEARDOWN state; only actual Stop and Completion emit
terminal states that can stop the main UI. Stable seek display time retains the
requested global position instead of resetting to zero.

Test Canonical Master ON: normal Play -> normal scrubber seek -> audio must
continue as one stable Master source. Then Stop -> Play again.
