(function(){
if(typeof AudioEngine==='undefined')return;
const original=AudioEngine.seek.bind(AudioEngine);
AudioEngine.seek=function(percent){
 const custom=this.hybridMode==='lite'||this.canonicalMode==='master'||this.canonicalMode==='lite';
 if(!custom)return original(percent);
 const total=Math.max(0,Number(this.totalDuration)||calculateTimelineDuration()),seek=Math.max(0,Math.min((Number(percent)||0)/100*total,Math.max(0,total-.1)));
 // Custom Lite/Canonical decks are not stored in activeSources. Stop them
 // first, then continue from the selected point with the stable master path.
 if(window.MixMindSourceLedger)window.MixMindSourceLedger.stopAll();
 if(window.MixMindHybridPlayback)window.MixMindHybridPlayback.clear();
 if(window.MixMindCanonicalMasterRenderer)window.MixMindCanonicalMasterRenderer.cleanup();
 if(window.MixMindCanonicalLiteRenderer)window.MixMindCanonicalLiteRenderer.cleanup();
 if(window.MixMindCanonicalLiteRolling)window.MixMindCanonicalLiteRolling.cleanup();
 if(window.MixMindCanonicalRollingRenderer)window.MixMindCanonicalRollingRenderer.cleanup();
 this.hybridMode=null;this.canonicalMode=null;
 this.activeSources.forEach(s=>{try{s.source.stop();s.source.disconnect()}catch(_){}});this.activeSources=[];
 if(this.timerID)cancelAnimationFrame(this.timerID);this.timerID=null;
 this.currentTime=seek;this.isPlaying=true;this.scheduleMixFrom(seek);this.startUIUpdate();Visualizer.start();updatePlayButton(true);
 if(typeof showToast==='function')showToast('Seek resumed with stable master playback.','success');
};})();
