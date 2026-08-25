Master PlanSet Stale Policy — Phase 20

Adds explicit Rebuild Master Plans. Canonical Master ON behavior:
- no plan yet: builds initial plan;
- sealed current plan: plays;
- stale plan: refuses with clear error;
- user must click Rebuild Master Plans, then Play again.

Legacy OFF mode remains available. Test: Canonical ON -> Play -> Stop -> manually
change transition type -> Play must refuse -> Rebuild Master Plans -> Play works.
