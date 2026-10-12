import {initA11y} from "./a11y.js";
import {initEvents} from "./events.js";
import {renderView} from "./render.js";
import {ALUNO_ID, CUR, G, MODE, T, UI, emptyTurma, normalize, setState} from "./state.js";
import {P, docItems, fromDocs, persistLocal, save, setStatus} from "./store.js";
import {initTheme} from "./theme.js";
import {toast} from "./ui.js";
import {canon} from "./util.js";
window.addEventListener("plan-conflict",()=>toast("Outra pessoa salvou esta turma ao mesmo tempo. Sua última alteração não foi aplicada: a versão mais recente foi carregada."));
initTheme();initEvents();initA11y();
renderView();
(async()=>{
  let db=null,u=null;
  try{db=window.claude&&await window.claude.use("db")}catch(e){}
  try{u=window.claude&&await window.claude.use("user")}catch(e){}
  try{UI.cw=u?u.can("data.write"):null}catch(e){}
  try{const me=window.PLAN&&await PLAN.me();UI.role=me&&me.role}catch(e){}
  if(db&&UI.cw===false&&MODE==="planner"){setState({MODE:"landing",T:{x:emptyTurma()},CUR:"x"});normalize()}
  try{setState({DL:window.claude&&await window.claude.use("downloads")})}catch(e){}
  UI.boot=false;
  if(!db){UI.err="Não foi possível carregar o calendário agora.";setStatus("local");renderView();return}
  if(MODE==="landing"){renderView();return}
  if(MODE==="planner")renderView();
  P.dref=db.collection("planejador");
  let first=true;
  P.dref.onSnapshot(snap=>{
    if(snap.metadata.hasPendingWrites)return;
    const docs={};snap.docs.forEach(d=>{docs[d.id]=d.data()});
    const r=fromDocs(docs);
    if(MODE==="aluno"||MODE==="docente"){
      if(!Object.keys(r.t).length){UI.loaded=true;UI.empty=true;renderView();return}
      const prev=UI.loaded?canon([G,T,CUR]):null;
      setState({G:r.g,T:r.t});const ids=Object.keys(T);
      setState({CUR:MODE==="docente"?"":(ALUNO_ID&&T[ALUNO_ID]?ALUNO_ID:(ids.length===1?ids[0]:""))});
      normalize();UI.savedAt=CUR&&docs["turma-"+CUR]?docs["turma-"+CUR].savedAt||"":(Object.values(docs).map(x=>x.savedAt||"").sort().pop()||"");UI.empty=false;
      const changed=prev!==null&&prev!==canon([G,T,CUR]);UI.loaded=true;renderView();
      if(changed)toast("Calendário atualizado");return;
    }
    if(!Object.keys(r.t).length){if(first){first=false;P.lastJson={};save()}return}
    first=false;
    if(P.dirty||document.querySelector(".modal"))return;
    const cur=canon([docItems()]);
    const keep=CUR;setState({G:r.g,T:r.t});setState({CUR:T[keep]?keep:Object.keys(T)[0]});normalize();
    const now=docItems();
    P.lastJson={};now.forEach(([k,d])=>{P.lastJson[k]=canon(d)});
    if(r.legacy)delete P.lastJson.geral;
    if(canon([now])===cur&&!r.legacy){setStatus("saved");return}
    persistLocal();renderView();
    if(r.legacy)save();else setStatus("saved");
  },()=>{if(MODE!=="planner"){UI.err="Não foi possível carregar o calendário agora.";renderView()}else setStatus("error")});
})();

