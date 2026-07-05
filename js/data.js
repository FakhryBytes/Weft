// Weft — data.js
// Fetches the static content decks once and caches them in memory.
// Each language can have multiple level files (A1, A2, B1...); LEVELS
// below is the single place to extend when a new level is added.
(function (global) {
  const LANGS = ["de", "nl", "en"];
  const LANG_LABEL = { de: "Deutsch", nl: "Nederlands", en: "English" };
  const LEVELS = {
    de: ["a1", "a2"],
    nl: ["a1", "a2"],
    en: ["c1", "c2"]
  };

  const cache = { vocab: {}, grammar: {}, loaded: false };

  async function loadAll() {
    if (cache.loaded) return cache;
    const vocabByLevel = {}, grammarByLevel = {};
    const jobs = [];
    LANGS.forEach((l) => {
      vocabByLevel[l] = {}; grammarByLevel[l] = {};
      LEVELS[l].forEach((lvl) => {
        jobs.push(
          fetch(`./data/vocab_${l}_${lvl}.json`)
            .then((r) => r.json())
            .then((d) => { vocabByLevel[l][lvl] = d.items || []; })
        );
        jobs.push(
          fetch(`./data/grammar_${l}_${lvl}.json`)
            .then((r) => r.json())
            .then((d) => { grammarByLevel[l][lvl] = d.lessons || []; })
        );
      });
    });
    await Promise.all(jobs);
    // Concat in the fixed LEVELS order (not fetch-resolution order).
    LANGS.forEach((l) => {
      cache.vocab[l] = LEVELS[l].flatMap((lvl) => vocabByLevel[l][lvl] || []);
      cache.grammar[l] = LEVELS[l].flatMap((lvl) => grammarByLevel[l][lvl] || []);
    });
    cache.loaded = true;
    return cache;
  }

  function vocabDeck(lang) {
    return cache.vocab[lang] || [];
  }

  function grammarLessons(lang) {
    return cache.grammar[lang] || [];
  }

  function levelsFor(lang) {
    return (LEVELS[lang] || []).map((l) => l.toUpperCase());
  }

  global.WeftData = { LANGS, LANG_LABEL, LEVELS, loadAll, vocabDeck, grammarLessons, levelsFor, cache };
})(window);
