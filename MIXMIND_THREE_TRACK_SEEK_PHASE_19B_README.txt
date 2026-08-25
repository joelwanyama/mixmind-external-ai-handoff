Three-Track Seek Abort-and-Stabilize — Phase 19B

Adds test-only Seek A / Seek B / Seek C buttons to the three-track Master chain
panel. Each destroys the chain/session and starts exactly one stable Master
source at the selected track's sealed ownership boundary. It schedules no future
transition after a seek. Normal main seek remains unchanged.

Test: start chain, during A->B press Seek B, confirm STABLE MASTER TRACK 2 and
Sources 1/2. Then Stop. Repeat during B->C with Seek C.
