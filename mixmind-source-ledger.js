(function(){
const records=new Map();let sequence=0;
function register(meta){const id='src-'+(++sequence);const r=Object.assign({id,state:'scheduled',createdAt:Date.now(),source:null,gain:null,trackId:null,kind:'master',deck:null,start:null,stop:null,transitionId:null},meta||{});records.set(id,r);if(r.source){r.source.onended=()=>{r.state='ended';cleanup(id);};}return r;}
function stop(id,when){const r=records.get(id);if(!r)return false;r.state='stopping';try{r.source&&r.source.stop(when)}catch(_){};try{r.source&&r.source.disconnect();r.gain&&r.gain.disconnect()}catch(_){};r.state='stopped';records.delete(id);return true;}
function cleanup(id){const r=records.get(id);if(!r)return;try{r.source&&r.source.disconnect();r.gain&&r.gain.disconnect()}catch(_){};records.delete(id);}
function stopAll(){Array.from(records.keys()).forEach(id=>stop(id));}
function active(){return Array.from(records.values()).filter(r=>r.state==='scheduled'||r.state==='playing'||r.state==='transitioning');}
function count(){return active().length;}
function assertBudget(max){if(count()>max)throw Error('Source budget exceeded: '+count()+' active sources, max '+max);return true;}
function snapshot(){return active().map(r=>({id:r.id,trackId:r.trackId,kind:r.kind,deck:r.deck,start:r.start,stop:r.stop,transitionId:r.transitionId,state:r.state}));}
window.MixMindSourceLedger=Object.freeze({register,stop,cleanup,stopAll,active,count,assertBudget,snapshot});})();
