Canonical Master Beta Seek — Phase 19D

Adds Seek A / Seek B / Seek C to the full-timeline Master Beta panel. Each seek
aborts the PlanSet chain, tears down the session bus/decks, and starts exactly
one stable Master source at the selected sealed ownership boundary. It schedules
no future transition. Normal main seek remains unchanged.

Test during A->B: Seek B; during B->C: Seek C; then Stop each stable source.
