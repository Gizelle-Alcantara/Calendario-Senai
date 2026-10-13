import {MESES, TURNOS, WD, WDL} from "../config.js";
import {renderView} from "../render.js";
import {blockMsg, calc, colorOf, confDay, countConf, ucOf} from "../rules.js";
import {copiarTurma, sugerirPeriodo} from "../semestre.js";
import {S, T, UI, normalize, setState} from "../state.js";
import {save} from "../store.js";
import {closeModal, rowHorario, toast} from "../ui.js";
import {addD, br, dow, esc, slug, todayISO} from "../util.js";
import {ensureWeek, viewToggle, weekList, weekNav} from "./semana.js";
export function monthList(a,b){
  const out=[];let [y,m]=(a||S.cfg.inicio).split("-").map(Number);const [ye,me]=(b||S.cfg.termino).split("-").map(Number);
  while((y<ye||(y===ye&&m<=me))&&out.length<48){out.push(`${y}-${String(m).padStart(2,"0")}`);m++;if(m>12){m=1;y++}}
  return out;
}
export function shiftMonth(ym,n){let [y,m]=ym.split("-").map(Number);m+=n;while(m>12){m-=12;y++}while(m<1){m+=12;y--}return `${y}-${String(m).padStart(2,"0")}`}
export function vCal(){
  if(!UI.month){const t=todayISO().slice(0,7),ml=monthList();UI.month=ml.includes(t)?t:ml[0]}
  const C=calc(),ym=UI.month,[y,m]=ym.split("-").map(Number);
  const first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),dim=new Date(Date.UTC(y,m,0)).getUTCDate(),t=todayISO();
  let cells=WD.map((d,i)=>`<div class="h" aria-hidden="true">${d}</div>`).join("");
  for(let i=0;i<first;i++)cells+=`<div class="day blank"></div>`;
  for(let d=1;d<=dim;d++){
    const iso=`${ym}-${String(d).padStart(2,"0")}`,e=S.days[iso]||{},w=dow(iso),s=e.s||[];
    const cl=["day"];if(w===0||w===6)cl.push("wk");if(iso<S.cfg.inicio||iso>S.cfg.termino)cl.push("out");if(e.t==="feriado")cl.push("hol");if(e.t==="sem")cl.push("sem");if(iso===t)cl.push("today");
    const cf=confDay(iso).join("; ");
    const chips=s.map((sg,j)=>{const u=ucOf(sg);return `<span class="chip ${u&&!cf?"":"bad"}" style="--c:${colorOf(sg)}">${cf?'<span aria-hidden="true">⚠ </span>':""}${esc(sg)} ${C.enc[iso][j]}</span><span class="sr-only"> ${esc(u?u.nome:sg)}, encontro ${C.enc[iso][j]}.</span>`}).join("");
    const extra=[cf?"Choque: "+cf+".":"",iso<S.cfg.inicio||iso>S.cfg.termino?"Fora do período da turma.":"",!s.length&&!e.h&&!(w===0||w===6)?"Sem lançamento.":""].filter(Boolean).join(" ");
    cells+=`<button class="${cl.join(" ")}" data-act="day" data-iso="${iso}"><span class="dn">${d}<span class="sr-only"> de ${MESES[m-1]}, ${WDL[w]}${iso===t?", hoje":""}.</span></span>${e.h?`<span class="lb">${esc(e.h)}<span class="sr-only">.</span></span>`:""}${chips}${extra?`<span class="sr-only"> ${esc(extra)}</span>`:""}</button>`;
  }
  const ml=monthList();
  const tools=[["edit","Editar dia","--accent"],...S.ucs.map((u,i)=>["uc:"+u.sigla,u.sigla,`--u${i%8}`]),["feriado","Feriado","--bad"],["sem","Sem aula","--muted"],["erase","Limpar dia","--muted"]];
  const semana=UI.cview==="semana";if(semana)ensureWeek();
  const dayFn=iso=>{
    const e=S.days[iso]||{},w=dow(iso),s=e.s||[],cf=confDay(iso).join("; "),cls=[];
    if(w===0||w===6)cls.push("wk");if(iso<S.cfg.inicio||iso>S.cfg.termino)cls.push("out");if(e.t==="feriado")cls.push("hol");if(e.t==="sem")cls.push("sem");
    const extra=[cf?"Choque: "+cf+".":"",iso<S.cfg.inicio||iso>S.cfg.termino?"Fora do período da turma.":"",!s.length&&!e.h&&!(w===0||w===6)?"Sem lançamento.":""].filter(Boolean).join(" ");
    return {cls,lab:e.h||"",clickable:true,sr:extra,items:s.map((sg,j)=>{const u=ucOf(sg);return {c:colorOf(sg),bad:!!cf||!u,html:`${cf?'<span aria-hidden="true">⚠ </span>':""}<b>${esc(sg)}</b> ${C.enc[iso][j]} · ${esc(u?u.nome:sg)}${u&&u.docente?" · "+esc(u.docente):""}${u&&u.sala?" · sala "+esc(u.sala):""} · ${rowHorario()}`}})};
  };
  const wdBoxes=WD.map((n,i)=>`<label><input type="checkbox" class="aw" value="${i}" ${[2,4].includes(i)?"checked":""}> ${n}</label>`).join("");
  return `<section class="panel">
    ${semana?weekNav():""}<div class="calbar" ${semana?"hidden":""}><div class="row"><button class="btn" data-act="mprev" aria-label="Mês anterior"><span aria-hidden="true">‹</span></button><h2 id="calTitulo">${MESES[m-1]} de ${y}</h2><button class="btn" data-act="mnext" aria-label="Próximo mês"><span aria-hidden="true">›</span></button></div>
    <div class="row"><select id="mjump" aria-label="Ir para o mês" style="width:auto">${ml.map(x=>`<option value="${x}" ${x===ym?"selected":""}>${MESES[+x.slice(5)-1]} ${x.slice(0,4)}</option>`).join("")}</select>${viewToggle()}</div></div>
    <div class="pal" style="margin-block:12px 4px" role="group" aria-label="Ferramenta">${tools.map(([k,l,v])=>`<button data-act="tool" data-k="${esc(k)}" aria-pressed="${UI.tool===k}"><span class="sw" style="--c:var(${v})"></span>${esc(l)}</button>`).join("")}
      ${UI.tool==="feriado"||UI.tool==="sem"?`<input type="text" id="holName" placeholder="${UI.tool==="feriado"?"Nome do feriado":"Motivo (opcional)"}" value="${esc(UI.holName)}" style="width:200px">`:""}</div>
    <p class="small muted" style="margin:0 0 10px">${UI.tool==="edit"?"Clique em um dia para editar detalhes.":UI.tool.startsWith("uc:")?"Clique nos dias para lançar a aula. Clique de novo para remover.":"Clique nos dias para aplicar."} Cada chip mostra a sigla e o número do encontro.</p>
    ${semana?weekList(dayFn):`<div class="cal" role="group" aria-label="Dias de ${MESES[m-1]} de ${y}. Use as setas para mover entre os dias.">${cells}</div>`}</section>
  <details class="panel"><summary>Lançar vários encontros de uma vez</summary>
    <div class="form" style="margin-top:12px">
      <label class="f">Disciplina<select id="aUc">${S.ucs.map(u=>`<option value="${esc(u.sigla)}">${esc(u.sigla)} · ${esc(u.nome)}</option>`).join("")}</select></label>
      <label class="f">A partir de<input type="date" id="aFrom" value="${S.cfg.inicio}"></label>
      <label class="f">Quantidade<input type="number" id="aQty" min="1" value="${Math.max(C.rows[0]?C.rows[0].faltam:1,1)}"></label>
    </div>
    <div class="wds" style="margin-block:12px">${wdBoxes}</div>
    <div class="row"><button class="btn pri" data-act="auto">Lançar</button><span class="small muted">Pula feriados, dias sem aula, dias já ocupados e dias bloqueados para o docente.</span></div>
  </details>`;
}
export function dayClick(iso){
  const tool=UI.tool;let e=S.days[iso]||{s:[]};e.s=e.s||[];
  if(tool==="edit"){openDayModal(iso);return}
  if(tool==="erase"){delete S.days[iso]}
  else if(tool==="feriado"||tool==="sem"){S.days[iso]={s:[],t:tool,h:UI.holName||(tool==="sem"?"SEM AULA":"FERIADO")}}
  else if(tool.startsWith("uc:")){
    const sg=tool.slice(3);
    if(e.t==="feriado"||e.t==="sem"){toast("Dia marcado como "+(e.t==="sem"?"sem aula":"feriado")+". Limpe o dia antes.");return}
    const k=e.s.lastIndexOf(sg);
    if(k>=0){e.s.splice(k,1)}
    else if(e.s.length){toast(`Choque: o dia já tem ${e.s[0]}. Remova antes de lançar outra disciplina.`);return}
    else{const m=blockMsg(iso,sg);if(m){toast("Choque: "+m+".");return}e.s.push(sg)}
    if(!e.s.length&&!e.h)delete S.days[iso];else S.days[iso]=e;
  }
  save();renderView();
}
export function openDayModal(iso){
  const e=S.days[iso]||{s:[]},w=dow(iso);
  const opt=(v)=>`<option value="">(nenhuma)</option>`+S.ucs.map(u=>`<option value="${esc(u.sigla)}" ${u.sigla===v?"selected":""}>${esc(u.sigla)} · ${esc(u.nome)}</option>`).join("");
  const t=e.t==="feriado"||e.t==="sem"?e.t:"letivo";
  document.getElementById("modalRoot").innerHTML=`<div class="ov" data-act="mclose"><div class="modal" role="dialog" aria-label="Editar dia" data-iso="${iso}">
    <h3>${WDL[w]}, ${br(iso)}</h3>
    <label class="f">Tipo do dia<select id="mT"><option value="letivo" ${t==="letivo"?"selected":""}>Dia letivo</option><option value="feriado" ${t==="feriado"?"selected":""}>Feriado</option><option value="sem" ${t==="sem"?"selected":""}>Sem aula</option></select></label>
    <label class="f">Disciplina do dia<select id="mS1">${opt(e.s[0])}</select></label>
    ${e.s.length>1?`<label class="f">Disciplina extra (choque: remova)<select id="mS2">${opt(e.s[1])}</select></label>`:""}
    <label class="f">Nome do feriado ou observação<input type="text" id="mH" value="${esc(e.h||"")}"></label>
    <div id="mInfo" class="small muted"></div>
    <div class="row"><button class="btn pri" data-act="msave">Salvar</button><button class="btn bad" data-act="mclear">Limpar dia</button><button class="btn" data-act="mclose2">Cancelar</button></div></div></div>`;
  updModalInfo();
}
export function updModalInfo(){
  const el=document.getElementById("mInfo");if(!el)return;
  const iso=document.querySelector(".modal").dataset.iso,letivo=document.getElementById("mT").value==="letivo";
  const sel=["mS1","mS2"].map(id=>document.getElementById(id)).filter(Boolean).map(x=>x.value).filter(Boolean);
  const out=sel.map(sg=>{const u=ucOf(sg);return u?`${sg}: docente ${u.docente||"não definido"}${u.sala?" · sala "+u.sala:""}`:""});
  const bad=letivo?sel.map(sg=>blockMsg(iso,sg)).filter(Boolean):[];
  if(letivo&&sel.length>1)bad.push("duas disciplinas no mesmo dia");
  el.innerHTML=out.map(esc).join("<br>")+(out.length?"<br>":"")+"Horário: "+rowHorario()+(bad.length?`<br><b style="color:var(--bad)">Choque: ${esc(bad.join("; "))}.</b>`:"");
  const sv=document.querySelector("[data-act=msave]");if(sv)sv.disabled=bad.length>0;
}
export function saveModal(){
  const m=document.querySelector(".modal"),iso=m.dataset.iso;
  const t=document.getElementById("mT").value,h=document.getElementById("mH").value.trim();
  let s=["mS1","mS2"].map(id=>document.getElementById(id)).filter(Boolean).map(x=>x.value).filter(Boolean);
  if(t!=="letivo")s=[];
  else{if(s.length>1){toast("Choque: duas disciplinas no mesmo dia.");return}
    const bm=s.map(sg=>blockMsg(iso,sg)).find(Boolean);if(bm){toast("Choque: "+bm+".");return}}
  const d={s};if(t!=="letivo"){d.t=t;d.h=h||(t==="sem"?"SEM AULA":"FERIADO")}else if(h){d.t="nota";d.h=h}
  if(!d.s.length&&!d.h)delete S.days[iso];else S.days[iso]=d;
  save();closeModal();renderView();
}
export function openTurmaModal(){
  document.getElementById("modalRoot").innerHTML=`<div class="ov" data-act="mclose"><div class="modal" role="dialog" aria-label="Nova turma">
    <h3>Nova turma</h3>
    <label class="f">Código da turma<input type="text" id="ntCod" placeholder="ex.: 202630"></label>
    <label class="f">Curso<input type="text" id="ntCurso" value="${esc(S?S.cfg.curso:"")}"></label>
    <div class="form" style="grid-template-columns:1fr 1fr">
      <label class="f">Turno<select id="ntTurno">${TURNOS.map(x=>`<option ${S&&x===S.cfg.turno?"selected":""}>${x}</option>`).join("")}</select></label>
      <label class="f">Módulo<input type="text" id="ntMod" value="I"></label>
      <label class="f">Início<input type="date" id="ntIni"></label>
      <label class="f">Término<input type="date" id="ntFim"></label>
      <label class="f">Aulas por dia<input type="number" id="ntAulas" min="1" max="8" value="4"></label>
      <label class="f">Coordenador<input type="text" id="ntCoord" value="${esc(S?S.cfg.coord:"")}"></label></div>
    <label class="f">Disciplinas e feriados<select id="ntCopy"><option value="">Começar vazia</option>${Object.entries(T).map(([id,st])=>`<option value="${esc(id)}">Copiar da turma ${esc(st.cfg.turma)}</option>`).join("")}</select></label>
    <fieldset id="ntOpc" class="small" style="border:0;padding:0;margin:0"><legend class="sr-only">O que copiar</legend>
      <label class="chk"><input type="checkbox" id="ntCAulas" checked> Levar as aulas já lançadas, deslocando as datas em semanas inteiras (cada aula mantém o dia da semana)</label>
      <label class="chk"><input type="checkbox" id="ntCFer" checked> Levar feriados e recessos (os que mudam de data a cada ano, como Carnaval, não são copiados)</label>
      <span class="muted">Disciplinas e docentes sempre vêm junto. Chamada e faltas não são copiadas. Ao escolher a turma de origem, o período novo é sugerido 26 semanas depois.</span></fieldset>
    <div id="ntErr" class="small" style="color:var(--bad)"></div>
    <div class="row"><button class="btn pri" data-act="turmasave">Criar turma</button><button class="btn" data-act="mclose2">Cancelar</button></div></div></div>`;
}
export function saveTurma(){
  const v=id=>document.getElementById(id).value.trim(),err=m=>{document.getElementById("ntErr").textContent=m};
  const cod=v("ntCod"),id=slug(cod);
  if(!cod)return err("Informe o código da turma.");
  if(T[id])return err("Já existe uma turma com esse código.");
  if(!v("ntIni")||!v("ntFim"))return err("Informe as datas de início e término.");
  if(v("ntFim")<v("ntIni"))return err("O término precisa ser depois do início.");
  const src=T[v("ntCopy")],ck=i=>document.getElementById(i).checked;
  const cfg={turma:cod,curso:v("ntCurso"),turno:v("ntTurno"),modulo:v("ntMod"),coord:v("ntCoord"),email:"",local:"",inicio:v("ntIni"),termino:v("ntFim"),aulasDia:Math.max(1,+v("ntAulas")||4),destinatarios:""};
  let st,resumo=null;
  if(src){
    const r=copiarTurma(src,{cod,inicio:cfg.inicio,termino:cfg.termino,aulas:ck("ntCAulas"),feriados:ck("ntCFer")});
    st=r.st;resumo=r.resumo;st.cfg={...st.cfg,curso:cfg.curso,turno:cfg.turno,modulo:cfg.modulo,coord:cfg.coord,aulasDia:cfg.aulasDia};
  }else st={cfg,ucs:[],days:{},envios:[]};
  T[id]=st;setState({CUR:id});normalize();UI.month=null;UI.week=null;UI.ucFilter="";UI.tab=src?"calendario":"disciplinas";
  save();closeModal();renderView();
  if(!resumo){toast(`Turma ${cod} criada`);return}
  const p=[`Turma ${cod} criada`];
  if(resumo.aulas)p.push(`${resumo.aulas} aula(s) copiada(s)`);
  if(resumo.feriados)p.push(`${resumo.feriados} feriado(s)`);
  if(resumo.aulasFora)p.push(`${resumo.aulasFora} aula(s) ficaram fora do período`);
  if(resumo.naoCopiados.length)p.push("lance à mão ou importe: "+resumo.naoCopiados.join(", "));
  const nc=countConf();if(nc)p.push(`${nc} choque(s): veja o Painel`);
  toast(p.join(" · ")+".");
}
export function autoAlloc(){
  const sg=document.getElementById("aUc").value,from=document.getElementById("aFrom").value;
  let qty=+document.getElementById("aQty").value;
  const wds=[...document.querySelectorAll(".aw:checked")].map(x=>+x.value);
  if(!sg||!from||!qty||!wds.length){toast("Informe disciplina, data, quantidade e dias da semana.");return}
  let iso=from,n=0,last="",guard=0,pul=0;
  while(n<qty&&guard++<800){
    const e=S.days[iso]||{s:[]};
    if(wds.includes(dow(iso))&&e.t!=="feriado"&&e.t!=="sem"&&!(e.s||[]).length){
      if(blockMsg(iso,sg))pul++;
      else{e.s=[sg];S.days[iso]=e;n++;last=iso}
    }
    iso=addD(iso,1);
  }
  save();toast(`${n} encontro(s) lançado(s)${last?" até "+br(last):""}${pul?` · ${pul} dia(s) pulado(s) por bloqueio do docente`:""}${n<qty?" · período esgotado antes de completar":""}.`);renderView();
}

/* ---------- CRONOGRAMA ---------- */
export const actions={
  "day":(b,e,a)=>{dayClick(b.dataset.iso)},
  "tool":(b,e,a)=>{{UI.tool=b.dataset.k;renderView()}},
  "mprev":(b,e,a)=>{{UI.month=shiftMonth(UI.month,-1);renderView()}},
  "mnext":(b,e,a)=>{{UI.month=shiftMonth(UI.month,1);renderView()}},
  "msave":(b,e,a)=>{saveModal()},
  "mclear":(b,e,a)=>{{delete S.days[document.querySelector(".modal").dataset.iso];save();closeModal();renderView()}},
  "mclose2":(b,e,a)=>{closeModal()},
  "auto":(b,e,a)=>{autoAlloc()},
};
export const changes=[
  [t=>t.id==="mjump",(t,e)=>{UI.month=t.value;renderView()}],
  [t=>t.id==="mS1"||t.id==="mS2"||t.id==="mT",(t,e)=>{updModalInfo()}],
  // escolher a turma de origem preenche os campos da nova turma (só os que ainda estão vazios ou no padrão)
  [t=>t.id==="ntCopy",(t)=>{
    const src=T[t.value];if(!src)return;
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v};
    const p=sugerirPeriodo(src.cfg),g=id=>document.getElementById(id).value;
    if(!g("ntIni")&&!g("ntFim")){set("ntIni",p.inicio);set("ntFim",p.termino)}
    set("ntCurso",src.cfg.curso);set("ntTurno",src.cfg.turno);set("ntMod",src.cfg.modulo);set("ntAulas",src.cfg.aulasDia);set("ntCoord",src.cfg.coord);
  }],
];

