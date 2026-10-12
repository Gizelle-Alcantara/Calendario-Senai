import {avisos, calc, calcOf, colorOf, horaAula, horarios} from "../rules.js";
import {CUR, S, T} from "../state.js";
import {sig} from "../ui.js";
import {br, esc, hm, todayISO} from "../util.js";
export function vPainel(){
  const C=calc(),av=avisos(C),c=S.cfg;
  const pend=C.rows.reduce((a,r)=>a+Math.max(r.faltam,0),0);
  const totP=C.rows.reduce((a,r)=>a+r.P,0),totA=C.rows.reduce((a,r)=>a+r.aloc,0);
  const diasLet=C.isos.filter(i=>(S.days[i].s||[]).length).length;
  const t=todayISO();
  const prox=C.isos.find(i=>i>=t&&(S.days[i].s||[]).length);
  const chTot=S.ucs.reduce((a,u)=>a+(+u.ch||0),0);
  const docs={};
  C.rows.forEach(r=>{const n=r.u.docente||"(sem docente)";(docs[n]=docs[n]||[]).push(r)});
  return `
  <div class="banner ${pend===0&&!av.some(a=>a[0]==="err")?"ok":"warn"}">${pend===0?(av.some(a=>a[0]==="err")?"Calendário com erros: veja os avisos":"Calendário OK"):`Aviso: aulas pendentes de lançamento (${pend} encontro${pend>1?"s":""})`}</div>
  <div class="tiles">
    <div class="tile"><b class="mono">${totA}/${totP}</b><span>encontros lançados</span></div>
    <div class="tile"><b class="mono">${diasLet}</b><span>dias letivos no calendário</span></div>
    <div class="tile"><b class="mono">${chTot} h</b><span>carga horária prevista</span></div>
    <div class="tile"><b class="mono">${prox?br(prox):"-"}</b><span>${prox?"próxima aula · "+(S.days[prox].s||[]).join(" + "):"sem próxima aula"}</span></div>
  </div>
  <section class="panel"><h2>Turmas</h2><div class="tw"><table><thead><tr><th>Turma</th><th>Curso</th><th>Turno</th><th>Período</th><th class="n">Encontros</th><th class="n">Pendentes</th><th></th></tr></thead><tbody>
  ${Object.entries(T).map(([id,st])=>{const cc=calcOf(st),al=cc.rows.reduce((a,r)=>a+r.aloc,0),pr=cc.rows.reduce((a,r)=>a+r.P,0),pe=cc.rows.reduce((a,r)=>a+Math.max(r.faltam,0),0);
   return `<tr><td class="mono">${esc(st.cfg.turma)}${id===CUR?" · atual":""}</td><td>${esc(st.cfg.curso)}</td><td>${esc(st.cfg.turno)}</td><td class="mono">${br(st.cfg.inicio)} a ${br(st.cfg.termino)}</td><td class="n mono">${al}/${pr}</td><td class="n mono">${pe}</td><td>${id===CUR?"":`<button class="btn sm" data-act="turmago" data-id="${esc(id)}">Abrir</button>`}</td></tr>`}).join("")}
  </tbody></table></div><div class="row" style="margin-top:10px"><button class="btn pri" data-act="turmanew">Adicionar turma</button></div></section>
  <section class="panel"><h2>Controle por unidade curricular</h2>
    <div class="tw"><table><thead><tr><th>UC</th><th>Sigla</th><th>Docente</th><th class="n">CH</th><th class="n">Aulas</th><th>Encontros</th><th class="n">Alocado</th><th class="n">Faltam</th><th class="n">Lim. faltas</th><th>Início</th><th>Fim</th><th>Status</th></tr></thead><tbody>
    ${C.rows.map(r=>`<tr><td>${esc(r.u.nome)}</td><td>${sig(r.u.sigla)}</td><td>${esc(r.u.docente)||'<span class="muted">-</span>'}</td><td class="n mono">${r.u.ch}</td><td class="n mono">${r.Q}</td>
    <td><div class="bar ${r.faltam<0?"over":""}" style="--c:${colorOf(r.u.sigla)}"><i style="width:${r.P?Math.min(100,r.aloc/r.P*100):0}%"></i></div></td>
    <td class="n mono">${r.aloc}/${r.P}</td><td class="n mono" style="color:${r.faltam>0?"var(--warn)":r.faltam<0?"var(--bad)":"var(--ok)"}">${r.faltam===0?"OK":r.faltam}</td><td class="n mono">${r.R}</td><td class="mono">${br(r.ini)}</td><td class="mono">${br(r.fim)}</td><td><span class="pill ${r.status.replace(" ","-")}">${r.status}</span></td></tr>`).join("")}
    </tbody></table></div>
    <p class="small muted">Aulas = CH${horaAula()===50?" × 1,2 (hora-aula de 50 min)":""}. Encontros = aulas ÷ ${c.aulasDia} aulas por dia, arredondado para cima. Limite de faltas = 25% das aulas.</p>
  </section>
  <div class="grid2">
    <section class="panel"><h2>Avisos</h2>${av.length?`<ul class="av">${av.map(([k,m])=>`<li><span class="dot ${k}"></span><span>${esc(m)}</span></li>`).join("")}</ul>`:'<p class="muted">Nenhum aviso.</p>'}</section>
    <section class="panel"><h2>Horário das aulas</h2>${horTable()}</section>
  </div>
  <section class="panel"><h2>Por docente</h2><div class="tw"><table><thead><tr><th>Docente</th><th>UCs</th><th class="n">Encontros</th><th>Próxima aula</th></tr></thead><tbody>
  ${Object.entries(docs).map(([n,rs])=>{const all=rs.flatMap(r=>r.ds.map(d=>[d,r.u.sigla])).sort();const nx=all.find(x=>x[0]>=t);
   return `<tr><td>${esc(n)}</td><td>${rs.map(r=>sig(r.u.sigla)).join(" ")}</td><td class="n mono">${all.length}</td><td class="mono">${nx?br(nx[0])+" · "+nx[1]:"-"}</td></tr>`}).join("")}
  </tbody></table></div></section>`;
}
export function horTable(){
  return `<div class="tw"><table><thead><tr><th>Aula</th><th>Início</th><th>Término</th></tr></thead><tbody>${horarios().map(h=>`<tr><td class="mono">${h.n}</td><td class="mono">${hm(h.i)}</td><td class="mono">${hm(h.f)}</td></tr>`).join("")}</tbody></table></div><p class="small muted">Hora-aula de ${horaAula()} min · turno ${esc(S.cfg.turno)}</p>`;
}

/* ---------- CALENDÁRIO ---------- */
