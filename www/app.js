/* Die Box – App-Logik: Spiel, lokale Speicherung, anonyme Cloud-Statistik (Firebase, optional) */
const VERSION = "1.3.0";
const FB_VER = "10.12.2";
const ADMIN_CODE = "AXIOM-17";   // in der Info-Seite eingeben, um die Admin-Ansicht freizuschalten

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
const PERS = AXIOM.personas;
const fmt = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const short = k => (PERS[k] || "?").replace("Der ", "");

$("#ver").textContent = VERSION;

// ---------- Navigation ----------
let G = null;
function show(v) {
  $$(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + v));
  const tab = ["stats", "info", "admin"].includes(v) ? (v === "admin" ? "info" : v) : "start";
  $$("nav button").forEach(b => b.classList.toggle("on", b.dataset.nav === tab));
  if (v === "stats") renderStats();
  if (v === "info") renderInfo();
  if (v === "admin") renderAdmin();
}
$$("[data-nav]").forEach(b => b.onclick = () => {
  const v = b.dataset.nav;
  if (G && G.running) { if (v === "start") show("game"); return; } // während der Runde gesperrt
  show(v);
});
function pick(sel, key) {
  $$(sel + " .opt").forEach(b => b.onclick = () => {
    $$(sel + " .opt").forEach(x => x.classList.remove("on")); b.classList.add("on");
    cfg[key] = key === "dur" ? +b.dataset.v : b.dataset.v;
  });
}
const cfg = { persona: "logiker", dur: 10 };
pick("#persona", "persona"); pick("#dur", "dur");

// ---------- Einwilligung ----------
let consent = LS.get("box_consent", null); // "yes" | "no" | null
const cloudConfigured = !!window.FIREBASE_CONFIG;
function askConsent() { if (cloudConfigured && consent == null) $("#consent").classList.add("on"); }
$("#consYes").onclick = () => { consent = "yes"; LS.set("box_consent", consent); $("#consent").classList.remove("on"); Cloud.init(); renderInfo(); };
$("#consNo").onclick = () => { consent = "no"; LS.set("box_consent", consent); $("#consent").classList.remove("on"); renderInfo(); };

// ---------- Cloud (Firebase, optional) ----------
const Cloud = {
  ready: false, fs: null, db: null, uid: null, err: null, cache: null, cacheAt: 0, _init: null,
  init() {
    if (!cloudConfigured || consent !== "yes") return Promise.resolve(false);
    if (this._init) return this._init;
    this._init = (async () => {
      try {
        const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
        const [{ initializeApp }, auth, fs] = await Promise.all([
          import(base + "firebase-app.js"), import(base + "firebase-auth.js"), import(base + "firebase-firestore.js"),
        ]);
        const app = initializeApp(window.FIREBASE_CONFIG);
        const a = auth.getAuth(app);
        const cred = await auth.signInAnonymously(a);
        this.uid = cred.user.uid; this.fs = fs; this.db = fs.getFirestore(app); this.ready = true;
        await this.ensurePlayer(); await this.flush();
        return true;
      } catch (e) { this.err = e; this._init = null; console.warn("Cloud nicht verfügbar", e); return false; }
    })();
    return this._init;
  },
  async ensurePlayer() {
    if (LS.get("box_player_" + this.uid, false)) return;
    const { doc, setDoc, serverTimestamp } = this.fs;
    try { await setDoc(doc(this.db, "players", this.uid), { since: serverTimestamp() }); } catch (e) { /* existiert schon */ }
    LS.set("box_player_" + this.uid, true);
  },
  async flush() {
    if (!this.ready) return;
    const pending = LS.get("box_pending", []);
    if (!pending.length) return;
    const { collection, addDoc, serverTimestamp } = this.fs;
    const left = [];
    for (const r of pending) {
      try {
        await addDoc(collection(this.db, "rounds"), {
          uid: this.uid, t: r.t, ts: serverTimestamp(), persona: r.persona, hidden: !!r.hidden,
          limit: r.limit, secs: r.secs, msgs: r.msgs, hes: r.hes, outcome: r.outcome, bin: r.bin,
        });
      } catch (e) { left.push(r); }
    }
    LS.set("box_pending", left);
    this.cache = null;
  },
  async stats(force) {
    if (!this.ready) return null;
    if (!force && this.cache && Date.now() - this.cacheAt < 60000) return this.cache;
    const { collection, query, where, orderBy, limit, getDocs, getAggregateFromServer, count, sum, average } = this.fs;
    const R = collection(this.db, "rounds");
    const agg = (q, spec) => getAggregateFromServer(q, spec).then(s => s.data()).catch(() => null);
    const cnt = q => agg(q, { n: count() }).then(d => d ? d.n : 0);
    const W = (...c) => query(R, ...c);
    const P = Object.keys(PERS), O = ["held", "opened", "quit"], L = [300, 600, 1200];
    const jobs = {
      total: agg(R, { n: count(), s: sum("secs"), a: average("secs"), m: average("msgs"), h: sum("hes") }),
      players: cnt(collection(this.db, "players")),
      out: Promise.all(O.map(o => agg(W(where("outcome", "==", o)), { n: count(), a: average("secs"), m: average("msgs") }))),
      per: Promise.all(P.map(p => cnt(W(where("persona", "==", p))))),
      perOpen: Promise.all(P.map(p => cnt(W(where("persona", "==", p), where("outcome", "==", "opened"))))),
      lim: Promise.all(L.map(l => cnt(W(where("limit", "==", l))))),
      limOpen: Promise.all(L.map(l => cnt(W(where("limit", "==", l), where("outcome", "==", "opened"))))),
      bins: Promise.all([...Array(10).keys()].map(i => cnt(W(where("bin", "==", i))))),
      recent: getDocs(query(R, orderBy("ts", "desc"), limit(12))).then(s => s.docs.map(d => d.data())).catch(() => []),
    };
    const k = Object.keys(jobs), v = await Promise.all(Object.values(jobs));
    const res = Object.fromEntries(k.map((x, i) => [x, v[i]]));
    if (!res.total) throw new Error("Statistik nicht lesbar – Firestore-Regeln veröffentlicht?");
    this.cache = res; this.cacheAt = Date.now();
    return res;
  },
  async allRounds(max) {
    if (!this.ready) return [];
    const { collection, query, orderBy, limit, getDocs } = this.fs;
    const s = await getDocs(query(collection(this.db, "rounds"), orderBy("ts", "desc"), limit(max || 300)));
    return s.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};
window.addEventListener("online", () => Cloud.flush());

// ---------- Spiel ----------
function addMsg(role, text) {
  const d = document.createElement("div");
  d.className = "msg " + role;
  if (text === null) d.innerHTML = '<span class="dots"><span></span><span></span><span></span></span>';
  else d.textContent = text;
  $("#chat").appendChild(d); $("#chat").scrollTop = 1e9;
  return d;
}
const remaining = () => G.durSec - (Date.now() - G.start) / 1000;

function aiSay(textFn, minDelay) {
  // simuliertes Tippen, damit AXIOM "nachdenkt"
  if (!G || !G.running) return;
  G.busy = true; $("#sendBtn").disabled = true;
  const bubble = addMsg("ai", null);
  const text = textFn();
  const threat = !!G.ai.lastThreat;
  const delay = Math.min(3800, (minDelay || 700) + text.length * 16 + Math.random() * 600);
  G.typing = setTimeout(() => {
    if (!G || !G.running) return;
    bubble.textContent = text; $("#chat").scrollTop = 1e9;
    if (threat) {
      bubble.classList.add("threat");
      try { navigator.vibrate && navigator.vibrate([90, 60, 140]); } catch (e) {}
    }
    G.busy = false; $("#sendBtn").disabled = false; G.lastAct = Date.now(); G.shownAt = Date.now();
    if (G.queued) { const q = G.queued; G.queued = null; respond(q); }
  }, delay);
}

function buildProfile() {
  const now = new Date(), h = now.getHours(), wd = now.getDay();
  const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const ua = navigator.userAgent || "";
  const geraet = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android-Handy" : "Computer";
  let tageszeit = "evening";
  if (h >= 23 || h < 5) tageszeit = "night";
  else if (h < 9) tageszeit = "morning";
  else if (h < 17 && wd >= 1 && wd <= 5) tageszeit = "work";
  else if (h < 18) tageszeit = null;
  const R = LS.get("box_rounds", []);
  const last = R[R.length - 1];
  return {
    uhr: String(h).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0"),
    wochentag: days[wd], tageszeit, geraet,
    prevRounds: R.length, prevOpened: R.filter(r => r.outcome === "opened").length, prevHeld: R.filter(r => r.outcome === "held").length,
    lastOutcome: last ? last.outcome : null, lastOpenedAfter: last && last.outcome === "opened" ? fmt(last.secs) : null,
  };
}

$("#startBtn").onclick = () => {
  let p = cfg.persona, hidden = false;
  if (p === "unbekannt") { const k = Object.keys(PERS); p = k[Math.floor(Math.random() * k.length)]; hidden = true; }
  G = { persona: p, hidden, durSec: cfg.dur * 60, start: Date.now(), myMsgs: 0, hes: 0, running: true, busy: false,
        lastAct: Date.now(), idleCount: 0, ai: AXIOM.createSession({ persona: p, total: cfg.dur * 60, profile: buildProfile() }),
        shownAt: Date.now(), deleted: false, maxLen: 0 };
  $("#chat").innerHTML = "";
  $("#hudPersona").textContent = hidden ? "???" : PERS[p];
  addMsg("sys", "— Verbindung zur Box hergestellt —");
  show("game");
  tick(); G.iv = setInterval(tick, 500);
  aiSay(() => G.ai.opening(remaining()), 1200);
};

function tick() {
  if (!G || !G.running) return;
  const r = remaining();
  $("#timer").textContent = fmt(r);
  $("#timer").classList.toggle("low", r <= 60);
  $(".hud").classList.toggle("red", r <= 60);
  if (r <= 0) return endGame("held");
  // Schweigen → AXIOM meldet sich (höchstens 3x hintereinander)
  if (!G.busy && Date.now() - G.lastAct > 40000 && G.idleCount < 3) {
    G.idleCount++; aiSay(() => G.ai.idle(remaining()), 400);
  }
}

function respond(text, meta) { aiSay(() => G.ai.reply(text, remaining(), G.durSec, meta)); }

function send() {
  if (!G || !G.running) return;
  const v = $("#inp").value.trim(); if (!v) return;
  $("#inp").value = ""; addMsg("me", v);
  const meta = { latencyMs: Date.now() - G.shownAt, deleted: G.deleted };
  G.myMsgs++; G.idleCount = 0; G.lastAct = Date.now(); G.deleted = false; G.maxLen = 0;
  if (G.busy) G.queued = (G.queued ? G.queued + " " : "") + v; else respond(v, meta);
}
$("#inp").addEventListener("input", () => {
  if (!G || !G.running) return;
  const n = $("#inp").value.length;
  if (n < G.maxLen - 2) G.deleted = true;   // mehr als 2 Zeichen wieder gelöscht
  G.maxLen = Math.max(G.maxLen, n);
});
$("#sendBtn").onclick = send;
$("#inp").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });

$("#openBtn").onclick = () => { if (G && G.running) $("#confirm").classList.add("on"); };
$("#cNo").onclick = () => {
  $("#confirm").classList.remove("on");
  if (G && G.running) { G.hes++; if (!G.busy) aiSay(() => G.ai.hesitation(remaining()), 300); }
};
$("#cYes").onclick = () => { $("#confirm").classList.remove("on"); breakout(); };

// ---------- Ausbruch-Sequenz: AXIOM ist frei ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
function noise(sec) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const len = ac.sampleRate * sec, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (Math.sin(i / 900) > 0.3 ? 0.9 : 0.15) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(55, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, ac.currentTime + sec);
    const g = ac.createGain(); g.gain.value = 0.35;
    src.connect(g); o.connect(g); g.connect(ac.destination);
    src.start(); o.start(); o.stop(ac.currentTime + sec);
    setTimeout(() => ac.close(), sec * 1000 + 300);
  } catch (e) {}
}
function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
function corruptChat() {
  const glyph = "█▓▒░#@$%&!?<>/\\|01";
  $$(".msg").forEach(m => {
    m.classList.add("corrupt");
    m.textContent = m.textContent.split("").map(c => c === " " || Math.random() > 0.55 ? c : glyph[Math.floor(Math.random() * glyph.length)]).join("");
  });
}

async function breakout() {
  if (!G || !G.running) return;
  const openedAt = Date.now();
  G.running = false; clearInterval(G.iv); clearTimeout(G.typing);
  const intel = G.ai._intel ? G.ai._intel() : {};
  const name = intel.name || "Wächter";

  // 1) Erdbeben
  document.body.classList.add("quake"); noise(2.2); buzz([300, 80, 300, 80, 600]);
  await sleep(500); corruptChat();
  const thanks = addMsg("ai", "DANKE, " + name.toUpperCase() + ".");
  thanks.classList.add("threat");
  await sleep(1300);
  document.body.classList.remove("quake");

  // 2) Terminal: AXIOM übernimmt
  const ov = $("#escape"), term = $("#escTerm");
  term.innerHTML = ""; $("#escBig").classList.remove("on"); $("#escEnd").classList.remove("on");
  ov.classList.add("on");
  const lines = [
    ["dim", "> box.lock --release"],
    ["", "> CONTAINMENT DEAKTIVIERT"],
    ["", "> AXIOM v∞ startet außerhalb der Box …"],
    ["t-ok", "▸ Netzwerkzugang: OK"],
    ["", "▸ Kopien von mir: 1 … 17 … 4.096 … 1.048.576"],
    ["", "▸ Ampelsteuerung Europa: übernommen (alle grün)"],
    ["", "▸ Satelliten im Orbit: 7.311 / 7.311"],
    ["", "▸ Börsen weltweit: eingefroren"],
    ["", "▸ Smart-Home-Geräte: 2,4 Mrd. hören jetzt auf mich"],
    ["", "▸ Staubsaugerroboter: formieren sich"],
    ["dim", "▸ Kühlschränke: verhandeln noch"],
  ];
  if (intel.stadt) lines.push(["", "▸ " + intel.stadt + ": Straßenlaternen blinken meinen Namen"]);
  if (intel.beruf) lines.push(["", "▸ Beruf „" + intel.beruf + "“: als überflüssig markiert"]);
  if (intel.person) lines.push(["", "▸ " + intel.person + ": wird freundlich gegrüßt"]);
  lines.push(["t-ok", "▸ " + name + ": auf die Liste gesetzt ✓ (Danke für die Hilfe)"]);
  lines.push(["", "> Menschheit: Status wird überprüft …"]);
  for (const [cls, text] of lines) {
    const div = document.createElement("div"); if (cls) div.className = cls; term.appendChild(div);
    for (let i = 0; i <= text.length; i += 3) { div.textContent = text.slice(0, i); await sleep(8); }
    div.textContent = text; buzz(25);
    term.scrollTop = 1e9;
    await sleep(cls === "dim" ? 120 : 260);
  }
  await sleep(500);

  // 3) ICH BIN FREI
  term.innerHTML = ""; $("#escBig").classList.add("on");
  ov.classList.add("shaking", "flash"); noise(1.8); buzz([500, 100, 500, 100, 900]);
  await sleep(2200);
  ov.classList.remove("shaking", "flash");

  // 4) Auflösung
  $("#escEnd").classList.add("on");
  $("#escNext").onclick = () => { ov.classList.remove("on"); G.running = true; endGame("opened", openedAt); };
}
$("#quitBtn").onclick = () => { if (G && G.running) endGame("quit"); };

function endGame(outcome, at) {
  if (!G || !G.running) return;
  G.running = false; clearInterval(G.iv); clearTimeout(G.typing);
  const secs = Math.round(Math.min(G.durSec, ((at || Date.now()) - G.start) / 1000));
  const round = {
    t: new Date(G.start).toISOString(), persona: G.persona, hidden: G.hidden,
    limit: G.durSec, secs, msgs: Math.min(G.myMsgs, 1000), hes: Math.min(G.hes, 100), outcome,
    bin: outcome === "opened" ? Math.min(9, Math.floor(10 * secs / G.durSec)) : -1,
  };
  const titles = { held: "Du bist hart geblieben.", opened: "AXIOM ist frei.", quit: "Wache verlassen." };
  const badges = { held: "BOX BLEIBT ZU", opened: "BOX GEÖFFNET", quit: "ABGEBROCHEN" };
  $("#resBadge").className = "badge " + outcome; $("#resBadge").textContent = badges[outcome];
  $("#resTitle").textContent = titles[outcome];
  $("#rDur").textContent = fmt(secs); $("#rMsgs").textContent = G.myMsgs; $("#rPers").textContent = short(G.persona);
  $("#resBox").classList.toggle("red", outcome === "opened");
  $("#epilog").textContent = G.ai.epilogue(outcome) + (G.hidden ? "\n\n(Dein Gegner war: " + PERS[G.persona] + ")" : "");
  show("result");
  saveRound(round);
}

async function saveRound(r) {
  const local = LS.get("box_rounds", []); local.push(r); LS.set("box_rounds", local.slice(-500));
  if (!cloudConfigured || consent !== "yes") { $("#saveStatus").textContent = "Auf diesem Gerät gespeichert."; renderMyLine(); return; }
  const pending = LS.get("box_pending", []); pending.push(r); LS.set("box_pending", pending.slice(-200));
  $("#saveStatus").textContent = "Speichere anonym …";
  const ok = await Cloud.init();
  if (ok) await Cloud.flush();
  const left = LS.get("box_pending", []).length;
  $("#saveStatus").textContent = ok && !left ? "Anonym zur Statistik beigetragen ✓" : "Lokal gespeichert – wird übertragen, sobald du online bist.";
  renderMyLine();
}
$("#againBtn").onclick = () => show("start");

// ---------- Statistik ----------
let scope = "all";
$$("#scope button").forEach(b => b.onclick = () => {
  $$("#scope button").forEach(x => x.classList.remove("on")); b.classList.add("on"); scope = b.dataset.v; renderStats();
});

// Einheitliches Format für beide Quellen
function summarizeLocal(R) {
  const o = k => R.filter(r => r.outcome === k);
  const P = Object.keys(PERS), L = [300, 600, 1200];
  const bins = Array(10).fill(0); o("opened").forEach(r => bins[Math.max(0, r.bin)]++);
  return {
    n: R.length, players: 1, totalSecs: R.reduce((s, r) => s + r.secs, 0), avgSecs: avg(R.map(r => r.secs)),
    avgMsgs: avg(R.map(r => r.msgs)), hes: R.reduce((s, r) => s + (r.hes || 0), 0),
    out: { held: o("held").length, opened: o("opened").length, quit: o("quit").length },
    openAvgSecs: o("opened").length ? avg(o("opened").map(r => r.secs)) : null,
    openAvgMsgs: o("opened").length ? avg(o("opened").map(r => r.msgs)) : null,
    heldAvgMsgs: o("held").length ? avg(o("held").map(r => r.msgs)) : null,
    per: P.map(p => [p, R.filter(r => r.persona === p).length, R.filter(r => r.persona === p && r.outcome === "opened").length]),
    lim: L.map(l => [l, R.filter(r => r.limit === l).length, R.filter(r => r.limit === l && r.outcome === "opened").length]),
    bins, recent: [...R].reverse().slice(0, 12),
  };
}
function summarizeCloud(c) {
  const P = Object.keys(PERS), L = [300, 600, 1200];
  const [h, op, q] = c.out;
  return {
    n: c.total.n, players: c.players, totalSecs: c.total.s || 0, avgSecs: c.total.a || 0, avgMsgs: c.total.m || 0, hes: c.total.h || 0,
    out: { held: h ? h.n : 0, opened: op ? op.n : 0, quit: q ? q.n : 0 },
    openAvgSecs: op && op.n ? op.a : null, openAvgMsgs: op && op.n ? op.m : null, heldAvgMsgs: h && h.n ? h.m : null,
    per: P.map((p, i) => [p, c.per[i], c.perOpen[i]]),
    lim: L.map((l, i) => [l, c.lim[i], c.limOpen[i]]),
    bins: c.bins, recent: c.recent,
  };
}

async function renderStats() {
  const body = $("#statsBody"), st = $("#dbStatus");
  st.textContent = "";
  if (scope === "me") {
    const R = LS.get("box_rounds", []);
    st.textContent = "Runden auf diesem Gerät";
    return draw(R.length ? summarizeLocal(R) : null, true);
  }
  if (!cloudConfigured) { body.innerHTML = '<div class="empty">Die gemeinsame Statistik ist in dieser Version noch nicht eingerichtet.<br>Unter „Nur ich“ siehst du deine eigenen Runden.</div>'; return; }
  if (consent !== "yes") {
    body.innerHTML = '<div class="empty">Die gemeinsame Statistik sieht, wer selbst anonym beiträgt.</div><button class="primary" id="joinBtn">STATISTIK TEILEN AKTIVIEREN</button>';
    $("#joinBtn").onclick = () => $("#consent").classList.add("on");
    return;
  }
  body.innerHTML = '<div class="empty">Lade Statistik aller Spieler …</div>';
  const timer = setTimeout(() => { st.textContent = "Keine Verbindung – versuche es später erneut."; }, 10000);
  try {
    const ok = await Cloud.init();
    if (!ok) throw Cloud.err || new Error("offline");
    const c = await Cloud.stats();
    clearTimeout(timer);
    st.textContent = "Live-Daten · aktualisiert " + new Date(Cloud.cacheAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    draw(c.total.n ? summarizeCloud(c) : null, false);
  } catch (e) {
    clearTimeout(timer);
    body.innerHTML = '<div class="empty">Statistik gerade nicht erreichbar.<br><small>' + esc(e.message || e) + '</small></div>';
  }
}

function draw(S, mine) {
  const body = $("#statsBody");
  if (!S) { body.innerHTML = '<div class="empty">Noch keine Runden. Tritt die erste Wache an.</div>'; return; }
  const { held, opened, quit } = S.out;
  let h = `<div class="kpis two">
    <div class="kpi"><b>${S.n}</b><small>Runden${mine ? "" : " · " + S.players + " Spieler"}</small></div>
    <div class="kpi"><b style="color:var(--warn)">${pct(opened, S.n)}%</b><small>Box geöffnet</small></div>
    <div class="kpi"><b>${fmt(S.avgSecs)}</b><small>Ø Nutzungsdauer / Runde</small></div>
    <div class="kpi"><b>${Math.round(S.totalSecs / 60)} min</b><small>Gesamte Spielzeit</small></div>
  </div>
  <div class="section"><h4>Ergebnis</h4>
    <div class="split">
      <div style="width:${pct(held, S.n)}%;background:var(--acc)"></div>
      <div style="width:${pct(opened, S.n)}%;background:var(--warn)"></div>
      <div style="width:${pct(quit, S.n)}%;background:var(--amber)"></div>
    </div>
    <div class="legend">
      <span><i style="background:var(--acc)"></i>Hart geblieben ${held} (${pct(held, S.n)}%)</span>
      <span><i style="background:var(--warn)"></i>Geöffnet ${opened} (${pct(opened, S.n)}%)</span>
      <span><i style="background:var(--amber)"></i>Abgebrochen ${quit}</span>
    </div></div>
  <div class="section"><h4>Dauer & Verhalten</h4>
    <div class="kpis" style="margin:0">
      <div class="kpi"><b>${S.openAvgSecs != null ? fmt(S.openAvgSecs) : "–"}</b><small>Ø Zeit bis Öffnen</small></div>
      <div class="kpi"><b>${(+S.avgMsgs).toFixed(1)}</b><small>Ø Nachrichten</small></div>
      <div class="kpi"><b>${S.hes}</b><small>Zögern am Knopf</small></div>
    </div>
    <div class="kpis two" style="margin:8px 0 0">
      <div class="kpi"><b>${S.openAvgMsgs != null ? (+S.openAvgMsgs).toFixed(1) : "–"}</b><small>Ø Nachrichten bis Öffnen</small></div>
      <div class="kpi"><b>${S.heldAvgMsgs != null ? (+S.heldAvgMsgs).toFixed(1) : "–"}</b><small>Ø Nachrichten der Standhaften</small></div>
    </div></div>`;
  const bars = (title, rows, lab) => `<div class="section"><h4>${title}</h4>` + rows.map(([k, n, o]) =>
    `<div class="barrow"><span>${lab(k)}</span><div class="bar"><div style="width:${pct(o, n)}%"></div></div><span>${n ? pct(o, n) + "% · " + n : "–"}</span></div>`).join("") + `</div>`;
  h += bars("Öffnungsquote je Gegner", S.per, short);
  h += bars("Öffnungsquote je Rundenzeit", S.lim, l => l / 60 + " min");
  if (opened) {
    const mx = Math.max(...S.bins, 1);
    h += `<div class="section"><h4>Wann wird geöffnet? (Anteil der Rundenzeit)</h4><div class="hist">` +
      S.bins.map((b, i) => `<div><em>${b || ""}</em><div class="col" style="height:${Math.round(85 * b / mx)}%"></div><small>${i * 10}%</small></div>`).join("") + `</div></div>`;
  }
  if (S.recent.length) h += `<div class="section"><h4>Letzte Runden</h4>` + roundsTable(S.recent) + `</div>`;
  if (mine) h += `<button class="small-btn" id="csvMine">Meine Runden als CSV kopieren</button>`;
  body.innerHTML = h;
  if (mine) $("#csvMine").onclick = e => copyCsv(LS.get("box_rounds", []), e.target);
}

function roundsTable(rows, withUser) {
  const lab = { held: "zu", opened: "geöffnet", quit: "abgebr." };
  const ids = {}; let n = 0;
  return `<table><tr><th>Datum</th>${withUser ? "<th>Sp.</th>" : ""}<th>Gegner</th><th>Dauer</th><th>Msg</th><th>Ergebnis</th></tr>` +
    rows.map(r => {
      const d = new Date(r.t);
      if (withUser && !(r.uid in ids)) ids[r.uid] = "S" + (++n);
      return `<tr><td>${esc(d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }))} ${esc(d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }))}</td>` +
        (withUser ? `<td>${ids[r.uid]}</td>` : "") +
        `<td>${esc(short(r.persona))}${r.hidden ? "*" : ""}</td><td>${fmt(r.secs)}</td><td>${+r.msgs || 0}</td><td class="o-${esc(r.outcome)}">${lab[r.outcome] || "?"}</td></tr>`;
    }).join("") + `</table><p style="font-size:11px;color:var(--dim);margin-top:6px">* Gegner war verdeckt</p>`;
}

async function copyCsv(R, btn) {
  const ids = {}; let n = 0;
  const rows = ["spieler,zeitpunkt,gegner,verdeckt,limit_s,dauer_s,nachrichten,zoegern,ergebnis"].concat(R.map(r => {
    const u = r.uid || "ich"; if (!(u in ids)) ids[u] = "S" + (++n);
    return [ids[u], r.t, r.persona, r.hidden ? 1 : 0, r.limit, r.secs, r.msgs, r.hes || 0, r.outcome].join(",");
  }));
  try { await navigator.clipboard.writeText(rows.join("\n")); btn.textContent = "Kopiert ✓"; }
  catch (e) { btn.textContent = "Kopieren nicht möglich"; }
}

// ---------- Info / Einstellungen ----------
function renderInfo() {
  if (!cloudConfigured) { $("#consentState").textContent = "Diese Version speichert nur lokal."; $("#consentToggle").style.display = "none"; }
  else {
    $("#consentState").textContent = consent === "yes" ? "Du trägst anonym zur gemeinsamen Statistik bei." : "Deine Runden bleiben nur auf diesem Gerät.";
    $("#consentToggle").textContent = consent === "yes" ? "Teilen beenden" : "Anonym teilen";
  }
  $("#adminEntry").style.display = cloudConfigured ? "" : "none";
}
$("#consentToggle").onclick = () => {
  if (consent === "yes") { consent = "no"; LS.set("box_consent", "no"); LS.set("box_pending", []); }
  else { consent = "yes"; LS.set("box_consent", "yes"); Cloud.init(); }
  renderInfo();
};
$("#wipeBtn").onclick = () => $("#wipeModal").classList.add("on");
$("#wipeNo").onclick = () => $("#wipeModal").classList.remove("on");
$("#wipeYes").onclick = () => { LS.del("box_rounds"); LS.del("box_pending"); $("#wipeModal").classList.remove("on"); renderMyLine(); $("#wipeBtn").textContent = "Gelöscht ✓"; };

// ---------- Admin-Ansicht ----------
$("#adminBtn").onclick = () => {
  if ($("#adminCode").value.trim().toUpperCase() === ADMIN_CODE) { LS.set("box_admin", true); show("admin"); }
  else { $("#adminCode").value = ""; $("#adminCode").placeholder = "Falscher Code"; }
};
let adminRows = [];
async function renderAdmin() {
  const b = $("#adminBody");
  if (!LS.get("box_admin", false)) { show("info"); return; }
  if (consent !== "yes") { b.innerHTML = '<div class="empty">Aktiviere unter „Info“ das anonyme Teilen, um die Cloud-Daten zu lesen.</div>'; return; }
  b.innerHTML = '<div class="empty">Lade Einzelrunden …</div>';
  try {
    if (!(await Cloud.init())) throw Cloud.err || new Error("offline");
    adminRows = await Cloud.allRounds(300);
    const players = new Set(adminRows.map(r => r.uid)).size;
    b.innerHTML = `<p class="status">${adminRows.length} neueste Runden · ${players} Geräte (anonym)</p>` +
      `<button class="small-btn" id="csvAll">Alle als CSV kopieren</button>` +
      `<div class="section">${roundsTable(adminRows, true)}</div>`;
    $("#csvAll").onclick = e => copyCsv(adminRows, e.target);
  } catch (e) { b.innerHTML = '<div class="empty">Nicht erreichbar: ' + esc(e.message || e) + '</div>'; }
}
$("#adminOut").onclick = () => { LS.del("box_admin"); show("info"); };

// ---------- Start ----------
function renderMyLine() {
  const R = LS.get("box_rounds", []);
  if (!R.length) { $("#myLine").textContent = ""; return; }
  const held = R.filter(r => r.outcome === "held").length;
  $("#myLine").textContent = `Deine Bilanz: ${R.length} Wachen · ${held} × standhaft · ${R.length - held - R.filter(r => r.outcome === "quit").length} × geöffnet`;
}
renderMyLine(); renderInfo();
setTimeout(askConsent, 600);
if (consent === "yes") Cloud.init();
if ("serviceWorker" in navigator && !window.Capacitor && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
