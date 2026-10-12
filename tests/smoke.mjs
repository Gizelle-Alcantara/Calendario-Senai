// Fumaça funcional: percorre as telas, edita, salva e confere que não há erros no console.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path"; import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
const PORT = "3133", BASE = `http://localhost:${PORT}`, PW = "smoke";
const srv = spawn("node", ["server.js"], { env: { ...process.env, PORT, ADMIN_PASSWORD: PW, TURSO_DATABASE_URL: "file:" + join(mkdtempSync(join(tmpdir(), "sm-")), "t.db") }, stdio: "ignore" });
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const c = await b.newContext({ serviceWorkers: "block", locale: "pt-BR" });
await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const p = await c.newPage(), erros = [], res = [];
p.on("pageerror", (e) => erros.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED/.test(m.text())) erros.push("console: " + m.text()); });
const t = (n, v) => { res.push([n, !!v]); if (!v) console.log("FALHA", n); };
await p.goto(BASE + "/#login"); await p.fill("input[type=password]", PW); await p.keyboard.press("Enter");
await p.waitForSelector("#tabs button"); await p.waitForTimeout(500);
const abas = await p.$$eval("#tabs button", (x) => x.map((y) => y.textContent.trim()));
for (const a of abas) { await p.click(`#tabs button:has-text("${a}")`); await p.waitForTimeout(250); t("aba " + a + " renderiza", (await p.innerText("#view")).length > 10); }
// calendário: lança aula e salva
await p.click('#tabs button:has-text("Calendário")');
const dia = p.locator(".cal .day:not(.blank)").nth(14); await dia.click(); await p.waitForSelector(".modal");
await p.click('[data-act=msave]'); await p.waitForTimeout(1200);
t("status salvo", /salvos/i.test(await p.innerText("#stat")));
// alunos + chamada
await p.click('#tabs button:has-text("Alunos")'); await p.fill("#alLista", "Maria Teste;123;maria@ex.com;7599999999"); await p.click("[data-act=alunoadd]"); await p.waitForTimeout(300);
const tem = async () => (await p.$$eval("#view input", (i) => i.map((x) => x.value))).includes("Maria Teste");
t("aluno adicionado", await tem());
await p.click('#tabs button:has-text("Chamada")'); await p.waitForTimeout(300);
t("chamada lista dias", (await p.innerText("#view")).length > 50);
// persistência após recarregar
await p.reload(); await p.waitForSelector("#tabs button"); await p.click('#tabs button:has-text("Alunos")');
await p.waitForTimeout(300);
t("aluno persiste no banco", await tem());
await b.close(); srv.kill();
console.log(`${res.filter((r) => r[1]).length}/${res.length} ok; erros no console: ${erros.length}`); erros.forEach((e) => console.log(" ", e));
process.exit(erros.length || res.some((r) => !r[1]) ? 1 : 0);
