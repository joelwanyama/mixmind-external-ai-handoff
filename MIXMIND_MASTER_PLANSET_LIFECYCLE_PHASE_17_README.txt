Master PlanSet Lifecycle Phase 17

Adds a cached Master PlanSet lifecycle foundation. Test Master Plan now consumes
the current cached sealed PlanSet rather than rebuilding an unrelated plan inside
the renderer. The cache detects whether its track order/input fingerprints are
still current and rebuilds a fresh plan for the controlled test when needed.

Normal playback remains unchanged. This is groundwork for explicit stale-plan
handling before normal Play is migrated.
