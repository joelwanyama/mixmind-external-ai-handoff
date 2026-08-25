Public Transport Coordinator Phase E3

Wraps public AudioEngine Play/Stop/Seek in a serialized command queue, but routes
all commands to legacy internals only. Canonical beta remains disabled. This is a
legacy compatibility test for queue/recursion safety.

Test normal Play, Stop, Seek, preview, and rapid Play/Stop. Then Transport Audit
must show public and legacy counters incrementing with nestedPublicCommands 0.
