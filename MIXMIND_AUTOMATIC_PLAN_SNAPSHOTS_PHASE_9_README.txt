MixMind Automatic Plan Snapshots — Phase 9

Every time a Lite Test Plan is sealed, MixMind now saves a local JSON snapshot
in browser storage. It includes plan envelope, fingerprint/policy, safe source
timing, track metadata view, timeline order, and transitions. It never stores
or exports raw audio buffers.

The cue panel adds Download Plan Snapshot so a validated setup can be saved as
a JSON file for review/backup. It does NOT automatically restore an old plan or
override current analysis/playback.

Install, hard refresh, scan, seal a candidate. The cue panel will include
Download Plan Snapshot.
