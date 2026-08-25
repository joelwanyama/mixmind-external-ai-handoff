# MixMind — Windows Edge Test Guide

## One-time setup

1. Put these files in the same folder:
   - `index.html`
   - `mixmind_local_server.py`
   - `START_MIXMIND_WINDOWS.bat`
2. Double-click `START_MIXMIND_WINDOWS.bat`.
3. If Windows asks for permission, allow the local server.
4. Edge should open at `http://localhost:8765/`.
5. Keep the black server window open while testing.

## First tests

1. Import three local songs.
2. Wait for normal analysis to complete.
3. Create a mix.
4. Test a single-track preview, each transition preview, then full playback.
5. Record any silence, quiet audio, timer drift, or failed transition.

## Stem status

The local server provides the correct browser security headers and enables
WebGPU/WASM capability testing. Real stems are not available until the
ONNX Runtime files and HTDemucs model assets are placed in the local folder
and the manifest is configured.
