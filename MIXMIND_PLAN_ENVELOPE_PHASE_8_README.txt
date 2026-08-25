MixMind PlanEnvelope Phase 8

This update formalizes sealed Lite test plans as serializable PlanEnvelope
objects. Each contains a schema version, fingerprint, policy versions, source
geometry, safe pair, gate summary, execution directive, and prebuilt fallback.

It adds stale-plan protection: if the tracks/source offsets/pair timing change,
the old plan must be re-scanned and sealed again. No audio behavior is changed.

Install, restart, hard refresh, Scan Lite Pairs, seal a candidate, then run the
cue normally. This package is groundwork for later offline export parity.
