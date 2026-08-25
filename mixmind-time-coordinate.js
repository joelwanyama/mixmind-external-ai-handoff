/* MixMind time-coordinate kernel (Phase 1).
   Contract: Lite activity curves and SafeWindowPairPlanner window starts are
   source-buffer seconds. `track.mixStart` is the playable source offset, not
   global mix time. Keep time-domain conversion in one auditable place. */
(function(){
'use strict';
const Domain=Object.freeze({SOURCE:'source',LOCAL:'local',GLOBAL:'global'});
function finite(x,label){if(!Number.isFinite(Number(x)))throw Error((label||'Time')+' is invalid.');return Number(x)}
function playableSourceStart(track){
 const value=typeof getTrackMixStart==='function'?getTrackMixStart(track):Number(track&&track.mixStart)||0;
 return Math.max(0,finite(value,'Playable source start'));
}
function sourceDuration(track){const value=typeof getTrackAudioDuration==='function'?getTrackAudioDuration(track):Number(track&&track.duration)||0;return Math.max(0,finite(value,'Source duration'))}
function sourceTime(track,value){const time=finite(value,'Source time'),duration=sourceDuration(track);if(time<0||time>duration+.001)throw Error('Source time is outside the audio buffer.');return Object.freeze({trackId:track&&track.id||null,domain:Domain.SOURCE,value:Math.min(duration,time)});}
function sourceInterval(track,start,end){const a=sourceTime(track,start).value,b=sourceTime(track,end).value;if(!(b>a))throw Error('Source interval must have positive duration.');return Object.freeze({trackId:track&&track.id||null,domain:Domain.SOURCE,start:a,end:b});}
function localToSource(track,local){return sourceTime(track,playableSourceStart(track)+finite(local,'Local time'));}
function sourceToLocal(track,source){return Object.freeze({trackId:track&&track.id||null,domain:Domain.LOCAL,value:sourceTime(track,source).value-playableSourceStart(track)});}
function intervalFromPairWindow(track,window){if(!window)throw Error('Safe-window interval is unavailable.');return sourceInterval(track,window.start,window.end);}
function assertSourceInterval(interval){if(!interval||interval.domain!==Domain.SOURCE||!Number.isFinite(interval.start)||!Number.isFinite(interval.end)||interval.end<=interval.start)throw Error('Activity query requires a valid source-time interval.');return interval;}
window.MixMindTimeCoordinate=Object.freeze({Domain,playableSourceStart,sourceDuration,sourceTime,sourceInterval,localToSource,sourceToLocal,intervalFromPairWindow,assertSourceInterval});
})();
