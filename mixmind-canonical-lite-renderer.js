/* MixMind Canonical Lite Vocal-Safe Handoff v2
   Test-only, two-song renderer. It never replaces normal multi-track playback.
   The only overlap is outgoing master + quiet, high-passed incoming instrumental.
   Incoming vocals remain withheld during the gate-confirmed pre-vocal window;
   a short anti-click takeover then hands ownership to incoming master. */
(function(){
'use strict';
const decisionApi=window.MixMindCanonicalTransition,lite=window.MixMindLite2Stem,store=window.MixMindLite2Storage,ledger=window.MixMindSourceLedger;
if(!decisionApi||!lite||!store||!ledger||typeof AudioEngine==='undefined')return;
let nodes=[];
function clean(){nodes.forEach(n=>ledger.stop(n.id));nodes=[];AudioEngine.canonicalMode=null;}
const priorStop=AudioEngine.stop.bind(AudioEngine);
AudioEngine.stop=function(){clean();return priorStop();};
function source(buffer,start,offset,duration,gain,trackId,kind){
 const c=AudioEngine.ctx,s=c.createBufferSource(),g=c.createGain();
 s.buffer=buffer;g.gain.setValueAtTime(gain,start);s.connect(g);g.connect(AudioEngine.masterGain);
 s.start(start,offset,duration);
 const n=ledger.register({source:s,gain:g,trackId,kind,deck:'canonical-lite-vocal-safe-v2',start,stop:start+duration});
 nodes.push(n);ledger.assertBudget(3);return n;
}
async function ready(track){if(lite.isReady(track))return true;try{return await store.hydrate(track)}catch(_){return false}}
function explain(d){
 if(!d)return 'Canonical decision is unavailable.';
 if(d.execution.mode!=='lite')return (d.liteEligibility&&d.liteEligibility.reasons&&d.liteEligibility.reasons[0])||d.explanation||'This pair is not Lite eligible.';
 if(!d.liteEligibility||!d.liteEligibility.eligible)return (d.liteEligibility&&d.liteEligibility.reasons||['Lite gate is blocked.']).join(' ');
 if(!d.safeWindows||!d.safeWindows.valid)return 'A valid Lite safe-window pair is required.';
 return '';
}
function inspect(list,trans){
 if(!list||list.length!==2)return {ok:false,reason:'Canonical Lite test requires exactly two songs.'};
 let d;try{d=decisionApi.build(0)}catch(_){return {ok:false,reason:'Canonical decision is unavailable.'};}
 const reason=explain(d);
 if(reason)return {ok:false,reason,decision:d};
 const qc=window.MixMindTransitionQC?window.MixMindTransitionQC.run(0,'lite',d):null;
 if(qc&&!qc.valid)return {ok:false,reason:qc.errors.join(' '),decision:d};
 if(!lite.isReady(list[0],false)||!lite.isReady(list[1],false))return {ok:false,reason:'Both songs need prepared Lite stems.',decision:d};
 return {ok:true,reason:'',decision:d,qc};
}
async function playTwoTracks(list,trans,options){
 options=options||{};const sealed=options.plan;let check,d,safe;
 if(sealed){if(sealed.state!=='SEALED'||!sealed.intrinsic||sealed.intrinsic.classification!=='LITE_CANDIDATE'||!sealed.safePair)throw Error('Sealed Lite plan is invalid.');if(!list||list.length!==2||list[0].id!==sealed.pair.outgoingTrackId||list[1].id!==sealed.pair.incomingTrackId)throw Error('Sealed plan does not match the current two-song timeline.');d=sealed;safe=sealed.safePair;}else{check=inspect(list,trans);if(!check.ok)return null;d=check.decision;safe=d.safeWindows;}
 const a=list[0],b=list[1];
 if(!(await ready(a))||!(await ready(b)))return null;
 clean();if(!AudioEngine.ctx)AudioEngine.init();if(AudioEngine.ctx.state==='suspended')await AudioEngine.ctx.resume();
 const c=AudioEngine.ctx,start=c.currentTime+.05;
 // Safe-pair starts are source-buffer positions, already constrained to each playable range.
 const outOffset=getTrackMixStart(a),transitionOffset=safe.outgoing.start;
 const elapsed=Math.max(0,transitionOffset-outOffset),handoff=Math.max(.12,Number(safe.effectiveDuration)||d.timing.effectiveDuration);
 const transitionStart=start+elapsed,inOffset=safe.incoming.start;
 const aDuration=Math.min(elapsed+handoff,a.buffer.duration-outOffset);
 const instrumentalBuffer=lite.ensure(b).assets.instrumental.inMemoryBuffer;
 const instrumentalDuration=Math.min(handoff,instrumentalBuffer.duration-inOffset);
 const masterOffset=inOffset+handoff,masterDuration=Math.max(0,b.buffer.duration-masterOffset);
 if(aDuration<=.05||instrumentalDuration<handoff-.03||masterDuration<=.05)return null;
 // Source ownership: outgoing master -> incoming instrumental -> incoming master.
 const out=source(a.buffer,start,outOffset,aDuration,getTrackTrim(a),a.id,'outgoing-master');
 const instrumental=source(instrumentalBuffer,transitionStart,inOffset,instrumentalDuration,0,b.id,'incoming-instrumental');
 const incoming=source(b.buffer,transitionStart+handoff,masterOffset,masterDuration,0,b.id,'incoming-master-takeover');
 const steps=64,outCurve=new Float32Array(steps),inCurve=new Float32Array(steps),trimA=getTrackTrim(a),trimB=getTrackTrim(b);
 for(let i=0;i<steps;i++){const x=i/(steps-1);outCurve[i]=Math.cos(x*Math.PI/2)*trimA;inCurve[i]=Math.sin(x*Math.PI/2)*trimB*.72;}
 out.gain.gain.setValueCurveAtTime(outCurve,transitionStart,handoff);
 instrumental.gain.gain.setValueAtTime(0,transitionStart);instrumental.gain.gain.setValueCurveAtTime(inCurve,transitionStart,handoff);
 // Keep incoming instrumental narrow and low-end protected while outgoing master owns the overlap.
 const hp=c.createBiquadFilter();hp.type='highpass';hp.Q.value=.7;hp.frequency.setValueAtTime(180,transitionStart);hp.frequency.linearRampToValueAtTime(95,transitionStart+handoff);
 instrumental.gain.disconnect();instrumental.gain.connect(hp);hp.connect(AudioEngine.masterGain);instrumental.filter=hp;
 // Controlled anti-click takeover only: no generic incoming-master/instrumental blend.
 const antiClick=Math.min(.035,handoff*.08),takeover=transitionStart+handoff;
 instrumental.gain.gain.cancelScheduledValues(takeover-antiClick);instrumental.gain.gain.setValueAtTime(trimB*.72,takeover-antiClick);instrumental.gain.gain.linearRampToValueAtTime(0,takeover);
 incoming.gain.gain.setValueAtTime(0,takeover);incoming.gain.gain.linearRampToValueAtTime(trimB,takeover+antiClick);
 AudioEngine.canonicalMode='lite';AudioEngine.timeline=list;AudioEngine.transitions=trans;AudioEngine.trackStartTimes=[start,transitionStart];
 AudioEngine.totalDuration=elapsed+handoff+masterDuration;AudioEngine.mixStartTime=start;AudioEngine.currentTime=0;AudioEngine.isPlaying=true;
 AudioEngine.startUIUpdate();Visualizer.start();updatePlayButton(true);
 if(typeof showToast==='function')showToast('Testing Lite Vocal-Safe Handoff v2.','success');
 return Object.assign({},d,{executedRecipe:'lite-vocal-safe-handoff-v2',handoff:{outgoing:'master',overlap:'incoming instrumental (filtered)',vocalPolicy:'withheld until master takeover',takeover:'validated anti-click master swap'}});
}
async function playSealedPlan(plan){return playTwoTracks(timeline,transitions,{plan});}
window.MixMindCanonicalLiteRenderer=Object.freeze({playTwoTracks,playSealedPlan,cleanup:clean,inspect});
})();
