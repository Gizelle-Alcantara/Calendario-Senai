import {MESES, WD} from "../config.js";
import {LOGO} from "../data.js";
import {renderView} from "../render.js";
import {calc, ucOf} from "../rules.js";
import {CUR, DL, G, S, UI} from "../state.js";
import {save} from "../store.js";
import {copyText, fdt, rowHorario, toast} from "../ui.js";
import {addD, br, dow, esc, fd, todayISO} from "../util.js";
import {monthList} from "./calendario.js";
import {csvText} from "./dados.js";
export const sigHash=()=>{const s=JSON.stringify({d:S.days,u:S.ucs.map(u=>[u.sigla,u.nome,u.ch,u.docente,u.sala]),c:[S.cfg.inicio,S.cfg.termino,S.cfg.turno,S.cfg.aulasDia]});let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return String(h)};
export const alunoLink=(id=CUR)=>G.base+"#aluno-"+id;
export const PER={sem2:"Próximas 2 semanas",mes:"Mês atual",tudo:"Período completo"};
export function envRange(p){
  const t=todayISO(),c=S.cfg;
  if(p==="sem2")return [t,addD(t,13)];
  if(p==="mes"){const [y,m]=t.split("-").map(Number);return [`${t.slice(0,7)}-01`,fd(new Date(Date.UTC(y,m,0)))]}
  return [c.inicio,c.termino];
}
export function buildMsg(p,canal){
  const c=S.cfg,C=calc(),[a,b]=envRange(p),zap=canal==="zap",B=x=>zap?`*${x}*`:x;
  const P=Object.fromEntries(C.rows.map(r=>[r.u.sigla,r.P]));
  const L=[];
  Object.keys(S.days).sort().filter(i=>i>=a&&i<=b).forEach(iso=>{
    const d=S.days[iso],s=d.s||[],lab=`${WD[dow(iso)]} ${iso.slice(8)}/${iso.slice(5,7)}`;
    if(s.length)L.push(`• ${lab}: `+s.map((sg,j)=>{const u=ucOf(sg)||{};return `${sg} ${C.enc[iso][j]}/${P[sg]??"?"}${u.docente?" ("+u.docente+")":""}`}).join(" + ")+(d.h?` – ${d.h}`:""));
    else if(d.h)L.push(`• ${lab}: ${d.t==="sem"?"Sem aula":"Feriado"} – ${d.h}`);
  });
  const lim=C.rows.filter(r=>r.P>0).map(r=>`${r.u.sigla} ${r.R}`).join(" · ");
  return [B(`Calendário de aulas – Turma ${c.turma}`),`${c.curso} · Módulo ${c.modulo}`,`Horário: ${rowHorario()} · ${PER[p].toLowerCase()} (${br(a)} a ${br(b)})`,"",
    ...(L.length?L:["Nenhuma aula lançada neste período."]),"",`Limite de faltas (25% das aulas): ${lim}`,
    "",`Calendário sempre atualizado: ${alunoLink()}`,
    ...(c.coord?["",`Coordenação: ${c.coord}`]:[])].join("\n");
}
export function htmlCalendario(){
  const C=calc(),c=S.cfg;
  const months=monthList().map(ym=>{
    const [y,m]=ym.split("-").map(Number),first=new Date(Date.UTC(y,m-1,1)).getUTCDay(),dim=new Date(Date.UTC(y,m,0)).getUTCDate();
    let cells="";for(let i=0;i<first;i++)cells+="<td></td>";
    for(let d=1;d<=dim;d++){const iso=`${ym}-${String(d).padStart(2,"0")}`,e=S.days[iso]||{},w=dow(iso);
      if((first+d-1)%7===0&&d>1)cells+="</tr><tr>";
      cells+=`<td class="${w===0||w===6?"w":""} ${e.t==="feriado"?"h":""}"><b>${d}</b>${e.h?`<i>${esc(e.h)}</i>`:""}${(e.s||[]).map((sg,j)=>`<span>${esc(sg)} ${C.enc[iso][j]}</span>`).join("")}</td>`}
    return `<section><h2>${MESES[m-1]} de ${y}</h2><table class="cal"><thead><tr>${WD.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody><tr>${cells}</tr></tbody></table></section>`}).join("");
  const ucs=C.rows.map(r=>`<tr><td>${esc(r.u.sigla)}</td><td>${esc(r.u.nome)}</td><td>${esc(r.u.docente)}</td><td>${r.u.ch} h</td><td>${r.P}</td><td>${r.R}</td><td>${br(r.ini)}</td><td>${br(r.fim)}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calendário da turma ${esc(c.turma)}</title><style>
body{font:14px system-ui,sans-serif;max-width:900px;margin:0 auto;padding:16px;color:#14202e}h1{font-size:1.4rem;margin:0}h2{font-size:1.05rem;margin:18px 0 6px;text-transform:capitalize}.m{color:#5a6b7f;margin:4px 0 14px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d9e0ea;padding:4px;vertical-align:top;font-size:.82rem}th{background:#f2f5f9;text-align:left}
table.cal td{height:68px;width:14.28%}td.w{background:#eaeef4}td.h{background:#fde9e7}td i{display:block;font-size:.68rem;font-style:normal}td span{display:block;background:#dfeaf7;border-radius:3px;padding:0 3px;margin-top:2px;font-size:.72rem}
section{break-inside:avoid}</style></head><body><img src="${LOGO}" alt="SENAI" style="height:40px;margin-bottom:8px"><h1>${esc(c.curso)}</h1><p class="m">Turma ${esc(c.turma)} · Módulo ${esc(c.modulo)} · ${esc(c.turno)} · ${rowHorario()}<br>Período: ${br(c.inicio)} a ${br(c.termino)}${c.coord?" · Coordenação: "+esc(c.coord):""}</p>
<table><thead><tr><th>Sigla</th><th>Disciplina</th><th>Docente</th><th>CH</th><th>Encontros</th><th>Limite de faltas</th><th>Início</th><th>Fim</th></tr></thead><tbody>${ucs}</tbody></table>${months}
<p class="m">O número ao lado da sigla é o encontro. Gerado em ${br(todayISO())}.</p></body></html>`;
}
export function vEnviar(){
  const e=UI.env,last=S.envios[S.envios.length-1],cur=sigHash();
  const msg=e.msg!==null?e.msg:buildMsg(e.periodo,e.canal);
  const subj=`Calendário de aulas – Turma ${S.cfg.turma} (${PER[e.periodo].toLowerCase()})`;
  const dest=(S.cfg.destinatarios||"").split(/[\s,;]+/).filter(x=>x.includes("@"));
  const mailto=dest.length&&e.canal==="email"?`mailto:?bcc=${encodeURIComponent(dest.join(","))}&subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(msg)}`:"";
  const ban=!last?{k:"warn",m:"Nenhum envio registrado ainda."}:last.sig===cur?{k:"ok",m:`Calendário igual ao último envio (${fdt(last.em)}).`}:{k:"warn",m:`Há alterações no calendário desde o último envio (${fdt(last.em)}). Envie de novo.`};
  const opt=(k,v,l)=>`<button data-act="envopt" data-k="${k}" data-v="${v}" aria-pressed="${e[k]===v}">${l}</button>`;
  return `<div class="banner ${ban.k}">${esc(ban.m)}</div>
  <div class="grid2">
  <section class="panel"><h2>Mensagem para a turma</h2>
    <div class="pal" style="margin-bottom:8px">${Object.entries(PER).map(([k,l])=>opt("periodo",k,l)).join("")}</div>
    <div class="pal" style="margin-bottom:12px">${opt("canal","zap","WhatsApp / texto")}${opt("canal","email","E-mail")}</div>
    ${e.canal==="email"?`<label class="f" style="margin-bottom:10px">Assunto<input type="text" id="envSub" value="${esc(subj)}" readonly></label>`:""}
    <textarea id="envMsg" style="min-height:300px" aria-label="Mensagem">${esc(msg)}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="copy" data-id="envMsg">Copiar mensagem</button>${e.canal==="email"?`<button class="btn" data-act="copy" data-id="envSub">Copiar assunto</button>`:""}${mailto&&mailto.length<1900?`<a class="btn" href="${mailto}">Abrir no e-mail</a>`:""}<button class="btn" data-act="envlog">Registrar como enviado</button></div>
    <p class="small muted">A página não envia mensagens sozinha. Copie o texto, envie pelo seu canal e clique em "Registrar como enviado" para acompanhar se o calendário mudou depois.</p></section>
  <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
  <section class="panel"><h2>Link para os alunos</h2><label class="f">Link da visão do aluno (turma ${esc(S.cfg.turma)})<input type="text" id="envLink" value="${esc(alunoLink())}" readonly></label>
    <div class="row" style="margin-top:8px"><button class="btn" data-act="copy" data-id="envLink">Copiar link</button></div>
    <p class="small muted">Quem abre esse link vê o calendário atualizado ao vivo. Basta enviar o link: quem abre só visualiza.</p></section>
  <section class="panel"><h2>Arquivos para anexar</h2>
    ${DL?`<div class="row"><button class="btn" data-act="dlhtml">Baixar página do calendário (HTML)</button><button class="btn" data-act="dlcsv">Baixar encontros (CSV)</button><button class="btn" data-act="print">Imprimir / salvar em PDF</button></div><p class="small muted">A página HTML abre em qualquer navegador e pode ser impressa ou salva em PDF. O CSV abre no Excel.</p>`:`<p class="small muted">O download de arquivos não está disponível neste momento. Use os textos da aba Dados (CSV e agenda .ics).</p>`}</section>
  <section class="panel"><h2>Destinatários</h2><label class="f">E-mails da turma (um por linha)<textarea id="envDest" data-cfgx="destinatarios" style="min-height:110px" placeholder="aluno1@email.com">${esc(S.cfg.destinatarios)}</textarea></label>
    <div class="row" style="margin-top:8px"><button class="btn" data-act="copy" data-id="envDest">Copiar lista</button><span class="small muted">${dest.length} e-mail(s)</span></div></section>
  </div></div>
  <section class="panel"><h2>Envios registrados</h2>
    <div class="tw"><table><thead><tr><th>Data</th><th>Canal</th><th>Período</th><th>Situação</th></tr></thead><tbody>
    ${S.envios.slice(-8).reverse().map(x=>`<tr><td class="mono">${esc(fdt(x.em))}</td><td>${x.canal==="email"?"E-mail":"WhatsApp / texto"}</td><td>${esc(PER[x.periodo]||"")}</td><td>${x.sig===cur?"Calendário igual ao atual":"Calendário mudou depois"}</td></tr>`).join("")||'<tr><td colspan="4" class="muted">Nenhum envio registrado.</td></tr>'}
    </tbody></table></div></section>`;
}

/* ---------- COMPARTILHAR ---------- */
export const actions={
  "envopt":(b,e,a)=>{{UI.env[b.dataset.k]=b.dataset.v;UI.env.msg=null;renderView()}},
  "envlog":(b,e,a)=>{{S.envios.push({em:new Date().toISOString(),canal:UI.env.canal,periodo:UI.env.periodo,sig:sigHash()});save();toast("Envio registrado");renderView()}},
  "dlcsv":(b,e,a)=>{{
    const csv=a==="dlcsv";
    DL.save({filename:csv?`encontros-turma-${S.cfg.turma}.csv`:`calendario-turma-${S.cfg.turma}.html`,data:csv?"\ufeff"+csvText():htmlCalendario()})
      .then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")});
  }},
  "dlhtml":(b,e,a)=>{{
    const csv=a==="dlcsv";
    DL.save({filename:csv?`encontros-turma-${S.cfg.turma}.csv`:`calendario-turma-${S.cfg.turma}.html`,data:csv?"\ufeff"+csvText():htmlCalendario()})
      .then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")});
  }},
  "print":(b,e,a)=>{{const w=window.open("","_blank");if(!w){toast("Libere os pop-ups do navegador para imprimir.");return}w.document.write(htmlCalendario());w.document.close();setTimeout(()=>{try{w.focus();w.print()}catch(e){}},400)}},
  "copy":(b,e,a)=>{copyText(b.dataset.id)},
};
export const changes=[
  [t=>t.dataset.cfgx,(t,e)=>{S.cfg[t.dataset.cfgx]=t.value.trim();UI.env.msg=null;save();if(t.id==="envDest")renderView()}],
];

