# MixMind — Windows Stem Installation Guide

## Before starting

- Use the PC with Microsoft Edge.
- Close the black MixMind server window if it is already running.
- Keep at least 2 GB of free disk space.
- Use Wi-Fi or a stable connection: the public AI model is about 316 MB.

## Install

1. Put these files in the same MixMind folder:
   - `INSTALL_MIXMIND_STEMS_WINDOWS.bat`
   - `install_mixmind_stems_windows.ps1`
   - `mixmind-stem-config.js`
   - `mixmind-stem-separation-worker.js`
   - `mixmind-htdemucs-4s-adapter.js`
   - `index.html`
2. Double-click `INSTALL_MIXMIND_STEMS_WINDOWS.bat`.
3. Type `YES` when asked.
4. Wait until it says **Installation complete**.
5. Double-click `START_MIXMIND_WINDOWS.bat`.
6. In Edge press `Ctrl + F5`.

## First stem test

1. Import two 44.1 kHz stereo songs.
2. Let standard MixMind analysis finish.
3. In a song's detail panel, choose **Prepare manually** in Stem Mode.
4. Click **Prepare Stems**.
5. Wait for **STEMS READY**.
6. Prepare the second song too.
7. Add both to the mix and use **Preview Transition**.
8. If the stem preview sounds correct, enable **Experimental Stem Full-Mix**.

## If anything fails

Do not delete the source music. Send a screenshot of the MixMind message and the black server/installer window text.
