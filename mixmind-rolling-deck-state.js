(function(){
const decision=window.MixMindCanonicalTransition;if(!decision)return;
const STATES=Object.freeze(['empty','assigned','hydrating','ready','playing','transitioning','releasing','released','failed']);
function makeDeck(name){return{name,state:'empty',trackId:null,decisionId:null,sourceStart:null,sourceEnd:null,error:null};}
function validTransition(d){return d&&d.validation&&d.validation.status!=='invalid'&&Number.isFinite(d.timing.effectiveDuration)&&d.timing.effectiveDuration>=0;}
function buildSchedule(list){if(!Array.isArray(list)||!list.length)return{tracks:[],decisions:[]};const decisions=[],tracks=[],decks=[makeDeck('A'),makeDeck('B')];let cursor=0;for(let i=0;i<list.length;i++){const t=list[i],mixStart=getTrackMixStart(t),mixDuration=getTrackMixDuration(t),sourceEnd=mixStart+mixDuration;let d=null,effective=0;if(i<list.length-1){d=decision.build(i);if(!validTransition(d))throw Error('Invalid canonical transition decision at pair '+i);effective=Math.min(d.timing.effectiveDuration,mixDuration);decisions.push(d);}tracks.push({index:i,trackId:t.id,globalStart:cursor,globalEnd:cursor+mixDuration,sourceStart:mixStart,sourceEnd,sourceDuration:mixDuration,transitionOutEffective:effective});if(i<list.length-1)cursor+=mixDuration-effective;}
return{tracks,decisions,decks};}
function assertSchedule(schedule){for(const t of schedule.tracks){if(t.sourceDuration<=0)throw Error('Track '+t.index+' has invalid source duration.');if(Math.abs((t.sourceEnd-t.sourceStart)-t.sourceDuration)>.001)throw Error('Track '+t.index+' source duration was truncated.');}return true;}
window.MixMindRollingDeckState=Object.freeze({STATES,makeDeck,buildSchedule,assertSchedule});})();
