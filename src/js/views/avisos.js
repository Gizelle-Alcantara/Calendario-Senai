import {renderView} from "../render.js";
import {CUR, MODE, S, UI} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {esc} from "../util.js";
export async function loadAv(){
  const cfg=S.aviso,[st,pv,lg]=await Promise.all([PLAN.api({op:"notify_status"}),PLAN.api({op:"notify_preview",turma:CUR,cfg}),PLAN.api({op:"notify_log"})]);
  UI.av={st,pv,lg:lg.items||[],turma:CUR};if(MODE==="planner"&&UI.tab==="avisos")renderView();
}
export const avCanal=r=>({email:"E-mail",whatsapp:"WhatsApp",ambos:"E-mail e WhatsApp"}[r]||r);
export function vAvisos(){
  if(!UI.av||UI.av.turma!==CUR){UI.av={loading:true,turma:CUR};loadAv()}
  const A=UI.av,a=S.aviso;if(A.loading)return '<section class="panel"><p class="muted">Carregando…</p></section>';
  const st=A.st||{},pv=A.pv||{},when=iso=>{try{return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return iso}};
  const need=a.canal==="whatsapp"?!st.whatsapp:a.canal==="email"?!st.email:(!st.email||!st.whatsapp);
  const chk=(k,l)=>`<label class="row small" style="gap:6px"><input type="checkbox" data-av="${k}" ${a[k]?"checked":""}> ${l}</label>`;
  return `${need?`<section class="panel" style="border-color:var(--warn)"><b>Serviço de envio não configurado.</b> <span class="small">O sistema monta e registra os avisos, mas o envio fica <b>simulado</b> (nada sai de verdade) até você cadastrar as chaves do ${a.canal==="whatsapp"?"WhatsApp":a.canal==="email"?"e-mail (Resend)":"e-mail e do WhatsApp"} no servidor. Veja o guia de instalação, seção Avisos.</span></section>`:""}
  <div class="grid2">
  <section class="panel"><h2>Envio automático da turma ${esc(S.cfg.turma)}</h2>
    <div style="display:flex;flex-direction:column;gap:8px">${chk("auto","Avisar alterações do calendário todos os dias às 20h (aulas novas, canceladas, não dadas e reposições)")}${chk("lembrete","Lembrete na véspera de cada aula (às 20h do dia anterior)")}</div>
    <label class="f" style="margin-top:12px">Canal<select data-av="canal"><option value="email" ${a.canal==="email"?"selected":""}>E-mail</option><option value="whatsapp" ${a.canal==="whatsapp"?"selected":""}>WhatsApp</option><option value="ambos" ${a.canal==="ambos"?"selected":""}>E-mail e WhatsApp</option></select></label>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px"><b class="small">Quem recebe</b>${chk("docentes","Docentes da turma (cadastro da aba Docentes)")}${chk("lista","Lista extra da aba Enviar (e-mails)")}</div>
    <p class="small muted">Hoje: <b>${pv.emails||0}</b> e-mail(s) e <b>${pv.phones||0}</b> número(s) de WhatsApp. O agendador roda uma vez por dia. Só são enviadas aulas de hoje em diante.</p></section>
  <section class="panel"><h2>Alterações pendentes de aviso</h2>
    ${pv.lines&&pv.lines.length?`<ul style="margin:0 0 10px;padding-left:18px">${pv.lines.map(l=>`<li class="small">${esc(l)}</li>`).join("")}</ul><div class="row"><button class="btn pri" data-act="avsend" data-kind="alterações">Avisar agora</button><button class="btn" data-act="avbase">Marcar como avisado</button></div>`:`<p class="small muted">${pv.hasBase?"Nenhuma alteração desde o último aviso.":"Ative o envio automático ou use Marcar como avisado para começar a acompanhar as alterações a partir de agora."}</p>${pv.hasBase?"":'<div class="row"><button class="btn" data-act="avbase">Começar a acompanhar</button></div>'}`}
  </section></div>
  <section class="panel"><h2>Mensagem livre</h2><p class="small muted" style="margin-top:-4px">Vai para os mesmos destinatários e canal definidos acima.</p>
    <label class="f">Assunto<input type="text" id="avSubj" maxlength="150" value="${esc(UI.avSubj||"")}"></label>
    <label class="f">Mensagem<textarea id="avText" maxlength="2000" style="min-height:110px">${esc(UI.avText||"")}</textarea></label>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="avsend" data-kind="manual">${UI.confirm==="avsend"?"Confirmar envio para "+((a.canal!=="whatsapp"?pv.emails||0:0)+(a.canal!=="email"?pv.phones||0:0))+" destinatário(s)":"Enviar mensagem"}</button></div></section>
  <section class="panel"><h2>Histórico de avisos</h2><div class="tw"><table><thead><tr><th>Quando</th><th>Turma</th><th>Tipo</th><th>Canal</th><th>Resultado</th><th>Por</th></tr></thead><tbody>
    ${(A.lg||[]).map(h=>`<tr><td class="mono">${when(h.at)}</td><td>${esc(h.turma||"")}</td><td>${esc(h.kind||"")}</td><td>${esc(avCanal(h.canal))}</td><td>${h.ok?"":'<span class="bdg bad">Falha</span> '}${esc(h.resumo||"")}${h.erro?`<br><span class="small muted">${esc(h.erro)}</span>`:""}</td><td>${esc(h.by||"")}</td></tr>`).join("")||'<tr><td colspan="6" class="muted">Nenhum aviso enviado ainda.</td></tr>'}</tbody></table></div></section>`;
}
export async function avSend(kind){
  const subj=(document.getElementById("avSubj")||{}).value,txt=(document.getElementById("avText")||{}).value;
  if(kind==="manual"){UI.avSubj=subj;UI.avText=txt}
  const r=await PLAN.api({op:"notify_send",turma:CUR,kind,assunto:subj,texto:txt,canal:S.aviso.canal,cfg:S.aviso});
  UI.confirm=null;if(r.error&&!r.result){toast(r.error)}else toast((r.simulated?"Envio simulado (serviço não configurado). ":"")+(r.resumo||""));
  if(r.ok&&kind==="manual"){UI.avSubj="";UI.avText=""}
  UI.av=null;renderView();
}

/* ---------- RELATÓRIOS ---------- */
export const actions={
  "avsend":(b,e,a)=>{{if(b.dataset.kind==="manual"&&UI.confirm!=="avsend"){UI.avSubj=document.getElementById("avSubj").value;UI.avText=document.getElementById("avText").value;UI.confirm="avsend";renderView();return}avSend(b.dataset.kind)}},
  "avbase":(b,e,a)=>{{PLAN.api({op:"notify_baseline",turma:CUR}).then(()=>{toast("Pronto: as próximas alterações serão avisadas.");UI.av=null;renderView()})}},
};
export const changes=[
  [t=>t.dataset.av!==undefined,(t,e)=>{const k=t.dataset.av;S.aviso[k]=t.type==="checkbox"?t.checked:t.value;if((k==="auto"||k==="lembrete")&&t.checked)PLAN.api({op:"notify_baseline",turma:CUR});save();UI.av=null;renderView()}],
];

