// Núcleo da API (padrão Web Request/Response). Usado pela Vercel, Netlify e pelo servidor local.
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "node:crypto";
import { icsFor } from "./ics.js";

let _db, _ready;
// Remoto (Turso) usa o cliente "web" (sem módulos nativos, ideal para Vercel/Netlify); arquivo local usa o cliente completo.
async function init() {
  const url = process.env.TURSO_DATABASE_URL || "file:./data/planejador.db";
  const { createClient } = await import(url.startsWith("file:") ? "@libsql/client" : "@libsql/client/web");
  _db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  const x = (sql) => _db.execute(sql);
  await x("CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)");
  const cols = (await x("PRAGMA table_info(docs)")).rows.map((r) => String(r.name));
  if (!cols.includes("rev")) await x("ALTER TABLE docs ADD COLUMN rev INTEGER NOT NULL DEFAULT 1");
  if (!cols.includes("updated_by")) await x("ALTER TABLE docs ADD COLUMN updated_by TEXT");
  await x("CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY AUTOINCREMENT, doc_id TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL, by TEXT, rev INTEGER, note TEXT)");
  await x("CREATE INDEX IF NOT EXISTS history_doc ON history(doc_id, id)");
  await x("CREATE TABLE IF NOT EXISTS users (login TEXT PRIMARY KEY, nome TEXT NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, created_at TEXT NOT NULL)");
}
const db = () => _db;
async function ready() { if (!_ready) _ready = init(); await _ready; }
const q = (sql, args = []) => db().execute({ sql, args });

/* ---------- sessão ---------- */
const SECRET = () => process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "troque-isto";
const sign = (v) => createHmac("sha256", SECRET()).update(v).digest("hex");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const makeToken = (u) => { const p = b64({ l: u.login, n: u.nome, m: !!u.master, e: Date.now() + 1000 * 60 * 60 * 12 }); return p + "." + sign(p); };
function readToken(t) {
  if (!t) return null;
  const [p, sig] = t.split(".");
  if (!p || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(p));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { const o = JSON.parse(Buffer.from(p, "base64url").toString()); return o.e > Date.now() ? { login: o.l, nome: o.n, master: !!o.m } : null; } catch { return null; }
}
function cookieOf(req, name) {
  const m = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}
const who = (req) => readToken(cookieOf(req, "plan_sess"));
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const hashPw = (pw, salt) => scryptSync(pw, salt, 32).toString("hex");
const normLogin = (s) => String(s || "").trim().toLowerCase();
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

/* ---------- histórico ---------- */
const KEEP = 60;
async function pushHistory(id, data, by, rev, note) {
  await q("INSERT INTO history(doc_id,data,at,by,rev,note) VALUES(?,?,?,?,?,?)", [id, data, new Date().toISOString(), by, rev, note || null]);
  await q("DELETE FROM history WHERE doc_id=? AND id NOT IN (SELECT id FROM history WHERE doc_id=? ORDER BY id DESC LIMIT ?)", [id, id, KEEP]);
}
function labelOf(id, js) {
  try {
    const d = JSON.parse(js);
    if (id === "geral") return `Docentes e configurações (${(d.docentes || []).length} docentes)`;
    const s = d.state || {}, c = s.cfg || {};
    return `Turma ${c.turma || id} · ${Object.keys(s.days || {}).length} dias · ${(s.ucs || []).length} disciplinas`;
  } catch { return id; }
}
async function writeDoc(id, data, by, base, note) {
  const js = JSON.stringify(data);
  const cur = (await q("SELECT data, rev FROM docs WHERE id=?", [id])).rows[0];
  if (cur) {
    if (base !== undefined && Number(base) !== Number(cur.rev)) return { conflict: { rev: Number(cur.rev), data: JSON.parse(String(cur.data)) } };
    if (String(cur.data) === js) return { rev: Number(cur.rev), same: true };
    const rev = Number(cur.rev) + 1;
    await q("UPDATE docs SET data=?, updated_at=?, rev=?, updated_by=? WHERE id=?", [js, new Date().toISOString(), rev, by, id]);
    await pushHistory(id, js, by, rev, note);
    return { rev };
  }
  if (base !== undefined && Number(base) > 0) return { conflict: { rev: 0, data: null, gone: true } };
  await q("INSERT INTO docs(id,data,updated_at,rev,updated_by) VALUES(?,?,?,1,?)", [id, js, new Date().toISOString(), by]);
  await pushHistory(id, js, by, 1, note || "criado");
  return { rev: 1 };
}

export async function handle(req) {
  try {
    await ready();
    const url = new URL(req.url);
    const me = who(req);

    if (req.method === "GET") {
      const ics = url.searchParams.get("ics");
      if (ics) {
        const r = await q("SELECT id, data FROM docs");
        const docs = Object.fromEntries(r.rows.map((x) => [String(x.id), JSON.parse(String(x.data))]));
        const out = icsFor(ics, docs);
        if (!out) return new Response("Agenda não encontrada", { status: 404 });
        return new Response(out.body, { headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "public, max-age=300", "content-disposition": `inline; filename="${out.file}"` } });
      }
      const r = await q("SELECT id, data, rev, updated_at, updated_by FROM docs");
      const docs = r.rows.map((x) => ({ id: String(x.id), data: JSON.parse(String(x.data)), rev: Number(x.rev), by: x.updated_by || null }));
      return json({ admin: !!me, user: me, docs });
    }
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const body = await req.json().catch(() => ({}));

    if (body.op === "login") {
      const login = normLogin(body.login), pw = String(body.password || "");
      let user = null;
      if (login && login !== "admin") {
        const u = (await q("SELECT * FROM users WHERE login=?", [login])).rows[0];
        if (u && eq(hashPw(pw, String(u.salt)), String(u.hash))) user = { login, nome: String(u.nome), master: false };
      } else {
        const mp = process.env.ADMIN_PASSWORD;
        if (!mp) return json({ error: "ADMIN_PASSWORD não configurada no servidor." }, 500);
        if (eq(pw, mp)) user = { login: "admin", nome: "Coordenação (senha mestre)", master: true };
      }
      if (!user) { await new Promise((r) => setTimeout(r, 600)); return json({ error: "Usuário ou senha incorretos." }, 401); }
      const secure = url.protocol === "https:" ? "; Secure" : "";
      return json({ ok: true, user }, 200, { "set-cookie": `plan_sess=${encodeURIComponent(makeToken(user))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure}` });
    }
    if (body.op === "logout") return json({ ok: true }, 200, { "set-cookie": "plan_sess=; Path=/; HttpOnly; Max-Age=0" });

    if (!me) return json({ error: "Somente coordenadores podem alterar os dados." }, 401);
    const by = me.nome || me.login;

    if (body.op === "set") {
      if (!/^[\w.-]{1,80}$/.test(body.id || "") || !body.data || typeof body.data !== "object") return json({ error: "bad_request" }, 400);
      if (JSON.stringify(body.data).length > 2_000_000) return json({ error: "too_large" }, 413);
      const r = await writeDoc(body.id, body.data, by, body.base, body.note);
      if (r.conflict) return json({ error: "conflict", ...r.conflict }, 409);
      return json({ ok: true, rev: r.rev });
    }
    if (body.op === "delete") {
      const id = String(body.id || "");
      const cur = (await q("SELECT data, rev FROM docs WHERE id=?", [id])).rows[0];
      if (cur) { await pushHistory(id, String(cur.data), by, Number(cur.rev), "excluída"); await q("DELETE FROM docs WHERE id=?", [id]); }
      return json({ ok: true });
    }
    if (body.op === "history") {
      const r = await q("SELECT id, doc_id, data, at, by, rev, note FROM history ORDER BY id DESC LIMIT 80");
      return json({ items: r.rows.map((x) => ({ id: Number(x.id), doc: String(x.doc_id), at: String(x.at), by: x.by, rev: Number(x.rev), note: x.note, label: labelOf(String(x.doc_id), String(x.data)) })) });
    }
    if (body.op === "restore") {
      const h = (await q("SELECT doc_id, data FROM history WHERE id=?", [Number(body.hid)])).rows[0];
      if (!h) return json({ error: "Versão não encontrada." }, 404);
      const r = await writeDoc(String(h.doc_id), JSON.parse(String(h.data)), by, undefined, "restaurada");
      return json({ ok: true, rev: r.rev });
    }

    /* contas: só a senha mestre gerencia */
    if (body.op === "users") {
      if (!me.master) return json({ error: "Somente a senha mestre gerencia contas." }, 403);
      const r = await q("SELECT login, nome, created_at FROM users ORDER BY nome");
      return json({ users: r.rows.map((x) => ({ login: String(x.login), nome: String(x.nome), at: String(x.created_at) })) });
    }
    if (body.op === "user_add" || body.op === "user_pw" || body.op === "user_del") {
      if (!me.master) return json({ error: "Somente a senha mestre gerencia contas." }, 403);
      const login = normLogin(body.login);
      if (!/^[a-z0-9._-]{3,40}$/.test(login) || login === "admin") return json({ error: "Login inválido (3 a 40 letras minúsculas, números, ponto, traço ou underline)." }, 400);
      if (body.op === "user_del") { await q("DELETE FROM users WHERE login=?", [login]); return json({ ok: true }); }
      const pw = String(body.password || "");
      if (pw.length < 8) return json({ error: "A senha precisa ter ao menos 8 caracteres." }, 400);
      const salt = randomBytes(16).toString("hex"), hash = hashPw(pw, salt);
      if (body.op === "user_add") {
        const nome = String(body.nome || "").trim().slice(0, 80) || login;
        if ((await q("SELECT 1 FROM users WHERE login=?", [login])).rows.length) return json({ error: "Esse login já existe." }, 409);
        await q("INSERT INTO users(login,nome,salt,hash,created_at) VALUES(?,?,?,?,?)", [login, nome, salt, hash, new Date().toISOString()]);
      } else await q("UPDATE users SET salt=?, hash=? WHERE login=?", [salt, hash, login]);
      return json({ ok: true });
    }
    return json({ error: "op" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro no servidor: " + (e && e.message) }, 500);
  }
}
