// Weft — data.js
// Fetches the static content decks once and caches them in memory.
(function (global) {
  const LANGS = ["de", "nl", "en"];
  const LANG_LABEL = { de: "Deutsch", nl: "Nederlands", en: "English" };

  const cache = { vocab: {}, grammar: {}, loaded: false };

  async function loadAll() {
    if (cache.loaded) return cache;
    const jobs = [];
    LANGS.forEach((l) => {
      jobs.push(
        fetch(`./data/vocab_${l}.json`).then((r) => r.json()).then((d) => (cache.vocab[l] = d))
      );
      jobs.push(
        fetch(`./data/grammar_${l}.json`).then((r) => r.json()).then((d) => (cache.grammar[l] = d))
      );
    });
    await Promise.all(jobs);
    cache.loaded = true;
    return cache;
  }

  function vocabDeck(lang) {
    return (cache.vocab[lang] && cache.vocab[lang].items) || [];
  }

  function grammarLessons(lang) {
    return (cache.grammar[lang] && cache.grammar[lang].lessons) || [];
  }

  global.WeftData = { LANGS, LANG_LABEL, loadAll, vocabDeck, grammarLessons, cache };
})(window);
