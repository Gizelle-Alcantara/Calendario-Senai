import {MESES, WD} from "../config.js";
import {calc, colorOf, ucOf} from "../rules.js";
import {S, T, UI} from "../state.js";
import {fdt, rowHorario, sig} from "../ui.js";
import {br, dow, esc, todayISO} from "../util.js";
import {monthList} from "./calendario.js";
import {horTable} from "./painel.js";
export function roCells(ym,C){
  const [y,m]=ym.split("-").map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),dim=new Date(Date.UTC(y,m,0)).getUTCDate(),t=todayISO();
  let cells=WD.map(d=>`<div class="h">${d}</div>`).join("");
  for(let i=0;i<first;i++)cells+=`<div class="day blank"></div>`;
  for(let d=1;d<=dim;d++){
    const iso=`${ym}-${String(d).padStart(2,"0")}`,e=S.days[iso]||{},w=dow(iso),s=e.s||[];
    const cl=["day"];if(w===0||w===6)cl.push("wk");if(iso<S.cfg.inicio||iso>S.cfg.termino)cl.push("out");if(e.t==="feriado")cl.push("hol");if(e.t==="sem")cl.push("sem");if(iso===t)cl.push("today");
    const chips=s.map((sg,j)=>{const u=ucOf(sg);return `<span class="chip" style="--c:${colorOf(sg)};${UI.fUc&&sg!==UI.fUc?"opacity:.2":""}" title="${esc(u?u.nome:sg)}">${esc(sg)} ${C.enc[iso][j]}</span>`}).join("");
    cells+=`<div class="${cl.join(" ")}"><span class="dn">${d}</span>${e.h?`<span class="lb">${esc(e.h)}</span>`:""}${chips}</div>`;
  }
  return cells;
}
export function renderAluno(){
  const hdr=document.getElementById("hdr"),v=document.getElementById("view");
  document.getElementById("tabs").innerHTML="";
  const back=(UI.cw===false?"":'<a class="btn sm" href="#">Voltar ao planejador</a>')+(Object.keys(T).length>1&&S?'<a class="btn sm" href="#aluno">Trocar turma</a>':"");
  if(UI.loaded&&!UI.empty&&!S){
    hdr.innerHTML=`<h1>Calendário das turmas</h1>${UI.cw===false?"":'<a class="btn sm" href="#">Voltar ao planejador</a>'}`;
    v.innerHTML=`<section class="panel"><h2>Escolha sua turma</h2><div style="display:flex;flex-direction:column;gap:8px">${Object.entries(T).map(([id,st])=>`<a class="btn" href="#aluno-${esc(id)}" style="text-decoration:none">Turma ${esc(st.cfg.turma)} · ${esc(st.cfg.curso)} · ${esc(st.cfg.turno)}</a>`).join("")}</div></section>`;return;
  }
  if(!UI.loaded||UI.empty){
    hdr.innerHTML=`<h1>Calendário da turma</h1>${back}`;
    v.innerHTML=`<p class="muted">${UI.err||(UI.empty?"O calendário desta turma ainda não foi publicado. Volte mais tarde.":"Carregando…")}</p>`;return;
  }
  const C=calc(),c=S.cfg,t=todayISO();
  hdr.innerHTML=`<h1>${esc(c.curso)}</h1><span class="meta mono">Turma ${esc(c.turma)} · Módulo ${esc(c.modulo)} · ${esc(c.turno)}</span><div class="hbar"><span class="stat" data-k="saved">● Ao vivo${UI.savedAt?" · atualizado "+esc(fdt(UI.savedAt)):""}</span>${back}</div>`;
  const next=[];
  for(const iso of C.isos){if(iso>=t&&(S.days[iso].s||[]).some(sg=>!UI.fUc||sg===UI.fUc)){next.push(iso);if(next.length>=7)break}}
  const P=Object.fromEntries(C.rows.map(r=>[r.u.sigla,r.P]));
  if(!UI.month){const ml=monthList(),tm=t.slice(0,7);UI.month=ml.includes(tm)?tm:ml[0]}
  const [y,m]=UI.month.split("-").map(Number),ml=monthList();
  const used=new Set(C.rows.map(r=>r.u.sigla));
  v.innerHTML=`
  <section class="panel"><h2>Próximas aulas</h2>
    ${next.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Dia</th><th>Disciplina</th><th class="n">Encontro</th><th>Docente</th><th>Sala</th><th>Horário</th><th>Obs.</th></tr></thead><tbody>
    ${next.flatMap(iso=>(S.days[iso].s||[]).map((sg,j)=>{if(UI.fUc&&sg!==UI.fUc)return "";const u=ucOf(sg)||{};return `<tr ${iso===t?'style="font-weight:600"':""}><td class="mono">${br(iso)}${iso===t?" · hoje":""}</td><td>${WD[dow(iso)]}</td><td>${sig(sg)} <span class="small muted">${esc(u.nome||"")}</span></td><td class="n mono">${C.enc[iso][j]}/${P[sg]??"?"}</td><td>${esc(u.docente||"")}</td><td>${esc(u.sala||"")}</td><td class="mono">${rowHorario()}</td><td>${esc(S.days[iso].h||"")}</td></tr>`})).join("")}
    </tbody></table></div>`:'<p class="muted">Nenhuma aula lançada a partir de hoje.</p>'}
  </section>
  <section class="panel"><h2>Disciplinas</h2><div class="tw"><table><thead><tr><th>Disciplina</th><th>Docente</th><th class="n">CH</th><th>Andamento</th><th class="n">Encontros</th><th class="n">Limite de faltas</th><th>Início</th><th>Fim</th><th>Situação</th></tr></thead><tbody>
  ${C.rows.map(r=>{const done=r.ds.filter(d=>d<=t).length;return `<tr><td>${sig(r.u.sigla)} ${esc(r.u.nome)}</td><td>${esc(r.u.docente)||'<span class="muted">-</span>'}</td><td class="n mono">${r.u.ch} h</td>
  <td><div class="bar" style="--c:${colorOf(r.u.sigla)}"><i style="width:${r.P?Math.min(100,done/r.P*100):0}%"></i></div></td><td class="n mono">${done}/${r.P}</td><td class="n mono">${r.R}</td><td class="mono">${br(r.ini)}</td><td class="mono">${br(r.fim)}</td><td><span class="pill ${r.status.replace(" ","-")}">${r.status}</span></td></tr>`}).join("")}
  </tbody></table></div><p class="small muted">Limite de faltas: 25% das aulas de cada disciplina.${c.coord?" Coordenação: "+esc(c.coord)+".":""}</p></section>
  <section class="panel"><div class="calbar"><div class="row"><button class="btn" data-act="mprev" aria-label="Mês anterior">‹</button><h2>${MESES[m-1]} de ${y}</h2><button class="btn" data-act="mnext" aria-label="Próximo mês">›</button></div>
    <select id="mjump" aria-label="Ir para o mês" style="width:auto">${ml.map(x=>`<option value="${x}" ${x===UI.month?"selected":""}>${MESES[+x.slice(5)-1]} ${x.slice(0,4)}</option>`).join("")}</select></div>
    <div class="pal" style="margin-block:12px 10px" role="group" aria-label="Filtrar disciplina"><button data-act="fuc" data-k="" aria-pressed="${!UI.fUc}">Todas</button>${S.ucs.filter(u=>used.has(u.sigla)).map(u=>`<button data-act="fuc" data-k="${esc(u.sigla)}" aria-pressed="${UI.fUc===u.sigla}" title="${esc(u.nome)}"><span class="sw" style="--c:${colorOf(u.sigla)}"></span>${esc(u.sigla)}</button>`).join("")}</div>
    <div class="cal">${roCells(UI.month,C)}</div><p class="small muted">O número ao lado da sigla é o encontro. Dias em vermelho são feriados.</p></section>
  <section class="panel"><h2>Horário das aulas</h2>${horTable()}</section>`;
}

/* ---------- ENTRADA E VISÃO DO DOCENTE (somente leitura) ---------- */
