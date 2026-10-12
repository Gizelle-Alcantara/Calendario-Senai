// Verificação de acessibilidade: axe-core (WCAG 2.0/2.1/2.2 A e AA) + testes de teclado e foco.
// Uso: npm run test:a11y   (precisa de: npm i -D playwright axe-core  e de um Chromium instalado)
// Variáveis: BASE (usa um servidor já no ar), ADMIN_PASSWORD (padrão: teste-a11y), CHROMIUM (caminho do executável)
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const PW = process.env.ADMIN_PASSWORD || "teste-a11y";
const PORT = process.env.PORT || "3111";
const BASE = process.env.BASE || `http://localhost:${PORT}`;
let server = null;
if (!process.env.BASE) {
  const dir = mkdtempSync(join(tmpdir(), "a11y-"));
  server = spawn("node", ["server.js"], { env: { ...process.env, PORT, ADMIN_PASSWORD: PW, TURSO_DATABASE_URL: "file:" + join(dir, "t.db") }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) { try { await fetch(BASE + "/"); break; } catch { await new Promise((r) => setTimeout(r, 200)); } }
}

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const falhas = [], checks = [];
const ok = (nome, cond, det = "") => { checks.push([nome, !!cond]); if (!cond) falhas.push(`FALHA  ${nome} ${det}`); };

async function axe(page, rotulo) {
  await page.evaluate(AXE);
  const r = await page.evaluate((tags) => axe.run(document, { runOnly: { type: "tag", values: tags } }), TAGS);
  for (const v of r.violations) {
    falhas.push(`AXE ${v.impact} · ${v.id} · ${rotulo}\n    ${v.help}\n    ` + v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]).join("\n    "));
  }
  checks.push([`axe ${rotulo}`, r.violations.length === 0]);
}
const settle = (p) => p.waitForTimeout(350);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });

async function ctx(opts = {}) {
  const c = await browser.newContext({ locale: "pt-BR", viewport: { width: 1280, height: 900 }, serviceWorkers: "block", ...opts });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  return c;
}
async function entrar(c) {
  const p = await c.newPage();
  await p.goto(BASE + "/#login");
  await p.waitForSelector("input[type=password]");
  await p.fill("input[type=password]", PW);
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => !location.hash.includes("login") && document.querySelector("#tabs button"), null, { timeout: 15000 });
  await settle(p);
  return p;
}

// ---------- coordenação: todas as abas × tema × largura ----------
for (const [tema, vw] of [["light", 1280], ["dark", 1280], ["light", 360], ["dark", 360]]) {
  const c = await ctx({ viewport: { width: vw, height: 900 }, colorScheme: tema });
  await c.addInitScript((t) => { try { localStorage.setItem("planejador-turma-v1-theme", t); } catch {} }, tema);
  const p = await entrar(c);
  const abas = await p.$$eval("#tabs button", (b) => b.map((x) => x.textContent.trim()));
  ok(`abas existem (${tema} ${vw})`, abas.length >= 10, abas.length);
  for (const nome of abas) {
    await p.click(`#tabs button:has-text("${nome}")`);
    await settle(p);
    if (nome === "Acesso" || nome === "Avisos" || nome === "Dados") await p.waitForTimeout(600);
    await axe(p, `${nome} · ${tema} · ${vw}px`);
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`sem rolagem horizontal da página: ${nome} · ${vw}px`, over <= 1, "excesso " + over + "px");
  }
  if (tema === "light" && vw === 1280) {
    // ---------- diálogos ----------
    await p.click('#tabs button:has-text("Calendário")'); await settle(p);
    const dia = p.locator('.cal .day:not(.blank)').nth(20);
    await dia.focus(); await p.keyboard.press("Enter"); await settle(p);
    ok("diálogo do dia abre com role=dialog e aria-modal", await p.$('.modal[role=dialog][aria-modal=true]'));
    ok("diálogo tem nome acessível", await p.$eval(".modal", (m) => !!(m.getAttribute("aria-labelledby") && document.getElementById(m.getAttribute("aria-labelledby")))).catch(() => false));
    ok("foco entra no diálogo", await p.evaluate(() => !!document.activeElement.closest(".modal")));
    ok("fundo fica inerte", await p.evaluate(() => document.querySelector(".wrap").inert === true));
    await axe(p, "diálogo do dia");
    for (let i = 0; i < 25; i++) await p.keyboard.press("Tab");
    ok("Tab não escapa do diálogo", await p.evaluate(() => !!document.activeElement.closest(".modal")));
    await p.keyboard.press("Escape"); await settle(p);
    ok("Esc fecha o diálogo", !(await p.$(".modal")));
    ok("foco volta ao dia que abriu o diálogo", await p.evaluate(() => !!document.activeElement.closest(".day")));
    // setas no calendário
    const antes = await p.evaluate(() => document.activeElement.dataset.iso);
    await p.keyboard.press("ArrowRight");
    ok("seta direita move o foco para o dia seguinte", await p.evaluate((a) => document.activeElement.dataset.iso && document.activeElement.dataset.iso !== a, antes));
    // nova turma
    await p.click('#tabs button:has-text("Turma")'); await settle(p);
    await p.click('[data-act=turmanew]'); await settle(p);
    await axe(p, "diálogo nova turma");
    await p.keyboard.press("Escape"); await settle(p);
    // abas: estado atual exposto
    ok("aba atual marcada com aria-current", await p.$('#tabs button[aria-current=page]'));
    // aviso de status é anunciado
    ok("região de avisos é um live region", await p.$eval("#toastRoot", (e) => e.getAttribute("aria-live") === "polite"));
    ok("título da página muda com a aba", await p.title().then((t) => /Turma/.test(t)));
    // pular para o conteúdo
    await p.goto(BASE + "/"); await p.waitForSelector("#tabs button"); await settle(p);
    await p.keyboard.press("Tab");
    ok("primeiro Tab vai para o link de pular", await p.evaluate(() => document.activeElement.classList.contains("skip")));
    await p.keyboard.press("Enter");
    ok("o link de pular leva ao conteúdo", await p.evaluate(() => document.activeElement.id === "view"));
    // idioma e pontos de referência
    ok("html lang=pt-BR", await p.evaluate(() => document.documentElement.lang === "pt-BR"));
    ok("há um único main e um único h1", await p.evaluate(() => document.querySelectorAll("main").length === 1 && document.querySelectorAll("h1").length === 1));
    // ampliação de texto 200% (zoom) sem perder conteúdo
    await p.setViewportSize({ width: 640, height: 900 });
    await p.addStyleTag({ content: "html{font-size:200%}" }); await settle(p);
    ok("texto a 200% sem rolagem horizontal", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 1);
    // espaçamento de texto (WCAG 1.4.12)
    await p.addStyleTag({ content: "*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}" }); await settle(p);
    await axe(p, "espaçamento de texto ampliado");
  }
  await c.close();
}

// ---------- telas públicas (sem login) ----------
const cp = await ctx();
const abrir = async (hash) => { const pg = await cp.newPage(); await pg.goto(BASE + "/" + hash); await pg.waitForTimeout(1200); return pg; };
for (const [rot, hash] of [["escolha (landing)", ""], ["aluno", "#aluno-202629"], ["docente (lista)", "#docente"]]) {
  const pg = await abrir(hash);
  const txt = await pg.innerText("#view");
  ok(`tela pública com conteúdo real: ${rot}`, txt.length > 20 && !/ainda não foi publicado/.test(txt), txt.slice(0, 60));
  await axe(pg, "público · " + rot); await pg.close();
}
{
  const pg = await abrir("#docente");
  const hrefs = await pg.$$eval('a[href^="#docente-"]', (a) => a.map((x) => x.getAttribute("href")));
  await pg.close();
  if (hrefs[0]) { const p2 = await abrir(hrefs[0]); await axe(p2, "público · agenda do docente"); await p2.close(); }
}
await cp.close();

// ---------- tela de login ----------
const cl = await ctx();
const pl = await cl.newPage();
await pl.goto(BASE + "/#login"); await pl.waitForSelector("input[type=password]");
await axe(pl, "login");
ok("login: foco no primeiro campo", await pl.evaluate(() => document.activeElement.classList.contains("lg-user")));
await cl.close();

await browser.close();
if (server) server.kill();
const bons = checks.filter((c) => c[1]).length;
console.log(`\n${bons}/${checks.length} verificações passaram`);
if (falhas.length) { console.log("\n" + falhas.join("\n\n")); process.exit(1); }
