import {WD} from "../config.js";
import {calc, ucOf} from "../rules.js";
import {S, UI} from "../state.js";
import {rowHorario, sig} from "../ui.js";
import {br, dow, esc} from "../util.js";
export function vCron(){
  const C=calc(),f=UI.ucFilter,rows=[];
  for(const iso of C.isos){(S.days[iso].s||[]).forEach((sg,j)=>{if(!f||f===sg)rows.push({iso,sg,n:C.enc[iso][j],h:S.days[iso].h})})}
  const P=Object.fromEntries(C.rows.map(r=>[r.u.sigla,r.P]));
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Cronograma de encontros</h2>
    <select id="cf" style="width:auto" aria-label="Filtrar disciplina"><option value="">Todas as disciplinas</option>${S.ucs.map(u=>`<option value="${esc(u.sigla)}" ${u.sigla===f?"selected":""}>${esc(u.sigla)} · ${esc(u.nome)}</option>`).join("")}</select></div>
    <div class="tw"><table><thead><tr><th>Data</th><th>Dia</th><th>UC</th><th class="n">Encontro</th><th>Docente</th><th>Sala</th><th>Horário</th><th>Obs.</th></tr></thead><tbody>
    ${rows.map(r=>{const u=ucOf(r.sg)||{};return `<tr><td class="mono">${br(r.iso)}</td><td>${WD[dow(r.iso)]}</td><td>${sig(r.sg)} <span class="small muted">${esc(u.nome||"")}</span></td><td class="n mono">${r.n}/${P[r.sg]??"?"}</td><td>${esc(u.docente||"")}</td><td>${esc(u.sala||"")}</td><td class="mono">${rowHorario()}</td><td>${esc(r.h||"")}</td></tr>`}).join("")||`<tr><td colspan="8" class="muted">Nenhum encontro lançado. Use o calendário para lançar as aulas.</td></tr>`}
    </tbody></table></div></section>`;
}

/* ---------- DISCIPLINAS ---------- */
