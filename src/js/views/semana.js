// Visão de semana: lista vertical (um dia por linha), pensada para telas estreitas.
// Serve ao planejador (dias clicáveis) e às telas somente leitura de aluno e docente.
import {KEY, MESES, WD, WDL} from "../config.js";
import {renderView} from "../render.js";
import {UI} from "../state.js";
import {addD, dow, esc, todayISO} from "../util.js";

export const weekStart=iso=>addD(iso,-dow(iso));
export function initView(){
  let v=null;try{v=localStorage.getItem(KEY+"-cview")}catch(e){}
  UI.cview=v==="semana"||v==="mes"?v:(typeof window!=="undefined"&&window.innerWidth<640?"semana":"mes");
}
/** Garante uma semana válida em UI.week e define os limites de navegação (iso de domingo). */
export function ensureWeek(min,max){
  UI.wmin=min?weekStart(min):"";UI.wmax=max?weekStart(max):"9999-12-31";
  const t=todayISO();
  if(!UI.week){
    const ym=UI.month,seed=ym&&t.slice(0,7)!==ym?ym+"-01":t;
    UI.week=weekStart(seed);
  }
  if(UI.week<UI.wmin)UI.week=UI.wmin;
  if(UI.week>UI.wmax)UI.week=UI.wmax;
  return UI.week;
}
export function weekTitle(w){
  const e=addD(w,6),a=+w.slice(8),b=+e.slice(8),ma=MESES[+w.slice(5,7)-1],mb=MESES[+e.slice(5,7)-1];
  if(w.slice(0,7)===e.slice(0,7))return `${a} a ${b} de ${ma} de ${w.slice(0,4)}`;
  return `${a} de ${ma}${w.slice(0,4)!==e.slice(0,4)?" de "+w.slice(0,4):""} a ${b} de ${mb} de ${e.slice(0,4)}`;
}
export const viewToggle=()=>`<div class="pal" role="group" aria-label="Modo de exibição do calendário">${[["mes","Mês"],["semana","Semana"]].map(([k,l])=>`<button data-act="cview" data-k="${k}" aria-pressed="${UI.cview===k}">${l}</button>`).join("")}</div>`;
export function weekNav(){
  const w=UI.week;
  return `<div class="calbar"><div class="row"><button class="btn" data-act="wprev" aria-label="Semana anterior" ${w<=UI.wmin?"disabled":""}><span aria-hidden="true">‹</span></button><h2 id="calTitulo">${weekTitle(w)}</h2><button class="btn" data-act="wnext" aria-label="Próxima semana" ${w>=UI.wmax?"disabled":""}><span aria-hidden="true">›</span></button><button class="btn sm" data-act="whoje">Hoje</button></div>
  <div class="row">${viewToggle()}</div></div>`;
}
/** dayFn(iso) -> {cls:[], lab:"", sr:"", clickable:bool, items:[{c:"var(--u0)", html:"…", bad:bool}]} */
export function weekList(dayFn){
  const w=UI.week,t=todayISO();
  return `<ol class="wklist" aria-labelledby="calTitulo">${Array.from({length:7},(_,i)=>addD(w,i)).map(iso=>{
    const d=dayFn(iso),cl=["wkrow",...(d.cls||[])];if(iso===t)cl.push("today");
    const inner=`<span class="wdn"><b>${WD[dow(iso)]}</b> ${iso.slice(8)}/${iso.slice(5,7)}<span class="sr-only">, ${WDL[dow(iso)]}, ${+iso.slice(8)} de ${MESES[+iso.slice(5,7)-1]}${iso===t?", hoje":""}.</span>${iso===t?'<span class="small"> · hoje</span>':""}</span>
      <span class="wbody">${d.lab?`<span class="lb">${esc(d.lab)}</span>`:""}${d.items.map(x=>`<span class="chip ${x.bad?"bad":""}" style="--c:${x.c}">${x.html}</span>`).join("")}${!d.items.length&&!d.lab?'<span class="small muted">Sem aula</span>':""}${d.sr?`<span class="sr-only"> ${esc(d.sr)}</span>`:""}</span>`;
    return `<li>${d.clickable?`<button class="${cl.join(" ")}" data-act="day" data-iso="${iso}">${inner}</button>`:`<div class="${cl.join(" ")}">${inner}</div>`}</li>`;
  }).join("")}</ol>`;
}
export const actions={
  cview:(b)=>{
    const k=b.dataset.k;if(k===UI.cview)return;
    if(k==="semana"){UI.week=null;}
    else if(UI.week){UI.month=addD(UI.week,3).slice(0,7)}
    UI.cview=k;try{localStorage.setItem(KEY+"-cview",k)}catch(e){}
    renderView();
  },
  wprev:()=>{if(UI.week>UI.wmin){UI.week=addD(UI.week,-7);renderView()}},
  wnext:()=>{if(UI.week<UI.wmax){UI.week=addD(UI.week,7);renderView()}},
  whoje:()=>{const w=weekStart(todayISO());UI.week=w<UI.wmin?UI.wmin:w>UI.wmax?UI.wmax:w;renderView()},
};
