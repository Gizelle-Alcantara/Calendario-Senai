import {captureFocus, enhance, restoreFocus, updateTitle} from "./a11y.js";
import {MODE, UI} from "./state.js";
import {renderHead} from "./ui.js";
import {vAcesso} from "./views/acesso.js";
import {renderAluno} from "./views/aluno.js";
import {vAlunos} from "./views/alunos.js";
import {vAvisos} from "./views/avisos.js";
import {vCal} from "./views/calendario.js";
import {vChamada} from "./views/chamada.js";
import {afterRender, vShare} from "./views/compartilhar.js";
import {vCron} from "./views/cronograma.js";
import {vDados} from "./views/dados.js";
import {vDisc} from "./views/disciplinas.js";
import {renderDocente} from "./views/docente.js";
import {vDoc} from "./views/docentes.js";
import {vEnviar} from "./views/enviar.js";
import {renderLanding} from "./views/landing.js";
import {vPainel} from "./views/painel.js";
import {vRel} from "./views/relatorios.js";
import {vTurma} from "./views/turma.js";
function draw(){
  if(UI.boot){document.getElementById("hdr").innerHTML="<h1>Planejador de Turma</h1>";document.getElementById("tabs").innerHTML="";document.getElementById("view").innerHTML='<p class="muted">Carregando…</p>';return}
  if(MODE==="aluno"){renderAluno();return}
  if(MODE==="docente"){renderDocente();return}
  if(MODE==="landing"){renderLanding();return}
  renderHead();
  const v=document.getElementById("view");
  v.innerHTML={painel:vPainel,calendario:vCal,cronograma:vCron,enviar:vEnviar,compartilhar:vShare,disciplinas:vDisc,docentes:vDoc,turma:vTurma,dados:vDados,relatorios:vRel,acesso:vAcesso,avisos:vAvisos,chamada:vChamada,alunos:vAlunos}[UI.tab]();
  afterRender();
}

export function renderView(){
  const k=captureFocus();
  draw();
  enhance();updateTitle();
  restoreFocus(k);
}
