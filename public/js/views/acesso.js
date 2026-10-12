import {renderView} from "../render.js";
import {MODE, UI} from "../state.js";
import {toast} from "../ui.js";
import {esc} from "../util.js";
export async function loadAcc(){
  const me=await PLAN.me().catch(()=>null);const A={me,users:null,hist:[]};
  const h=await PLAN.api({op:"history"});A.hist=h.items||[];
  if(me&&me.master){const u=await PLAN.api({op:"users"});A.users=u.users||[]}
  UI.acc=A;if(MODE==="planner"&&UI.tab==="acesso")renderView();
}
export function vAcesso(){
  if(!UI.acc){UI.acc={loading:true};loadAcc()}
  const A=UI.acc;if(A.loading)return '<section class="panel"><p class="muted">Carregando…</p></section>';
  const when=iso=>{try{return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return iso}};
  const users=A.me&&A.me.master?`<section class="panel"><h2>Contas dos coordenadores</h2><p class="small muted" style="margin-top:-4px">Cada pessoa entra com o próprio usuário e senha, e o histórico mostra quem alterou o quê. A senha mestre continua valendo para você.</p>
    <div class="tw"><table><thead><tr><th>Usuário</th><th>Nome</th><th>Tipo</th><th>Nova senha</th><th></th></tr></thead><tbody>${(A.users||[]).map(u=>`<tr><td class="mono">${esc(u.login)}</td><td>${esc(u.nome)}</td><td>${u.role==="docente"?"Docente":"Coordenador"}</td><td><input type="password" id="pw_${esc(u.login)}" placeholder="mín. 8 caracteres" autocomplete="new-password" aria-label="Nova senha de ${esc(u.nome)}" style="width:170px"> <button class="btn sm" data-act="usrpw" data-l="${esc(u.login)}">Alterar</button></td><td><button class="btn sm bad" data-act="usrdel" data-l="${esc(u.login)}">${UI.confirm==="u"+u.login?"Confirmar":"Remover"}</button></td></tr>`).join("")||'<tr><td colspan="5" class="muted">Nenhuma conta ainda.</td></tr>'}</tbody></table></div>
    <h3 style="margin:16px 0 8px">Nova conta</h3><div class="form"><label class="f">Usuário (letras minúsculas)<input type="text" id="uLogin" autocomplete="off"></label><label class="f">Nome<input type="text" id="uNome" autocomplete="off"></label><label class="f">Senha (mín. 8)<input type="password" id="uPw" autocomplete="new-password"></label><label class="f">Tipo de conta<select id="uRole"><option value="coord">Coordenador (edita tudo)</option><option value="docente">Docente (só chamada e alunos)</option></select></label></div>
    <div class="row" style="margin-top:8px"><button class="btn pri" data-act="usradd">Criar conta</button></div></section>`:`<section class="panel"><h2>Contas</h2><p class="small muted">Você entrou como ${esc((A.me&&A.me.nome)||"coordenador")}. Só quem usa a senha mestre cria e remove contas.</p></section>`;
  const hist=`<section class="panel"><div class="row" style="justify-content:space-between"><h2>Histórico de alterações</h2><button class="btn sm" data-act="histload">Atualizar</button></div><p class="small muted" style="margin-top:-4px">As últimas versões de cada turma ficam guardadas. Restaurar volta a turma (ou a lista de docentes) ao estado daquela hora; a versão atual também fica no histórico.</p>
    <div class="tw"><table><thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th></th></tr></thead><tbody>${(A.hist||[]).map(h=>`<tr><td class="mono">${when(h.at)}</td><td>${esc(h.by||"-")}</td><td>${esc(h.label)}${h.note?` <span class="muted">(${esc(h.note)})</span>`:""}</td><td><button class="btn sm" data-act="histrestore" data-h="${h.id}">${UI.confirm==="h"+h.id?"Confirmar restauração":"Restaurar"}</button></td></tr>`).join("")||'<tr><td colspan="4" class="muted">Sem alterações registradas.</td></tr>'}</tbody></table></div></section>`;
  return `<div class="grid2" style="grid-template-columns:1fr">${users}${hist}</div>`;
}
export const actions={
  "usradd":(b,e,a)=>{{const g=id=>document.getElementById(id).value;PLAN.api({op:"user_add",login:g("uLogin"),nome:g("uNome"),password:g("uPw"),role:g("uRole")}).then(r=>{toast(r.ok?"Conta criada":r.error||"Erro ao criar a conta");if(r.ok)loadAcc()})}},
  "usrdel":(b,e,a)=>{{const lg=b.dataset.l;if(UI.confirm==="u"+lg){UI.confirm=null;PLAN.api({op:"user_del",login:lg}).then(r=>{toast(r.ok?"Conta removida":r.error||"Erro");loadAcc()})}else{UI.confirm="u"+lg;renderView()}}},
  "usrpw":(b,e,a)=>{{const lg=b.dataset.l,pw=document.getElementById("pw_"+lg).value;PLAN.api({op:"user_pw",login:lg,password:pw}).then(r=>toast(r.ok?"Senha alterada":r.error||"Erro"))}},
  "histload":(b,e,a)=>{loadAcc()},
  "histrestore":(b,e,a)=>{{const id=b.dataset.h;if(UI.confirm==="h"+id){UI.confirm=null;PLAN.api({op:"restore",hid:+id}).then(r=>{if(r.ok){toast("Versão restaurada. Recarregando…");setTimeout(()=>location.reload(),900)}else toast(r.error||"Erro ao restaurar")})}else{UI.confirm="h"+id;renderView()}}},
};
export const changes=[];

