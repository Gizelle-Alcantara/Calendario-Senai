// Gera public/ a partir de src/: HTML, CSS, módulos JS, dados iniciais e arquivos estáticos.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => join(ROOT, "src", p), out = (p) => join(ROOT, "public", p);
const copyDir = (from, to) => {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) {
    const a = join(from, f), b = join(to, f);
    statSync(a).isDirectory() ? copyDir(a, b) : copyFileSync(a, b);
  }
};
rmSync(out(""), { recursive: true, force: true });
mkdirSync(out(""), { recursive: true });
copyFileSync(src("index.html"), out("index.html"));
copyFileSync(src("shim.js"), out("shim.js"));
copyDir(src("css"), out("css"));
copyDir(src("js"), out("js"));
copyDir(src("static"), out(""));
// dados iniciais (planilha original) e logotipo viram um módulo
const seed = readFileSync(src("seed.json"), "utf8").trim(), logo = readFileSync(src("logo.b64"), "utf8").trim();
writeFileSync(out("js/data.js"), `export const SEED=${seed};\nexport const LOGO=${JSON.stringify(logo)};\n`);
console.log("public/ gerado");
