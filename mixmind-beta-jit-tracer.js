/* Read-only JIT scheduler tracer for Canonical Master Beta.
   Phase 21B fix: enable()/disable() wrote to a property of an Object.freeze()d
   object, which throws TypeError in strict mode, so the tracer could never be
   enabled (all log() calls were silently no-ops, traces always showed 0 events).
   State now lives in the closure; the frozen object exposes only the API and a
   read-only .enabled getter. No playback logic is touched. */
(function(){'use strict';
let enabled=false;
const events=[];
const T={
  get enabled(){return enabled},
  enable(){enabled=true;events.length=0;if(window.console)console.info('[MixMindJitTracer] enabled - capturing read-only JIT events.');return true},
  disable(){enabled=false;if(window.console)console.info('[MixMindJitTracer] disabled.');return true},
  log(event,data){
    if(!enabled)return;
    const c=window.AudioEngine&&AudioEngine.ctx;
    events.push(Object.assign({event,ctxTime:c&&c.currentTime,state:window.MixMindCanonicalMasterBeta&&window.MixMindCanonicalMasterBeta.getStatus().state},data||{}));
  },
  dump(){return events.slice()},
  show(){
    let p=document.getElementById('jitTracePanel');
    if(p)p.remove();
    p=document.createElement('div');
    p.id='jitTracePanel';
    p.style.cssText='position:fixed;z-index:10006;left:16px;bottom:16px;width:min(720px,calc(100vw - 32px));max-height:60vh;overflow:auto;background:#11121b;border:1px solid #2d3142;border-radius:10px;padding:12px;color:#e5e7eb;font:11px/1.4 monospace';
    p.innerHTML='<button style="float:right;background:none;border:0;color:#fff" onclick="this.parentElement.remove()">×</button><b style="color:#22d3ee">Canonical JIT Trace ('+events.length+' events)</b><pre style="white-space:pre-wrap">'+JSON.stringify(events,null,2)+'</pre>';
    document.body.appendChild(p);
  }
};
window.MixMindBetaJitTracer=Object.freeze(T);
})();
