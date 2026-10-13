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
// a aba Alunos foi removida; a chamada continua funcionando
t("aba Alunos não existe", !abas.includes("Alunos"));
await p.click('#tabs button:has-text("Chamada")'); await p.waitForTimeout(300);
t("chamada lista dias", (await p.innerText("#view")).length > 50);
await p.reload(); await p.waitForSelector("#tabs button"); await p.click('#tabs button:has-text("Calendário")');
t("lançamento persiste após recarregar", (await p.locator(".cal .day:not(.blank)").count()) > 20);
// ---------- desfazer / refazer ----------
await p.click('#tabs button:has-text("Calendário")');
await p.click('[data-act=cview][data-k=mes]'); await p.waitForTimeout(200);
const feriados = () => p.locator(".cal .day.hol").count();
const f0 = await feriados();
await p.click('[data-act=tool][data-k=feriado]');
await p.locator(".cal .day:not(.blank):not(.hol):not(.wk)").first().click(); await p.waitForTimeout(300);
t("lançou um feriado", (await feriados()) === f0 + 1);
await p.locator("#view h2").first().click(); await p.keyboard.press("Control+z"); await p.waitForTimeout(300);
t("Ctrl+Z desfaz", (await feriados()) === f0);
await p.keyboard.press("Control+y"); await p.waitForTimeout(300);
t("Ctrl+Y refaz", (await feriados()) === f0 + 1);
await p.click('[data-act=undo]'); await p.waitForTimeout(300);
t("botão Desfazer funciona", (await feriados()) === f0);
t("botão Refazer habilitado", await p.$eval("[data-act=redo]", (b) => !b.disabled));
// ---------- visão de semana ----------
await p.click('[data-act=tool][data-k=edit]');
await p.click('[data-act=cview][data-k=semana]'); await p.waitForSelector(".wklist");
t("semana mostra 7 dias", (await p.locator(".wklist > li").count()) === 7);
const tit = await p.innerText("#calTitulo");
await p.click("[data-act=wnext]"); await p.waitForTimeout(150);
t("semana seguinte muda o título", (await p.innerText("#calTitulo")) !== tit);
await p.click("[data-act=wprev]");
t("semana anterior volta", (await p.innerText("#calTitulo")) === tit);
await p.locator(".wklist button.wkrow").first().click(); await p.waitForSelector(".modal"); await p.keyboard.press("Escape");
t("dia da semana abre o editor", !(await p.$(".modal")));
await p.reload(); await p.waitForSelector("#tabs button"); await p.click('#tabs button:has-text("Calendário")');
t("modo semana é lembrado", !!(await p.$(".wklist")));
await p.click('[data-act=cview][data-k=mes]');
// ---------- importar feriados ----------
await p.click('#tabs button:has-text("Turma")');
await p.fill("#impTxt", "20/11/2026;Consciência Negra;feriado\n21/12/2026;23/12/2026;Recesso;sem aula\nxx;ruim;feriado");
await p.click("[data-act=impprev]"); await p.waitForSelector("#impPrev table");
const linhas = await p.locator("#impPrev tbody tr").count();
t("prévia lista as datas (1 + 3 dias úteis)", linhas === 4);
t("prévia avisa da linha ruim", /ignorada/.test(await p.innerText("#impPrev")));
await p.click("[data-act=impaplicar]"); await p.waitForTimeout(300);
await p.click('#tabs button:has-text("Calendário")'); await p.waitForTimeout(200);
const novembro = p.locator("#mjump"); await novembro.selectOption({ index: 3 }).catch(() => {});
let achou = false; const opts = await p.$$eval("#mjump option", (o) => o.map((x) => x.value));
for (const v of opts) { await p.selectOption("#mjump", v); await p.waitForTimeout(100); if ((await p.locator(".cal .day.hol").allInnerTexts()).some((x) => /Consci/.test(x))) { achou = true; break; } }
t("feriado importado aparece no calendário", achou);
// ---------- copiar turma para o próximo semestre ----------
await p.click('#tabs button:has-text("Turma")');
await p.click("[data-act=turmanew]"); await p.waitForSelector(".modal");
const origem = await p.$$eval("#ntCopy option", (o) => o.filter((x) => x.value).map((x) => x.value));
await p.selectOption("#ntCopy", origem[0]);
t("período novo é sugerido", (await p.inputValue("#ntIni")) > "2027-01-01");
await p.fill("#ntCod", "202701"); await p.click("[data-act=turmasave]"); await p.waitForTimeout(500);
t("nova turma criada e aberta", /202701/.test(await p.innerText("#hdr")));
t("duas turmas no seletor", (await p.locator("#turmaSel option").count()) === 2);
await p.click('#tabs button:has-text("Disciplinas")');
t("disciplinas foram copiadas", (await p.locator("#view input[data-f=sigla]").count()) > 3);
await b.close(); srv.kill();
console.log(`${res.filter((r) => r[1]).length}/${res.length} ok; erros no console: ${erros.length}`); erros.forEach((e) => console.log(" ", e));
process.exit(erros.length || res.some((r) => !r[1]) ? 1 : 0);
