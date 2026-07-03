// Weft — storage.js
// Everything lives under one localStorage key. Pure functions in, pure
// object out — app.js decides when to call save().
(function (global) {
  const KEY = "weft_state_v1";

  const DEFAULT_STATE = {
    onboarded: false,
    settings: { newPerDay: 10, tts: true },
    cards: {},              // cardId -> { ease, interval, reps, due, lapses }
    newIntroduced: { date: "", counts: { de: 0, nl: 0, en: 0 } },
    lessonsDone: {},        // lessonId -> true
    activity: {},           // "YYYY-MM-DD" -> true
    stats: { reviewsTotal: 0, correctTotal: 0 },
    session: null           // in-progress drill session, or null
  };

  function todayStr(d) {
    const date = d || new Date();
    return date.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // shallow-merge with defaults so new fields survive upgrades
      return Object.assign(structuredClone(DEFAULT_STATE), parsed, {
        settings: Object.assign({}, DEFAULT_STATE.settings, parsed.settings),
        newIntroduced: Object.assign({}, DEFAULT_STATE.newIntroduced, parsed.newIntroduced),
        stats: Object.assign({}, DEFAULT_STATE.stats, parsed.stats)
      });
    } catch (e) {
      console.error("Weft: failed to load state, starting fresh.", e);
      return structuredClone(DEFAULT_STATE);
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error("Weft: failed to save state.", e);
      return false;
    }
  }

  function markActivityToday(state) {
    state.activity[todayStr()] = true;
  }

  function computeStreak(state) {
    let streak = 0;
    let cursor = new Date();
    // if today has no activity yet, streak counts back from yesterday
    if (!state.activity[todayStr(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (state.activity[todayStr(cursor)]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function resetNewIntroducedIfNewDay(state) {
    const t = todayStr();
    if (state.newIntroduced.date !== t) {
      state.newIntroduced = { date: t, counts: { de: 0, nl: 0, en: 0 } };
    }
  }

  function exportBackup(state) {
    return JSON.stringify(state, null, 1);
  }

  function importBackup(jsonText) {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object" || !parsed.cards) {
      throw new Error("That file doesn't look like a Weft backup.");
    }
    return Object.assign(structuredClone(DEFAULT_STATE), parsed);
  }

  global.WeftStorage = {
    load, save, todayStr, markActivityToday, computeStreak,
    resetNewIntroducedIfNewDay, exportBackup, importBackup, DEFAULT_STATE
  };
})(window);
