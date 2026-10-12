import {renderView} from "../render.js";
import {calc, countConf} from "../rules.js";
import {S, UI} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {esc} from "../util.js";
export function vDisc(){
  const C=calc();
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Unidades curriculares</h2><button class="btn pri" data-act="ucadd">Adicionar disciplina</button></div>
  <div class="tw"><table><thead><tr><th>Unidade curricular</th><th>Sigla</th><th class="n">CH</th><th>Docente</th><th>Sala/Lab.</th><th class="n">Encontros</th><th class="n">Alocado</th><th class="n">Faltam</th><th class="n">Lim. faltas</th><th></th></tr></thead><tbody>
  ${C.rows.map((r,i)=>`<tr><td><input type="text" data-uc="${i}" data-f="nome" value="${esc(r.u.nome)}" style="min-width:230px" aria-label="Nome"></td>
   <td><input type="text" data-uc="${i}" data-f="sigla" value="${esc(r.u.sigla)}" style="width:80px" aria-label="Sigla"></td>
   <td><input type="number" min="0" data-uc="${i}" data-f="ch" value="${r.u.ch}" style="width:80px" aria-label="Carga horária"></td>
   <td><select data-uc="${i}" data-f="docente" style="min-width:160px" aria-label="Docente"><option value="">(sem docente)</option>${S.docentes.map(d=>`<option ${d.nome===r.u.docente?"selected":""}>${esc(d.nome)}</option>`).join("")}</select></td>
   <td><input type="text" data-uc="${i}" data-f="sala" value="${esc(r.u.sala)}" style="width:110px" aria-label="Sala"></td>
   <td class="n mono">${r.P}</td><td class="n mono">${r.aloc}</td><td class="n mono">${r.faltam}</td><td class="n mono">${r.R}</td>
   <td><button class="btn sm bad" data-act="ucdel" data-i="${i}">${UI.confirm==="uc"+i?"Confirmar":"Excluir"}</button></td></tr>`).join("")}
  </tbody></table></div><p class="small muted">Cadastre os docentes na aba Docentes e escolha aqui quem leciona cada disciplina. Ao mudar uma sigla, os dias já lançados no calendário acompanham a mudança. Excluir uma disciplina remove seus lançamentos.</p></section>`;
}

/* ---------- DOCENTES ---------- */
export const actions={
  "ucadd":(b,e,a)=>{{S.ucs.push({nome:"Nova disciplina",sigla:"NOVA"+(S.ucs.length+1),ch:40,docente:"",sala:""});save();renderView()}},
  "ucdel":(b,e,a)=>{{const i=+b.dataset.i;if(UI.confirm==="uc"+i){const sg=S.ucs[i].sigla;S.ucs.splice(i,1);for(const [k,d] of Object.entries(S.days)){d.s=(d.s||[]).filter(x=>x!==sg);if(!d.s.length&&!d.h)delete S.days[k]}UI.confirm=null;save()}else UI.confirm="uc"+i;renderView()}},
  "fuc":(b,e,a)=>{{UI.fUc=b.dataset.k;renderView()}},
};
export const changes=[
  [t=>t.id==="cf",(t,e)=>{UI.ucFilter=t.value;renderView()}],
  [t=>t.dataset.uc!==undefined,(t,e)=>{
    const u=S.ucs[+t.dataset.uc],f=t.dataset.f;let v=t.value.trim();
    if(f==="ch")v=Math.max(0,+v||0);
    if(f==="sigla"){v=v.toUpperCase();if(!v||S.ucs.some(x=>x!==u&&x.sigla===v)){toast("Sigla vazia ou já usada.");renderView();return}
      const old=u.sigla;Object.values(S.days).forEach(d=>d.s=(d.s||[]).map(x=>x===old?v:x))}
    u[f]=v;save();renderView();
    if(f==="docente"||f==="sigla"){const n=countConf();if(n)toast(`${n} choque(s) com bloqueios de docentes. Veja os avisos no Painel.`)}
  }],
];

