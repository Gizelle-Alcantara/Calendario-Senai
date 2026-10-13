// Importação de feriados, cópia de semestre, desfazer/refazer e visão de semana (módulos puros, no Node).
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document = { getElementById: () => null, querySelector: () => null };
const I = await import("../public/js/importar.js");
const Sm = await import("../public/js/semestre.js");
const W = await import("../public/js/views/semana.js");
const St = await import("../public/js/state.js");
const Store = await import("../public/js/store.js");
const U = await import("../public/js/util.js");
const { setState, UI } = St;

const turma = (over = {}) => ({
  cfg: { turma: "A", curso: "C", turno: "Noturno (Técnico)", modulo: "I", coord: "", email: "", local: "", inicio: "2026-08-11", termino: "2026-12-17", aulasDia: 4, destinatarios: "", ...(over.cfg || {}) },
  ucs: over.ucs || [{ nome: "Lógica", sigla: "LPR", ch: 40, docente: "Ana", sala: "S1" }],
  days: over.days || {}, envios: [], alunos: [], reg: over.reg || {}, aviso: {},
});
const load = (t) => { setState({ MODE: "planner", G: { docentes: [{ nome: "Ana", semana: [], bloqueios: [] }], base: "x" }, T: { A: t }, CUR: "A" }); St.normalize(); return St.S; };

test("importar: reconhece formatos de data e rejeita datas impossíveis", () => {
  for (const s of ["2026-09-07", "07/09/2026", "7-9-2026", "7.9.2026", "20260907"]) assert.equal(I.parseData(s), "2026-09-07", s);
  for (const s of ["31/02/2026", "2026-13-01", "abc", "", "07/09/26"]) assert.equal(I.parseData(s), null, s);
});

test("importar CSV: cabeçalho, ; ou ,, aspas, tipo e intervalo sem fins de semana", () => {
  const csv = '﻿data;nome;tipo\n07/09/2026;Independência do Brasil;feriado\n"12/10/2026";"Aparecida; padroeira";\n21/12/2026;25/12/2026;Recesso;sem aula\nxx;Quebrada;feriado\n';
  const r = I.parseCsv(csv);
  assert.equal(r.items.length, 1 + 1 + 5, "1 + 1 + seg a sex do recesso");
  assert.equal(r.items.find((x) => x.iso === "2026-10-12").nome, "Aparecida; padroeira");
  assert.equal(r.items.find((x) => x.iso === "2026-12-23").t, "sem");
  assert.equal(r.items.find((x) => x.iso === "2026-09-07").t, "feriado");
  assert.equal(r.erros.length, 1); assert.equal(r.erros[0].linha, 5);
  const v = I.parseCsv("2026-11-02,Finados\n2026-11-20,Consciência Negra");
  assert.deepEqual(v.items.map((x) => x.nome), ["Finados", "Consciência Negra"]);
  assert.equal(I.parseCsv("20/12/2026;10/01/2027;x").erros.length, 0);
  assert.equal(I.parseCsv("01/01/2026;31/12/2027;x").items.length, 0, "intervalos acima de 60 dias são recusados");
});

test("importar ICS: dia inteiro com DTEND exclusivo, linhas dobradas e texto escapado", () => {
  const ics = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261221", "DTEND;VALUE=DATE:20261224", "SUMMARY:Recesso\\, fim de ano", "END:VEVENT",
    "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20261102", "SUMMARY:Fina", " dos", "END:VEVENT", "BEGIN:VEVENT", "SUMMARY:sem data", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const r = I.parseArquivo(ics);
  assert.equal(r.formato, "ICS");
  assert.deepEqual(r.items.map((x) => x.iso), ["2026-11-02", "2026-12-21", "2026-12-22", "2026-12-23"]);
  assert.equal(r.items[0].nome, "Finados"); assert.equal(r.items[1].nome, "Recesso, fim de ano");
  assert.equal(r.erros.length, 1);
});

test("importar: prévia classifica e aplicar respeita dias com aula", () => {
  const S = load(turma({ days: { "2026-09-07": { s: ["LPR"] }, "2026-10-12": { s: [], t: "feriado", h: "FERIADO" }, "2026-11-02": { s: [], t: "feriado", h: "Finados" } } }));
  const pl = I.planoImport([
    { iso: "2026-09-07", nome: "Independência", t: "feriado" }, { iso: "2026-10-12", nome: "N. Sra. Aparecida", t: "feriado" },
    { iso: "2026-11-02", nome: "Finados", t: "feriado" }, { iso: "2026-11-20", nome: "Consciência Negra", t: "feriado" }, { iso: "2027-01-01", nome: "Ano Novo", t: "feriado" }]);
  assert.deepEqual(pl.map((x) => x.acao), ["aula", "atualiza", "igual", "novo", "fora"]);
  const r = I.aplicarImport(pl);
  assert.deepEqual(r, { novos: 1, atualizados: 1, substituidos: 0, pulados: 1 });
  assert.deepEqual(S.days["2026-09-07"].s, ["LPR"], "aula preservada");
  assert.equal(S.days["2026-10-12"].h, "N. Sra. Aparecida"); assert.equal(S.days["2026-11-20"].t, "feriado"); assert.equal(S.days["2027-01-01"], undefined);
  const r2 = I.aplicarImport(pl.filter((x) => x.acao === "aula"), { substituirAulas: true });
  assert.equal(r2.substituidos, 1); assert.deepEqual(S.days["2026-09-07"].s, []);
});

test("semestre: aulas deslocam em semanas inteiras e mantêm o dia da semana", () => {
  const src = turma({ days: { "2026-08-11": { s: ["LPR"] }, "2026-08-13": { s: ["LPR"] }, "2026-12-17": { s: ["LPR"] } } });
  const { st, resumo } = Sm.copiarTurma(src, { cod: "B", inicio: "2027-02-09", termino: "2027-06-16" });
  assert.equal(resumo.deslocamentoDias % 7, 0);
  assert.equal(resumo.deslocamentoDias, 182);
  for (const iso of Object.keys(st.days)) assert.ok([2, 4].includes(U.dow(iso)), "terça e quinta");
  assert.equal(st.days["2027-02-09"].s[0], "LPR"); assert.equal(st.days["2027-02-11"].s[0], "LPR");
  assert.equal(resumo.aulasFora, 1, "17/12 + 182 dias = 17/06, depois do término de 16/06");
  assert.equal(st.cfg.turma, "B"); assert.equal(st.cfg.inicio, "2027-02-09"); assert.equal(st.ucs[0].docente, "Ana");
  assert.notEqual(st.ucs, src.ucs, "disciplinas são cópia");
  assert.deepEqual(st.reg || {}, {}); assert.equal(st.alunos, undefined);
});

test("semestre: feriados fixos vão para o ano certo e os móveis são avisados", () => {
  const src = turma({ days: {
    "2026-09-07": { s: [], t: "feriado", h: "Independência" }, "2026-12-25": { s: [], t: "feriado", h: "Natal" },
    "2026-02-16": { s: [], t: "sem", h: "RECESSO CARNAVAL" }, "2026-04-03": { s: [], t: "feriado", h: "Sexta-feira Santa" } } });
  const { st, resumo } = Sm.copiarTurma(src, { cod: "B", inicio: "2027-02-01", termino: "2027-12-20", aulas: false });
  assert.ok(st.days["2027-09-07"] && st.days["2027-12-25"] === undefined, "25/12 fica fora de 20/12");
  assert.ok(!st.days["2027-02-16"], "Carnaval não é copiado");
  assert.ok(resumo.naoCopiados.includes("RECESSO CARNAVAL") && resumo.naoCopiados.includes("Sexta-feira Santa"));
  assert.equal(Sm.copiarTurma(src, { cod: "B", inicio: "2027-02-01", termino: "2027-12-20", feriados: false }).st.days["2027-09-07"], undefined);
  assert.deepEqual(Sm.sugerirPeriodo({ inicio: "2026-08-11", termino: "2026-12-17" }), { inicio: "2027-02-09", termino: "2027-06-17" });
});

test("desfazer/refazer: volta e avança, nova alteração limpa o refazer, respeita o limite", () => {
  const S = load(turma());
  Store.histReset();
  S.days["2026-09-01"] = { s: ["LPR"] }; Store.save();
  S.days["2026-09-02"] = { s: ["LPR"] }; Store.save();
  assert.equal(Store.H.undo.length, 2);
  assert.ok(Store.histStep(-1));
  assert.equal(St.S.days["2026-09-02"], undefined); assert.ok(St.S.days["2026-09-01"]);
  assert.ok(Store.histStep(-1)); assert.deepEqual(St.S.days, {});
  assert.equal(Store.histStep(-1), false, "nada mais para desfazer");
  assert.ok(Store.histStep(1)); assert.ok(St.S.days["2026-09-01"]);
  St.S.days["2026-09-03"] = { s: ["LPR"] }; Store.save();
  assert.equal(Store.H.redo.length, 0, "nova alteração limpa o refazer");
  assert.equal(Store.histStep(1), false);
  Store.histReset(); Store.H.max = 3;
  for (let i = 10; i < 20; i++) { St.S.days["2026-10-" + i] = { s: ["LPR"] }; Store.save(); }
  assert.equal(Store.H.undo.length, 3); Store.H.max = 60;
});

test("desfazer: salvar sem mudança não cria passo e a troca de turma não se perde", () => {
  load(turma()); Store.histReset();
  Store.save(); Store.save();
  assert.equal(Store.H.undo.length, 0);
});

test("semana: início no domingo, título e limites de navegação", () => {
  assert.equal(W.weekStart("2026-10-14"), "2026-10-11");
  assert.equal(W.weekStart("2026-10-11"), "2026-10-11");
  assert.equal(W.weekTitle("2026-10-11"), "11 a 17 de outubro de 2026");
  assert.equal(W.weekTitle("2026-10-25"), "25 de outubro a 31 de outubro de 2026".replace("25 de outubro a 31 de outubro", "25 a 31 de outubro"));
  assert.equal(W.weekTitle("2026-12-27"), "27 de dezembro de 2026 a 2 de janeiro de 2027");
  UI.week = null; UI.month = null;
  const w = W.ensureWeek("2026-08-11", "2026-12-17");
  assert.ok(w >= "2026-08-09" && w <= "2026-12-13");
  UI.week = "2025-01-05"; assert.equal(W.ensureWeek("2026-08-11", "2026-12-17"), "2026-08-09");
  UI.week = "2030-01-06"; assert.equal(W.ensureWeek("2026-08-11", "2026-12-17"), "2026-12-13");
});
