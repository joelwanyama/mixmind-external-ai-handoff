(function(){
if(typeof window.switchTab!=='function')return;
const previous=window.switchTab;
window.switchTab=function(tab){const result=previous.apply(this,arguments);const isMix=tab==='mix'||tab==='advanced';if(isMix&&typeof renderTimeline==='function'){requestAnimationFrame(()=>{renderTimeline();if(typeof updateMixRuler==='function')updateMixRuler(AudioEngine.currentTime||0,calculateTimelineDuration());});}return result;};
})();
