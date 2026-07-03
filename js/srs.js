// Weft — srs.js
// Simplified SM-2. Grades: 0 = Again, 1 = Hard, 2 = Good, 3 = Easy.
(function (global) {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function freshCardState(now) {
    return { ease: 2.5, interval: 0, reps: 0, due: now || Date.now(), lapses: 0 };
  }

  // Returns a NEW card state — never mutates the input.
  function schedule(cardState, grade, now) {
    now = now || Date.now();
    const cs = Object.assign({}, cardState || freshCardState(now));

    if (grade === 0) {
      // Again: reset progress, requeue for immediate relearning.
      cs.ease = Math.max(1.3, cs.ease - 0.2);
      cs.interval = 0;
      cs.reps = 0;
      cs.lapses += 1;
      cs.due = now; // due immediately — the session queue re-inserts it
      return cs;
    }

    if (grade === 1) cs.ease = Math.max(1.3, cs.ease - 0.15);
    else if (grade === 3) cs.ease = cs.ease + 0.15;
    // grade === 2 (Good) leaves ease unchanged

    if (cs.reps === 0) {
      cs.interval = grade === 1 ? 1 : grade === 2 ? 1 : 2;
    } else if (cs.reps === 1) {
      cs.interval = grade === 1 ? 3 : grade === 2 ? 4 : 6;
    } else {
      const factor = grade === 1 ? 0.85 : grade === 3 ? cs.ease * 1.3 : cs.ease;
      cs.interval = Math.max(1, Math.round(cs.interval * factor));
    }

    cs.reps += 1;
    cs.due = now + cs.interval * DAY_MS;
    return cs;
  }

  function isDue(cardState, now) {
    now = now || Date.now();
    if (!cardState) return false; // "new" cards are handled separately
    return cardState.due <= now;
  }

  function isMastered(cardState) {
    return !!cardState && cardState.interval >= 21;
  }

  global.WeftSRS = { freshCardState, schedule, isDue, isMastered, DAY_MS };
})(window);
