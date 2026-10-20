// Netlandia Quest on screen: the start screen, the score bar and the challenge card.
// The story and its rules are in js/story.js; the globe is reached through `hooks`,
// so this file never touches the 3D scene itself.
import {
  STORY, STORY_ORDER, STORY_LEVELS, STORY_SECONDS, STORY_LIVES, loadStory, nextChapter, isUnlocked, rankOf, storyDone,
  startChallenge, answer, winChapter, restartStory, FLAWLESS_BONUS, levelOf, examAt,
} from './story.js';
import { MINIGAMES } from './minigames.js';

const QUEST_KEY = 'netlandia.quest', PLAY_KEY = 'netlandia.play';

// News on the win card when the next network is a new part of the world.
const DISCOVERY = {
  submarine: {
    plain: '🌊 New discovery! Something is moving under the sea: the undersea cables.',
    eng: '🌊 New discovery: the subsea systems that cross the ocean.',
  },
  metro: {
    plain: '🌍 You crossed the ocean! On the other side lies the land of light and cables.',
    eng: '🌍 Across the ocean: side A, the optical transport under the packet world.',
  },
};

// hooks: plain(), majorName(id), majorColor(id), setLocked(id, locked, animate),
// focusMajor(id), openMajor(id), toGlobe(), refresh(), pause(on) (stop drawing the globe
// while a mini-game has the screen)
export function initQuest(hooks) {
  const el = (s) => document.querySelector(s);
  const intro = el('#intro'), bar = el('#quest'), card = el('#qcard');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  const story = loadStory((() => { try { return JSON.parse(store.get(QUEST_KEY)); } catch { return null; } })());
  let playing = store.get(PLAY_KEY) === 'story';
  let view = null;            // what the card shows: { kind, id, challenge, ... }
  let timer = null, asked = 0;
  let play = null;            // a mini-game running: { game, state, raf, canvas }

  const save = () => store.set(QUEST_KEY, JSON.stringify(story));
  const say = (pair) => (hooks.plain() ? pair.plain : pair.eng);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const locked = (id) => playing && !isUnlocked(story, id);
  // open, next (locked but named) or hidden (still in the clouds, not even named)
  const status = (id) => (!locked(id) ? 'open' : id === nextChapter(story) ? 'next' : 'hidden');

  // ------------------------------------------------ the globe follows the story
  function applyLocks(animateId = null) {
    for (const id of STORY_ORDER) hooks.setLocked(id, locked(id), id === animateId);
    hooks.refresh();
  }

  // ------------------------------------------------ the score bar
  function renderBar() {
    if (!playing) {
      bar.innerHTML = '<button class="q-play" data-q="intro">🎮 <b>Netlandia Quest</b><span>play to unlock the map</span></button>';
      return;
    }
    const next = nextChapter(story);
    bar.innerHTML = `
      <div class="q-stats"><span class="q-rank">${esc(rankOf(story))}</span>
        <span class="q-score"><b>${story.score.toLocaleString('en')}</b> pts</span>
        <span class="q-prog">${next ? `Level ${levelOf(next).n} · ` : ''}${story.unlocked.length} / ${STORY_ORDER.length} unlocked</span></div>
      ${next ? `<button class="q-next" data-q="next" style="--c:${hooks.majorColor(next)}">Next: ${esc(hooks.majorName(next))} ▶</button>` : '<button class="q-next" data-q="done">🏆 All unlocked</button>'}
      <button class="q-menu" data-q="intro" aria-label="Quest menu">☰</button>`;
  }

  // ------------------------------------------------ the start screen
  function showIntro() {
    closeCard();
    const started = story.unlocked.length > 0;
    intro.innerHTML = `
      <div class="i-box">
        <span class="i-face" aria-hidden="true">😈</span>
        <h2>Netlandia Quest</h2>
        <p>${hooks.plain()
          ? 'Lord Lag has switched off Netlandia. Win back each network from his minions, one challenge at a time, and the map lights up as you go.'
          : 'Lord Lag has taken Netlandia down. Win back each network, from the city edge to the ocean floor, and each scene unlocks as you go.'}</p>
        ${story.best ? `<p class="i-best">Best score: <b>${story.best.toLocaleString('en')}</b></p>` : ''}
        <div class="i-btns">
          <button class="primary" data-q="play">▶ ${started && !storyDone(story) ? 'Continue the story' : 'Play the story'}</button>
          ${started ? '<button data-q="restart">Start over</button>' : ''}
          <button data-q="explore">Explore freely</button>
        </div>
      </div>`;
    intro.hidden = false;
  }
  function setPlaying(on) {
    playing = on;
    store.set(PLAY_KEY, on ? 'story' : 'explore');
    intro.hidden = true;
    if (on) hooks.toGlobe();
    applyLocks();
    renderBar();
  }

  // ------------------------------------------------ the challenge card
  function openCard(v) {
    stopTimer();
    stopGame();
    view = v;
    renderCard();
    card.hidden = false;
  }
  function closeCard() {
    stopTimer();
    stopGame();
    view = null;
    card.hidden = true;
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function taunt(id) {
    hooks.toGlobe();
    hooks.focusMajor(id);
    openCard({ kind: 'taunt', id });
  }
  // a chapter with a mini-game plays it; the others still ask their three questions
  function begin(id) {
    if (MINIGAMES[id]) openCard({ kind: 'how', id });
    else openCard({ kind: 'question', id, c: startChallenge(id), last: null });
  }
  function renderCard() {
    const v = view, ch = STORY[v.id], name = esc(hooks.majorName(v.id));
    card.style.setProperty('--c', hooks.majorColor(v.id));
    card.dataset.kind = v.kind;
    const lvl = levelOf(v.id), stop = lvl.chapters.indexOf(v.id) + 1;
    const where = `Level ${lvl.n} · ${esc(say(lvl.name))} · stop ${stop} of ${lvl.chapters.length}`;
    if (v.kind === 'taunt') {
      card.innerHTML = `
        <span class="q-level-tag">${where}</span>
        <div class="q-villain"><span class="q-face" aria-hidden="true">${ch.villain.face}</span>
          <div><span class="q-k">Taken over by ${esc(ch.villain.name)}</span><h3>${name}</h3></div></div>
        <p class="q-say">“${esc(say(ch.taunt))}”</p>
        <div class="q-btns"><button data-q="later">Later</button><button class="primary" data-q="begin">Take it back ▶</button></div>`;
    } else if (v.kind === 'question') {
      const c = v.c, q = say(c.questions[c.i]);
      const title = v.exam ? `Level ${lvl.n} final exam` : `Win back ${name}`;
      const hearts = Array.from({ length: STORY_LIVES }, (_, i) => `<i class="${i < c.lives ? 'on' : ''}">♥</i>`).join('');
      card.innerHTML = `
        <div class="q-head"><span class="q-k">${title} · ${c.i + 1} / ${c.questions.length}</span>
          <span class="q-hearts" aria-label="${c.lives} lives left">${hearts}</span><span class="q-pts">+${c.points}</span></div>
        <div class="q-time"><i></i></div>
        <h3 class="q-q">${esc(q.q)}</h3>
        <div class="q-answers">${c.order[c.i].map((k, pos) => `<button data-answer="${pos}"><kbd>${pos + 1}</kbd>${esc(q.a[k])}</button>`).join('')}</div>
        ${v.last ? `<p class="q-flash ${v.last.right ? 'ok' : 'bad'}">${v.last.right ? `Right! +${v.last.points}` : v.last.timeout ? 'Too slow!' : 'Not quite.'}</p>` : ''}`;
      startTimer();
    } else if (v.kind === 'how') {
      const game = MINIGAMES[v.id], words = hooks.plain() ? 'plain' : 'eng';
      card.innerHTML = `
        <span class="q-k">Win back ${name} · mini-game</span>
        <h3>🎮 ${esc(game.name[words])}</h3>
        <p class="q-say">${esc(game.how[words])}</p>
        <p class="q-sum">Goal: <b>${esc(game.goal[words])}</b></p>
        <div class="q-btns"><button data-q="later">Later</button><button class="primary" data-q="go">Start ▶</button></div>`;
    } else if (v.kind === 'game') {
      const game = MINIGAMES[v.id], words = hooks.plain() ? 'plain' : 'eng';
      card.innerHTML = `
        <div class="q-head"><span class="q-k">Win back ${name} · ${esc(game.name[words])}</span><button class="q-quit" data-q="quit" aria-label="Give up">✕</button></div>
        <canvas class="q-canvas"></canvas>
        <div class="q-lanes">${game.laneNames[words].map((l, i) => `<button data-lane="${i}"><kbd>${i + 1}</kbd>${esc(l)}</button>`).join('')}</div>`;
      startGame(v.id);
    } else if (v.kind === 'exam') {
      const n = examAt(v.id).length;
      card.innerHTML = `
        <span class="q-level-tag">${where}</span>
        <span class="q-k">🏁 ${esc(MINIGAMES[v.id].name[hooks.plain() ? 'plain' : 'eng'])} won · +${v.carry.toLocaleString('en')} pts</span>
        <h3>Level ${lvl.n} final exam</h3>
        <p class="q-say">${hooks.plain()
          ? `One last challenge before the clouds over ${name} lift: ${n} questions on all of Level ${lvl.n}, the phone towers, the city and the core. You have two lives.`
          : `Before ${name} unlocks: ${n} questions across Level ${lvl.n}, xhaul, aggregation and core. Two strikes and you're out.`}</p>
        ${v.st ? `<dl><dt>Your game</dt><dd>${esc(MINIGAMES[v.id].summary(v.st, hooks.plain() ? 'plain' : 'eng'))}</dd></dl>` : ''}
        <div class="q-btns"><button class="primary" data-q="exam">Start the exam ▶</button></div>`;
    } else if (v.kind === 'won') {
      const next = nextChapter(story);
      const ended = lvl.chapters.at(-1) === v.id, after = STORY_LEVELS.find((l) => l.n === lvl.n + 1);
      const news = !ended && DISCOVERY[next];
      const game = MINIGAMES[v.id], words = hooks.plain() ? 'plain' : 'eng';
      card.innerHTML = `
        <span class="q-k">Congratulations!</span>
        <h3>You unlocked ${name}</h3>
        <p class="q-say">${esc(say(ch.win))}</p>
        ${v.st && game?.summary ? `<dl><dt>Your game</dt><dd>${esc(game.summary(v.st, words))}</dd></dl>` : ''}
        <dl><dt>Why you won</dt><dd>${esc(say(ch.why))}</dd><dt>In a real network</dt><dd>${esc(say(ch.recap))}</dd></dl>
        <p class="q-sum">+${v.points.toLocaleString('en')} pts${v.flawless ? ' · flawless bonus' : ''} · you are now <b>${esc(rankOf(story))}</b></p>
        ${ended ? `<div class="q-levelup"><b>🏁 Level ${lvl.n} complete: ${esc(say(lvl.name))}</b>
          <span>${lvl.chapters.map((c) => esc(hooks.majorName(c))).join(' · ')}: all back online.</span>
          ${after ? `<span>Next: <b>Level ${after.n} · ${esc(say(after.name))}</b>${DISCOVERY[next] ? `. ${esc(say(DISCOVERY[next]))}` : ''}</span>` : ''}</div>` : ''}
        ${news ? `<p class="q-news">${esc(say(news))}</p>` : ''}
        <div class="q-btns"><button data-q="enter">Go into ${name}</button>
          ${next ? '<button class="primary" data-q="next">Next challenge ▶</button>' : '<button class="primary" data-q="done">Finish ▶</button>'}</div>`;
    } else if (v.kind === 'lost') {
      card.innerHTML = `
        <div class="q-villain"><span class="q-face" aria-hidden="true">${ch.villain.face}</span>
          <div><span class="q-k">This round goes to ${esc(ch.villain.name)}</span><h3>You died${v.exam ? ' in the exam' : ''}</h3></div></div>
        <p class="q-say">${esc(say(ch.lose))}${v.exam ? ` ${hooks.plain() ? 'Your race still counts: only the exam starts again.' : 'The race result stands; retake the exam.'}` : ''}</p>
        <div class="q-btns"><button data-q="later">Back to the map</button><button class="primary" data-q="${v.exam ? 'exam' : 'begin'}">Try again</button></div>`;
    } else if (v.kind === 'locked') {
      const next = nextChapter(story);
      card.innerHTML = `
        <span class="q-k">☁ Hidden in the clouds</span>
        <h3>Something is down there…</h3>
        <p class="q-say">The clouds only clear one network at a time. Win back ${esc(hooks.majorName(next))} first.</p>
        <div class="q-btns"><button data-q="later">OK</button><button class="primary" data-q="next">Go to ${esc(hooks.majorName(next))} ▶</button></div>`;
    } else if (v.kind === 'done') {
      card.innerHTML = `
        <span class="q-k">🏆 Netlandia is back on</span>
        <h3>You are Chief of the NOC</h3>
        <p class="q-say">${hooks.plain()
          ? 'Every network is back, from the homes of Popcorn Hill to the cables under the ocean. Lord Lag is beaten, for now.'
          : 'Every scene is unlocked: aggregation, xhaul, core, subsea, metro and long-haul. Lord Lag is beaten, for now.'}</p>
        <p class="q-sum">Score <b>${story.score.toLocaleString('en')}</b> · best <b>${story.best.toLocaleString('en')}</b></p>
        <div class="q-btns"><button data-q="replay">Play again</button><button class="primary" data-q="free">Explore the map ▶</button></div>`;
    }
  }

  // ------------------------------------------------ a mini-game on the card's canvas
  function startGame(id) {
    const game = MINIGAMES[id], canvas = card.querySelector('.q-canvas'), g = canvas.getContext('2d');
    play = { id, game, state: game.start(), raf: 0, canvas, last: performance.now() };
    const size = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight, r = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(w * r)) { canvas.width = Math.round(w * r); canvas.height = Math.round(h * r); }
      g.setTransform(r, 0, 0, r, 0, 0);
      return [w, h];
    };
    const css = getComputedStyle(card), v = (k) => css.getPropertyValue(k).trim();
    const c = hooks.majorColor(id);
    const theme = {
      ink: css.color, paper: v('--paper'), well: v('--well'), muted: v('--muted'), font: css.fontFamily,
      accent: c, accentSoft: `${c}40`, gold: '#ffc43d', good: hooks.plain() ? '#12825a' : '#4fd59a', bad: '#e63946',
      lane: ['#e76f51', '#7b2cbf', '#8a94a6'],
    };
    const loop = (now) => {
      if (!play) return;
      // real time, in small steps, so a slow device plays the same game, only less smoothly
      let left = Math.min(0.25, (now - play.last) / 1000);
      play.last = now;
      while (left > 0 && !play.state.over) { const dt = Math.min(1 / 60, left); game.tick(play.state, dt); left -= dt; }
      const [w, h] = size();
      const words = hooks.plain() ? 'plain' : 'eng';
      game.draw(g, play.state, w, h, words, theme);
      // games whose choices change (Packet Race) relabel their lane buttons as they go
      if (game.lanes) {
        game.lanes(play.state, words).forEach((l, i) => {
          const b = card.querySelector(`[data-lane="${i}"]`);
          if (b && (b.lastChild.textContent !== l || b.disabled !== (l === '—'))) { b.lastChild.textContent = l; b.disabled = l === '—'; }
        });
      }
      const res = game.result(play.state);
      if (res) { const st = play.state; setTimeout(() => endGame(id, res, st), 600); play.raf = 0; return; }
      play.raf = requestAnimationFrame(loop);
    };
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      const lane = game.laneAt(e.clientX - r.left, e.clientY - r.top, r.width, r.height, play?.state);
      if (lane != null) press(lane);
    });
    hooks.pause(true);
    play.raf = requestAnimationFrame(loop);
  }
  function press(lane) {
    if (!play) return;
    play.game.press(play.state, lane);
    const b = card.querySelector(`[data-lane="${lane}"]`);
    if (b) { b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); }
  }
  function stopGame() {
    if (!play) return;
    if (play.raf) cancelAnimationFrame(play.raf);
    play = null;
    hooks.pause(false);
  }
  function endGame(id, res, st) {
    if (!view || view.kind !== 'game' || view.id !== id) return;
    stopGame();
    if (!res.won) { openCard({ kind: 'lost', id }); return; }
    const points = res.points + (res.flawless ? FLAWLESS_BONUS : 0);
    // the last stop of a level has its final exam still to come
    if (examAt(id)) { openCard({ kind: 'exam', id, carry: points, flawless: res.flawless, st }); return; }
    bank(id, points, res.flawless, st);
  }
  // a network won: it unlocks, its points join the score, and the win card says why
  function bank(id, points, flawless, st = null) {
    winChapter(story, { id, over: 'won', points });
    save();
    applyLocks(id);
    renderBar();
    openCard({ kind: 'won', id, points, flawless, st });
  }

  function startTimer() {
    asked = performance.now();
    const fill = card.querySelector('.q-time i');
    timer = setInterval(() => {
      const s = (performance.now() - asked) / 1000;
      if (fill) fill.style.width = `${Math.max(0, 100 - (s / STORY_SECONDS) * 100)}%`;
      if (s >= STORY_SECONDS) pick(null);
    }, 100);
  }
  function pick(pos) {
    if (!view || view.kind !== 'question' || view.c.over) return;
    stopTimer();
    const c = view.c, seconds = (performance.now() - asked) / 1000;
    const res = answer(c, pos, seconds);
    if (c.over === 'won') {
      const ex = view.exam;
      if (ex) bank(c.id, ex.carry + c.points, ex.flawless && !c.mistakes, ex.st);
      else bank(c.id, c.points, !c.mistakes);
    } else if (c.over === 'lost') {
      openCard({ kind: 'lost', id: c.id, exam: view.exam });
    } else {
      view.last = { ...res, timeout: pos == null };
      renderCard();
    }
  }

  // ------------------------------------------------ clicks and keys
  function act(what) {
    const next = nextChapter(story);
    if (what === 'intro') showIntro();
    else if (what === 'play') { setPlaying(true); if (nextChapter(story)) taunt(nextChapter(story)); else openCard({ kind: 'done', id: STORY_ORDER.at(-1) }); }
    else if (what === 'restart') { restartStory(story); save(); setPlaying(true); taunt(nextChapter(story)); }
    else if (what === 'explore' || what === 'free') { closeCard(); setPlaying(false); }
    else if (what === 'next') { if (next) taunt(next); }
    else if (what === 'begin' && view) begin(view.id);
    else if (what === 'go' && view) openCard({ kind: 'game', id: view.id });
    else if (what === 'exam' && view) {
      const ex = view.exam ?? { carry: view.carry, flawless: view.flawless, st: view.st };
      openCard({ kind: 'question', id: view.id, c: startChallenge(view.id, Math.random, examAt(view.id)), last: null, exam: ex });
    }
    else if (what === 'quit' && view) openCard({ kind: 'lost', id: view.id });
    else if (what === 'later') closeCard();
    else if (what === 'enter' && view) { const id = view.id; closeCard(); hooks.openMajor(id); }
    else if (what === 'done') openCard({ kind: 'done', id: STORY_ORDER.at(-1) });
    else if (what === 'replay') { restartStory(story); save(); applyLocks(); renderBar(); taunt(nextChapter(story)); }
  }
  // the lane buttons react on touch-down, the way a game should
  card.addEventListener('pointerdown', (e) => {
    const l = e.target.closest('[data-lane]');
    if (l) { e.preventDefault(); press(+l.dataset.lane); }
  });
  for (const root of [intro, bar, card]) {
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-answer]');
      if (a) { pick(+a.dataset.answer); return; }
      const b = e.target.closest('[data-q]');
      if (b) act(b.dataset.q);
    });
  }
  addEventListener('keydown', (e) => {
    if (!['1', '2', '3'].includes(e.key)) return;
    if (view?.kind === 'question') { pick(+e.key - 1); e.stopPropagation(); }
    else if (view?.kind === 'game' && !e.repeat) { press(+e.key - 1); e.stopPropagation(); }
  }, true);

  // ------------------------------------------------ start
  if (store.get(PLAY_KEY) == null) showIntro();
  applyLocks();
  renderBar();

  return {
    isLocked: locked,
    status,
    // for test scripts: the running mini-game's state
    get playing() { return play?.state ?? null; },
    // a click on a locked network: the next one starts its challenge, the others say why not
    blocked(id) {
      hooks.toGlobe();
      if (id === nextChapter(story)) taunt(id); else openCard({ kind: 'locked', id });
    },
    // the reading mode changed: say it all again in the other words
    relabel() {
      renderBar();
      if (!intro.hidden) showIntro();
      // a question starts its clock again, now that it reads differently; a game keeps
      // running and only its lane buttons change words (the board redraws itself)
      if (view?.kind === 'game') {
        const names = MINIGAMES[view.id].laneNames[hooks.plain() ? 'plain' : 'eng'];
        card.querySelectorAll('[data-lane]').forEach((b, i) => { b.lastChild.textContent = names[i]; });
      } else if (view) { stopTimer(); renderCard(); }
    },
  };
}
