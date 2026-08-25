MixMind Pair Scan Completeness Fix

The first Pair Scan screenshot correctly evaluated 2 hydrated songs, but the
library showed 4 tracks. The first scanner silently skipped the two tracks whose
master AudioBuffer was not hydrated in the current browser session.

This update scans every directed library pair. It now shows:
- NEEDS AUDIO when either song's master audio is not hydrated;
- the exact reason instead of silently omitting the pair.

It does not relink, upload, decode, prepare stems, apply fallbacks, or change
playback. It only makes scan coverage truthful.

Install: replace the files from this ZIP, restart MixMind, press Ctrl+Shift+R,
then click Scan Lite Pairs again.
