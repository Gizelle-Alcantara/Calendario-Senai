// Regras do planejador (módulos puros do navegador, testados no Node). Rode: npm test
import test from "node:test";
import assert from "node:assert/strict";
const R = await import("../public/js/rules.js");
const U = await import("../public/js/util.js");
const St = await import("../public/js/state.js");
const Store = await import("../public/js/store.js");
const { setState, UI } = St;

const FAR = "2099-03-02"; // datas no futuro: independem do relógio
const nextDow = (w, from = FAR) => { let d = from; while (U.dow(d) !== w) d = U.addD(d, 1); return d; };
const turma = (over = {}) => ({
  cfg: { turma: "A", curso: "Curso", turno: "Noturno (Técnico)", modulo: "I", coord: "", email: "", local: "", inicio: "2099-03-01", termino: "2099-06-30", aulasDia: 4, destinatarios: "", ...over.cfg },
  ucs: over.ucs || [{ nome: "Lógica", sigla: "LPR", ch: 40, docente: "Ana", sala: "S1" }, { nome: "Banco", sigla: "BD", ch: 60, docente: "Bia", sala: "S2" }],
  days: over.days || {}, envios: [], alunos: over.alunos || [], reg: over.reg || {}, aviso: {},
});
const load = (turmas, docentes = [{ nome: "Ana", semana: [], bloqueios: [] }, { nome: "Bia", semana: [], bloqueios: [] }]) => {
  const T = Object.fromEntries(Object.entries(turmas));
  const id = Object.keys(T)[0];
  setState({ MODE: "planner", G: { docentes, base: "x" }, T, CUR: id });
  St.normalize(); UI.repSab = false;
  return St.S;
};

test("datas: pd, addD, dow, br, toMin, hm", () => {
  assert.equal(U.addD("2026-02-27", 2), "2026-03-01");
  assert.equal(U.addD("2026-12-31", 1), "2027-01-01");
  assert.equal(U.dow("2026-10-10"), 6);
  assert.equal(U.br("2026-10-10"), "10/10/2026");
  assert.equal(U.br("-"), "-");
  assert.equal(U.toMin("18:40"), 1120);
  assert.equal(U.hm(1120), "18:40");
  assert.equal(U.esc('<a href="x">&\'</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
});

test("hora-aula: só o Matutino NEM tem 50 min", () => {
  assert.equal(R.horaOf({ turno: "Matutino NEM" }), 50);
  for (const t of ["Matutino", "Vespertino", "Vespertino NEM", "Noturno (Técnico)", "Diurno"]) assert.equal(R.horaOf({ turno: t }), 60, t);
});

test("horários: noturno 4 aulas a partir de 18:40; Matutino NEM 6 aulas com intervalo de 20 min", () => {
  const n = R.horariosOf({ turno: "Noturno (Técnico)" });
  assert.equal(n.length, 4); assert.equal(U.hm(n[0].i), "18:40"); assert.equal(U.hm(n[3].f), "22:40");
  const m = R.horariosOf({ turno: "Matutino NEM" });
  assert.equal(m.length, 6); assert.equal(U.hm(m[0].i), "07:00");
  assert.equal(m[3].i - m[2].f, 20);
  assert.deepEqual(R.spanOf({ turno: "Noturno (Técnico)" }).map(U.hm), ["18:40", "22:40"]);
});

test("encontros: P = ceil(Q / aulasDia), Q usa 1,2 só quando a hora-aula é de 50 min; faltas R = 25% de Q", () => {
  const S = load({ A: turma({ ucs: [{ nome: "X", sigla: "X", ch: 40, docente: "Ana", sala: "" }, { nome: "Y", sigla: "Y", ch: 30, docente: "Ana", sala: "" }] }) });
  let [x, y] = R.calcOf(S).rows;
  assert.deepEqual([x.Q, x.P, x.R], [40, 10, 10]);
  assert.deepEqual([y.Q, y.P, y.R], [30, 8, 7]);
  const N = load({ A: turma({ cfg: { turno: "Matutino NEM", aulasDia: 3 }, ucs: [{ nome: "X", sigla: "X", ch: 40, docente: "", sala: "" }] }) });
  [x] = R.calcOf(N).rows;
  assert.deepEqual([x.Q, x.P, x.R], [48, 16, 12]);
});

test("contagem: numera os encontros em ordem de data e calcula o que falta", () => {
  const d1 = nextDow(1), d2 = U.addD(d1, 1), d3 = U.addD(d1, 2);
  const S = load({ A: turma({ days: { [d3]: { s: ["LPR"] }, [d1]: { s: ["LPR"] }, [d2]: { s: ["BD"] } } }) });
  const C = R.calcOf(S);
  assert.deepEqual(C.enc[d1], [1]); assert.deepEqual(C.enc[d3], [2]); assert.deepEqual(C.enc[d2], [1]);
  const lpr = C.rows[0]; assert.equal(lpr.aloc, 2); assert.equal(lpr.faltam, 8); assert.equal(lpr.ini, d1); assert.equal(lpr.fim, d3);
  assert.equal(lpr.status, "PLANEJADA");
});

test("aula não dada não conta como encontro (aparece como ×) e sem reposição entra nos avisos", () => {
  const d1 = nextDow(1), d2 = U.addD(d1, 7);
  const S = load({ A: turma({ days: { [d1]: { s: ["LPR"] }, [d2]: { s: ["LPR"] } }, reg: { [d1]: { dado: "nao", motivo: "Docente ausente" } } }) });
  const C = R.calcOf(S);
  assert.deepEqual(C.enc[d1], ["×"]); assert.deepEqual(C.enc[d2], [1]);
  assert.equal(C.rows[0].aloc, 1); assert.equal(C.rows[0].nao, 1); assert.equal(C.rows[0].semRep, 1);
  assert.ok(R.avisos(C).some(([k, m]) => k === "warn" && /sem reposição/.test(m)));
});

test("bloqueio do docente por dia da semana e por período", () => {
  const seg = nextDow(1), sex = nextDow(5);
  const S = load({ A: turma() }, [{ nome: "Ana", semana: [5], bloqueios: [{ de: seg, ate: U.addD(seg, 2), motivo: "férias" }] }, { nome: "Bia", semana: [], bloqueios: [] }]);
  assert.match(R.blockMsg(sex, "LPR"), /Ana não leciona às sextas-feiras/);
  assert.match(R.blockMsg(U.addD(seg, 1), "LPR"), /Ana está indisponível \(férias\)/);
  assert.equal(R.blockMsg(U.addD(seg, 3), "LPR"), "");
  assert.equal(R.blockMsg(sex, "BD"), "", "outro docente não é afetado");
});

test("choque entre turmas: mesmo docente ou mesma sala no mesmo dia e horário", () => {
  const d = nextDow(2);
  const A = turma({ days: {} });
  const B = turma({ cfg: { turma: "B" }, days: { [d]: { s: ["LPR"] } } }); // Ana, sala S1, noturno
  const S = load({ A, B });
  assert.match(R.blockMsg(d, "LPR"), /Ana já leciona LPR na turma B/);
  // outro docente na mesma sala
  A.ucs[1].sala = "s1 "; // BD (Bia) na sala S1, comparação sem diferenciar maiúsculas/espaços
  assert.match(R.blockMsg(d, "BD"), /sala s1 já está ocupada por LPR \(turma B\)/);
  // outro dia: sem choque
  assert.equal(R.blockMsg(U.addD(d, 1), "LPR"), "");
});

test("turnos que não se sobrepõem não geram choque; aula não dada na outra turma libera o horário", () => {
  const d = nextDow(2);
  const A = turma();
  const B = turma({ cfg: { turma: "B", turno: "Matutino" }, days: { [d]: { s: ["LPR"] } } });
  load({ A, B });
  assert.equal(R.blockMsg(d, "LPR"), "", "manhã x noite");
  const C = turma({ cfg: { turma: "C" }, days: { [d]: { s: ["LPR"] } }, reg: { [d]: { dado: "nao" } } });
  load({ A, C });
  assert.equal(R.blockMsg(d, "LPR"), "", "aula cancelada não ocupa o docente");
});

test("confDay e countConf: duas disciplinas no mesmo dia e bloqueios", () => {
  const d = nextDow(3);
  const S = load({ A: turma({ days: { [d]: { s: ["LPR", "BD"] } } }) });
  assert.match(R.confDay(d)[0], /mais de uma disciplina/);
  assert.equal(R.countConf(), 1);
});

test("avisos: aula em fim de semana, fora do período e em dia sem aula", () => {
  const sab = nextDow(6), fora = "2099-01-05", fer = U.addD(nextDow(2), 7);
  const S = load({ A: turma({ days: { [sab]: { s: ["LPR"] }, [fora]: { s: ["BD"] }, [fer]: { s: ["LPR"], t: "feriado", h: "X" } } }) });
  const msgs = R.avisos(R.calcOf(S)).map((x) => x[1]).join("\n");
  assert.match(msgs, /Aula em sábado/); assert.match(msgs, /fora do período/); assert.match(msgs, /dia sem aula/);
});

test("reposição: sugere só dias livres (sem domingo, sábado opcional, feriado, ocupado ou bloqueado)", () => {
  const seg = nextDow(1);
  const lot = { [seg]: { s: ["LPR"] }, [U.addD(seg, 1)]: { s: ["BD"] }, [U.addD(seg, 2)]: { s: [], t: "feriado", h: "F" } };
  const S = load({ A: turma({ days: lot, reg: { [seg]: { dado: "nao" } } }) }, [{ nome: "Ana", semana: [4], bloqueios: [] }, { nome: "Bia", semana: [], bloqueios: [] }]);
  let c = R.repCands(seg, 10).map((x) => x.iso);
  assert.ok(!c.includes(U.addD(seg, 1)), "ocupado"); assert.ok(!c.includes(U.addD(seg, 2)), "feriado");
  assert.ok(c.every((i) => U.dow(i) !== 0 && U.dow(i) !== 6), "sem fim de semana");
  assert.ok(c.every((i) => U.dow(i) !== 4), "Ana não leciona às quintas");
  UI.repSab = true;
  c = R.repCands(seg, 20).map((x) => x.iso);
  assert.ok(c.some((i) => U.dow(i) === 6), "sábado liberado quando marcado");
  UI.repSab = false;
});

test("reposição: applyRep só vale para aula não dada e troca a data anterior", () => {
  const seg = nextDow(1);
  const S = load({ A: turma({ days: { [seg]: { s: ["LPR"] } }, reg: { [seg]: { dado: "sim" } } }) });
  assert.equal(R.applyRep(seg, U.addD(seg, 7)), false, "aula dada não repõe");
  S.reg[seg] = { dado: "nao" };
  const a = U.addD(seg, 7), b = U.addD(seg, 14);
  assert.equal(R.applyRep(seg, a), true);
  assert.deepEqual(S.days[a], { s: ["LPR"], t: "nota", h: "Reposição de " + U.br(seg) });
  assert.equal(S.reg[seg].rep, a);
  R.applyRep(seg, b);
  assert.equal(S.days[a], undefined, "reposição antiga removida");
  assert.ok(S.days[b]);
  const C = R.calcOf(S); assert.equal(C.rows[0].semRep, 0);
});

test("faltas: soma por aluno e disciplina só nas aulas dadas; semáforo 75% / limite", () => {
  const d1 = nextDow(1), d2 = U.addD(d1, 7), d3 = U.addD(d1, 14);
  const S = load({ A: turma({ days: { [d1]: { s: ["LPR"] }, [d2]: { s: ["LPR"] }, [d3]: { s: ["LPR"] } },
    alunos: [{ id: "a1", nome: "A" }, { id: "a2", nome: "B" }],
    reg: { [d1]: { dado: "sim", faltas: { a1: 4, a2: 0 } }, [d2]: { dado: "sim", faltas: { a1: 2 } }, [d3]: { dado: "nao", faltas: { a1: 4 } } } }) });
  const m = R.faltasMap();
  assert.equal(m.a1.LPR, 6); assert.equal(m.a2.LPR || 0, 0);
  assert.equal(R.stFalta(6, 10), "ok"); assert.equal(R.stFalta(8, 10), "warn"); assert.equal(R.stFalta(10, 10), "warn"); assert.equal(R.stFalta(11, 10), "bad");
  assert.equal(R.stFalta(0, 0), "ok"); assert.equal(R.stFalta(1, 0), "warn");
});

test("normalize: cria docentes citados nas disciplinas e preenche campos que faltam", () => {
  const T = { A: turma({ ucs: [{ nome: "N", sigla: "N", ch: 10, docente: "Carla", sala: "" }] }) };
  delete T.A.alunos; delete T.A.reg; delete T.A.aviso;
  setState({ MODE: "planner", G: { docentes: [] }, T, CUR: "A" }); St.normalize();
  assert.ok(St.G.docentes.some((d) => d.nome === "Carla" && Array.isArray(d.semana) && Array.isArray(d.bloqueios)));
  assert.deepEqual(St.S.alunos, []); assert.deepEqual(St.S.reg, {}); assert.equal(St.S.aviso.canal, "email");
  assert.equal(St.S.docentes, St.G.docentes, "turma compartilha a lista global de docentes");
});

test("fromDocs: lê o formato do banco e migra o antigo sem docentes globais", () => {
  const novo = Store.fromDocs({ geral: { docentes: [{ nome: "Z", semana: [], bloqueios: [] }], base: "b" }, "turma-X": { state: turma() } });
  assert.equal(novo.legacy, false); assert.equal(novo.g.docentes[0].nome, "Z"); assert.ok(novo.t.X);
  const velho = Store.fromDocs({ "turma-Y": { state: { ...turma(), docentes: [{ nome: "Q", semana: [], bloqueios: [] }] } } });
  assert.equal(velho.legacy, true); assert.equal(velho.g.docentes[0].nome, "Q"); assert.equal(velho.t.Y.docentes, undefined);
});
