import {WDL} from "./config.js";
import {S, T, UI} from "./state.js";
import {addD, br, dow, toMin, todayISO} from "./util.js";
export const horaOf=c=>c.turno==="Matutino NEM"?50:60;
export const horaAula=()=>horaOf(S.cfg);
export function horariosOf(c){
  const h=horaOf(c);
  const st={"Matutino":"07:30","Matutino NEM":"07:00","Vespertino NEM":"13:20","Vespertino":"13:00","Diurno":"07:30","Noturno (Comunidade)":"18:00"}[c.turno]||"18:40";
  let t=toMin(st);const rows=[];
  if(c.turno==="Diurno"){const d=h*2;[["1 - 2",t],["3 - 4",t+d],["5 - 6",toMin("13:00")]].forEach(([n,s])=>rows.push({n,i:s,f:s+d}))}
  else{const n=c.turno==="Matutino NEM"?6:4;for(let i=1;i<=n;i++){if(c.turno==="Matutino NEM"&&i===4)t+=20;rows.push({n:String(i),i:t,f:t+h});t+=h}}
  return rows;
}
export const horarios=()=>horariosOf(S.cfg);
export const spanOf=c=>{const h=horariosOf(c);return [h[0].i,h[h.length-1].f]};
export const colorOf=sig=>{const i=S.ucs.findIndex(u=>u.sigla===sig);return `var(--u${(i<0?7:i)%8})`};
export const ucOf=sig=>S.ucs.find(u=>u.sigla===sig);
export const calc=()=>calcOf(S);
export function calcOf(S){
  const c=S.cfg,hora=horaOf(c),isos=Object.keys(S.days).sort();
  const dates={},enc={};
  S.ucs.forEach(u=>dates[u.sigla]=[]);
  const reg=S.reg||{};
  for(const iso of isos){
    const d=S.days[iso];enc[iso]=[];const nao=reg[iso]&&reg[iso].dado==="nao";
    (d.s||[]).forEach(sg=>{if(nao){enc[iso].push("×");return}(dates[sg]=dates[sg]||[]).push(iso);enc[iso].push(dates[sg].length)});
  }
  const cnt={};
  for(const [iso,r] of Object.entries(reg)){const sg=((S.days[iso]||{}).s||[])[0];if(!sg)continue;const c=cnt[sg]=cnt[sg]||{dadas:0,nao:0,semRep:0};
    if(r.dado==="sim")c.dadas++;else if(r.dado==="nao"){c.nao++;if(!r.rep)c.semRep++}}
  const t=todayISO();
  const rows=S.ucs.map((u,i)=>{
    const Q=Math.ceil(hora===60?u.ch:u.ch*1.2),P=Math.ceil(Q/c.aulasDia),R=Math.floor(Q*.25);
    const ds=dates[u.sigla]||[],ini=ds[0]||"-",fim=ds[ds.length-1]||"-";
    const status=ds.length&&t>=ini&&t<=fim?"EM ANDAMENTO":ds.length&&t>fim?"CONCLUÍDA":"PLANEJADA";
    const k=cnt[u.sigla]||{dadas:0,nao:0,semRep:0};
    return {u,i,Q,P,R,aloc:ds.length,faltam:P-ds.length,ini,fim,status,ds,dadas:k.dadas,nao:k.nao,semRep:k.semRep};
  });
  return {rows,enc,dates,isos};
}
export const PLUR=["domingos","segundas-feiras","terças-feiras","quartas-feiras","quintas-feiras","sextas-feiras","sábados"];
export const normSala=s=>String(s||"").trim().toLowerCase();
export function blockMsg(iso,sg){
  const u=ucOf(sg);if(!u)return "";
  const d=u.docente?S.docentes.find(x=>x.nome===u.docente):null;
  const w=dow(iso);
  if(d){
    if((d.semana||[]).includes(w))return `${d.nome} não leciona ${w===0||w===6?"aos":"às"} ${PLUR[w]}`;
    const b=(d.bloqueios||[]).find(x=>x.de&&iso>=x.de&&iso<=(x.ate||x.de));
    if(b)return `${d.nome} está indisponível${b.motivo?" ("+b.motivo+")":""} de ${br(b.de)}${b.ate&&b.ate!==b.de?" a "+br(b.ate):""}`;
  }
  const sp1=spanOf(S.cfg),sala=normSala(u.sala);
  for(const st of Object.values(T)){
    if(st===S)continue;const dd=st.days[iso];if(!dd||!(dd.s||[]).length)continue;
    if(st.reg&&st.reg[iso]&&st.reg[iso].dado==="nao")continue;
    const sp2=spanOf(st.cfg);if(!(sp1[0]<sp2[1]&&sp2[0]<sp1[1]))continue;
    const ucs=dd.s.map(x=>st.ucs.find(u2=>u2.sigla===x)).filter(Boolean);
    if(d){const hit=ucs.find(u2=>u2.docente===u.docente);if(hit)return `${d.nome} já leciona ${hit.sigla} na turma ${st.cfg.turma} nesse horário`}
    if(sala){const hit=ucs.find(u2=>normSala(u2.sala)===sala);if(hit)return `a sala ${u.sala.trim()} já está ocupada por ${hit.sigla} (turma ${st.cfg.turma}) nesse horário`}
  }
  return "";
}
export function confDay(iso){
  const s=(S.days[iso]||{}).s||[];const m=[];
  if(s.length>1)m.push(`mais de uma disciplina no mesmo dia (${s.join(" e ")})`);
  s.forEach(sg=>{const b=blockMsg(iso,sg);if(b)m.push(b)});
  return m;
}
export const countConf=()=>Object.keys(S.days).reduce((a,i)=>a+confDay(i).length,0);
export function avisos(C){
  const a=[];
  C.rows.forEach(r=>{
    if(r.faltam>0)a.push(["warn",`${r.u.sigla}: faltam ${r.faltam} encontro(s) para lançar (${r.aloc} de ${r.P}).`]);
    if(r.faltam<0)a.push(["err",`${r.u.sigla}: ${-r.faltam} encontro(s) a mais que o previsto (${r.aloc} de ${r.P}).`]);
    if(!r.u.docente)a.push(["info",`${r.u.sigla}: sem docente definido.`]);
    if(r.semRep>0)a.push(["warn",`${r.u.sigla}: ${r.semRep} aula(s) não dada(s) sem reposição. Veja a aba Chamada.`]);
  });
  for(const iso of C.isos){
    const d=S.days[iso],s=d.s||[];if(!s.length)continue;
    const w=dow(iso);
    if(w===0||w===6)a.push(["warn",`Aula em ${WDL[w]}, ${br(iso)} (${s.join(", ")}).`]);
    if(iso<S.cfg.inicio||iso>S.cfg.termino)a.push(["warn",`Aula fora do período da turma: ${br(iso)} (${s.join(", ")}).`]);
    if(d.t==="feriado"||d.t==="sem")a.push(["err",`Aula marcada em dia sem aula: ${br(iso)}.`]);
    s.forEach(sg=>{if(!ucOf(sg))a.push(["err",`Sigla "${sg}" em ${br(iso)} não existe nas disciplinas.`])});
    confDay(iso).forEach(m=>a.push(["err",`Choque em ${br(iso)}: ${m}.`]));
  }
  return a;
}

/* ---------- reposição de aulas e faltas ---------- */
export function repCands(iso,max=5){
  const sg=((S.days[iso]||{}).s||[])[0];if(!sg)return [];
  const out=[],today=todayISO(),lim=addD(S.cfg.termino,45);
  for(let d=addD(iso>today?iso:today,1);d<=lim&&out.length<max;d=addD(d,1)){
    const w=dow(d);if(w===0||(w===6&&!UI.repSab)||d<S.cfg.inicio)continue;
    const x=S.days[d];if(x&&((x.s||[]).length||x.t==="feriado"||x.t==="sem"))continue;
    S.days[d]={s:[sg]};const m=blockMsg(d,sg);if(x)S.days[d]=x;else delete S.days[d];
    if(!m)out.push({iso:d,fora:d>S.cfg.termino});
  }
  return out;
}
export function applyRep(orig,nw){
  const r=S.reg[orig];if(!r||r.dado!=="nao")return false;const sg=((S.days[orig]||{}).s||[])[0];if(!sg)return false;
  if(r.rep&&S.days[r.rep]&&String(S.days[r.rep].h||"").startsWith("Reposição"))delete S.days[r.rep];
  S.days[nw]={s:[sg],t:"nota",h:"Reposição de "+br(orig)};r.rep=nw;return true;
}
export function faltasMap(){
  const m={};(S.alunos||[]).forEach(a=>m[a.id]={});
  for(const [iso,r] of Object.entries(S.reg||{})){if(r.dado!=="sim"||!r.faltas)continue;const sg=((S.days[iso]||{}).s||[])[0];if(!sg)continue;
    for(const [aid,n] of Object.entries(r.faltas))if(m[aid])m[aid][sg]=(m[aid][sg]||0)+(+n||0)}
  return m;
}
export const stFalta=(n,lim)=>!lim?(n>0?"warn":"ok"):n>lim?"bad":n>=Math.ceil(lim*.75)?"warn":"ok";
