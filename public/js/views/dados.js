import {WD} from "../config.js";
import {renderView} from "../render.js";
import {calc, horarios, ucOf} from "../rules.js";
import {DL, G, MODE, S, UI, legacyToMulti, normalize, seedAll, setState, strippedT} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {br, dow, esc, hm, todayISO} from "../util.js";
export function csvText(){
  const C=calc(),P=Object.fromEntries(C.rows.map(r=>[r.u.sigla,r.P])),L=["Data;Dia;Sigla;Unidade curricular;Encontro;Docente;Sala;Observação"];
  for(const iso of C.isos)(S.days[iso].s||[]).forEach((sg,j)=>{const u=ucOf(sg)||{};L.push([br(iso),WD[dow(iso)],sg,u.nome||"",`${C.enc[iso][j]}/${P[sg]??"?"}`,u.docente||"",u.sala||"",S.days[iso].h||""].join(";"))});
  return L.join("\n");
}
export function icsText(){
  const C=calc(),h=horarios(),a=hm(h[0].i).replace(":","")+"00",b=hm(h[h.length-1].f).replace(":","")+"00";
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planejador de Turma//PT-BR"];
  for(const iso of C.isos){const s=[...new Set(S.days[iso].s||[])];if(!s.length)continue;const d=iso.replace(/-/g,"");
    L.push("BEGIN:VEVENT",`UID:${d}-${S.cfg.turma}@planejador`,`DTSTAMP:${d}T000000`,`DTSTART:${d}T${a}`,`DTEND:${d}T${b}`,`SUMMARY:${s.join(" + ")} - Turma ${S.cfg.turma}`,"END:VEVENT")}
  L.push("END:VCALENDAR");return L.join("\r\n");
}
export async function loadBk(){
  const [l,s]=await Promise.all([PLAN.api({op:"backup_list"}),PLAN.api({op:"backup_status"})]);
  UI.bk={items:l.items||[],st:s};if(MODE==="planner"&&UI.tab==="dados")renderView();
}
export function vBackups(){
  if(!window.PLAN)return "";
  if(!UI.bk){UI.bk={loading:true};loadBk()}
  const B=UI.bk;if(B.loading)return '<section class="panel"><h2>Backups automáticos</h2><p class="muted">Carregando…</p></section>';
  const when=iso=>{try{return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}catch(e){return iso}};
  const kb=n=>n>=1048576?(n/1048576).toFixed(1)+" MB":Math.max(1,Math.round(n/1024))+" KB";
  const last=B.items[0];
  return `<section class="panel"><div class="row" style="justify-content:space-between;margin-bottom:6px"><h2>Backups automáticos</h2><div class="row"><button class="btn pri" data-act="bkrun">Fazer backup agora</button><button class="btn sm" data-act="bkreload">Atualizar</button></div></div>
    <p class="small muted" style="margin-top:-2px">Todo dia às 20h o sistema guarda uma cópia de tudo (turmas, docentes, chamada e alunos) no próprio banco, se algo mudou. Ficam as últimas 30 cópias e a primeira de cada mês, por 12 meses. ${B.st&&B.st.email?`Aos domingos uma cópia também vai por e-mail${B.st.semAlunos?" (sem nomes e faltas de alunos)":""}.`:'A cópia semanal por e-mail está <b>desligada</b>: cadastre <span class="mono">BACKUP_EMAIL</span> no servidor para ligar (guia: docs/BACKUP-pt-BR.md).'}</p>
    <p class="small" style="margin:0 0 8px">${last?`Último backup: <b>${when(last.at)}</b> (${esc(last.kind)}).`:"Ainda não há backups. O primeiro sai no próximo horário agendado ou ao clicar em Fazer backup agora."}</p>
    <div class="tw"><table><thead><tr><th>Quando</th><th>Tipo</th><th>Por</th><th class="n">Itens</th><th class="n">Tamanho</th><th></th></tr></thead><tbody>
    ${B.items.map(b=>`<tr><td class="mono">${when(b.at)}</td><td>${esc(b.kind)}</td><td>${esc(b.by||"")}</td><td class="n mono">${b.docs}</td><td class="n mono">${kb(b.size)}</td><td><div class="row"><button class="btn sm" data-act="bkdl" data-id="${b.id}">Baixar</button><button class="btn sm bad" data-act="bkres" data-id="${b.id}">${UI.confirm==="bk"+b.id?"Confirmar restauração":"Restaurar"}</button></div></td></tr>`).join("")||'<tr><td colspan="6" class="muted">Nenhum backup ainda.</td></tr>'}</tbody></table></div>
    <p class="small muted">Restaurar devolve turmas e docentes ao estado daquela cópia e antes guarda uma cópia do estado atual ("antes de restaurar"). Turmas criadas depois do backup não são apagadas.</p></section>`;
}
export function vDados(){
  return `${vBackups()}<div class="grid2">
  <section class="panel"><h2>Cópia de segurança (JSON)</h2><div class="row" style="margin-bottom:8px"><button class="btn pri" data-act="bkfull">Baixar backup completo (arquivo)</button></div><p class="small muted">Os dados ficam salvos neste navegador. Copie este texto para guardar uma cópia ou levar para outro computador.</p>
    <textarea id="tJson" readonly aria-label="Cópia de segurança completa em JSON">${esc(JSON.stringify({geral:G,turmas:strippedT()},null,1))}</textarea><div class="row" style="margin-top:8px"><button class="btn pri" data-act="copy" data-id="tJson">Copiar</button></div></section>
  <section class="panel"><h2>Restaurar cópia</h2><p class="small muted">Cole o JSON ou escolha o arquivo.</p>
    <textarea id="tImp" placeholder="Cole aqui o JSON"></textarea>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="import">Restaurar</button><input type="file" id="fImp" aria-label="Escolher arquivo de backup (.json)" accept=".json,application/json" style="width:auto"></div></section>
  <section class="panel"><h2>Encontros em CSV</h2><p class="small muted">Separado por ponto e vírgula, abre direto no Excel.</p>
    <textarea id="tCsv" aria-label="Encontros em formato CSV" readonly>${esc(csvText())}</textarea><div class="row" style="margin-top:8px"><button class="btn" data-act="copy" data-id="tCsv">Copiar</button></div></section>
  <section class="panel"><h2>Agenda (.ics)</h2><p class="small muted">Cole em um arquivo com extensão .ics e importe no Google Agenda ou Outlook.</p>
    <textarea id="tIcs" aria-label="Agenda em formato ICS" readonly>${esc(icsText())}</textarea><div class="row" style="margin-top:8px"><button class="btn" data-act="copy" data-id="tIcs">Copiar</button></div></section></div>
  <section class="panel"><h2>Visão para os alunos</h2><p class="small muted">Esta mesma página tem uma visão somente leitura, com próximas aulas, disciplinas, limite de faltas e calendário, que se atualiza sozinha a cada alteração sua. Ela abre quando o link do artefato termina em <b>#aluno</b>. Para quem só pode visualizar, ela abre sozinha. Use "Ver como aluno" no topo para conferir.</p></section>
  <section class="panel"><h2>Voltar aos dados da planilha</h2><p class="small muted">Apaga todas as turmas e docentes e recarrega só a turma 202629 com os lançamentos da planilha original.</p>
    <button class="btn bad" data-act="reset">${UI.confirm==="reset"?"Confirmar: descartar alterações":"Restaurar planilha original"}</button></section>`;
}

/* ---------- VISÃO DO ALUNO (somente leitura, ao vivo) ---------- */
export const actions={
  "bkfull":(b,e,a)=>{{const o=JSON.stringify({geral:G,turmas:strippedT()},null,1);DL.save({filename:`backup-planejador-${todayISO()}.json`,data:o}).then(()=>toast("Backup salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")})}},
  "bkrun":(b,e,a)=>{{PLAN.api({op:"backup_now"}).then(r=>{toast(r.ok?"Backup feito":r.error||"Erro ao fazer o backup");loadBk()})}},
  "bkreload":(b,e,a)=>{loadBk()},
  "bkdl":(b,e,a)=>{{PLAN.api({op:"backup_download",id:+b.dataset.id}).then(r=>{if(!r.ok){toast(r.error||"Erro");return}const it=(UI.bk.items||[]).find(x=>x.id===+b.dataset.id);DL.save({filename:`backup-planejador-${(it?it.at:todayISO()).slice(0,10)}.json`,data:r.data}).then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")})})}},
  "bkres":(b,e,a)=>{{const id=b.dataset.id;if(UI.confirm==="bk"+id){UI.confirm=null;PLAN.api({op:"backup_restore",id:+id}).then(r=>{if(r.ok){toast("Backup restaurado. Recarregando…");setTimeout(()=>location.reload(),900)}else toast(r.error||"Erro ao restaurar")})}else{UI.confirm="bk"+id;renderView()}}},
  "import":(b,e,a)=>{{try{const o=JSON.parse(document.getElementById("tImp").value);if(o.turmas&&o.geral){setState({G:o.geral,T:o.turmas,CUR:Object.keys(o.turmas)[0]})}else if(o.cfg&&o.ucs&&o.days){const m=legacyToMulti(o);setState(m)}else throw 0;normalize();save();toast("Dados restaurados");renderView()}catch(x){toast("JSON inválido. Cole a cópia completa.")}}},
  "reset":(b,e,a)=>{{if(UI.confirm==="reset"){{const m=seedAll();setState(m)}normalize();UI.confirm=null;UI.month=null;save();toast("Planilha original restaurada")}else UI.confirm="reset";renderView()}},
};
export const changes=[
  [t=>t.id==="fImp"&&t.files[0],(t,e)=>{const fr=new FileReader();fr.onload=()=>{document.getElementById("tImp").value=fr.result};fr.readAsText(t.files[0])}],
];

