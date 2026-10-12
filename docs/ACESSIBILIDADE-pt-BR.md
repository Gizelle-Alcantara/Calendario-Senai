# Acessibilidade (meta: WCAG 2.2 nível AA)

## O que foi feito
**Estrutura e idioma**
- Documento HTML5 completo com `lang="pt-BR"`, `viewport` e título que muda conforme a tela e a aba (antes, o `index.html` publicado não tinha doctype, idioma nem viewport).
- Pontos de referência: `header`, `nav` (nome "Seções do planejador"), `main`, um único `h1`.
- Link **"Ir para o conteúdo principal"** como primeiro item de Tab.

**Teclado e foco**
- Tudo se opera sem mouse. Foco sempre visível (contorno de 3 px).
- Diálogos: `role="dialog"`, `aria-modal`, nome pelo título, foco entra no diálogo, **Tab fica preso nele**, **Esc fecha**, o fundo fica inerte e o foco **volta ao botão/dia que abriu**.
- Calendário: setas, Home e End movem o foco entre os dias; cada dia tem nome acessível com data **e** conteúdo (disciplinas, feriado, bloqueio).
- Ao salvar, a tela é redesenhada **sem perder o foco** (inclusive ao sair de um campo com Tab).

**Leitor de tela**
- Avisos ("Salvo", "Copiado", erros) em região `aria-live` permanente.
- Aba atual marcada com `aria-current`; barras de progresso com `role="progressbar"` e valor; tabelas com nome, `scope` e regiões roláveis focáveis.
- Campos dentro de tabelas ganham nome "coluna · linha". Bloqueios e conflitos deixaram de depender só de cor/traço (têm texto).
- Login e diálogos com rótulos e mensagens de erro anunciadas.

**Visual**
- Contraste dos temas claro e escuro conferido pelo axe; modo de **alto contraste do Windows** (`forced-colors`); `prefers-reduced-motion`.
- Alvos de toque ≥ 24 px (WCAG 2.5.8); sem rolagem horizontal em 360 px; texto a 200% e espaçamento ampliado sem perda.

## Como foi verificado
`npm run test:a11y` roda o axe-core (regras WCAG 2.0/2.1/2.2 A e AA + boas práticas) em **todas as abas × claro/escuro × 1280 px/360 px**, nos diálogos, nas telas públicas (escolha, aluno, docente), no login e com espaçamento de texto ampliado, mais testes de teclado e foco. Resultado nesta versão: **144/144 verificações**. Foi feito também um controle negativo (erros injetados de propósito são detectados).

## Limites — leia
- Ferramentas automáticas encontram só parte dos problemas de acessibilidade. **Não foi feito teste com leitores de tela reais** (NVDA, JAWS, VoiceOver, TalkBack) nem com usuários com deficiência. Recomenda-se uma rodada de teste assim antes de declarar conformidade.
- Os arquivos baixados (calendário em HTML para envio/impressão, CSV, ICS) não foram auditados como documentos acessíveis.
- As fontes vêm do Google Fonts; sem internet, o navegador usa fontes do sistema.
