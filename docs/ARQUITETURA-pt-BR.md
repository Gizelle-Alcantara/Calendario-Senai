# Arquitetura do código

O aplicativo deixou de ser um arquivo único (`src/tpl.html`, ~1.200 linhas) e virou **módulos ES nativos**: o navegador carrega cada arquivo diretamente, sem bundler. O `scripts/build.js` só copia `src/` para `public/` e gera `public/js/data.js` (dados iniciais da planilha e logotipo).

```
src/
  index.html            documento completo (idioma, viewport, pontos de referência, link de pular)
  css/                  tokens (cores, tema claro/escuro) · base · components · calendar · overlay · a11y
  shim.js               emula window.claude/PLAN: banco via /api, login, downloads (carregado antes dos módulos)
  js/
    main.js             inicialização, leitura do banco (polling de 5 s) e escolha do modo
    config.js           constantes (dias, meses, turnos, abas)
    util.js             datas, escape de HTML, horas
    state.js            estado compartilhado (G, T, CUR, S, MODE, UI) e setState()
    store.js            salvamento (banco + cópia local), status, conversão de/para documentos
    rules.js            regras puras: carga, encontros, choques, bloqueios, reposição, faltas
    importar.js         leitura de CSV/ICS de feriados, prévia e aplicação (regras puras)
    semestre.js         cópia de turma para o semestre seguinte (regras puras)
    historico.js        desfazer/refazer (instantâneos em store.js)
    ui.js               toast, cabeçalho/abas, helpers de interface
    a11y.js             foco, diálogos, anúncios, semântica aplicada após cada renderização
    events.js           delegação de eventos (clique/change/input/teclado) → registros por tela
    render.js           escolhe a tela conforme o modo e a aba
    theme.js            tema claro/escuro/automático
    views/*.js          uma tela por arquivo (feriados.js = importação; semana.js = visão de semana); cada uma exporta `actions` (data-act) e `changes`
    vendor/qrcode.js    biblioteca de QR Code (antes vinha de um CDN)
```

## Como as peças conversam
- **Estado:** módulos importam `G, T, CUR, S, MODE` como ligações vivas; para **alterar**, usam `setState({...})` (importações ES são somente leitura).
- **Telas:** funções que devolvem HTML (template literals). Depois de cada renderização, `a11y.enhance()` completa nomes de campos, tabelas e barras de progresso e devolve o foco ao elemento em que o usuário estava.
- **Eventos:** botões usam `data-act="nome"`. Cada tela registra suas ações em `actions` e suas reações a campos em `changes`; o `events.js` junta tudo. Para criar uma ação nova, escreva-a no arquivo da tela e use `data-act` no HTML.
- **Regras puras:** `rules.js` não mexe no DOM, por isso roda no Node e é coberto por `tests/rules.test.mjs`.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run build` | gera `public/` |
| `npm test` | gera `public/` e roda os testes (API, regras, importação, cópia de semestre, desfazer, semana) |
| `npm run lint` | ESLint nos módulos (`no-undef` garante que nenhum import ficou faltando) |
| `npm run test:smoke` | percorre as telas num Chromium, lança aula, cadastra aluno e confere o console |
| `npm run test:a11y` | axe-core + testes de teclado/foco (precisa de `npm install` e de um Chromium; defina `CHROMIUM=/caminho` se necessário) |

## Observação sobre o `hashchange`
Trocar o `#` do endereço (aluno/docente/login) recarrega a página de propósito; por isso os testes abrem cada endereço numa página nova.
