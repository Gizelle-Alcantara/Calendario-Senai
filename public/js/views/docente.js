import {MESES, WD} from "../config.js";
import {PLUR, calcOf, spanOf} from "../rules.js";
import {DL, DOC_ID, G, T, UI} from "../state.js";
import {fdt, spanStr, toast} from "../ui.js";
import {br, dow, esc, hm, slug, todayISO} from "../util.js";
import {monthList} from "./calendario.js";
import {ensureWeek, viewToggle, weekList, weekNav} from "./semana.js";
export function docAgg(d){
  const turmas=[],aulas=[],fer={};
  Object.entries(T).forEach(([id,st],ti)=>{
    const C=calcOf(st),rows=C.rows.filter(r=>r.u.docente===d.nome);
    if(!rows.length)return;
    turmas.push({id,st,ti,rows});
    rows.forEach(r=>r.ds.forEach((iso,k)=>aulas.push({iso,ti,turma:st.cfg.turma,sig:r.u.sigla,nome:r.u.nome,n:k+1,P:r.P,sala:r.u.sala||"",h:(st.days[iso]||{}).h||"",hor:spanStr(st.cfg)})));
    Object.entries(st.days).forEach(([iso,e])=>{if(e.t==="feriado"||e.t==="sem")fer[iso]=e.h||"Sem aula"});
  });
  aulas.sort((a,b)=>a.iso<b.iso?-1:a.iso>b.iso?1:a.ti-b.ti);
  return {turmas,aulas,fer};
}
export function renderDocente(){
  const hdr=document.getElementById("hdr"),v=document.getElementById("view");
  document.getElementById("tabs").innerHTML="";
  const back=UI.cw===false?"":'<a class="btn sm" href="#">Voltar ao planejador</a>';
  if(!UI.loaded||UI.empty){hdr.innerHTML=`<h1>Calendário do docente</h1>${back}`;v.innerHTML=`<p class="muted">${UI.err||(UI.empty?"O calendário ainda não foi publicado. Volte mais tarde.":"Carregando…")}</p>`;return}
  const d=G.docentes.find(x=>slug(x.nome)===DOC_ID);
  if(!d){
    hdr.innerHTML=`<h1>Calendário do docente</h1>${back}`;
    v.innerHTML=`<section class="panel"><h2>Escolha seu nome</h2><div style="display:flex;flex-direction:column;gap:8px">${G.docentes.map(x=>`<a class="btn" href="#docente-${esc(slug(x.nome))}">${esc(x.nome)}</a>`).join("")||'<span class="muted">Nenhum docente cadastrado.</span>'}</div></section>`;return;
  }
  const A=docAgg(d),t=todayISO();
  hdr.innerHTML=`<h1>${esc(d.nome)}</h1><span class="meta mono">Calendário do docente</span><div class="hbar"><span class="stat" data-k="saved">● Ao vivo${UI.savedAt?" · atualizado "+esc(fdt(UI.savedAt)):""}</span>${back}<a class="btn sm" href="#docente">Trocar docente</a></div>`;
  if(!A.turmas.length){v.innerHTML='<section class="panel"><p class="muted" style="margin:0">Você ainda não está associado a nenhuma disciplina. Fale com a coordenação.</p></section>';return}
  const ini=A.turmas.map(x=>x.st.cfg.inicio).sort()[0],fim=A.turmas.map(x=>x.st.cfg.termino).sort().pop(),ml=monthList(ini,fim);
  if(!UI.month||!ml.includes(UI.month)){const tm=t.slice(0,7);UI.month=ml.includes(tm)?tm:ml[0]}
  const [y,m]=UI.month.split("-").map(Number);
  const first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  const byDay={};A.aulas.forEach(a=>(byDay[a.iso]=byDay[a.iso]||[]).push(a));
  const semana=UI.cview==="semana";if(semana)ensureWeek(ini,fim);
  const dayFn=iso=>{
    const w=dow(iso),as=byDay[iso]||[],b=(d.bloqueios||[]).find(x=>x.de&&iso>=x.de&&iso<=(x.ate||x.de));
    const blk=(d.semana||[]).includes(w)||!!b,lab=A.fer[iso]||(b?(b.motivo||"Indisponível"):""),cls=[];
    if(w===0||w===6)cls.push("wk");if(A.fer[iso])cls.push("hol");if(blk&&!A.fer[iso])cls.push("blk");
    return {cls,lab,clickable:false,sr:blk&&!A.fer[iso]?"Dia em que você está indisponível.":"",items:as.map(a=>({c:`var(--u${a.ti%8})`,bad:as.length>1,html:`<b>${esc(a.turma)} · ${esc(a.sig)}</b> ${a.n}/${a.P} · ${esc(a.nome)} · ${esc(a.hor)}${a.sala?" · sala "+esc(a.sala):""}`}))};
  };
  let cells=WD.map(x=>`<div class="h">${x}</div>`).join("");
  for(let i=0;i<first;i++)cells+='<div class="day blank"></div>';
  for(let k=1;k<=dim;k++){
    const iso=`${UI.month}-${String(k).padStart(2,"0")}`,w=dow(iso),as=byDay[iso]||[],b=(d.bloqueios||[]).find(x=>x.de&&iso>=x.de&&iso<=(x.ate||x.de));
    const blk=(d.semana||[]).includes(w)||!!b,lab=A.fer[iso]||(b?(b.motivo||"Indisponível"):"");
    const cl=["day"];if(w===0||w===6)cl.push("wk");if(A.fer[iso])cl.push("hol");if(blk&&!A.fer[iso])cl.push("blk");if(iso===t)cl.push("today");
    cells+=`<div class="${cl.join(" ")}"><span class="dn">${k}</span>${lab?`<span class="lb">${esc(lab)}</span>`:""}${as.map(a=>`<span class="chip ${as.length>1?"bad":""}" style="--c:var(--u${a.ti%8})" title="${esc(a.nome+" · encontro "+a.n+"/"+a.P+" · "+a.hor)}">${esc(a.turma)} · ${esc(a.sig)} ${a.n}</span>`).join("")}</div>`;
  }
  const next=A.aulas.filter(a=>a.iso>=t).slice(0,10);
  const wk=(d.semana||[]).map(w=>PLUR[w]),bl=(d.bloqueios||[]).filter(x=>x.de);
  v.innerHTML=`
  <section class="panel"><h2>Próximas aulas</h2>${next.length?`<div class="tw"><table><thead><tr><th>Data</th><th>Dia</th><th>Turma</th><th>Disciplina</th><th class="n">Encontro</th><th>Sala</th><th>Horário</th><th>Obs.</th></tr></thead><tbody>
  ${next.map(a=>`<tr ${a.iso===t?'style="font-weight:600"':""}><td class="mono">${br(a.iso)}${a.iso===t?" · hoje":""}</td><td>${WD[dow(a.iso)]}</td><td class="mono">${esc(a.turma)}</td><td><span class="sig" style="--c:var(--u${a.ti%8})">${esc(a.sig)}</span> <span class="small muted">${esc(a.nome)}</span></td><td class="n mono">${a.n}/${a.P}</td><td>${esc(a.sala)}</td><td class="mono">${a.hor}</td><td>${esc(a.h)}</td></tr>`).join("")}
  </tbody></table></div>`:'<p class="muted">Nenhuma aula lançada a partir de hoje.</p>'}</section>
  <section class="panel">${semana?weekNav():""}<div class="calbar" ${semana?"hidden":""}><div class="row"><button class="btn" data-act="mprev" aria-label="Mês anterior">‹</button><h2>${MESES[m-1]} de ${y}</h2><button class="btn" data-act="mnext" aria-label="Próximo mês">›</button></div>
    <select id="mjump" aria-label="Ir para o mês" style="width:auto">${ml.map(x=>`<option value="${x}" ${x===UI.month?"selected":""}>${MESES[+x.slice(5)-1]} ${x.slice(0,4)}</option>`).join("")}</select>${viewToggle()}</div>
    <div class="pal" style="margin-block:12px 10px">${A.turmas.map(x=>`<span class="small"><span class="sig" style="--c:var(--u${x.ti%8})">${esc(x.st.cfg.turma)}</span> ${esc(x.st.cfg.curso)} · ${esc(x.st.cfg.turno)}</span>`).join(" ")}</div>
    ${semana?weekList(dayFn):`<div class="cal">${cells}</div>`}<p class="small muted">Cada chip mostra turma, sigla e número do encontro. Dias em vermelho são feriados ou dias sem aula. Dias listrados são dias em que você está indisponível.</p></section>
  <section class="panel"><h2>Minhas disciplinas</h2><div class="tw"><table><thead><tr><th>Turma</th><th>Disciplina</th><th class="n">CH</th><th class="n">Encontros</th><th>Início</th><th>Fim</th><th>Horário</th><th>Situação</th></tr></thead><tbody>
  ${A.turmas.flatMap(x=>x.rows.map(r=>`<tr><td class="mono">${esc(x.st.cfg.turma)}</td><td><span class="sig" style="--c:var(--u${x.ti%8})">${esc(r.u.sigla)}</span> ${esc(r.u.nome)}</td><td class="n mono">${r.u.ch} h</td><td class="n mono">${r.ds.filter(z=>z<=t).length}/${r.P}</td><td class="mono">${br(r.ini)}</td><td class="mono">${br(r.fim)}</td><td class="mono">${spanStr(x.st.cfg)}</td><td><span class="pill ${r.status.replace(" ","-")}">${r.status}</span></td></tr>`)).join("")}
  </tbody></table></div></section>
  <section class="panel"><h2>Disponibilidade</h2>${wk.length||bl.length?`<ul class="av">${wk.length?`<li><span class="dot info"></span><span>Não leciona ${esc(wk.join(", "))}.</span></li>`:""}${bl.map(x=>`<li><span class="dot info"></span><span>Indisponível de ${br(x.de)}${x.ate&&x.ate!==x.de?" a "+br(x.ate):""}${x.motivo?" ("+esc(x.motivo)+")":""}.</span></li>`).join("")}</ul>`:'<p class="muted" style="margin:0">Nenhum bloqueio cadastrado.</p>'}
    <p class="small muted" style="margin-bottom:0">Para mudar sua disponibilidade, fale com a coordenação.</p></section>
  <details class="panel"><summary>Levar minhas aulas para a agenda</summary>
    <div class="row" style="margin-top:12px">${DL?'<button class="btn" data-act="dldoc">Baixar minhas aulas (CSV)</button>':""}<button class="btn" data-act="copy" data-id="docIcs">Copiar agenda (.ics)</button></div>
    <p class="small muted">Cole o texto em um arquivo com extensão .ics e importe no Google Agenda ou no Outlook.</p>
    <textarea id="docIcs" readonly>${esc(docIcs(A))}</textarea></details>`;
}
export function docIcs(A){
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planejador de Turma//PT-BR"];
  A.aulas.forEach(a=>{const st=T[Object.keys(T)[a.ti]],sp=spanOf(st.cfg),d=a.iso.replace(/-/g,"");
    L.push("BEGIN:VEVENT",`UID:${d}-${a.turma}-${a.sig}@planejador`,`DTSTAMP:${d}T000000`,`DTSTART:${d}T${hm(sp[0]).replace(":","")}00`,`DTEND:${d}T${hm(sp[1]).replace(":","")}00`,`SUMMARY:${a.sig} - Turma ${a.turma}`,"END:VEVENT")});
  L.push("END:VCALENDAR");return L.join("\r\n");
}
export function csvDoc(A){return ["Data;Dia;Turma;Sigla;Disciplina;Encontro;Sala;Horário;Observação",...A.aulas.map(a=>[br(a.iso),WD[dow(a.iso)],a.turma,a.sig,a.nome,`${a.n}/${a.P}`,a.sala,a.hor,a.h].join(";"))].join("\n")}

/* ---------- render / eventos ---------- */
/* ---------- CHAMADA, FALTAS E REPOSIÇÃO ---------- */
export const actions={
  "dldoc":(b,e,a)=>{{const d=G.docentes.find(x=>slug(x.nome)===DOC_ID);if(d&&DL)DL.save({filename:`aulas-${DOC_ID}.csv`,data:"\ufeff"+csvDoc(docAgg(d))}).then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")})}},
};
export const changes=[];

