import {announce} from "./a11y.js";
import {TABS} from "./config.js";
import {KEY} from "./config.js";
import {renderView} from "./render.js";
import {MODE, UI} from "./state.js";
import {closeModal} from "./ui.js";
import {loadAcc} from "./views/acesso.js";
// Delegação de eventos: cada visão exporta `actions` (data-act) e `changes` (campos).
import {actions as aCal, changes as cCal} from "./views/calendario.js";
import {actions as aDisc, changes as cDisc} from "./views/disciplinas.js";
import {actions as aDoc, changes as cDoc} from "./views/docentes.js";
import {actions as aTurma, changes as cTurma} from "./views/turma.js";
import {actions as aEnv, changes as cEnv} from "./views/enviar.js";
import {actions as aShare, changes as cShare} from "./views/compartilhar.js";
import {actions as aDados, changes as cDados} from "./views/dados.js";
import {actions as aAcesso} from "./views/acesso.js";
import {actions as aAv, changes as cAv} from "./views/avisos.js";
import {actions as aCh, changes as cCh} from "./views/chamada.js";
import {actions as aDocV, changes as cDocV} from "./views/docente.js";
import {actions as aRel, changes as cRel} from "./views/relatorios.js";

const shell={
  mclose:(b,e)=>{if(e.target===b)closeModal();return},
  tab:(b)=>{UI.tab=b.dataset.k;UI.confirm=null;try{localStorage.setItem(KEY+"-tab",UI.tab)}catch(x){}renderView();window.scrollTo(0,0);announce(((TABS.find(x=>x[0]===UI.tab))||[])[1]||"");if(UI.tab==="acesso")loadAcc()},
};
const ACTIONS=Object.assign({},shell,aCal,aDisc,aDoc,aTurma,aEnv,aShare,aDados,aAcesso,aAv,aCh,aDocV,aRel);
const CHANGES=[].concat(cTurma,cCal,cRel,cAv,cCh,cDisc,cDados,cDoc,cShare,cEnv,cDocV);

export function initEvents(){
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-act]");if(!b)return;
    const fn=ACTIONS[b.dataset.act];if(fn)fn(b,e,b.dataset.act);
  });
  document.addEventListener("change",e=>{
    const t=e.target,hit=CHANGES.find(([test])=>test(t));
    if(hit)hit[1](t,e);
  });
  document.addEventListener("input",e=>{if(e.target.id==="holName")UI.holName=e.target.value;if(e.target.id==="envMsg")UI.env.msg=e.target.value});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
  window.addEventListener("hashchange",()=>{if(MODE!=="planner"||/^#(aluno|docente|login)/.test(location.hash))location.reload()});
}
