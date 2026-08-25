# MixMind Complete External AI Handoff Package

## Contents

This package contains:

- the current browser application `index.html`;
- all local JavaScript files referenced by the current index that exist in the project workspace;
- local server/startup scripts;
- model/stem installer scripts;
- architecture specifications;
- validation reports;
- external-review analysis reports;
- current JIT trace and transport/refactor source files;
- `MixMind_Master_External_AI_Prompt.md`.

## Not included

The package deliberately does not include:

```text
user audio files
browser IndexedDB/OPFS data
prepared stem PCM/model cache data
installed model binaries if not present in the workspace
browser settings/profile data
```

Those are local user/device assets and should remain local.

## Current caution

The current normal Canonical Master Beta full-chain JIT path has an unresolved silence-at-transition regression. Keep:

```text
Canonical Master: OFF
```

for normal reliable playback until JIT trace evidence identifies and repairs the incoming-deck issue.

Legacy playback is the stable default.

## Start here for external review

1. Read `MixMind_Complete_Handoff_and_Technical_Reference.md`.
2. Read `MixMind_Master_External_AI_Prompt.md`.
3. Review current JIT files:
   - `mixmind-canonical-master-beta.js`
   - `mixmind-beta-jit-tracer.js`
   - `mixmind-public-transport-coordinator.js`
   - `mixmind-master-plan-set.js`
   - `mixmind-master-plan-set-cache.js`
4. Read validation reports before suggesting changes.

## Deployment

The expected Windows project root includes:

```text
index.html
START_MIXMIND_WINDOWS.bat
RESET_AND_START_MIXMIND_WINDOWS.bat
mixmind_local_server.py
```

The local application is served from:

```text
http://localhost:8765/
```
