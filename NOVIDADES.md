# Novidades desta versão

## Segurança e trabalho em equipe
- **Contas por coordenador.** Aba *Acesso*: a senha mestre (`ADMIN_PASSWORD`) cria contas com usuário e senha (mín. 8 caracteres). Cada pessoa entra em `/#login` com o próprio usuário. Só a senha mestre cria, troca senha e remove contas.
- **Histórico e desfazer.** Cada gravação guarda uma versão (últimas 60 por turma), com data e autor. Aba *Acesso → Histórico → Restaurar* volta a turma ou a lista de docentes àquele ponto. Turmas excluídas também ficam no histórico.
- **Edição simultânea.** Se duas pessoas editam a mesma turma ao mesmo tempo, a segunda gravação é recusada, a versão mais recente é carregada e aparece um aviso. Ninguém sobrescreve o trabalho do outro sem perceber.

## Regras do calendário
- **Choque de sala/laboratório.** Duas turmas não ocupam a mesma sala no mesmo dia em horários que se sobrepõem (campo *Sala/Lab.* em Disciplinas).
- **Código da turma.** Ao mudar o código na aba Turma, o identificador interno e os links acompanham (os links antigos dessa turma deixam de valer).

## Para alunos e docentes
- **Agenda assinável.** Aba *Compartilhar*: link `/api?ics=turma-<id>` (e um por docente) para assinar no Google Agenda, Outlook ou iPhone. Atualiza sozinho.
- **App instalável (PWA).** O site pode ser instalado na tela inicial do celular e abre sem internet com os últimos dados vistos.

## Para a coordenação
- **Relatórios.** Andamento por turma, carga por docente em todas as turmas e ocupação por mês (dias livres para reposição).
- **Imprimir / salvar em PDF** na aba Enviar e **backup completo** em arquivo na aba Dados.
- **Testes automáticos** da API: `npm test`.

## Chamada, faltas e reposição (nova rodada)
- **Aba Chamada.** Lista as aulas do calendário e registra cada uma como *dada* ou *não dada* (com motivo). Mostra aulas passadas sem registro, encontros já dados e aulas não dadas sem reposição.
- **Aba Alunos.** Cadastro da turma (cole a lista, com matrícula opcional). Ao registrar uma aula dada, informe a falta de cada aluno (0 a todas as aulas do dia). A tabela soma as faltas por disciplina, compara com o limite de 25% e marca *Atenção* (a partir de 75% do limite) e *Limite excedido*. Exporta a frequência em CSV.
- **Reposição automática.** Aula marcada como não dada deixa de contar como encontro realizado. O sistema sugere datas livres (sem feriado, sem choque de docente, de sala ou de disciplina; sábados opcionais) e o botão *Repor tudo automaticamente* lança a primeira data de cada aula. A reposição aparece no calendário como "Reposição de dd/mm". Mudar o registro depois remove a reposição.
- **Conta de docente.** Na aba Acesso, o tipo *Docente* só pode lançar chamada e alunos. O servidor recusa qualquer outra alteração. O docente vê apenas as abas Chamada, Alunos e Relatórios.
- **Privacidade.** Visitantes (alunos e quem abre os links públicos) não recebem nomes de alunos, faltas nem motivos: só se a aula foi dada e a reposição. Trate a lista de alunos conforme a LGPD da instituição.

## Avisos por e-mail e WhatsApp (nova rodada)
- **Aba Avisos.** Alterações do calendário (diário, 20h), lembrete na véspera de cada aula, aviso imediato e mensagem livre. Canal: e-mail (Resend), WhatsApp (API oficial da Meta) ou ambos; grupos: alunos, docentes e lista extra.
- **Contatos** de alunos (aba Alunos) e docentes (aba Docentes). Visitantes dos links públicos não recebem e-mails, telefones nem a lista de destinatários.
- **Histórico** de envios com falhas registradas; falha mantém as alterações pendentes para a próxima tentativa.
- **Modo simulado** quando as chaves não estão configuradas. Guia completo: `docs/AVISOS-pt-BR.md`.

## Backup agendado (nova rodada)
- **Diário (20h):** cópia completa guardada no banco quando algo mudou (últimas 30 + a primeira de cada mês por 12 meses).
- **Semanal por e-mail:** arquivo anexo aos domingos, com opção de omitir dados de alunos.
- **Aba Dados:** fazer backup agora, baixar e restaurar (com cópia automática "antes de restaurar").
- **Recuperação total:** `scripts/restore-backup.js`. Guia: `docs/BACKUP-pt-BR.md`.

## Aba Alunos removida
- A aba *Alunos* (cadastro e frequência por aluno) saiu da interface. A Chamada segue registrando aula dada/não dada e reposição; faltas por aluno e a opção de avisar alunos deixaram de aparecer. Dados de alunos que já existiam em backups continuam guardados, só não há mais tela para editá-los.

## Código em módulos (nova rodada)
- O arquivo único de ~1.200 linhas virou **módulos ES** (`src/js`, `src/css`), sem bundler: regras puras, estado, salvamento, uma tela por arquivo. Guia: `docs/ARQUITETURA-pt-BR.md`.
- **36 testes** (`npm test`): API e regras do calendário (horários, encontros, choques de docente/sala, bloqueios, reposição, faltas). `npm run lint` e `npm run test:smoke` também disponíveis.
- QR Code agora está **dentro do projeto** (antes dependia de um CDN).

## Acessibilidade (nova rodada)
- Teclado completo, diálogos com foco preso e retorno, setas no calendário, link de pular, avisos para leitor de tela, tabelas e barras nomeadas, alto contraste, 200% de zoom e 360 px sem rolagem lateral.
- **Correção:** o `index.html` publicado não tinha doctype, idioma nem viewport; agora tem.
- Verificação automática com axe-core: `npm run test:a11y` (144/144). Falta testar com leitores de tela reais. Detalhes e limites: `docs/ACESSIBILIDADE-pt-BR.md`.
- Atualizando: o app instalado (PWA) troca de versão sozinho (cache `planejador-v3`); recarregue a página uma vez.
