import {WD} from "../config.js";
import {renderView} from "../render.js";
import {calcOf, countConf} from "../rules.js";
import {S, T, UI} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {br, esc, todayISO} from "../util.js";
export function vDoc(){
  const t=todayISO();
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:10px"><h2>Docentes</h2><button class="btn pri" data-act="docadd">Adicionar docente</button></div>
  <div class="tw"><table><thead><tr><th>Nome</th><th>E-mail</th><th>WhatsApp</th><th>Disciplinas</th><th class="n">CH</th><th class="n">Encontros</th><th>Próxima aula</th><th></th></tr></thead><tbody>
  ${S.docentes.map((d,i)=>{const rs=[];for(const st of Object.values(T))calcOf(st).rows.filter(r=>r.u.docente===d.nome).forEach(r=>rs.push({st,r}));
   const all=rs.flatMap(x=>x.r.ds.map(y=>[y,x.r.u.sigla])).sort();const nx=all.find(x=>x[0]>=t);
   return `<tr><td><input type="text" data-doc="${i}" data-f="nome" value="${esc(d.nome)}" style="min-width:180px" aria-label="Nome"></td>
   <td><input type="email" data-doc="${i}" data-f="email" value="${esc(d.email||"")}" style="min-width:200px" aria-label="E-mail"></td>
   <td><input type="tel" data-doc="${i}" data-f="tel" value="${esc(d.tel||"")}" placeholder="(75) 99999-9999" style="width:150px" aria-label="WhatsApp"></td>
   <td>${rs.map(x=>`<span class="sig" style="--c:var(--accent)" title="${esc(x.r.u.nome)}">${esc(x.st.cfg.turma)} · ${esc(x.r.u.sigla)}</span>`).join(" ")||'<span class="muted">-</span>'}</td><td class="n mono">${rs.reduce((a,x)=>a+(+x.r.u.ch||0),0)}</td><td class="n mono">${all.length}</td><td class="mono">${nx?br(nx[0])+" · "+nx[1]:"-"}</td>
   <td><button class="btn sm bad" data-act="docdel" data-i="${i}">${UI.confirm==="doc"+i?"Confirmar":"Excluir"}</button></td></tr>`}).join("")||`<tr><td colspan="8" class="muted">Nenhum docente cadastrado.</td></tr>`}
  </tbody></table></div><p class="small muted">Os docentes valem para todas as turmas. Renomear atualiza as disciplinas dele em todas elas. Excluir deixa as disciplinas sem docente. A coluna Disciplinas mostra turma · sigla.</p></section>
  <section class="panel"><h2>Bloqueios de disponibilidade</h2><p class="small muted" style="margin-top:-4px">O planejador não deixa lançar aula de um docente nos dias bloqueados. Use o bloqueio por período para representar aulas em outras turmas, licenças e férias.</p>
  <div style="display:flex;flex-direction:column;gap:14px">
  ${S.docentes.map((d,i)=>`<div style="border-top:1px solid var(--line);padding-top:12px"><div class="row" style="justify-content:space-between"><h3>${esc(d.nome)}</h3><button class="btn sm" data-act="bdadd" data-i="${i}">Bloquear período</button></div>
    <div class="wds" style="margin-block:8px"><span class="small muted" style="align-self:center">Não leciona:</span>${WD.map((n,w)=>`<label><input type="checkbox" data-bw="${i}" data-wd="${w}" ${(d.semana||[]).includes(w)?"checked":""}> ${n}</label>`).join("")}</div>
    ${(d.bloqueios||[]).map((b,j)=>`<div class="row" style="margin-top:6px"><input type="date" data-bd="${i}" data-j="${j}" data-f="de" value="${esc(b.de||"")}" style="width:150px" aria-label="De"><span class="small muted">até</span><input type="date" data-bd="${i}" data-j="${j}" data-f="ate" value="${esc(b.ate||"")}" style="width:150px" aria-label="Até"><input type="text" data-bd="${i}" data-j="${j}" data-f="motivo" value="${esc(b.motivo||"")}" placeholder="Motivo (ex.: outra turma)" style="flex:1;min-width:150px" aria-label="Motivo"><button class="btn sm bad" data-act="bddel" data-i="${i}" data-j="${j}">Remover</button></div>`).join("")}
  </div>`).join("")||'<p class="muted">Cadastre um docente para definir bloqueios.</p>'}
  </div></section>`;
}

/* ---------- TURMA ---------- */
export const actions={
  "docadd":(b,e,a)=>{{let n=S.docentes.length+1,nm;do{nm="Novo docente "+n++}while(S.docentes.some(d=>d.nome===nm));S.docentes.push({nome:nm,email:"",semana:[],bloqueios:[]});save();renderView()}},
  "docdel":(b,e,a)=>{{const i=+b.dataset.i;if(UI.confirm==="doc"+i){const nm=S.docentes[i].nome;S.docentes.splice(i,1);Object.values(T).forEach(st=>st.ucs.forEach(u=>{if(u.docente===nm)u.docente=""}));UI.confirm=null;save()}else UI.confirm="doc"+i;renderView()}},
  "bdadd":(b,e,a)=>{{const d=S.docentes[+b.dataset.i];d.bloqueios.push({de:todayISO(),ate:todayISO(),motivo:""});save();renderView()}},
  "bddel":(b,e,a)=>{{S.docentes[+b.dataset.i].bloqueios.splice(+b.dataset.j,1);save();renderView()}},
};
export const changes=[
  [t=>t.dataset.bw!==undefined,(t,e)=>{
    const d=S.docentes[+t.dataset.bw],w=+t.dataset.wd;d.semana=d.semana.filter(x=>x!==w);if(t.checked)d.semana.push(w);d.semana.sort();
    save();renderView();const n=countConf();if(n)toast(`${n} aula(s) já lançadas entram em choque. Veja os avisos no Painel.`)}],
  [t=>t.dataset.bd!==undefined,(t,e)=>{
    const b=S.docentes[+t.dataset.bd].bloqueios[+t.dataset.j];b[t.dataset.f]=t.value;if(b.de&&b.ate&&b.ate<b.de)b.ate=b.de;
    save();renderView();const n=countConf();if(n)toast(`${n} aula(s) já lançadas entram em choque. Veja os avisos no Painel.`)}],
  [t=>t.dataset.doc!==undefined,(t,e)=>{
    const d=S.docentes[+t.dataset.doc],f=t.dataset.f,v=t.value.trim();
    if(f==="nome"){if(!v||S.docentes.some(x=>x!==d&&x.nome===v)){toast("Nome vazio ou já cadastrado.");renderView();return}
      Object.values(T).forEach(st=>st.ucs.forEach(u=>{if(u.docente===d.nome)u.docente=v}))}
    d[f]=v;save();renderView();
  }],
];

