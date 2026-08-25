/* MixMind direct canonical Master test binding. No inline onclick dependency. */
(function(){
'use strict';
const BUILD='master-binding-20260815-1';
async function run(){
 const button=document.getElementById('canonicalMasterPlanBtn');
 const fail=msg=>{console.error('[MixMind Master Test]',msg);if(typeof showToast==='function')showToast(msg,'error');};
 if(!window.MixMindCanonicalMasterRenderer||typeof window.MixMindCanonicalMasterRenderer.playTwoTracks!=='function'){fail('Canonical Master renderer is unavailable.');return;}
 if(typeof timeline==='undefined'||!Array.isArray(timeline)||timeline.length!==2){fail('Test Master Plan requires exactly two timeline songs.');return;}
 const label=button&&button.textContent;if(button){button.disabled=true;button.textContent='Testing Master Plan…';}
 try{if(!window.MixMindMasterPlanSetCache)throw Error('Master PlanSet cache is unavailable.');const set=window.MixMindMasterPlanSetCache.ensure();if(set.state!=='SEALED')throw Error('Master PlanSet is not sealed.');const result=await window.MixMindCanonicalMasterRenderer.playPlanSet(set);if(!result)fail('Canonical Master renderer could not start.');else if(typeof showToast==='function')showToast('Testing canonical Master plan.','success');}
 catch(e){fail(e&&e.message||'Canonical Master renderer failed.');}
 finally{if(button){button.disabled=false;button.textContent=label||'Test Master Plan';}}
}
function bind(){const b=document.getElementById('canonicalMasterPlanBtn');if(!b||b.dataset.mixmindMasterBound==='1')return !!b;b.removeAttribute('onclick');b.addEventListener('click',run);b.dataset.mixmindMasterBound='1';b.title='Runs the current canonical Master two-song plan. Build: '+BUILD;return true;}
window.MixMindMasterTestBinding=Object.freeze({build:BUILD,bind,run,status:()=>({build:BUILD,bound:!!document.getElementById('canonicalMasterPlanBtn')?.dataset.mixmindMasterBound,renderer:!!window.MixMindCanonicalMasterRenderer,timelineTracks:typeof timeline!=='undefined'&&Array.isArray(timeline)?timeline.length:null})});
document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,200));let tries=0;const timer=setInterval(()=>{if(bind()||++tries>30)clearInterval(timer)},250);
})();
