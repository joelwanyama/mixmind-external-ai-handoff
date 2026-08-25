/* MixMind Lite 2-Stem foundation.
   Defines a separate vocal/instrumental asset contract without pretending that
   a high-quality four-stem result exists. */
(function () {
  'use strict';
  const foundation = window.MixMindStemFoundation;
  if (!foundation) return;
  const NAMES = ['vocals', 'instrumental'];
  function bufferLike(v) { return !!(v && typeof v.getChannelData === 'function' && Number.isFinite(v.length)); }
  function asset(name) { return { id:name, status:'missing', opfsKey:null, inMemoryBuffer:null, sampleRate:0, channels:0, length:0, duration:0, checksum:null, gain:1, muted:false }; }
  function ensure(track) {
    const audio = foundation.ensureTrackAudioState(track);
    if (!audio.lite2 || typeof audio.lite2 !== 'object') {
      audio.lite2 = { schemaVersion:1, status:'none', progress:0, stage:'Not prepared', modelId:null, modelVersion:null, failureReason:null, createdAt:null, alignment:{verified:false,referenceLength:0}, assets:{vocals:asset('vocals'),instrumental:asset('instrumental')} };
    }
    NAMES.forEach(name => { if (!audio.lite2.assets[name]) audio.lite2.assets[name]=asset(name); });
    return audio.lite2;
  }
  function isReady(track, requireHydrated=true) {
    const lite=ensure(track);
    if (lite.status!=='ready'||!lite.alignment.verified)return false;
    return NAMES.every(name => requireHydrated ? (lite.assets[name].status==='hydrated'&&bufferLike(lite.assets[name].inMemoryBuffer)) : ['stored','hydrated'].includes(lite.assets[name].status));
  }
  function plan(outgoing,incoming) {
    if (!isReady(outgoing,false)||!isReady(incoming,false)) return {mode:'master',reason:'Lite vocal/instrumental stems are unavailable.'};
    return { mode:'lite-2stem', template:'vocal-handoff', capabilities:['vocal-handoff','vocal-clash-protection','acapella-overlay'], unsupported:['bass-swap','drums-first','other-swap'], plan:{durationSeconds:8,outgoing:{vocals:[{at:0,gain:1},{at:.35,gain:0}],instrumental:[{at:0,gain:1},{at:1,gain:0}]},incoming:{vocals:[{at:0,gain:0},{at:.65,gain:1}],instrumental:[{at:0,gain:0},{at:.3,gain:1}]}} };
  }
  if (typeof window.createTimelineTrack === 'function') {
    const oldCreate = window.createTimelineTrack;
    window.createTimelineTrack = function(track) {
      const result = oldCreate(track), source = ensure(track), target = ensure(result);
      target.status=source.status; target.progress=source.progress; target.stage=source.stage; target.modelId=source.modelId; target.modelVersion=source.modelVersion; target.alignment=Object.assign({},source.alignment);
      NAMES.forEach(name=>Object.assign(target.assets[name],source.assets[name]));
      return result;
    };
  }
  window.MixMindLite2Stem = Object.freeze({ensure,isReady,plan,names:NAMES});
  console.log('MixMind Lite 2-Stem foundation loaded; no Lite model is installed yet.');
})();
