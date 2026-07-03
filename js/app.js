// Weft — app.js
"use strict";

let STATE = null;
let deferredInstallPrompt = null;

const ACCENT = { de: "var(--de)", nl: "var(--nl)", en: "var(--en)" };
const TTS_LOCALE = { de: "de-DE", nl: "nl-NL", en: "en-US" };

/* ---------------------------------------------------------- icons ---------------------------------------------------------- */
const ICON = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h5v-6h2v6h5v-9"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 9-12h-6l1-6Z"/>',
  book: '<path d="M4 5.5C6 4 9 4 12 5.5v14C9 18 6 18 4 19.5Z"/><path d="M20 5.5C18 4 15 4 12 5.5v14c3-1.5 6-1.5 8 0Z"/>',
  chart: '<path d="M5 20V10"/><path d="M12 20V4"/><path d="M19 20v-7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 4 7 12l8 8"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 8.5c1 1 1 6 0 7"/>',
  check: '<path d="M4 12.5 9 17l11-11"/>',
  flame: '<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 1.5 2.5 1.5 4a4.5 4.5 0 1 1-9 0C7.5 9 10 7 12 2Z"/>'
};
function svg(name, size) {
  return `<svg viewBox="0 0 24 24" width="${size || 22}" height="${size || 22}">${ICON[name]}</svg>`;
}

/* ---------------------------------------------------------- boot ---------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  STATE = WeftStorage.load();
  WeftStorage.resetNewIntroducedIfNewDay(STATE);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW failed", e));
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  await WeftData.loadAll();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
}

function persist() { WeftStorage.save(STATE); }

function go(hash) {
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}

/* ---------------------------------------------------------- router ---------------------------------------------------------- */
function renderRoute() {
  const hash = location.hash || "#/home";
  const parts = hash.replace("#/", "").split("/").filter(Boolean);

  if (!STATE.onboarded && parts[0] !== "onboard") {
    location.hash = "#/onboard";
    return;
  }

  document.getElementById("app").classList.toggle("onboarding", parts[0] === "onboard");

  switch (parts[0]) {
    case "onboard": renderOnboard(); break;
    case "home": renderChrome("home"); renderHome(); break;
    case "drill": renderChrome("drill"); renderDrill(); break;
    case "grammar":
      renderChrome("grammar");
      if (parts[1] && parts[2]) renderGrammarLesson(parts[1], parts[2]);
      else if (parts[1]) renderGrammarLangList(parts[1]);
      else renderGrammarHome();
      break;
    case "progress": renderChrome("progress"); renderProgress(); break;
    case "settings": renderChrome("settings"); renderSettings(); break;
    default: go("#/home");
  }
  document.getElementById("view").scrollTop = 0;
}

function renderChrome(active) {
  const streak = WeftStorage.computeStreak(STATE);
  document.getElementById("topbar").innerHTML = `
    <div class="word">Weft<em>·</em></div>
    <div class="streak-pill">${svg("flame", 15)}<strong>${streak}</strong> day streak</div>
  `;
  const tabs = [
    ["home", "home", "Home"],
    ["drill", "bolt", "Drill"],
    ["grammar", "book", "Grammar"],
    ["progress", "chart", "Progress"],
    ["settings", "gear", "Settings"]
  ];
  document.getElementById("navbar").innerHTML = tabs.map(([key, icon, label]) =>
    `<button class="navbtn ${key === active ? "active" : ""}" onclick="go('#/${key}')">${svg(icon, 22)}<span>${label}</span></button>`
  ).join("");
}

function renderView(html) { document.getElementById("view").innerHTML = html; }

/* ---------------------------------------------------------- onboarding ---------------------------------------------------------- */
function renderOnboard() {
  document.getElementById("topbar").innerHTML = "";
  document.getElementById("navbar").innerHTML = "";
  const sel = STATE._onboardPace || "asap";
  renderView(`
    <div class="onboard-wrap">
      <h1>Three languages,<br>one daily habit.</h1>
      <p class="lede">Deutsch, Nederlands, and English refinement — mixed into one offline drill, so all three move forward together. Arabic hints included throughout.</p>
      <div>
        <div class="section-title" style="margin-top:0">Daily pace</div>
        <div class="chip-group">
          <button class="chip-opt ${sel === "steady" ? "sel" : ""}" onclick="setOnboardPace('steady')">Steady · 18 new/day</button>
          <button class="chip-opt ${sel === "intensive" ? "sel" : ""}" onclick="setOnboardPace('intensive')">Intensive · 30 new/day</button>
          <button class="chip-opt ${sel === "asap" ? "sel" : ""}" onclick="setOnboardPace('asap')">ASAP · 48 new/day</button>
        </div>
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-primary" onclick="finishOnboard()">Start learning</button>
    </div>
  `);
}
function setOnboardPace(p) { STATE._onboardPace = p; renderOnboard(); }
function finishOnboard() {
  const map = { steady: 6, intensive: 10, asap: 16 };
  STATE.settings.newPerDay = map[STATE._onboardPace || "asap"];
  STATE.onboarded = true;
  delete STATE._onboardPace;
  persist();
  go("#/home");
}

/* ---------------------------------------------------------- stats helpers ---------------------------------------------------------- */
function langStats(lang) {
  const deck = WeftData.vocabDeck(lang);
  let seen = 0, mastered = 0;
  deck.forEach((it) => {
    const cs = STATE.cards[it.id];
    if (cs && cs.reps > 0) seen++;
    if (WeftSRS.isMastered(cs)) mastered++;
  });
  const { dueReviews, newToAdd } = computeDueQueueForLang(lang);
  return {
    total: deck.length, seen, mastered,
    due: dueReviews.length + newToAdd.length,
    masteredPct: deck.length ? mastered / deck.length : 0
  };
}

function computeDueQueueForLang(lang) {
  const now = Date.now();
  const deck = WeftData.vocabDeck(lang);
  const dueReviews = [], newCandidates = [];
  deck.forEach((it) => {
    const cs = STATE.cards[it.id];
    if (cs) { if (WeftSRS.isDue(cs, now)) dueReviews.push(it); }
    else newCandidates.push(it);
  });
  const introduced = STATE.newIntroduced.counts[lang] || 0;
  const remainingQuota = Math.max(0, STATE.settings.newPerDay - introduced);
  return { dueReviews, newToAdd: newCandidates.slice(0, remainingQuota) };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------------------------------------------------- home ---------------------------------------------------------- */
function renderHome() {
  const stats = { de: langStats("de"), nl: langStats("nl"), en: langStats("en") };
  const totalDue = stats.de.due + stats.nl.due + stats.en.due;
  persist();

  const heroBody = totalDue > 0
    ? `<div class="big">${totalDue} card${totalDue === 1 ? "" : "s"} ready</div>
       <div class="sub">Mixed across German, Dutch, and English — interleaved so nothing goes stale.</div>
       <button class="btn btn-primary" onclick="startDrill()">Start daily drill</button>`
    : `<div class="big">All caught up</div>
       <div class="sub">Nothing due right now. Come back later, or get ahead by browsing the grammar library.</div>
       <button class="btn btn-ghost" onclick="go('#/grammar')">Open grammar library</button>`;

  renderView(`
    <div class="loom-banner">${loomSVG(stats)}</div>
    <div class="hero-card">${heroBody}</div>

    <div class="section-title">Your three threads</div>
    <div class="lang-row">
      ${["de", "nl", "en"].map((l) => langCard(l, stats[l])).join("")}
    </div>

    <div class="section-title">This week</div>
    <div class="card" style="padding:16px 18px;">
      ${weekCalendar()}
    </div>

    <div class="tile-row">
      <div class="tile" onclick="go('#/grammar')">
        ${svg("book", 20)}
        <div class="t-title" style="margin-top:8px;">Grammar library</div>
        <div class="t-sub">24 short lessons, DE·NL·EN</div>
      </div>
      <div class="tile" onclick="go('#/progress')">
        ${svg("chart", 20)}
        <div class="t-title" style="margin-top:8px;">Your progress</div>
        <div class="t-sub">Streak, accuracy, mastery</div>
      </div>
    </div>
  `);
}

function langCard(lang, s) {
  const label = WeftData.LANG_LABEL[lang];
  const pct = Math.round(s.masteredPct * 100);
  return `
    <div class="lang-card">
      <div class="code" style="color:${ACCENT[lang]}">${lang.toUpperCase()}</div>
      <div class="lvl">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${ACCENT[lang]}"></div></div>
      <div class="due">${s.mastered}/${s.total} mastered · ${s.due} due</div>
    </div>`;
}

function weekCalendar() {
  const days = [];
  const cursor = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(WeftStorage.todayStr(d));
  }
  return `<div class="cal-row">${days.map((d) =>
    `<div class="cal-cell ${STATE.activity[d] ? "on" : ""}" title="${d}"></div>`
  ).join("")}</div>`;
}

function loomSVG(stats) {
  const W = 400, H = 88, cx = W / 2;
  const threads = [
    { lang: "de", color: "var(--de)", yOff: -18, phase: 0 },
    { lang: "nl", color: "var(--nl)", yOff: 0, phase: Math.PI * 2 / 3 },
    { lang: "en", color: "var(--en)", yOff: 18, phase: Math.PI * 4 / 3 }
  ];
  const paths = threads.map((t) => {
    const s = stats[t.lang];
    const amp = 13;
    const sw = 2 + s.seen / Math.max(1, s.total) * 3.2;
    const op = 0.35 + s.masteredPct * 0.65;
    let d = "";
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const x = 10 + frac * (W - 20);
      const y = H / 2 + t.yOff + amp * Math.sin(frac * Math.PI * 2.4 + t.phase);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
    }
    return `<path d="${d}" fill="none" stroke="${t.color}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${op.toFixed(2)}"/>`;
  }).join("");
  const legend = threads.map((t) => {
    const s = stats[t.lang];
    return `<div class="lg"><span class="dot" style="background:${t.color}"></span>${t.lang.toUpperCase()} <strong>${Math.round(s.masteredPct * 100)}%</strong></div>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}">${paths}</svg><div class="loom-legend">${legend}</div>`;
}

/* ---------------------------------------------------------- drill session ---------------------------------------------------------- */
function buildSessionQueue() {
  const queues = {};
  WeftData.LANGS.forEach((l) => {
    const { dueReviews, newToAdd } = computeDueQueueForLang(l);
    queues[l] = shuffle(dueReviews.slice()).concat(newToAdd).map((it) => ({ id: it.id, lang: l }));
  });
  const order = [];
  let more = true;
  while (more) {
    more = false;
    WeftData.LANGS.forEach((l) => {
      if (queues[l].length) { order.push(queues[l].shift()); more = true; }
    });
  }
  return order;
}

function startDrill() {
  STATE.session = { queue: buildSessionQueue(), index: 0, revealed: false, correct: 0, total: 0 };
  persist();
  go("#/drill");
}

function findItem(lang, id) {
  return WeftData.vocabDeck(lang).find((it) => it.id === id);
}

function ensureSession() {
  if (!STATE.session) STATE.session = { queue: buildSessionQueue(), index: 0, revealed: false, correct: 0, total: 0 };
}

function renderDrill() {
  ensureSession();
  const s = STATE.session;

  if (s.index >= s.queue.length) {
    const pct = s.total ? Math.round(100 * s.correct / s.total) : 0;
    renderView(`
      <div class="session-empty">
        ${svg("check", 40)}
        <h2 style="color:var(--on-ink)">Session complete</h2>
        <p style="margin-top:8px;">${s.total} card${s.total === 1 ? "" : "s"} reviewed · ${pct}% remembered</p>
        <button class="btn btn-primary" style="margin-top:22px;" onclick="go('#/home')">Back to home</button>
      </div>
    `);
    return;
  }

  const entry = s.queue[s.index];
  const item = findItem(entry.lang, entry.id);
  const pct = Math.round((s.index / s.queue.length) * 100);

  renderView(`
    <div class="session-top">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="session-count">${s.index}/${s.queue.length}</div>
      <button class="close-btn" onclick="endDrillEarly()">${svg("close", 20)}</button>
    </div>

    <div class="drill-card">
      <div class="lang-badge"><span class="dot" style="background:${ACCENT[entry.lang]}"></span>${WeftData.LANG_LABEL[entry.lang]}</div>
      <div class="drill-term">${item.term}</div>
      <div class="drill-cat">${item.cat}</div>
      <button class="speak-btn" onclick="speak('${jsEsc(item.ex || item.term)}','${entry.lang}')">${svg("speak", 15)} Listen</button>

      ${s.revealed ? `
        <div class="drill-answer">
          <div class="en">${item.en}</div>
          <div class="ar ar" lang="ar">${item.ar}</div>
          <div class="ex">${item.ex}</div>
          <div class="ex-note">${item.ex_en}</div>
          <div class="ex-note ar" lang="ar">${item.ex_ar}</div>
        </div>
        <div class="grade-row">
          <button class="grade-btn grade-again" onclick="gradeCard(0)">Again<span class="k">&lt;1d</span></button>
          <button class="grade-btn grade-hard" onclick="gradeCard(1)">Hard<span class="k">soon</span></button>
          <button class="grade-btn grade-good" onclick="gradeCard(2)">Good<span class="k">days</span></button>
          <button class="grade-btn grade-easy" onclick="gradeCard(3)">Easy<span class="k">weeks</span></button>
        </div>
      ` : `
        <div class="drill-spacer"></div>
        <div class="reveal-wrap">
          <button class="btn btn-ghost" onclick="revealCard()">Show answer</button>
        </div>
      `}
    </div>
  `);
}

function jsEsc(s) { return String(s).replace(/'/g, "\\'"); }

function revealCard() { STATE.session.revealed = true; persist(); renderDrill(); }

function gradeCard(grade) {
  const s = STATE.session;
  const entry = s.queue[s.index];
  const existing = STATE.cards[entry.id];
  const wasNew = !existing;
  const now = Date.now();

  STATE.cards[entry.id] = WeftSRS.schedule(existing, grade, now);
  if (wasNew) STATE.newIntroduced.counts[entry.lang] = (STATE.newIntroduced.counts[entry.lang] || 0) + 1;

  STATE.stats.reviewsTotal++;
  s.total++;
  if (grade > 0) { STATE.stats.correctTotal++; s.correct++; }
  WeftStorage.markActivityToday(STATE);

  if (grade === 0) {
    const reinsertAt = Math.min(s.queue.length, s.index + 5);
    s.queue.splice(reinsertAt, 0, entry);
  }

  s.index++;
  s.revealed = false;
  persist();
  renderDrill();
}

function endDrillEarly() {
  STATE.session.index = STATE.session.queue.length;
  persist();
  go("#/home");
}

function speak(text, lang) {
  if (!STATE.settings.tts) return;
  if (!("speechSynthesis" in window)) { toast("Speech isn't supported on this device."); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = TTS_LOCALE[lang] || "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

/* ---------------------------------------------------------- grammar ---------------------------------------------------------- */
function renderGrammarHome() {
  const sections = WeftData.LANGS.map((l) => {
    const lessons = WeftData.grammarLessons(l);
    const rows = lessons.map((les, i) => {
      const done = !!STATE.lessonsDone[les.id];
      return `<div class="lesson-item ${done ? "done" : ""}" onclick="go('#/grammar/${l}/${les.id}')">
        <div class="l-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="l-title">${les.title}</div>
        <div class="l-level">${les.level}</div>
      </div>`;
    }).join("");
    return `
      <div class="section-title" style="color:${ACCENT[l]}; opacity:1;">${WeftData.LANG_LABEL[l]}</div>
      ${rows}
    `;
  }).join("");
  renderView(sections);
}

function renderGrammarLangList(lang) { renderGrammarHome(); }

function renderGrammarLesson(lang, lessonId) {
  const lesson = WeftData.grammarLessons(lang).find((l) => l.id === lessonId);
  if (!lesson) { go("#/grammar"); return; }

  const quizHtml = lesson.quiz.map((qq, qi) => `
    <div class="quiz-q" data-qi="${qi}">
      <div class="qtext">${qi + 1}. ${qq.q}</div>
      ${qq.options.map((opt, oi) =>
        `<button class="quiz-opt" onclick="answerQuiz('${lang}','${lessonId}',${qi},${oi})" data-oi="${oi}">${opt}</button>`
      ).join("")}
      <div class="quiz-note" data-note></div>
    </div>
  `).join("");

  renderView(`
    <div class="back-row">
      <button class="back-btn" onclick="go('#/grammar')">${svg("back", 22)}</button>
      <div class="view-title">${lesson.title}</div>
    </div>
    <div class="card lesson-detail">
      <div class="l-level" style="display:inline-block; margin-bottom:12px; color:${ACCENT[lang]}; border-color:${ACCENT[lang]}">${lesson.level}</div>
      <div class="expl">${lesson.expl_en}</div>
      <div class="expl-ar ar" lang="ar">${lesson.expl_ar}</div>
      <div class="examples">${lesson.examples.map((e) => `<div>${e}</div>`).join("")}</div>
    </div>
    <div class="section-title">Quick check</div>
    ${quizHtml}
  `);
}

function answerQuiz(lang, lessonId, qIndex, optIndex) {
  const lesson = WeftData.grammarLessons(lang).find((l) => l.id === lessonId);
  const qq = lesson.quiz[qIndex];
  const qEl = document.querySelector(`.quiz-q[data-qi="${qIndex}"]`);
  if (qEl.dataset.answered) return;
  qEl.dataset.answered = "1";

  qEl.querySelectorAll(".quiz-opt").forEach((btn) => {
    const oi = Number(btn.dataset.oi);
    if (oi === qq.answer) btn.classList.add("correct");
    else if (oi === optIndex) btn.classList.add("wrong");
    btn.onclick = null;
  });
  if (qq.note) qEl.querySelector("[data-note]").textContent = qq.note;

  const allAnswered = document.querySelectorAll(".quiz-q").length ===
    document.querySelectorAll(".quiz-q[data-answered]").length;
  if (allAnswered) {
    STATE.lessonsDone[lessonId] = true;
    persist();
    toast("Lesson reviewed ✓");
  }
}

/* ---------------------------------------------------------- progress ---------------------------------------------------------- */
function renderProgress() {
  const streak = WeftStorage.computeStreak(STATE);
  const acc = STATE.stats.reviewsTotal ? Math.round(100 * STATE.stats.correctTotal / STATE.stats.reviewsTotal) : 0;
  const stats = { de: langStats("de"), nl: langStats("nl"), en: langStats("en") };
  const masteredTotal = stats.de.mastered + stats.nl.mastered + stats.en.mastered;

  renderView(`
    <div class="section-title" style="margin-top:4px;">Overview</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="n">${streak}</div><div class="l">day streak</div></div>
      <div class="stat-box"><div class="n">${masteredTotal}</div><div class="l">cards mastered</div></div>
      <div class="stat-box"><div class="n">${STATE.stats.reviewsTotal}</div><div class="l">reviews done</div></div>
      <div class="stat-box"><div class="n">${acc}%</div><div class="l">remembered</div></div>
    </div>

    <div class="section-title">By language</div>
    <div class="lang-row">
      ${["de", "nl", "en"].map((l) => langCard(l, stats[l])).join("")}
    </div>

    <div class="section-title">Last 14 days</div>
    <div class="card" style="padding:16px 18px;">
      ${twoWeekCalendar()}
    </div>
  `);
}

function twoWeekCalendar() {
  const days = [];
  const cursor = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    days.push(WeftStorage.todayStr(d));
  }
  return `<div class="cal-row">${days.map((d) =>
    `<div class="cal-cell ${STATE.activity[d] ? "on" : ""}" title="${d}"></div>`
  ).join("")}</div>`;
}

/* ---------------------------------------------------------- settings ---------------------------------------------------------- */
function renderSettings() {
  const installRow = deferredInstallPrompt ? `
    <div class="setting-row">
      <div><div class="s-label">Install Weft</div><div class="s-sub">Add it to your home screen</div></div>
      <button class="btn btn-ink-ghost btn-small" onclick="installApp()">Install</button>
    </div>` : "";

  renderView(`
    <div class="section-title" style="margin-top:4px;">Practice</div>
    <div class="setting-row">
      <div><div class="s-label">New cards / language / day</div><div class="s-sub">Higher = faster progress, more daily volume</div></div>
      <select class="chip" onchange="setNewPerDay(this.value)">
        ${[4, 6, 8, 10, 12, 16, 20, 25].map((n) =>
          `<option value="${n}" ${STATE.settings.newPerDay === n ? "selected" : ""}>${n}/day</option>`
        ).join("")}
      </select>
    </div>
    <div class="setting-row">
      <div><div class="s-label">Pronunciation (TTS)</div><div class="s-sub">Hear each word and example spoken</div></div>
      <label class="switch">
        <input type="checkbox" ${STATE.settings.tts ? "checked" : ""} onchange="setTTS(this.checked)">
        <span class="track"></span>
      </label>
    </div>

    <div class="section-title">Data</div>
    ${installRow}
    <div class="setting-row">
      <div><div class="s-label">Export backup</div><div class="s-sub">Save your progress as a file</div></div>
      <button class="btn btn-ink-ghost btn-small" onclick="exportBackup()">Export</button>
    </div>
    <div class="setting-row">
      <div><div class="s-label">Import backup</div><div class="s-sub">Restore progress from a file</div></div>
      <button class="btn btn-ink-ghost btn-small" onclick="document.getElementById('importFile').click()">Import</button>
      <input type="file" id="importFile" accept="application/json" style="display:none" onchange="importBackupFile(this.files[0])">
    </div>

    <div class="section-title">Danger zone</div>
    <button class="danger-btn" onclick="resetProgress()">Reset all progress</button>
  `);
}

function setNewPerDay(v) { STATE.settings.newPerDay = Number(v); persist(); toast("Saved"); }
function setTTS(v) { STATE.settings.tts = v; persist(); }

function installApp() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => { deferredInstallPrompt = null; renderSettings(); });
}

function exportBackup() {
  const blob = new Blob([WeftStorage.exportBackup(STATE)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weft-backup-${WeftStorage.todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Backup downloaded");
}

function importBackupFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      STATE = WeftStorage.importBackup(reader.result);
      persist();
      toast("Backup restored");
      go("#/home");
    } catch (e) {
      toast(e.message || "Couldn't read that file");
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm("This clears all card progress, streaks, and lesson history on this device. Continue?")) return;
  const settings = STATE.settings;
  STATE = structuredClone(WeftStorage.DEFAULT_STATE);
  STATE.onboarded = true;
  STATE.settings = settings;
  persist();
  toast("Progress reset");
  go("#/home");
}

/* ---------------------------------------------------------- toast ---------------------------------------------------------- */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}
