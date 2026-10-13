// Desfazer/refazer na tela: Ctrl+Z, Ctrl+Y (ou Ctrl+Shift+Z) e os botões do cabeçalho.
import {announce} from "./a11y.js";
import {renderView} from "./render.js";
import {MODE} from "./state.js";
import {H, histStep} from "./store.js";
import {toast} from "./ui.js";

function passo(dir){
  if(MODE!=="planner")return false;
  const ok=histStep(dir);
  if(!ok){announce(dir<0?"Nada para desfazer":"Nada para refazer");return false}
  renderView();
  toast(dir<0?"Alteração desfeita":"Alteração refeita");
  return true;
}
export const desfazer=()=>passo(-1);
export const refazer=()=>passo(1);
export const podeDesfazer=()=>H.undo.length>0;
export const podeRefazer=()=>H.redo.length>0;
/** Atalhos: não interferem no desfazer nativo dos campos de texto nem com diálogos abertos. */
export function onKeydown(e){
  if(!(e.ctrlKey||e.metaKey)||e.altKey||MODE!=="planner")return;
  const k=e.key.toLowerCase();
  if(k!=="z"&&k!=="y")return;
  const t=e.target,tag=t&&t.tagName;
  if(tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT"||(t&&t.isContentEditable))return;
  if(document.querySelector(".modal"))return;
  e.preventDefault();
  if(k==="y"||e.shiftKey)refazer();else desfazer();
}
export const actions={undo:()=>{desfazer()},redo:()=>{refazer()}};
