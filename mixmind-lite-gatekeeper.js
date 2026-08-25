/* Lite eligibility gate. Phase 1 uses the time-coordinate kernel so activity
   lookups are auditable source-buffer times. It intentionally keeps the existing
   conservative thresholds and does not enable Lite for previously blocked pairs. */
(function(){
'use strict';
function val(x){return Math.max(0,Math.min(1,Number(x)||0))}
function evaluate(outgoing,incoming,transition){
 const lite=window.MixMindLite2Stem,analysis=window.MixMindLiteCollisionAnalysis,coords=window.MixMindTimeCoordinate,planner=window.MixMindSafeWindowPairPlanner;
 if(!lite||!analysis)return {eligible:false,reasons:['Lite collision analysis is unavailable.'],warnings:[],drift:Infinity,coordinateAudit:null};
 const reasons=[],warnings=[],timing=getEffectiveTransitionTiming(outgoing,transition),computedPair=planner?planner.choose(outgoing,incoming,transition):null,pair=transition&&transition._safePairOverride||computedPair;
 let activeTiming=timing,outTime,inTime,coordinateAudit=null;
 try{
  if(pair&&pair.valid){
   // Pair planner windows are source-buffer intervals. Do not add mixStart again.
   const outInterval=coords?coords.intervalFromPairWindow(outgoing,pair.outgoing):Object.assign({domain:'source'},pair.outgoing);
   const inInterval=coords?coords.intervalFromPairWindow(incoming,pair.incoming):Object.assign({domain:'source'},pair.incoming);
   if(coords){coords.assertSourceInterval(outInterval);coords.assertSourceInterval(inInterval);}
   activeTiming={start:pair.outgoing.start,effective:pair.effectiveDuration};
   outTime=outInterval.start;inTime=inInterval.start;
   const outOffset=coords?coords.playableSourceStart(outgoing):getTrackMixStart(outgoing);
   const inOffset=coords?coords.playableSourceStart(incoming):getTrackMixStart(incoming);
   coordinateAudit={version:'time-coordinate/1',branch:'safe-pair-source',outgoing:{sourceOffset:outOffset,pairStart:pair.outgoing.start,legacyQuery:outOffset+pair.outgoing.start,correctedQuery:outTime,delta:outOffset},incoming:{sourceOffset:inOffset,pairStart:pair.incoming.start,legacyQuery:inOffset+pair.incoming.start,correctedQuery:inTime,delta:inOffset}};
  }else{
   const out=coords?coords.localToSource(outgoing,timing.start):{value:getTrackMixStart(outgoing)+timing.start};
   const inn=coords?coords.localToSource(incoming,0):{value:getTrackMixStart(incoming)};
   outTime=out.value;inTime=inn.value;
   coordinateAudit={version:'time-coordinate/1',branch:'fallback-local-to-source',outgoing:{sourceOffset:coords?coords.playableSourceStart(outgoing):getTrackMixStart(outgoing),localStart:timing.start,legacyQuery:outTime,correctedQuery:outTime,delta:0},incoming:{sourceOffset:coords?coords.playableSourceStart(incoming):getTrackMixStart(incoming),localStart:0,legacyQuery:inTime,correctedQuery:inTime,delta:0}};
  }
 }catch(e){reasons.push('Invalid time mapping: '+e.message);coordinateAudit={version:'time-coordinate/1',error:e.message};outTime=0;inTime=0;}
 const bpmA=Number(outgoing.bpm),bpmB=Number(incoming.bpm),drift=(bpmA>0&&bpmB>0)?Math.abs(bpmA-bpmB)/60*activeTiming.effective:Infinity;
 const phrase=Math.min(val(outgoing.analysisConfidence&&outgoing.analysisConfidence.sections),val(incoming.analysisConfidence&&incoming.analysisConfidence.sections));
 const beat=Math.min(val(outgoing.analysisConfidence&&outgoing.analysisConfidence.bpm),val(incoming.analysisConfidence&&incoming.analysisConfidence.bpm));
 if(pair&&!pair.valid)reasons.push('No safe phrase window pair was found.');
 if(!lite.isReady(outgoing,false)||!lite.isReady(incoming,false))reasons.push('Lite stems are not ready.');
 if(!lite.ensure(outgoing).analysis||!lite.ensure(incoming).analysis)reasons.push('Lite collision analysis is unavailable.');
 if(!(timing.effective>0))reasons.push('Effective transition duration is invalid.');
 if(drift>.15)reasons.push('Predicted beat drift is too high for an unwarped Lite overlap.');
 if(phrase<.5||beat<.5)reasons.push('Phrase or beat confidence is too low.');
 if(!(outgoing.introEnd>0||outgoing.dropStart>0||outgoing.outroStart>0)||!(incoming.introEnd>0||incoming.dropStart>0||incoming.outroStart>0))warnings.push('Section markers are low confidence; using conservative gate.');
 const evidenceApi=window.MixMindIntervalEvidence;
 const outEvidence=evidenceApi?evidenceApi.evaluate(outgoing,outTime,outTime+activeTiming.effective,{threshold:.15,tailMargin:.25}):null;
 const inEvidence=evidenceApi?evidenceApi.evaluate(incoming,inTime,inTime+activeTiming.effective,{threshold:.15,tailMargin:.25}):null;
 const outActive=outEvidence&&outEvidence.available?outEvidence.max:analysis.activeAt(outgoing,outTime);
 const inSafe=inEvidence&&inEvidence.available?{safe:inEvidence.status==='PASS',confidence:inEvidence.confidence}:analysis.incomingSafe(incoming,inTime,inTime+activeTiming.effective);
 const outSafe=outEvidence&&outEvidence.available?{safe:outEvidence.status==='PASS',confidence:outEvidence.confidence}:analysis.outgoingSafe(outgoing,outTime);
 if(!outEvidence||!outEvidence.available)reasons.push('Outgoing vocal-safe exit cannot be proven because interval activity evidence is unavailable.');
 else if(outEvidence.status!=='PASS')reasons.push('Outgoing vocal-safe exit is not confirmed.');
 if(!inEvidence||!inEvidence.available)reasons.push('Incoming pre-vocal instrumental window cannot be proven because interval activity evidence is unavailable.');
 else if(inEvidence.status!=='PASS')reasons.push('Incoming pre-vocal instrumental window is not confirmed.');
 const inLow=lite.ensure(incoming).analysis&&lite.ensure(incoming).analysis.lowEndCurve.find(x=>inTime>=x.start&&inTime<=x.end);
 if(inLow&&inLow.value>.7&&val(outgoing.energy)>=.8)reasons.push('Incoming low-end is too strong for Lite overlap.');
 const keyConf=Math.min(val(outgoing.analysisConfidence&&outgoing.analysisConfidence.key),val(incoming.analysisConfidence&&incoming.analysisConfidence.key));
 if(keyConf<.5&&timing.effective>4)reasons.push('Key confidence is too low for long tonal overlap.');
 return {eligible:reasons.length===0,reasons,warnings,timing:activeTiming,safePair:pair,drift,phraseConfidence:phrase,beatConfidence:beat,outgoingVocal:outActive,incomingVocalSafe:inSafe,keyConfidence:keyConf,coordinateAudit,intervalEvidence:{outgoing:outEvidence,incoming:inEvidence}};
}
window.MixMindLiteGatekeeper=Object.freeze({evaluate});
})();
