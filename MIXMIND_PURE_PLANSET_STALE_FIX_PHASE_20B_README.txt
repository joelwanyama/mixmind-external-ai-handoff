Pure PlanSet Stale Fix — Phase 20B

Fixes the Phase 20 regression: PlanSet status/fingerprint comparison is now
pure and never builds/replaces a plan. Normal Canonical Master ON refuses when
no PlanSet exists or the PlanSet is stale. Use Rebuild Master Plans explicitly.

Test: Rebuild Master Plans -> Canonical ON Play works -> Stop -> change recipe
-> Canonical ON Play refuses -> Rebuild -> Play works again. Legacy OFF remains
available throughout.
