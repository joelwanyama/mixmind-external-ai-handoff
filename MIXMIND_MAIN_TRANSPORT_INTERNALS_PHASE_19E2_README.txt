Main Transport Internals — Phase 19E-2

Captures legacy play/stop/seek as explicit internal aliases and exposes internal
Canonical Master Beta start/stop/seek methods. Beta startup now uses the internal
legacy stop alias, preventing future public Stop recursion.

No public Play/Stop/Seek delegation changes in this phase.
