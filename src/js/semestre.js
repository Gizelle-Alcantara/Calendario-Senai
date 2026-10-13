// Copiar uma turma para o semestre seguinte: disciplinas, docentes, feriados e a grade semanal deslocada.
import {addD, clone, pd} from "./util.js";

/** Feriados que mudam de data a cada ano: não dá para levá-los pelo dia e mês. */
export const MOVEL=/carnaval|cinzas|santa|p[aá]scoa|corpus|recesso|ponto facultativo|emenda/i;
const dias=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const anos=(a,b)=>{const o=[];for(let y=+a.slice(0,4);y<=+b.slice(0,4);y++)o.push(y);return o};
const valido=iso=>{const [y,m,d]=iso.split("-").map(Number),dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCMonth()===m-1};

/** Sugestão: 26 semanas depois (mantém o dia da semana de cada aula). */
export const sugerirPeriodo=cfg=>({inicio:addD(cfg.inicio,182),termino:addD(cfg.termino,182)});

export function copiarTurma(src,{cod,inicio,termino,aulas=true,feriados=true}){
  const delta=Math.round(dias(src.cfg.inicio,inicio)/7)*7;   // deslocamento em semanas inteiras
  const st={cfg:{...clone(src.cfg),turma:cod,inicio,termino,destinatarios:""},ucs:clone(src.ucs),days:{},envios:[]};
  const r={feriados:0,naoCopiados:[],aulas:0,aulasFora:0,aulasSemData:0,deslocamentoDias:delta};
  const dentro=iso=>iso>=inicio&&iso<=termino;
  if(feriados){
    const fer=Object.entries(src.days).filter(([,d])=>(d.t==="feriado"||d.t==="sem")&&!(d.s||[]).length);
    const vistos=new Set();
    for(const [iso,d] of fer){
      if(dentro(iso)){st.days[iso]={s:[],t:d.t,h:d.h};r.feriados++;continue}   // mesma data cabe no novo período
      if(MOVEL.test(d.h||"")){if(!vistos.has(d.h)){vistos.add(d.h);r.naoCopiados.push(d.h)}continue}
      for(const y of anos(inicio,termino)){
        const novo=`${y}${iso.slice(4)}`;
        if(valido(novo)&&dentro(novo)&&!st.days[novo]){st.days[novo]={s:[],t:d.t,h:d.h};r.feriados++}
      }
    }
    // móveis que acabaram caindo no período novo (mesma data) não precisam de aviso
    r.naoCopiados=r.naoCopiados.filter(n=>!Object.values(st.days).some(d=>d.h===n));
  }
  if(aulas){
    for(const [iso,d] of Object.entries(src.days)){
      const s=(d.s||[]).filter(Boolean);if(!s.length)continue;
      const novo=addD(iso,delta);
      if(!dentro(novo)){r.aulasFora++;continue}
      const e=st.days[novo];
      if(e&&(e.t==="feriado"||e.t==="sem")){r.aulasSemData++;continue}
      st.days[novo]={s:[...s]};r.aulas++;
    }
  }
  return {st,resumo:r};
}
