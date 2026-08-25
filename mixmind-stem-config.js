/* MixMind local stem runtime configuration.
   The installer creates models/htdemucs-4s.manifest.json. */
(function () {
  async function configureWhenInstalled() {
    if (!window.MixMindStemRuntime) return;
    try {
      const response = await fetch('/models/htdemucs-4s.manifest.json', { cache: 'no-store' });
      if (!response.ok) return;
      window.MixMindStemRuntime.configure({
        manifestUrl: '/models/htdemucs-4s.manifest.json',
        workerUrl: '/mixmind-stem-separation-worker.js'
      });
      console.info('MixMind: local HTDemucs stem runtime configured.');
    } catch (_) {
      // Normal before installation: MixMind remains safely master-track-only.
    }
  }
  configureWhenInstalled();
})();
