import {LOGO} from "./data.js";
export function initTheme(){
  const K="planejador-turma-v1-theme",L={light:"Claro",dark:"Escuro",auto:"Automático"},NEXT={light:"dark",dark:"auto",auto:"light"};
  let m="light";try{m=localStorage.getItem(K)||"light"}catch(e){}
  if(!L[m])m="light";
  const apply=()=>{const r=document.documentElement;if(m==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",m);
    const b=document.getElementById("themeBtn");if(b){b.textContent="Tema: "+L[m];b.setAttribute("aria-label","Tema: "+L[m]+". Ativar para alternar")}};
  apply();
  const lg=document.getElementById("logo");if(lg)lg.src=LOGO;
  const b=document.getElementById("themeBtn");
  if(b)b.addEventListener("click",()=>{m=NEXT[m];try{localStorage.setItem(K,m)}catch(e){}apply()});
}
