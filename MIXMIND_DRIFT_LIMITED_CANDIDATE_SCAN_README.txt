MixMind Drift-Limited Candidate Scan

The prior landscape scan correctly found that 108 BPM <-> 113 BPM pairs were
blocked because the requested overlap exceeded the strict 0.15-beat drift limit.
This update does not relax that limit. Instead, it computes the maximum feasible
unwarped Lite overlap under the same safety cap:

  maximum overlap = 0.149 * 60 / absolute BPM difference

For a 5 BPM difference, this is about 1.79 seconds.

The scan now evaluates candidate windows using that shorter feasible duration,
then reports whether vocal/entry evidence is the next blocker. This is
read-only and does not modify current transitions or playback.

Install, Ctrl+Shift+R, then click Scan Lite Pairs and send a screenshot.
