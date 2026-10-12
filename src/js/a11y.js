// Acessibilidade transversal (WCAG 2.2 AA): foco, anúncios, diálogos e semântica de tabelas/formulários.
// Os modelos de tela continuam gerando HTML; aqui fica o que precisa de comportamento ou de contexto do DOM.
import {TABS} from "./config.js";
import {MODE, S, UI} from "./state.js";

const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]';
const ROOTS="#tabs,#hdr,#view,#modalRoot";
const visible=el=>!el.closest("[hidden]")&&el.getClientRects().length>0;
const focusables=root=>[...root.querySelectorAll(FOCUSABLE)].filter(visible);
let lastKey={k:"",shift:false,t:0},lastChange={el:null,t:0};

/* ---------- anúncios para leitores de tela ---------- */
export function announce(msg){
  const a=document.getElementById("announcer");if(!a)return;
  a.textContent="";setTimeout(()=>{a.textContent=msg},60);
}
export function updateTitle(){
  let t="Planejador de Turma · SENAI";
  if(MODE==="aluno")t="Calendário da turma"+(S?" "+S.cfg.turma:"")+" · SENAI";
  else if(MODE==="docente")t="Agenda do docente · SENAI";
  else if(MODE==="landing")t="Calendários de aulas · SENAI";
  else if(S){const l=(TABS.find(x=>x[0]===UI.tab)||[])[1];t=(l?l+" · ":"")+"Turma "+S.cfg.turma+" · Planejador SENAI"}
  document.title=t;
}

/* ---------- foco preservado entre redesenhos ---------- */
export function captureFocus(){
  let el=document.activeElement;
  // ao sair de um campo com Tab, o navegador dispara "change" quando o foco já está no corpo da página
  if((!el||el===document.body)&&lastChange.el&&document.contains(lastChange.el)&&Date.now()-lastChange.t<300)el=lastChange.el;
  if(!el||el===document.body)return null;
  const root=el.closest(ROOTS);if(!root)return null;
  return {root:root.id,id:el.id||"",i:focusables(root).indexOf(el),tab:lastKey.k==="Tab"&&Date.now()-lastKey.t<500,shift:lastKey.shift};
}
export function restoreFocus(k){
  if(!k)return;
  const root=document.getElementById(k.root);if(!root)return;
  const go=(advance)=>{
    let el=k.id?document.getElementById(k.id):null;
    if(!el||advance){const l=focusables(root);if(!l.length)return;const i=Math.max(0,Math.min(l.length-1,(k.i<0?0:k.i)+(advance?(k.shift?-1:1):0)));el=l[i]}
    if(el&&el!==document.activeElement)el.focus({preventScroll:true});
  };
  go(false);
  // Tab pressionado num campo que disparou "change": o destino foi redesenhado e o foco caiu no corpo da página.
  if(k.tab)setTimeout(()=>{const a=document.activeElement;if(!a||a===document.body||!document.contains(a)||(a.id&&a.id===k.id)||a===root.querySelectorAll(FOCUSABLE)[k.i])go(true)},0);
}

/* ---------- semântica aplicada depois de cada renderização ---------- */
const txt=el=>(el&&el.textContent||"").replace(/\s+/g," ").trim();
let uid=0;
export function enhance(root=document.getElementById("view")){
  if(!root)return;
  // títulos de tabela: o cabeçalho mais próximo vira o nome da tabela e da região rolável
  root.querySelectorAll("table").forEach(tb=>{
    if(!tb.getAttribute("aria-label")&&!tb.getAttribute("aria-labelledby")&&!tb.querySelector("caption")){
      let h=null;const box=tb.closest(".panel,details,section")||root;
      const hs=[...box.querySelectorAll("h1,h2,h3,summary")];
      for(const x of hs){if(x.compareDocumentPosition(tb)&Node.DOCUMENT_POSITION_FOLLOWING)h=x}
      if(h){if(!h.id)h.id="h"+(++uid);tb.setAttribute("aria-labelledby",h.id)}
      else tb.setAttribute("aria-label","Tabela de dados");
    }
    tb.querySelectorAll("thead th").forEach(th=>{if(!th.hasAttribute("scope"))th.setAttribute("scope","col");if(!txt(th)&&!th.querySelector(".sr-only"))th.innerHTML='<span class="sr-only">Ações</span>'});
    tb.querySelectorAll("tbody th").forEach(th=>{if(!th.hasAttribute("scope"))th.setAttribute("scope","row")});
    const w=tb.parentElement;
    if(w&&w.classList.contains("tw")){w.tabIndex=0;w.setAttribute("role","region");w.setAttribute("aria-label",(tb.getAttribute("aria-labelledby")?txt(document.getElementById(tb.getAttribute("aria-labelledby"))):"Tabela")+" (rolagem horizontal)")}
    // campos dentro de células: nome = coluna + linha
    const heads=[...tb.querySelectorAll("thead th")].map(txt);
    tb.querySelectorAll("tbody tr").forEach(tr=>{
      const cells=[...tr.children];const rowName=txt(cells[0].querySelector("input,select")?null:cells[0])||"";
      cells.forEach((td,ci)=>td.querySelectorAll("input,select,textarea,button").forEach(c=>{
        if(c.type==="hidden"||c.getAttribute("aria-label")||c.getAttribute("aria-labelledby")||c.closest("label")||(c.id&&document.querySelector(`label[for="${c.id}"]`)))return;
        if(c.tagName==="BUTTON"&&txt(c))return;
        const col=heads[ci]||"";
        c.setAttribute("aria-label",[col,rowName&&ci>0?rowName:""].filter(Boolean).join(" · ")||c.title||"Campo");
      }));
    });
  });
  // barras de progresso
  root.querySelectorAll(".bar").forEach(b=>{
    if(b.getAttribute("role"))return;
    const i=b.querySelector("i"),m=i&&/width:\s*([\d.]+)%/.exec(i.getAttribute("style")||"");
    const tr=b.closest("tr"),nome=tr?txt(tr.children[0]):"";
    b.setAttribute("role","progressbar");b.setAttribute("aria-valuemin","0");b.setAttribute("aria-valuemax","100");
    b.setAttribute("aria-valuenow",String(m?Math.round(+m[1]):0));b.setAttribute("aria-label","Progresso"+(nome?" de "+nome:""));
  });
  // controles soltos sem nome: usa placeholder ou título
  root.querySelectorAll("input,select,textarea").forEach(c=>{
    if(c.type==="hidden"||c.getAttribute("aria-label")||c.getAttribute("aria-labelledby")||c.closest("label")||(c.id&&document.querySelector(`label[for="${c.id}"]`)))return;
    const n=c.placeholder||c.title;if(n)c.setAttribute("aria-label",n);
  });
  // abas vazias (modos públicos) não viram um ponto de referência sem conteúdo
  const nav=document.getElementById("tabs");if(nav)nav.hidden=!nav.children.length;
}

/* ---------- diálogos: papel, foco, retorno e fundo inerte ---------- */
let opener=null,modalOpen=false;
function syncModal(){
  const root=document.getElementById("modalRoot"),m=root&&root.querySelector(".modal"),wrap=document.querySelector(".wrap");
  if(m&&!modalOpen){
    modalOpen=true;
    m.setAttribute("role","dialog");m.setAttribute("aria-modal","true");m.removeAttribute("aria-label");
    const h=m.querySelector("h2,h3");if(h){h.id=h.id||"dlgTitulo";m.setAttribute("aria-labelledby",h.id)}
    if(wrap)wrap.inert=true;
    m.tabIndex=-1;
    const f=focusables(m)[0];(f||m).focus({preventScroll:true});
    enhance(m);
  }else if(!m&&modalOpen){
    modalOpen=false;if(wrap)wrap.inert=false;
    const o=opener;opener=null;
    if(o&&document.contains(o.el))o.el.focus({preventScroll:true});
    else if(o)restoreFocus(o.k);
  }
}
export function initA11y(){
  const root=document.getElementById("modalRoot");
  new MutationObserver(syncModal).observe(root,{childList:true});
  // guarda quem abriu o diálogo antes de ele existir
  document.addEventListener("click",e=>{const b=e.target.closest("button,[data-act]");if(b&&!modalOpen)opener={el:b,k:captureFocus()||{root:(b.closest(ROOTS)||{}).id,id:b.id||"",i:focusables(b.closest(ROOTS)||document.body).indexOf(b)}}},true);
  document.addEventListener("change",e=>{lastChange={el:e.target,t:Date.now()}},true);
  const skip=document.querySelector(".skip");
  if(skip)skip.addEventListener("click",e=>{e.preventDefault();const v=document.getElementById("view");v.focus();v.scrollIntoView()});
  document.addEventListener("keydown",e=>{
    lastKey={k:e.key,shift:e.shiftKey,t:Date.now()};
    if(e.key==="Tab"&&modalOpen){
      const m=root.querySelector(".modal");if(!m)return;
      const l=focusables(m);if(!l.length){e.preventDefault();return}
      const a=document.activeElement;
      if(e.shiftKey&&(a===l[0]||a===m)){e.preventDefault();l[l.length-1].focus()}
      else if(!e.shiftKey&&a===l[l.length-1]){e.preventDefault();l[0].focus()}
    }
    // setas movem o foco entre os dias do calendário
    const d=e.target&&e.target.closest&&e.target.closest(".cal .day");
    if(d&&["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key)){
      const days=[...d.parentElement.querySelectorAll(".day:not(.blank)")],i=days.indexOf(d);
      const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];
      let n=e.key==="Home"?0:e.key==="End"?days.length-1:i+step;
      if(n>=0&&n<days.length){e.preventDefault();days[n].focus()}
    }
  },true);
}
