import {announce} from "./a11y.js";
import {BASE0, KEY2} from "./config.js";
import {CUR, G, MODE, T, UI, stripT, strippedT} from "./state.js";
import {canon, clone} from "./util.js";
export const P={dref:null,saveTimer:null,saving:Promise.resolve(),dirty:false,lastJson:{}};
export const STAT={local:"Salvo só neste navegador",saving:"Salvando…",saved:"Todos os lançamentos salvos",error:"Erro ao salvar. Tentaremos de novo na próxima alteração.",ro:"Somente leitura: você não tem permissão para salvar"};
export function setStatus(k){if(UI.status!==k&&["saved","error","ro"].includes(k)&&UI.loaded!==false&&MODE==="planner"&&UI.status!=="local")announce(STAT[k]);UI.status=k;const el=document.getElementById("stat");if(el){el.textContent=STAT[k]||"";el.dataset.k=k}}
export const docItems=()=>[["geral",{docentes:G.docentes,base:G.base}],...Object.entries(T).map(([id,st])=>["turma-"+id,{state:stripT(st)}])];
export function persistLocal(){try{localStorage.setItem(KEY2,JSON.stringify({G,T:strippedT(),CUR}))}catch(e){}}
export function save(){
  if(MODE!=="planner")return;
  persistLocal();
  if(!P.dref){setStatus("local");return}
  P.dirty=true;setStatus("saving");clearTimeout(P.saveTimer);
  P.saveTimer=setTimeout(()=>{P.saving=P.saving.then(async()=>{
    try{
      const items=docItems();
      for(const [doc,data] of items){const js=canon(data);if(P.lastJson[doc]===js)continue;await P.dref.doc(doc).set({...JSON.parse(js),savedAt:new Date().toISOString()});P.lastJson[doc]=js}
      for(const doc of Object.keys(P.lastJson)){if(!items.some(x=>x[0]===doc)){try{await P.dref.doc(doc).delete()}catch(e){}delete P.lastJson[doc]}}
      if(!docItems().some(([doc,data])=>P.lastJson[doc]!==canon(data))){P.dirty=false;setStatus("saved")}
    }catch(e){P.dirty=false;setStatus(e&&e.code==="invalid_argument"?"ro":"error")}
  })},500);
}
export function fromDocs(docs){
  const g=docs.geral?{docentes:clone(docs.geral.docentes||[]),base:docs.geral.base}:{docentes:[],base:BASE0},t={};
  for(const [k,v] of Object.entries(docs))if(k.startsWith("turma-")&&v&&v.state)t[k.slice(6)]=clone(v.state);
  if(!docs.geral)Object.values(t).forEach(st=>(st.docentes||[]).forEach(d=>{if(!g.docentes.some(x=>x.nome===d.nome))g.docentes.push(d)}));
  Object.values(t).forEach(st=>{delete st.docentes});
  return {g,t,legacy:!docs.geral};
}
