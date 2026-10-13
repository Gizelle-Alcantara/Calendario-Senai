import {TURNOS} from "../config.js";
import {renderView} from "../render.js";
import {horaAula} from "../rules.js";
import {CUR, S, T, UI, normalize, setState} from "../state.js";
import {persistLocal, save} from "../store.js";
import {toast} from "../ui.js";
import {esc} from "../util.js";
import {openTurmaModal, saveTurma} from "./calendario.js";
import {horTable} from "./painel.js";
import {vFeriados} from "./feriados.js";
export function vTurma(){
  const c=S.cfg,chT=S.ucs.reduce((a,u)=>a+(+u.ch||0),0);
  const fld=(k,l,t="text")=>`<label class="f">${l}<input type="${t}" data-cfg="${k}" value="${esc(c[k])}"></label>`;
  return `<section class="panel"><h2>Dados da turma</h2><div class="form">
    ${fld("turma","Turma")}${fld("curso","Curso")}
    <label class="f">Turno<select data-cfg="turno">${TURNOS.map(t=>`<option ${t===c.turno?"selected":""}>${t}</option>`).join("")}</select></label>
    ${fld("coord","Coordenador")}${fld("email","E-mail","email")}${fld("modulo","Módulo")}${fld("local","Local")}
    ${fld("inicio","Data de início","date")}${fld("termino","Data de término","date")}
    <label class="f">Aulas por dia<input type="number" min="1" max="8" data-cfg="aulasDia" value="${c.aulasDia}"></label>
    <label class="f">Hora-aula (min)<input type="text" value="${horaAula()}" readonly></label>
    <label class="f">CH prevista (h)<input type="text" value="${chT}" readonly></label></div>
    <p class="small muted">A hora-aula é de 50 min no turno Matutino NEM e de 60 min nos demais. Mudar turno ou aulas por dia recalcula encontros e horários.</p></section>
  <section class="panel"><h2>Horário das aulas</h2>${horTable()}</section>
  ${vFeriados()}
  <section class="panel"><h2>Excluir turma</h2><p class="small muted">Remove a turma ${esc(c.turma)} com todos os lançamentos. Os docentes continuam cadastrados.</p>
    <button class="btn bad" data-act="turmadel" ${Object.keys(T).length<2?"disabled":""}>${UI.confirm==="turmadel"?"Confirmar exclusão":"Excluir turma"}</button>${Object.keys(T).length<2?' <span class="small muted">É preciso ter ao menos uma turma.</span>':""}</section>`;
}

/* ---------- ENVIAR ---------- */
export const actions={
  "turmanew":(b,e,a)=>{openTurmaModal()},
  "turmasave":(b,e,a)=>{saveTurma()},
  "turmago":(b,e,a)=>{{setState({CUR:b.dataset.id});normalize();UI.month=null;UI.ucFilter="";persistLocal();renderView();window.scrollTo(0,0)}},
  "turmadel":(b,e,a)=>{{if(UI.confirm==="turmadel"){delete T[CUR];setState({CUR:Object.keys(T)[0]});normalize();UI.confirm=null;UI.month=null;UI.tab="painel";save();toast("Turma excluída")}else UI.confirm="turmadel";renderView()}},
};
export const changes=[
  [t=>t.id==="turmaSel",(t,e)=>{setState({CUR:t.value});normalize();UI.month=null;UI.ucFilter="";persistLocal();renderView()}],
  [t=>t.dataset.cfg,(t,e)=>{const k=t.dataset.cfg;S.cfg[k]=k==="aulasDia"?Math.max(1,+t.value||1):t.value;if(k==="inicio")UI.month=null;
    if(k==="turma"){const nid=String(t.value).trim().replace(/[^\w.-]/g,"").slice(0,60);if(nid&&nid!==CUR&&!T[nid]){T[nid]=T[CUR];delete T[CUR];setState({CUR:nid});normalize();toast("Código da turma atualizado. Os links antigos dessa turma deixam de valer.")}}
    save();renderView()}],
];

