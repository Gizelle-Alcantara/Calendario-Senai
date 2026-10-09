// Rodar: npm test   (usa um banco temporário em arquivo)
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.TURSO_DATABASE_URL = "file:" + join(mkdtempSync(join(tmpdir(), "pl-")), "t.db");
process.env.ADMIN_PASSWORD = "mestre-123";
process.env.SESSION_SECRET = "segredo-de-teste";
const { handle } = await import("../lib/core.js");

const call = (body, cookie) => handle(new Request("http://x/api", { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }));
const get = (qs = "", cookie) => handle(new Request("http://x/api" + qs, { headers: cookie ? { cookie } : {} }));
const login = async (b) => { const r = await call({ op: "login", ...b }); return { r, cookie: (r.headers.get("set-cookie") || "").split(";")[0] }; };

const turma = { state: { cfg: { turma: "T1", curso: "C", turno: "Matutino", aulasDia: 4 }, ucs: [{ sigla: "LOG", nome: "Lógica", ch: 40, docente: "Ana", sala: "Lab 1" }], days: { "2027-03-01": { s: ["LOG"] }, "2027-03-02": { t: "feriado", h: "X" } }, envios: [] } };

test("sem login não grava; senha errada é recusada", async () => {
  assert.equal((await call({ op: "set", id: "geral", data: {} })).status, 401);
  assert.equal((await login({ password: "errada" })).r.status, 401);
});
test("login mestre grava e lê", async () => {
  const { cookie } = await login({ password: "mestre-123" });
  const r = await call({ op: "set", id: "turma-t1", data: turma, base: 0 }, cookie);
  assert.equal((await r.json()).rev, 1);
  const j = await (await get()).json();
  assert.equal(j.admin, false);
  assert.equal(j.docs[0].rev, 1);
});
test("conflito de edição simultânea devolve 409 com a versão atual", async () => {
  const { cookie } = await login({ password: "mestre-123" });
  const a = await (await call({ op: "set", id: "turma-t1", data: { ...turma, x: 1 }, base: 1 }, cookie)).json();
  assert.equal(a.rev, 2);
  const r = await call({ op: "set", id: "turma-t1", data: { ...turma, x: 2 }, base: 1 }, cookie);
  assert.equal(r.status, 409);
  assert.equal((await r.json()).rev, 2);
});
test("histórico lista versões e restaura", async () => {
  const { cookie } = await login({ password: "mestre-123" });
  const h = await (await call({ op: "history" }, cookie)).json();
  assert.ok(h.items.length >= 2);
  const first = h.items[h.items.length - 1];
  assert.equal((await (await call({ op: "restore", hid: first.id }, cookie)).json()).ok, true);
  const j = await (await get()).json();
  assert.equal(j.docs.find((d) => d.id === "turma-t1").data.x, undefined);
});
test("exclusão guarda cópia no histórico", async () => {
  const { cookie } = await login({ password: "mestre-123" });
  await call({ op: "set", id: "turma-del", data: turma, base: 0 }, cookie);
  await call({ op: "delete", id: "turma-del" }, cookie);
  const h = await (await call({ op: "history" }, cookie)).json();
  assert.ok(h.items.some((i) => i.doc === "turma-del" && i.note === "excluída"));
});
test("contas: só a mestre cria; conta própria edita mas não gerencia", async () => {
  const m = await login({ password: "mestre-123" });
  assert.equal((await call({ op: "user_add", login: "maria", nome: "Maria", password: "curta" }, m.cookie)).status, 400);
  assert.equal((await call({ op: "user_add", login: "maria", nome: "Maria", password: "senha-longa-1" }, m.cookie)).status, 200);
  const u = await login({ login: "maria", password: "senha-longa-1" });
  assert.equal(u.r.status, 200);
  assert.equal((await call({ op: "set", id: "geral", data: { docentes: [] }, base: 0 }, u.cookie)).status, 200);
  assert.equal((await call({ op: "users" }, u.cookie)).status, 403);
  assert.equal((await login({ login: "maria", password: "errada-123" })).r.status, 401);
  const info = await (await get("", u.cookie)).json();
  assert.equal(info.user.nome, "Maria");
});
test("agenda .ics da turma e do docente", async () => {
  await (async () => { const { cookie } = await login({ password: "mestre-123" }); await call({ op: "set", id: "geral", data: { docentes: [{ nome: "Ana" }] }, base: 1 }, cookie); })();
  const t = await (await get("?ics=turma-t1")).text();
  assert.match(t, /DTSTART;TZID=America\/Bahia:20270301T073000/);
  assert.match(t, /DTEND;TZID=America\/Bahia:20270301T114300|DTEND;TZID=America\/Bahia:20270301T113000/);
  assert.doesNotMatch(t, /20270302/);
  const d = await (await get("?ics=docente-ana")).text();
  assert.match(d, /SUMMARY:LOG/);
  assert.equal((await get("?ics=turma-nao-existe")).status, 404);
});
