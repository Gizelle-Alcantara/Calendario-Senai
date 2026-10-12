import {renderView} from "../render.js";
import {calc, faltasMap, stFalta} from "../rules.js";
import {DL, S, UI} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {esc, newId} from "../util.js";
export function vAlunos(){
  const C=calc(),fm=faltasMap();
  const ucs=C.rows;
  const body=S.alunos.map((a,k)=>{
    let tot=0,worst="ok";
    const cells=ucs.map(r=>{const n=(fm[a.id]||{})[r.u.sigla]||0;tot+=n;const s=stFalta(n,r.R);if(s==="bad"||(s==="warn"&&worst==="ok"))worst=s;return `<td class="n mono ${s==="ok"?"":"b-"+s}" style="${s==="bad"?"color:var(--bad);font-weight:600":s==="warn"?"color:var(--warn);font-weight:600":""}">${n}</td>`}).join("");
    return `<tr><td><input type="text" data-al="${esc(a.id)}" data-f="nome" value="${esc(a.nome)}" style="min-width:200px" aria-label="Nome do aluno"></td><td><input type="text" data-al="${esc(a.id)}" data-f="mat" value="${esc(a.mat||"")}" style="width:110px" aria-label="Matrícula"></td><td><input type="email" data-al="${esc(a.id)}" data-f="email" value="${esc(a.email||"")}" style="min-width:170px" aria-label="E-mail do aluno"></td><td><input type="tel" data-al="${esc(a.id)}" data-f="tel" value="${esc(a.tel||"")}" style="width:140px" aria-label="WhatsApp do aluno"></td>${cells}<td class="n mono">${tot}</td><td>${worst==="bad"?'<span class="bdg bad">Limite excedido</span>':worst==="warn"?'<span class="bdg warn">Atenção</span>':'<span class="bdg ok">Regular</span>'}</td><td><button class="btn sm bad" data-act="alunodel" data-id="${esc(a.id)}">${UI.confirm==="al"+a.id?"Confirmar":"Excluir"}</button></td></tr>`}).join("");
  return `<section class="panel"><h2>Alunos da turma ${esc(S.cfg.turma)} (${S.alunos.length})</h2>
    <p class="small muted" style="margin-top:-4px">Faltas são contadas em aulas, por disciplina, só nas aulas dadas. O limite é 25% da carga de cada disciplina (linha "Limite" da tabela). Nomes e faltas só aparecem para quem entrou com conta; visitantes recebem apenas o calendário.</p>
    <div class="tw"><table><thead><tr><th>Aluno</th><th>Matrícula</th><th>E-mail</th><th>WhatsApp</th>${ucs.map(r=>`<th class="n" title="${esc(r.u.nome)}">${esc(r.u.sigla)}</th>`).join("")}<th class="n">Total</th><th>Situação</th><th></th></tr>
    <tr><th colspan="4" style="font-weight:400">Limite de faltas (aulas)</th>${ucs.map(r=>`<th class="n mono" style="font-weight:400">${r.R}</th>`).join("")}<th></th><th></th><th></th></tr></thead><tbody>${body||`<tr><td colspan="${ucs.length+7}" class="muted">Nenhum aluno cadastrado.</td></tr>`}</tbody></table></div>
    <div class="row" style="margin-top:10px"><button class="btn" data-act="frcsv" ${S.alunos.length?"":"disabled"}>Baixar frequência (CSV)</button></div></section>
  <section class="panel"><h2>Adicionar alunos</h2><p class="small muted" style="margin-top:-4px">Cole um por linha: <span class="mono">Nome;matrícula;e-mail;WhatsApp</span> (só o nome é obrigatório). Preencha e-mail e WhatsApp apenas com a autorização do aluno ou do responsável: são usados nos avisos automáticos.</p>
    <textarea id="alLista" placeholder="Maria Souza;2026001;maria@email.com;75999990000&#10;João Pereira" style="min-height:110px"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="alunoadd">Adicionar</button></div></section>`;
}

/* ---------- AVISOS (e-mail / WhatsApp) ---------- */
export const actions={
  "alunoadd":(b,e,a)=>{{const ls=document.getElementById("alLista").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let n=0;
    ls.forEach(l=>{const [nm,mat,email,tel]=l.split(";").map(x=>x.trim());if(nm&&!S.alunos.some(a=>a.nome.toLowerCase()===nm.toLowerCase())){S.alunos.push({id:newId(),nome:nm,mat:mat||"",email:email||"",tel:tel||""});n++}});
    S.alunos.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));if(n){save();renderView()}toast(n?n+" aluno(s) adicionado(s)":"Nenhum aluno novo (nomes vazios ou repetidos).")}},
  "alunodel":(b,e,a)=>{{const id=b.dataset.id;if(UI.confirm==="al"+id){S.alunos=S.alunos.filter(x=>x.id!==id);Object.values(S.reg).forEach(r=>{if(r.faltas)delete r.faltas[id]});UI.confirm=null;save()}else UI.confirm="al"+id;renderView()}},
  "frcsv":(b,e,a)=>{{const C=calc(),fm=faltasMap(),L=[["Aluno","Matrícula",...C.rows.map(r=>r.u.sigla+" (lim. "+r.R+")"),"Total"].join(";")];
    S.alunos.forEach(a=>{let tot=0;const c=C.rows.map(r=>{const n=(fm[a.id]||{})[r.u.sigla]||0;tot+=n;return n});L.push([a.nome,a.mat||"",...c,tot].join(";"))});
    DL.save({filename:`frequencia-turma-${S.cfg.turma}.csv`,data:"\ufeff"+L.join("\n")}).then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")})}},
};
export const changes=[
  [t=>t.dataset.al!==undefined,(t,e)=>{const a=S.alunos.find(x=>x.id===t.dataset.al);if(a){const v=t.value.trim();if(t.dataset.f==="nome"&&!v){toast("O nome não pode ficar vazio.");renderView();return}a[t.dataset.f]=v;save()}}],
];

