Legacy Internal Boundary Phase E2b

Adds _teardownLegacyTransportInternal and _legacyPlayInternal. The new internal
legacy Play reproduces existing legacy scheduling but uses internal teardown,
not public this.stop(). Public normal Play/Stop/Seek remain unchanged.

Install, hard refresh, then test normal legacy Play/Stop/Seek once. This is a
rollback checkpoint before any public coordinator is added.
