(function(){
const liteReady=()=>!!window.MixMindLite2Config&&typeof window.prepareLite2Stems==='function';
const isResourceFailure=e=>/bad_alloc|out of memory|cannot allocate enough memory|ConstantOfShape|WebGPU implementation/i.test((e&&e.message)||String(e));
if(typeof window.queueStemPreparation!=='function')return;
const previous=window.queueStemPreparation;
window.queueStemPreparation=async function(trackId){
 try{return await previous(trackId)}catch(error){
  if(!isResourceFailure(error)||!liteReady())throw error;
  if(typeof showToast==='function')showToast('High Quality stems are unavailable here. Switching to Lite vocals + instrumental mode.','warning');
  try{return await window.prepareLite2Stems(trackId)}catch(liteError){throw liteError}
 }
};
})();
