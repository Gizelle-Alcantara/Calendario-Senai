import {BASE0, KEY, KEY2, TABS} from "./config.js";
import {slug} from "./util.js";
import {SEED} from "./data.js";
export function seedTurma(){
  const days={};
  for(const [iso,e] of Object.entries(SEED.days)){
    const s=e.s||[];const d={s};
    if(e.h){d.h=e.h;d.t=s.length?"nota":"feriado"}
    days[iso]=d;
  }
  return {
    cfg:{turma:"202629",curso:"Técnico em Desenvolvimento de Sistemas",turno:"Noturno (Técnico)",modulo:"I",
      coord:"Silas Pereira",email:"",local:"",inicio:"2026-08-11",termino:"2026-12-17",aulasDia:4},
    ucs:SEED.ucs.map(u=>({...u})),days,envios:[]
  };
}
export const H0=typeof location!=="undefined"?location.hash:"";
export let MODE=H0.startsWith("#aluno")?"aluno":H0.startsWith("#docente")?"docente":"planner";
export const ALUNO_ID=MODE==="aluno"?H0.slice(7):"",DOC_ID=MODE==="docente"?H0.slice(9):"";
export let G={docentes:[],base:BASE0},T={},CUR="",S=null;
export const emptyTurma=()=>{const s=seedTurma();s.ucs=[];s.days={};return s};
export const seedAll=()=>({G:{docentes:[],base:BASE0},T:{"202629":seedTurma()},CUR:"202629"});
export const stripT=st=>{const r={...st};delete r.docentes;return r};
export const strippedT=()=>Object.fromEntries(Object.entries(T).map(([k,v])=>[k,stripT(v)]));
export function legacyToMulti(o){const id=slug(o.cfg.turma),st=stripT(o);return {G:{docentes:o.docentes||[],base:(o.cfg.linkAluno||BASE0).split("#")[0]},T:{[id]:st},CUR:id}}
if(MODE==="planner"){
  try{const r=localStorage.getItem(KEY2);
    if(r){const o=JSON.parse(r);G=o.G;T=o.T;CUR=o.CUR}
    else{const r1=localStorage.getItem(KEY);if(r1){const m=legacyToMulti(JSON.parse(r1));setState(m)}}}catch(e){}
}
if(!T||!Object.keys(T).length){if(MODE!=="planner"){T={x:emptyTurma()};CUR="x"}else{const m=seedAll();setState(m)}}
export function normalize(){
  G.docentes=Array.isArray(G.docentes)?G.docentes:[];G.base=G.base||BASE0;
  G.docentes.forEach(d=>{if(!Array.isArray(d.semana))d.semana=[];if(!Array.isArray(d.bloqueios))d.bloqueios=[]});
  const have=new Set(G.docentes.map(d=>d.nome));
  Object.values(T).forEach(st=>{
    st.envios=Array.isArray(st.envios)?st.envios:[];
    st.aviso=Object.assign({auto:false,lembrete:false,canal:"email",alunos:true,docentes:true,lista:true},st.aviso||{});if(!Array.isArray(st.alunos))st.alunos=[];if(!st.reg||typeof st.reg!=="object"||Array.isArray(st.reg))st.reg={};
    if(st.cfg.destinatarios===undefined)st.cfg.destinatarios="";
    st.ucs.forEach(u=>{if(u.docente&&!have.has(u.docente)){G.docentes.push({nome:u.docente,email:"",semana:[],bloqueios:[]});have.add(u.docente)}});
    st.docentes=G.docentes;
  });
  if(CUR&&!T[CUR])CUR=MODE==="planner"?Object.keys(T)[0]:"";
  S=CUR?T[CUR]:null;
}
normalize();
/* ---------- salvamento: banco do artefato (db) + cópia local ---------- */
export const UI={fUc:"",env:{periodo:"sem2",canal:"zap",msg:null},boot:true,loaded:false,empty:false,savedAt:"",live:false,err:"",cw:null,status:"local",tab:"painel",month:null,tool:"edit",holName:"",ucFilter:"",confirm:null};
try{const t=localStorage.getItem(KEY+"-tab");if(t&&TABS.some(x=>x[0]===t))UI.tab=t}catch(e){}

export let DL=null;
export function setState(o){if('G' in o)G=o.G;if('T' in o)T=o.T;if('CUR' in o)CUR=o.CUR;if('S' in o)S=o.S;if('MODE' in o)MODE=o.MODE;if('DL' in o)DL=o.DL}

