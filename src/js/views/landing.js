export function renderLanding(){
  document.getElementById("tabs").innerHTML="";
  document.getElementById("hdr").innerHTML='<h1>Calendário acadêmico</h1><span class="meta">Escolha como você quer acompanhar as aulas.</span>';
  document.getElementById("view").innerHTML=`<div class="grid2"><a class="card" href="#aluno"><h2>Sou aluno</h2><p class="muted" style="margin-bottom:0">Próximas aulas, limite de faltas e calendário da sua turma.</p></a>
    <a class="card" href="#docente"><h2>Sou docente</h2><p class="muted" style="margin-bottom:0">Suas aulas em todas as turmas, em um calendário só.</p></a></div>
    <p class="small muted">A edição do calendário é restrita à coordenação. <a href="#login">Acesso do coordenador</a></p>`;
}
