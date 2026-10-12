import {WD, WDL} from "../config.js";
import {renderView} from "../render.js";
import {applyRep, calc, repCands, ucOf} from "../rules.js";
import {S, UI} from "../state.js";
import {save} from "../store.js";
import {closeModal, toast} from "../ui.js";
import {br, dow, esc, todayISO} from "../util.js";
export const MOTIVOS=["Docente ausente","Feriado ou recesso","Evento da escola","Problema de infraestrutura","Outro motivo"];
export function repAuto(){
  const pend=Object.keys(S.reg).filter(i=>S.reg[i].dado==="nao"&&!S.reg[i].rep&&S.days[i]).sort();let ok=0,sem=0;
  for(const i of pend){const c=repCands(i).find(x=>!x.fora);if(c&&applyRep(i,c.iso))ok++;else sem++}
  save();renderView();toast(ok?`${ok} reposição(ões) lançada(s) no calendário.${sem?` ${sem} sem data livre: escolha manualmente.`:""}`:"Nenhuma data livre dentro do período. Escolha manualmente ou inclua sábados.");
}
export function vChamada(){
  const C=calc(),t=todayISO(),reg=S.reg||{},f=UI.rf||"pend";
  const tot=C.rows.reduce((a,r)=>({d:a.d+r.dadas,p:a.p+r.P,n:a.n+r.semRep}),{d:0,p:0,n:0});
  const pend=C.isos.filter(i=>(S.days[i].s||[]).length&&i<=t&&!reg[i]).length;
  let rows=[];
  for(const iso of C.isos){const sg=(S.days[iso].s||[])[0];if(!sg)continue;const r=reg[iso];
    if(f==="pend"&&!(iso<=t&&!r))continue;if(f==="nao"&&!(r&&r.dado==="nao"))continue;if(f==="fut"&&!(iso>t))continue;if(UI.ucFilter&&sg!==UI.ucFilter)continue;
    rows.push({iso,sg,r,n:C.enc[iso][0]})}
  const nf=r=>r&&r.faltas?Object.values(r.faltas).filter(x=>+x>0).length:0;
  const badge=r=>!r?'<span class="bdg mut">Sem registro</span>':r.dado==="sim"?'<span class="bdg ok">Aula dada</span>':`<span class="bdg bad">Não dada</span>${r.rep?` <span class="bdg ok">Reposta em ${br(r.rep)}</span>`:' <span class="bdg warn">Sem reposição</span>'}`;
  const pendRep=Object.keys(reg).filter(i=>reg[i].dado==="nao"&&!reg[i].rep&&S.days[i]).sort();
  const wd=iso=>WD[dow(iso)];
  const repPanel=pendRep.length?`<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Reposição de aulas (${pendRep.length})</h2><div class="row"><label class="row small" style="gap:6px"><input type="checkbox" id="rSab" ${UI.repSab?"checked":""}> Incluir sábados</label><button class="btn pri" data-act="repauto">Repor tudo automaticamente</button></div></div>
    <p class="small muted" style="margin-top:-2px">As datas sugeridas são dias livres, sem feriado, sem choque de docente, de sala ou de outra disciplina. Escolha uma data ou deixe o sistema lançar a primeira de cada aula.</p>
    <div style="display:flex;flex-direction:column;gap:10px">${pendRep.map(i=>{const sg=S.days[i].s[0],cs=repCands(i,4);return `<div class="row" style="align-items:flex-start;gap:10px"><div style="min-width:210px"><b>${esc(sg)}</b> · ${br(i)} (${wd(i)})<br><span class="small muted">${esc(reg[i].motivo||"")}</span></div><div class="row" style="flex:1">${cs.length?cs.map(c=>`<button class="btn sm" data-act="rep" data-o="${i}" data-n="${c.iso}">${br(c.iso)} ${wd(c.iso)}${c.fora?" (após o término)":""}</button>`).join(""):'<span class="small muted">Sem data livre nos próximos dias. Libere agenda ou inclua sábados.</span>'}</div></div>`}).join("")}</div></section>`:"";
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:8px"><h2>Registro de aulas dadas</h2>
    <div class="row"><select id="rfSel" style="width:auto" aria-label="Filtrar registros"><option value="pend" ${f==="pend"?"selected":""}>Pendentes de registro</option><option value="nao" ${f==="nao"?"selected":""}>Aulas não dadas</option><option value="fut" ${f==="fut"?"selected":""}>Próximas aulas</option><option value="todos" ${f==="todos"?"selected":""}>Todas</option></select>
    <select id="cf" style="width:auto" aria-label="Filtrar disciplina"><option value="">Todas as disciplinas</option>${S.ucs.map(u=>`<option value="${esc(u.sigla)}" ${u.sigla===UI.ucFilter?"selected":""}>${esc(u.sigla)}</option>`).join("")}</select></div></div>
    <p class="small" style="margin:0 0 10px"><b>${tot.d}</b> de ${tot.p} encontros previstos já dados · <b>${pend}</b> aula(s) passada(s) sem registro · <b>${tot.n}</b> não dada(s) sem reposição</p>
    <div class="tw"><table><thead><tr><th>Data</th><th>Dia</th><th>UC</th><th class="n">Encontro</th><th>Docente</th><th>Situação</th><th class="n">Alunos com falta</th><th></th></tr></thead><tbody>
    ${rows.map(x=>`<tr><td class="mono">${br(x.iso)}</td><td>${wd(x.iso)}</td><td>${esc(x.sg)}</td><td class="n mono">${x.n}</td><td>${esc((ucOf(x.sg)||{}).docente||"-")}</td><td>${badge(x.r)}</td><td class="n mono">${x.r&&x.r.dado==="sim"?nf(x.r):"-"}</td><td><button class="btn sm ${x.r?"":"pri"}" data-act="regopen" data-iso="${x.iso}">${x.r?"Editar":"Registrar"}</button></td></tr>`).join("")||'<tr><td colspan="8" class="muted">Nenhuma aula neste filtro.</td></tr>'}
    </tbody></table></div></section>${repPanel}`;
}
export function openRegModal(iso){
  const r=(S.reg||{})[iso]||{},sg=((S.days[iso]||{}).s||[])[0],u=ucOf(sg)||{},n=S.cfg.aulasDia;
  const sit=r.dado||"";
  const selF=a=>{const v=(r.faltas&&r.faltas[a.id])||0;return `<select data-fa="${esc(a.id)}" aria-label="Faltas de ${esc(a.nome)}" style="width:auto">${Array.from({length:n+1},(_,k)=>`<option value="${k}" ${k===+v?"selected":""}>${k===0?"Presente":k===n?`Faltou (${n})`:k+(k===1?" falta":" faltas")}</option>`).join("")}</select>`};
  document.getElementById("modalRoot").innerHTML=`<div class="ov" data-act="mclose"><div class="modal" role="dialog" aria-label="Registro da aula" data-iso="${iso}" style="width:min(100%,560px)">
    <h3>${WDL[dow(iso)]}, ${br(iso)} · ${esc(sg||"")}</h3><div class="small muted">${esc(u.nome||"")}${u.docente?" · "+esc(u.docente):""}</div>
    <label class="f">Situação<select id="rSit"><option value="" ${sit===""?"selected":""}>(sem registro)</option><option value="sim" ${sit==="sim"?"selected":""}>Aula dada</option><option value="nao" ${sit==="nao"?"selected":""}>Aula não dada</option></select></label>
    <div id="rNao" ${sit==="nao"?"":"hidden"}><label class="f">Motivo<select id="rMot">${MOTIVOS.map(m=>`<option ${m===r.motivo?"selected":""}>${m}</option>`).join("")}</select></label>
      ${r.rep?`<p class="small">Reposição lançada em <b>${br(r.rep)}</b>. Salvar com outra situação remove essa reposição do calendário.</p>`:'<p class="small muted">Depois de salvar, a aba Chamada sugere as datas de reposição.</p>'}</div>
    <div id="rSim" ${sit==="sim"?"":"hidden"}>${S.alunos.length?`<div class="row" style="justify-content:space-between;margin-bottom:6px"><b>Faltas dos alunos</b><button class="btn sm" data-act="rall">Todos presentes</button></div>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto">${S.alunos.map(a=>`<div class="row" style="justify-content:space-between"><span>${esc(a.nome)}</span>${selF(a)}</div>`).join("")}</div>`:'<p class="small muted">Cadastre os alunos na aba Alunos para registrar as faltas.</p>'}</div>
    <label class="f">Observação<input type="text" id="rObs" value="${esc(r.obs||"")}"></label>
    <div class="row"><button class="btn pri" data-act="rsave">Salvar</button><button class="btn" data-act="mclose2">Cancelar</button></div></div></div>`;
}
export function saveReg(){
  const m=document.querySelector(".modal"),iso=m.dataset.iso,sit=document.getElementById("rSit").value,old=S.reg[iso]||{};
  const obs=document.getElementById("rObs").value.trim();
  if(old.rep&&sit!=="nao"&&S.days[old.rep]&&String(S.days[old.rep].h||"").startsWith("Reposição"))delete S.days[old.rep];
  if(!sit)delete S.reg[iso];
  else if(sit==="nao")S.reg[iso]={dado:"nao",motivo:document.getElementById("rMot").value,...(obs?{obs}:{}),...(old.dado==="nao"&&old.rep?{rep:old.rep}:{})};
  else{const fa={};m.querySelectorAll("[data-fa]").forEach(s=>{if(+s.value>0)fa[s.dataset.fa]=+s.value});S.reg[iso]={dado:"sim",...(Object.keys(fa).length?{faltas:fa}:{}),...(obs?{obs}:{})}}
  save();closeModal();renderView();
}
export const actions={
  "regopen":(b,e,a)=>{openRegModal(b.dataset.iso)},
  "rsave":(b,e,a)=>{saveReg()},
  "rall":(b,e,a)=>{document.querySelectorAll("[data-fa]").forEach(s=>s.value="0")},
  "rep":(b,e,a)=>{{if(applyRep(b.dataset.o,b.dataset.n)){save();renderView();toast("Reposição lançada em "+br(b.dataset.n))}}},
  "repauto":(b,e,a)=>{repAuto()},
};
export const changes=[
  [t=>t.id==="rSab",(t,e)=>{UI.repSab=t.checked;renderView()}],
  [t=>t.id==="rSit",(t,e)=>{document.getElementById("rNao").hidden=t.value!=="nao";document.getElementById("rSim").hidden=t.value!=="sim"}],
  [t=>t.id==="aUc",(t,e)=>{const r=calc().rows.find(r=>r.u.sigla===t.value);document.getElementById("aQty").value=Math.max(r?r.faltam:1,1)}],
];

