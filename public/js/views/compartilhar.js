import qrcode from "../vendor/qrcode.js";
import {BASE0} from "../config.js";
import {renderView} from "../render.js";
import {CUR, G, MODE, S, UI} from "../state.js";
import {save} from "../store.js";
import {copyValue} from "../ui.js";
import {esc, slug} from "../util.js";
import {alunoLink} from "./enviar.js";
export function vShare(){
  const lk=alunoLink(),plan=G.base;
  const step=(n,tt,d)=>`<li style="display:flex;gap:10px"><span class="mono" style="color:var(--accent);font-weight:600">${n}</span><span><b>${tt}</b><br><span class="muted">${d}</span></span></li>`;
  return `<div class="grid2">
  <section class="panel"><h2>Visão do aluno</h2>
    <label class="f">Link da turma ${esc(S.cfg.turma)} (abre a visão somente leitura)<input type="text" id="shLink" value="${esc(lk)}" readonly></label>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="copy" data-id="shLink">Copiar link</button><a class="btn" href="#aluno-${esc(CUR)}">Abrir como aluno</a></div>
    <label class="f" style="margin-top:12px">Endereço do site (base de todos os links)<input type="text" id="shBase" data-gbase="1" value="${esc(G.base)}"></label>
    <div style="margin-top:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div id="qr" style="background:#fff;padding:8px;border-radius:6px;width:184px;height:184px"></div><p class="small muted" style="flex:1;min-width:180px;margin:0">Projete o QR code na sala para os alunos abrirem o calendário da turma no celular. Cada turma tem o seu link.</p></div></section>
  <section class="panel"><h2>Link do planejador</h2>
    <label class="f">Para docentes e coordenação que editam<input type="text" id="shPlan" value="${esc(plan)}" readonly></label>
    <div class="row" style="margin-top:8px"><button class="btn" data-act="copy" data-id="shPlan">Copiar link</button></div>
    <p class="small muted">Só o coordenador, com a senha, consegue salvar alterações. Todos os outros abrem uma tela para escolher entre a visão do aluno e a do docente.</p></section></div>
  <section class="panel"><h2>Visão do docente</h2><p class="small muted" style="margin-top:-4px">Somente leitura. Mostra as aulas do docente em todas as turmas num calendário só, com a disponibilidade dele.</p>
    <label class="f">Link geral (o docente escolhe o nome)<input type="text" id="shDoc" value="${esc(G.base+"#docente")}" readonly></label>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="copyv" data-v="${esc(G.base+"#docente")}">Copiar link geral</button></div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px">${S.docentes.map(d=>`<div class="row"><span style="min-width:140px;flex:1">${esc(d.nome)}</span><button class="btn sm" data-act="copyv" data-v="${esc(G.base+"#docente-"+slug(d.nome))}">Copiar link</button></div>`).join("")}</div></section>
  <section class="panel"><h2>Agenda no celular (assinar)</h2><p class="small muted" style="margin-top:-4px">Aluno ou docente assina uma vez e o calendário se atualiza sozinho no Google Agenda, Outlook ou iPhone, a cada alteração sua.</p>
    <label class="f">Agenda da turma ${esc(S.cfg.turma)}<input type="text" id="shIcs" value="${esc(location.origin+"/api?ics=turma-"+CUR)}" readonly></label>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="copy" data-id="shIcs">Copiar link da agenda</button><a class="btn" target="_blank" rel="noopener" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent("webcal://"+location.host+"/api?ics=turma-"+CUR)}">Adicionar ao Google Agenda</a></div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px">${S.docentes.map(d=>`<div class="row"><span style="min-width:140px;flex:1">${esc(d.nome)}</span><button class="btn sm" data-act="copyv" data-v="${esc(location.origin+"/api?ics=docente-"+slug(d.nome))}">Copiar agenda</button></div>`).join("")}</div></section>
  <section class="panel"><h2>Como compartilhar</h2><ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px">
    ${step(1,"Copie o link da turma ou do docente","Os links ficam nesta aba. Eles abrem sempre a visão somente leitura.")}
    ${step(2,"Alunos e docentes: só visualizam","Não precisam de conta nem de senha. Quem abre o endereço do site escolhe entre a visão do aluno e a do docente e não altera nada.")}
    ${step(3,"Coordenação: a única que edita","A edição exige a senha do coordenador (variável ADMIN_PASSWORD do servidor). Para entrar, abra o endereço do site seguido de #login.")}
    ${step(4,"Envie o link","Use a aba Enviar para montar a mensagem com o link e registrar o envio.")}</ol>
    <p class="small muted" style="margin-bottom:0">A permissão é verificada no servidor: sem a senha, nenhuma alteração é gravada.</p></section>`;
}
export function afterRender(){
  if(MODE==="planner"&&UI.tab==="compartilhar"){
    const el=document.getElementById("qr");if(!el)return;
    try{
      const q=qrcode(0,"M");q.addData(alunoLink());q.make();
      el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true,title:{text:"QR code do calendário da turma "+S.cfg.turma,id:"qrT"},alt:{text:"Aponte a câmera do celular para abrir o calendário da turma "+S.cfg.turma+". O mesmo endereço está escrito como texto nesta página.",id:"qrD"}});
    }catch(e){el.textContent="QR code indisponível. Use o link em texto."}
  }
}

/* ---------- DADOS ---------- */
export const actions={
  "copyv":(b,e,a)=>{copyValue(b.dataset.v)},
};
export const changes=[
  [t=>t.dataset.gbase,(t,e)=>{G.base=t.value.trim().split("#")[0]||BASE0;save();renderView()}],
];

