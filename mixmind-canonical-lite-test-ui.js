/* Test-only control for Canonical Lite Vocal-Safe Handoff v2.
   This button is deliberately not part of normal playback. */
(function(){
const r=window.MixMindCanonicalLiteRenderer;if(!r)return;
async function test(){const check=r.inspect(timeline,transitions);if(!check.ok){showToast(check.reason,'warning');return;}const d=await r.playTwoTracks(timeline,transitions);if(!d)showToast('Lite Vocal-Safe Handoff could not start. Master fallback remains active.','warning');}
function render(){
 const card=document.getElementById('simplePlayerCard');if(!card)return;
 let b=card.querySelector('.canonical-lite-test');
 if(!b){b=document.createElement('button');b.className='btn btn-sm canonical-lite-test';b.style.marginTop='8px';b.style.width='100%';b.onclick=test;card.appendChild(b);}
 const check=r.inspect(timeline,transitions);
 b.textContent=check.ok?'Test Lite Vocal-Safe Handoff (2 songs)':'Lite Handoff unavailable: '+check.reason;
 b.disabled=!check.ok;b.title=check.ok?'Test-only canonical renderer. Normal mix playback is unchanged.':check.reason;
}
const old=window.simpleRefreshHome;if(old)window.simpleRefreshHome=function(){const x=old.apply(this,arguments);render();return x;};
document.addEventListener('DOMContentLoaded',()=>setTimeout(render,300));
})();
