import {TABS} from "./config.js";
import {colorOf, horarios, spanOf} from "./rules.js";
import {CUR, S, T, UI} from "./state.js";
import {setStatus} from "./store.js";
import {br, esc, hm} from "./util.js";
export function toast(m){
  const r=document.getElementById("toastRoot");
  r.textContent="";
  clearTimeout(toast.t);
  setTimeout(()=>{r.innerHTML=`<div class="toast">${esc(m)}</div>`},30);
  toast.t=setTimeout(()=>{r.textContent=""},Math.max(6000,String(m).length*90));
}
export const sig=s=>`<span class="sig" style="--c:${colorOf(s)}">${esc(s)}</span>`;
export function copyText(id){
  const el=document.getElementById(id);if(!el)return;
  const ok=()=>toast("Copiado");
  const fb=()=>{el.focus();el.select();toast("Texto selecionado: use Ctrl+C")};
  try{navigator.clipboard.writeText(el.value).then(ok,fb)}catch(e){fb()}
}
export const rowHorario=()=>{const h=horarios();return h.length?`${hm(h[0].i)} às ${hm(h[h.length-1].f)}`:""};

/* ---------- cabeçalho / abas ---------- */
export const DOCTABS=["chamada","alunos","relatorios"];
export function renderHead(){
  const c=S.cfg;if(UI.role==="docente"&&!DOCTABS.includes(UI.tab))UI.tab="chamada";
  document.getElementById("hdr").innerHTML=`<h1>${esc(c.curso)}</h1><span class="meta mono">Turma ${esc(c.turma)} · Módulo ${esc(c.modulo)} · ${esc(c.turno)} · ${br(c.inicio)} a ${br(c.termino)}</span><div class="hbar"><span id="stat" class="stat"></span><select id="turmaSel" aria-label="Turma" style="width:auto;max-width:100%">${Object.entries(T).map(([id,st])=>`<option value="${esc(id)}" ${id===CUR?"selected":""}>${esc(st.cfg.turma)} · ${esc(st.cfg.curso)}</option>`).join("")}</select><button class="btn sm" data-act="turmanew">Nova turma</button><a class="btn sm" href="#aluno-${esc(CUR)}">Ver como aluno</a><a class="btn sm" href="#docente">Ver como docente</a></div>`;
  setStatus(UI.status);
  document.getElementById("tabs").innerHTML=TABS.filter(x=>UI.role!=="docente"||DOCTABS.includes(x[0])).map(([k,l])=>`<button data-act="tab" data-k="${k}"${UI.tab===k?' aria-current="page"':""}>${l}</button>`).join("");
}

/* ---------- PAINEL ---------- */
export const closeModal=()=>document.getElementById("modalRoot").innerHTML="";
export const fdt=iso=>{try{return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).replace(","," às")}catch(e){return ""}};
export function copyValue(v){const f=()=>toast("Não foi possível copiar. Selecione o link e copie.");try{navigator.clipboard.writeText(v).then(()=>toast("Link copiado"),f)}catch(e){f()}}
export const spanStr=c=>{const s=spanOf(c);return hm(s[0])+" às "+hm(s[1])};
