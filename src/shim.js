/* Camada de compatibilidade: oferece window.claude (db, user, downloads) usando a API /api.
   O aplicativo foi escrito para esse formato; aqui ele passa a falar com o seu servidor. */
(function () {
  let session = null, loading = null; const revs = {}; let poke = null;
  const api = (body) => fetch("/api", body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin", cache: "no-store" });
  const load = async () => { const r = await api(); if (!r.ok) throw new Error("api " + r.status); return r.json(); };
  const keep = (j) => { (j.docs || []).forEach((d) => (revs[d.id] = d.rev)); return j; };
  const first = () => (loading = loading || load().then((j) => (session = keep(j))));
  const BASE = location.origin + "/";

  function db() {
    return {
      collection() {
        return {
          doc(id) {
            return {
              async set(data) {
                const r = await api({ op: "set", id, data, base: revs[id] || 0 });
                if (r.status === 409) {
                  const j = await r.json().catch(() => ({})); revs[id] = j.rev || 0;
                  window.dispatchEvent(new Event("plan-conflict")); if (poke) poke();
                  const e = new Error("conflict"); e.code = "conflict"; throw e;
                }
                if (!r.ok) { const e = new Error("write"); e.code = r.status === 401 ? "invalid_argument" : "error"; throw e; }
                const j = await r.json(); revs[id] = j.rev;
              },
              async delete() { const r = await api({ op: "delete", id }); if (!r.ok) { const e = new Error("write"); e.code = "invalid_argument"; throw e; } delete revs[id]; },
            };
          },
          onSnapshot(cb, errcb) {
            let last = null, stop = false, timer;
            const emit = (j) => {
              const js = JSON.stringify(j.docs);
              if (js === last) return; last = js;
              cb({ metadata: { hasPendingWrites: false }, docs: j.docs.map((d) => { if (d.id === "geral") d.data.base = BASE; return { id: d.id, data: () => d.data }; }) });
            };
            const tick = async (initial) => {
              if (stop) return; clearTimeout(timer);
              try { const j = initial ? await first() : await load(); session = keep(j); emit(j); } catch (e) { if (initial && errcb) errcb(e); }
              if (!stop) timer = setTimeout(() => tick(false), document.hidden ? 20000 : 5000);
            };
            poke = () => { last = null; tick(false); };
            tick(true);
            return () => { stop = true; clearTimeout(timer); };
          },
        };
      },
    };
  }

  const downloads = {
    save({ filename, data }) {
      return new Promise((ok) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([data], { type: "application/octet-stream" }));
        a.download = filename; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); ok({ status: "saved" });
      });
    },
  };

  window.PLAN = { api: (b) => api(b).then(async (r) => ({ ok: r.ok, status: r.status, ...(await r.json().catch(() => ({}))) })), me: () => first().then((s) => s.user || null) };
  window.claude = {
    async use(name) {
      if (name === "db") return db();
      if (name === "user") { await first(); return { can: () => !!session.admin }; }
      if (name === "downloads") return downloads;
      return null;
    },
  };

  /* Login do coordenador: abra /#login */
  function ui() {
    const st = document.createElement("style");
    st.textContent = ".lg-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:99}.lg-box{background:var(--surface,#fff);color:var(--ink,#14202e);border-radius:10px;padding:22px;width:min(92vw,340px);box-shadow:0 10px 40px rgba(0,0,0,.3);font-family:inherit}.lg-box h2{margin:0 0 12px;font-size:1.1rem}.lg-box input{width:100%;padding:10px;border:1px solid var(--line,#ccc);border-radius:6px;margin-bottom:10px;font:inherit;box-sizing:border-box;background:var(--surface2,#fff);color:inherit}.lg-box button{padding:9px 14px;border-radius:6px;border:1px solid var(--accent,#0b5cab);background:var(--accent,#0b5cab);color:var(--accent-ink,#fff);font:inherit;cursor:pointer;min-height:36px}.lg-box label{display:block;font-size:.8rem;font-weight:600;margin-bottom:4px}.lg-box :focus-visible,.lg-out:focus-visible{outline:3px solid var(--accent,#0b5cab);outline-offset:2px}.lg-box .x{background:transparent;color:inherit;border-color:var(--line,#ccc);margin-left:6px}.lg-err{color:var(--bad,#b3261e);font-size:.85rem;min-height:1.2em;margin:0 0 8px}.lg-out{position:fixed;right:12px;bottom:12px;z-index:50;padding:6px 12px;border-radius:6px;border:1px solid var(--line,#ccc);background:var(--surface,#fff);color:var(--ink,#14202e);font:inherit;font-size:.8rem;cursor:pointer}";
    document.head.appendChild(st);
    first().then((s) => {
      if (s.admin) {
        const b = document.createElement("button"); b.className = "lg-out"; b.textContent = "Sair (" + ((s.user && s.user.nome) || "coordenador").split(" ")[0] + ")";
        b.onclick = async () => { await api({ op: "logout" }); location.hash = ""; location.reload(); };
        document.body.appendChild(b);
      } else if (location.hash === "#login") {
        const ov = document.createElement("div"); ov.className = "lg-ov";
        ov.innerHTML = '<div class="lg-wrap" role="dialog" aria-modal="true" aria-labelledby="lgT" aria-describedby="lgD"><form class="lg-box"><h2 id="lgT">Acesso do coordenador</h2><p id="lgD" class="lg-d" style="font-size:.85rem;margin:0 0 12px">Deixe o usuário vazio para entrar com a senha mestre.</p><label for="lgU">Usuário</label><input type="text" id="lgU" class="lg-user" autocomplete="username"><label for="lgP">Senha</label><input type="password" id="lgP" autocomplete="current-password" required><p class="lg-err" role="alert"></p><button type="submit">Entrar</button><button type="button" class="x">Cancelar</button></form></div>';
        document.body.appendChild(ov);
        const f = ov.querySelector("form"), inp = f.querySelector("input[type=password]"), err = f.querySelector(".lg-err");
        f.querySelector(".x").onclick = () => { location.hash = ""; };
        const wrap = document.querySelector(".wrap"); if (wrap) wrap.inert = true;
        f.querySelector(".lg-user").focus();
        ov.addEventListener("keydown", (e) => { if (e.key === "Escape") location.hash = ""; });
        f.onsubmit = async (e) => {
          e.preventDefault(); err.textContent = "";
          const r = await api({ op: "login", login: f.querySelector(".lg-user").value, password: inp.value }); const j = await r.json().catch(() => ({}));
          if (r.ok) { history.replaceState(null, "", location.pathname); location.reload(); } else err.textContent = j.error || "Não foi possível entrar.";
        };
      }
    }).catch(() => {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ui); else ui();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
})();
