// Importar feriados e recessos de um arquivo (CSV ou ICS) para a turma atual, com prévia antes de aplicar.
import {announce} from "../a11y.js";
import {MODELO_CSV, aplicarImport, parseArquivo, planoImport} from "../importar.js";
import {renderView} from "../render.js";
import {DL, S, UI} from "../state.js";
import {save} from "../store.js";
import {toast} from "../ui.js";
import {br, esc} from "../util.js";

const ROTULO={novo:"Novo",atualiza:"Substitui o nome",igual:"Já está lançado",aula:"Dia com aula",fora:"Fora do período da turma"};
const TIPO={feriado:"Feriado",sem:"Sem aula"};

export function vFeriados(){
  const im=UI.imp&&UI.imp.turma===S.cfg.turma?UI.imp:null,pl=im&&im.plano;
  const cont=k=>pl?pl.filter(x=>x.acao===k).length:0;
  let prev="";
  if(im&&im.erro)prev=`<p role="alert" class="small" style="color:var(--bad)">${esc(im.erro)}</p>`;
  else if(pl){
    const aplicaveis=cont("novo")+cont("atualiza")+cont("aula");
    prev=`<div role="status"><b>${pl.length} data(s) em ${im.formato}.</b>
      <span class="small"> ${cont("novo")} nova(s) · ${cont("atualiza")} a atualizar · ${cont("igual")} já lançada(s) · ${cont("aula")} em dia com aula · ${cont("fora")} fora do período.</span></div>
      ${im.erros.length?`<p class="small" style="color:var(--bad)">${im.erros.length} linha(s) ignorada(s): ${esc(im.erros.slice(0,5).map(x=>(x.linha?"linha "+x.linha+": ":"")+x.msg).join("; "))}${im.erros.length>5?"…":""}</p>`:""}
      <div class="tw"><table><caption class="sr-only">Prévia da importação</caption><thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>O que acontece</th></tr></thead><tbody>
      ${pl.slice(0,200).map(x=>`<tr><td class="mono">${br(x.iso)}</td><td>${esc(x.nome)}</td><td>${TIPO[x.t]}</td><td>${ROTULO[x.acao]}${x.acao==="atualiza"&&x.atual?` <span class="small muted">(hoje: ${esc(x.atual)})</span>`:""}</td></tr>`).join("")}
      </tbody></table></div>${pl.length>200?`<p class="small muted">Mostrando as 200 primeiras de ${pl.length}.</p>`:""}
      ${cont("aula")?`<label class="chk"><input type="checkbox" id="impAulas" ${im.subst?"checked":""}> Substituir também os dias que já têm aula (${cont("aula")}). Sem marcar, esses dias ficam como estão.</label>`:""}
      <div class="row" style="margin-top:8px"><button class="btn pri" data-act="impaplicar" ${aplicaveis?"":"disabled"}>Aplicar na turma ${esc(S.cfg.turma)}</button><button class="btn" data-act="impcancelar">Descartar</button></div>`;
  }
  return `<section class="panel"><h2>Importar feriados e calendário letivo</h2>
    <p class="small muted">Use um arquivo CSV (exportado do Excel: <i>Salvar como → CSV</i>) ou ICS (agenda do Google, Outlook, calendário oficial). Datas em 07/09/2026 ou 2026-09-07. Para um recesso, informe a data inicial e a final; fins de semana dentro do intervalo são ignorados. Nada muda até você conferir a prévia e aplicar.</p>
    <div class="form"><label class="f">Arquivo<input type="file" id="impFile" accept=".csv,.txt,.ics,text/csv,text/calendar,text/plain"></label></div>
    <label class="f">ou cole as linhas aqui (data;nome;tipo)<textarea id="impTxt" rows="4" placeholder="07/09/2026;Independência do Brasil;feriado&#10;21/12/2026;02/01/2027;Recesso escolar;sem aula">${esc(im?im.texto:"")}</textarea></label>
    <div class="row"><button class="btn pri" data-act="impprev">Ver prévia</button><button class="btn" data-act="impmodelo">Baixar arquivo modelo</button></div>
    <div id="impPrev" style="margin-top:10px">${prev}</div></section>`;
}

function prever(texto){
  const t=String(texto||"").trim();
  if(!t){UI.imp={turma:S.cfg.turma,texto:"",erro:"Escolha um arquivo ou cole as linhas antes de ver a prévia."};return}
  const r=parseArquivo(t);
  if(!r.items.length){UI.imp={turma:S.cfg.turma,texto,erro:"Nenhuma data reconhecida. "+(r.erros[0]?r.erros[0].msg+".":"Confira o formato do arquivo (veja o modelo).")};return}
  UI.imp={turma:S.cfg.turma,texto,formato:r.formato,erros:r.erros,plano:planoImport(r.items),subst:false};
}
export const actions={
  impprev:()=>{prever(document.getElementById("impTxt").value);renderView();if(UI.imp&&UI.imp.plano)announce(UI.imp.plano.length+" datas na prévia")},
  impcancelar:()=>{UI.imp=null;renderView()},
  impmodelo:()=>{
    if(!DL)return;
    DL.save({filename:"modelo-feriados.csv",data:MODELO_CSV}).then(()=>toast("Arquivo salvo"),er=>{if(!er||er.code!=="declined")toast("Não foi possível salvar o arquivo.")});
  },
  impaplicar:()=>{
    if(!UI.imp||!UI.imp.plano)return;
    const box=document.getElementById("impAulas");
    const r=aplicarImport(UI.imp.plano,{substituirAulas:!!(box&&box.checked)});
    UI.imp=null;save();renderView();
    const p=[];if(r.novos)p.push(r.novos+" nova(s)");if(r.atualizados)p.push(r.atualizados+" atualizada(s)");if(r.substituidos)p.push(r.substituidos+" no lugar de aulas");if(r.pulados)p.push(r.pulados+" mantida(s) por já terem aula");
    toast(p.length?"Feriados importados: "+p.join(", ")+".":"Nada a alterar.");
  },
};
export const changes=[
  [t=>t.id==="impFile"&&t.files&&t.files[0],(t)=>{
    const f=t.files[0];
    if(f.size>1e6){UI.imp={turma:S.cfg.turma,texto:"",erro:"Arquivo grande demais para um calendário de feriados."};renderView();return}
    // CSV do Excel costuma vir em Windows-1252: tenta UTF-8 e, se houver bytes inválidos, usa Windows-1252
    f.arrayBuffer().then(buf=>{
      let txt;try{txt=new TextDecoder("utf-8",{fatal:true}).decode(buf)}catch(err){txt=new TextDecoder("windows-1252").decode(buf)}
      prever(txt);renderView();if(UI.imp&&UI.imp.plano)announce(UI.imp.plano.length+" datas na prévia");
    });
  }],
  [t=>t.id==="impAulas",(t)=>{if(UI.imp)UI.imp.subst=t.checked}],
];
