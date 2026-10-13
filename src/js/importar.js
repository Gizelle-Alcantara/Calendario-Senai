// Importação de feriados e recessos (CSV ou ICS) para a turma atual. Regras puras: leem/alteram S.
import {S} from "./state.js";
import {addD, dow, fd, pd} from "./util.js";

const MAX_INTERVALO=60;
function mkIso(y,m,d){
  y=+y;m=+m;d=+d;
  if(!(y>=1990&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=31))return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?fd(dt):null;
}
/** Aceita 2026-09-07, 07/09/2026, 7-9-2026, 7.9.2026 e 20260907 (ICS). */
export function parseData(s){
  s=String(s||"").trim();let m;
  if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)))return mkIso(m[1],m[2],m[3]);
  if((m=/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)))return mkIso(m[3],m[2],m[1]);
  if((m=/^(\d{4})(\d{2})(\d{2})(?:T.*)?Z?$/.exec(s)))return mkIso(m[1],m[2],m[3]);
  return null;
}
const tipoDe=s=>/^(sem|recesso|sem aula)/i.test(String(s||"").trim())?"sem":"feriado";
function splitCsv(l,sep){
  const out=[];let cur="",q=false;
  for(let i=0;i<l.length;i++){
    const c=l[i];
    if(q){if(c==='"'&&l[i+1]==='"'){cur+='"';i++}else if(c==='"')q=false;else cur+=c}
    else if(c==='"')q=true;
    else if(c===sep){out.push(cur);cur=""}
    else cur+=c;
  }
  out.push(cur);return out.map(x=>x.trim());
}
/** Expande um intervalo; em intervalos, fins de semana são ignorados (não são dias letivos). */
function expandir(a,b,erro){
  if(!b||b===a)return [a];
  if(b<a){erro("data final antes da inicial");return [a]}
  const n=(pd(b)-pd(a))/864e5;
  if(n>MAX_INTERVALO){erro(`intervalo de mais de ${MAX_INTERVALO} dias`);return []}
  const out=[];for(let i=0;i<=n;i++){const d=addD(a,i);if(![0,6].includes(dow(d)))out.push(d)}
  return out;
}
export function parseCsv(texto){
  const items=[],erros=[];
  const linhas=String(texto||"").replace(/^﻿/,"").split(/\r?\n/);
  const sep=[";","\t",","].find(s=>linhas.some(l=>l.includes(s)))||";";
  let primeira=true;
  linhas.forEach((raw,i)=>{
    if(!raw.trim())return;
    const c=splitCsv(raw,sep),a=parseData(c[0]),cab=primeira;primeira=false;
    if(!a){if(!cab)erros.push({linha:i+1,msg:"data não reconhecida: "+(c[0]||"(vazio)")});return}  // a 1ª linha sem data é o cabeçalho
    const fim=parseData(c[1]),k=fim?2:1,nome=(c[k]||"").trim(),t=tipoDe(c[k+1]);
    const erro=m=>erros.push({linha:i+1,msg:m});
    for(const iso of expandir(a,fim,erro))items.push({iso,nome:nome||(t==="sem"?"SEM AULA":"FERIADO"),t});
  });
  return {items:dedup(items),erros,formato:"CSV"};
}
const unesc=s=>s.replace(/\\n/gi," ").replace(/\\([,;\\])/g,"$1").trim();
export function parseIcs(texto){
  const items=[],erros=[];
  const linhas=String(texto||"").replace(/\r?\n[ \t]/g,"").split(/\r?\n/);
  let ev=null;
  for(const l of linhas){
    if(/^BEGIN:VEVENT/i.test(l)){ev={};continue}
    if(/^END:VEVENT/i.test(l)){
      if(ev){
        const a=parseData(ev.ini);
        if(!a)erros.push({linha:0,msg:"evento sem data válida: "+(ev.nome||"(sem título)")});
        else{
          let b=ev.fim?parseData(ev.fim):null;
          const dia=/VALUE=DATE(?!-)/i.test(ev.iniRaw||"")||/^\d{8}$/.test(ev.ini||"");
          if(b&&dia)b=addD(b,-1);        // em eventos de dia inteiro o DTEND é exclusivo
          else if(b&&!dia)b=a;           // evento com hora: considera só o dia inicial
          for(const iso of expandir(a,b&&b>=a?b:a,m=>erros.push({linha:0,msg:m+": "+(ev.nome||"")})))items.push({iso,nome:ev.nome||"FERIADO",t:tipoDe(ev.nome)==="sem"?"sem":"feriado"});
        }
      }
      ev=null;continue;
    }
    if(!ev)continue;
    const m=/^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(l);if(!m)continue;
    const k=m[1].toUpperCase();
    if(k==="DTSTART"){ev.ini=m[3].trim();ev.iniRaw=m[2]}
    else if(k==="DTEND")ev.fim=m[3].trim();
    else if(k==="SUMMARY")ev.nome=unesc(m[3]);
  }
  return {items:dedup(items),erros,formato:"ICS"};
}
function dedup(items){const m=new Map();items.forEach(x=>m.set(x.iso,x));return [...m.values()].sort((a,b)=>a.iso<b.iso?-1:1)}
export const parseArquivo=texto=>/BEGIN:VCALENDAR/i.test(texto||"")?parseIcs(texto):parseCsv(texto);

/** Compara com a turma atual. acao: novo | atualiza | igual | aula | fora */
export function planoImport(items){
  return items.map(x=>{
    const e=S.days[x.iso];
    let acao="novo";
    if(x.iso<S.cfg.inicio||x.iso>S.cfg.termino)acao="fora";
    else if(e&&(e.s||[]).length)acao="aula";
    else if(e&&e.h===x.nome&&(e.t||"")===x.t)acao="igual";
    else if(e&&(e.h||e.t))acao="atualiza";
    return {...x,acao,atual:e&&e.h?e.h:""};
  });
}
export function aplicarImport(plano,{substituirAulas=false}={}){
  const r={novos:0,atualizados:0,substituidos:0,pulados:0};
  for(const x of plano){
    if(x.acao==="fora"||x.acao==="igual"){continue}
    if(x.acao==="aula"&&!substituirAulas){r.pulados++;continue}
    if(x.acao==="aula")r.substituidos++;else if(x.acao==="atualiza")r.atualizados++;else r.novos++;
    S.days[x.iso]={s:[],t:x.t,h:x.nome};
  }
  return r;
}
export const MODELO_CSV="﻿data;nome;tipo\n07/09/2026;Independência do Brasil;feriado\n12/10/2026;Nossa Senhora Aparecida;feriado\n02/11/2026;Finados;feriado\n20/11/2026;Consciência Negra;feriado\n21/12/2026;22/12/2026;Recesso escolar;sem aula\n";
