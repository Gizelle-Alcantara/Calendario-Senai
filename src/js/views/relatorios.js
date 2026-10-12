import {WD} from "../config.js";
import {renderView} from "../render.js";
import {calcOf} from "../rules.js";
import {S, T, UI} from "../state.js";
import {addD, dow, esc} from "../util.js";
export function vRel(){
  const mes=ym=>{const [y,m]=ym.split("-").map(Number);return new Date(Date.UTC(y,m-1,1)).toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:"UTC"})};
  const pct=(a,b)=>b?Math.round(a/b*100)+"%":"-";
  const tr=Object.entries(T).map(([id,st])=>{const C=calcOf(st),P=C.rows.reduce((a,r)=>a+r.P,0),A=C.rows.reduce((a,r)=>a+r.aloc,0),ch=st.ucs.reduce((a,u)=>a+(+u.ch||0),0),sem=C.rows.filter(r=>!r.u.docente).length;
    return `<tr><td>${esc(st.cfg.turma)}</td><td>${esc(st.cfg.curso)}</td><td>${esc(st.cfg.turno)}</td><td class="n mono">${ch}</td><td class="n mono">${A} / ${P}</td><td class="n mono">${pct(A,P)}</td><td class="n mono">${sem}</td></tr>`}).join("");
  const dr=S.docentes.map(d=>{let ts=new Set(),sg=[],A=0,P=0,HA=0,HP=0;
    Object.values(T).forEach(st=>{const C=calcOf(st);C.rows.filter(r=>r.u.docente===d.nome).forEach(r=>{ts.add(st.cfg.turma);sg.push(r.u.sigla);A+=r.aloc;P+=r.P;HA+=r.aloc*st.cfg.aulasDia;HP+=r.P*st.cfg.aulasDia})});
    return `<tr><td>${esc(d.nome)}</td><td>${esc([...ts].join(", ")||"-")}</td><td>${esc(sg.join(", ")||"-")}</td><td class="n mono">${A} / ${P}</td><td class="n mono">${HA} / ${HP}</td><td>${(d.semana||[]).length?esc((d.semana||[]).map(w=>WD[w]).join(", ")):"-"}</td></tr>`}).join("");
  const months={};
  for(let d=S.cfg.inicio;d&&d<=S.cfg.termino;d=addD(d,1)){const w=dow(d);if(w===0||w===6)continue;const ym=d.slice(0,7),e=S.days[d]||{};const m=months[ym]=months[ym]||{u:0,off:0,aula:0};m.u++;if(e.t==="feriado"||e.t==="sem")m.off++;else if((e.s||[]).length)m.aula++}
  const mr=Object.entries(months).map(([ym,m])=>`<tr><td style="text-transform:capitalize">${mes(ym)}</td><td class="n mono">${m.u}</td><td class="n mono">${m.off}</td><td class="n mono">${m.aula}</td><td class="n mono">${m.u-m.off-m.aula}</td><td class="n mono">${pct(m.aula,m.u-m.off)}</td></tr>`).join("");
  return `<section class="panel"><h2>Andamento por turma</h2><div class="tw"><table><thead><tr><th>Turma</th><th>Curso</th><th>Turno</th><th class="n">CH (h)</th><th class="n">Encontros lançados / previstos</th><th class="n">Lançado</th><th class="n">Disciplinas sem docente</th></tr></thead><tbody>${tr}</tbody></table></div></section>
  <section class="panel"><h2>Carga por docente (todas as turmas)</h2><div class="tw"><table><thead><tr><th>Docente</th><th>Turmas</th><th>Disciplinas</th><th class="n">Encontros lançados / previstos</th><th class="n">Horas-aula lançadas / previstas</th><th>Dias bloqueados</th></tr></thead><tbody>${dr}</tbody></table></div><p class="small muted">Horas-aula = encontros × aulas por dia de cada turma.</p></section>
  <section class="panel"><h2>Ocupação por mês — turma ${esc(S.cfg.turma)}</h2><div class="tw"><table><thead><tr><th>Mês</th><th class="n">Dias úteis</th><th class="n">Feriados / sem aula</th><th class="n">Com aula</th><th class="n">Livres</th><th class="n">Ocupação</th></tr></thead><tbody>${mr||'<tr><td colspan="6" class="muted">Defina início e término na aba Turma.</td></tr>'}</tbody></table></div><p class="small muted">Dias livres são úteis sem aula lançada: úteis para reposição.</p></section>`;
}

/* ---------- ACESSO (contas e histórico) ---------- */
export const actions={};
export const changes=[
  [t=>t.id==="rfSel",(t,e)=>{UI.rf=t.value;renderView()}],
];

