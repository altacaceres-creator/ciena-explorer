// Netlandia Quest on screen: the start screen, the score bar and the challenge card.
// The story and its rules are in js/story.js; the globe is reached through `hooks`,
// so this file never touches the 3D scene itself.
import {
  STORY, STORY_ORDER, STORY_SECONDS, STORY_LIVES, loadStory, nextChapter, isUnlocked, rankOf, storyDone,
  startChallenge, answer, winChapter, restartStory,
} from './story.js';

const QUEST_KEY = 'netlandia.quest', PLAY_KEY = 'netlandia.play';

// News on the win card when the next network is a new part of the world.
const DISCOVERY = {
  submarine: {
    plain: '🌊 New discovery! The packet world is yours, and something is moving under the sea: the undersea cables.',
    eng: '🌊 New discovery: side B is back up, and the subsea systems that cross the ocean are next.',
  },
  metro: {
    plain: '🌍 You crossed the ocean! On the other side lies the land of light and cables.',
    eng: '🌍 Across the ocean: side A, the optical transport under the packet world.',
  },
};

// hooks: plain(), majorName(id), majorColor(id), setLocked(id, locked, animate),
// focusMajor(id), openMajor(id), toGlobe(), refresh()
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
        <span class="q-prog">${story.unlocked.length} / ${STORY_ORDER.length} unlocked</span></div>
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
    view = v;
    renderCard();
    card.hidden = false;
  }
  function closeCard() {
    stopTimer();
    view = null;
    card.hidden = true;
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function taunt(id) {
    hooks.toGlobe();
    hooks.focusMajor(id);
    openCard({ kind: 'taunt', id });
  }
  function begin(id) {
    openCard({ kind: 'question', id, c: startChallenge(id), last: null });
  }
  function renderCard() {
    const v = view, ch = STORY[v.id], name = esc(hooks.majorName(v.id));
    card.style.setProperty('--c', hooks.majorColor(v.id));
    card.dataset.kind = v.kind;
    if (v.kind === 'taunt') {
      card.innerHTML = `
        <div class="q-villain"><span class="q-face" aria-hidden="true">${ch.villain.face}</span>
          <div><span class="q-k">Taken over by ${esc(ch.villain.name)}</span><h3>${name}</h3></div></div>
        <p class="q-say">“${esc(say(ch.taunt))}”</p>
        <div class="q-btns"><button data-q="later">Later</button><button class="primary" data-q="begin">Take it back ▶</button></div>`;
    } else if (v.kind === 'question') {
      const c = v.c, q = say(ch.questions[c.i]);
      const hearts = Array.from({ length: STORY_LIVES }, (_, i) => `<i class="${i < c.lives ? 'on' : ''}">♥</i>`).join('');
      card.innerHTML = `
        <div class="q-head"><span class="q-k">Win back ${name} · ${c.i + 1} / ${ch.questions.length}</span>
          <span class="q-hearts" aria-label="${c.lives} lives left">${hearts}</span><span class="q-pts">+${c.points}</span></div>
        <div class="q-time"><i></i></div>
        <h3 class="q-q">${esc(q.q)}</h3>
        <div class="q-answers">${c.order[c.i].map((k, pos) => `<button data-answer="${pos}"><kbd>${pos + 1}</kbd>${esc(q.a[k])}</button>`).join('')}</div>
        ${v.last ? `<p class="q-flash ${v.last.right ? 'ok' : 'bad'}">${v.last.right ? `Right! +${v.last.points}` : v.last.timeout ? 'Too slow!' : 'Not quite.'}</p>` : ''}`;
      startTimer();
    } else if (v.kind === 'won') {
      const next = nextChapter(story);
      const news = DISCOVERY[next];
      card.innerHTML = `
        <span class="q-k">Congratulations!</span>
        <h3>You unlocked ${name}</h3>
        <p class="q-say">${esc(say(ch.win))}</p>
        <dl><dt>Why you won</dt><dd>${esc(say(ch.why))}</dd></dl>
        <p class="q-sum">+${v.points.toLocaleString('en')} pts${v.flawless ? ' · flawless bonus' : ''} · you are now <b>${esc(rankOf(story))}</b></p>
        ${news ? `<p class="q-news">${esc(say(news))}</p>` : ''}
        <div class="q-btns"><button data-q="enter">Go into ${name}</button>
          ${next ? '<button class="primary" data-q="next">Next challenge ▶</button>' : '<button class="primary" data-q="done">Finish ▶</button>'}</div>`;
    } else if (v.kind === 'lost') {
      card.innerHTML = `
        <div class="q-villain"><span class="q-face" aria-hidden="true">${ch.villain.face}</span>
          <div><span class="q-k">This round goes to ${esc(ch.villain.name)}</span><h3>You died</h3></div></div>
        <p class="q-say">${esc(say(ch.lose))}</p>
        <div class="q-btns"><button data-q="later">Back to the map</button><button class="primary" data-q="begin">Try again</button></div>`;
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
      const flawless = !c.mistakes;
      winChapter(story, c);
      save();
      applyLocks(c.id);
      renderBar();
      openCard({ kind: 'won', id: c.id, points: c.points, flawless });
    } else if (c.over === 'lost') {
      openCard({ kind: 'lost', id: c.id });
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
    else if (what === 'later') closeCard();
    else if (what === 'enter' && view) { const id = view.id; closeCard(); hooks.openMajor(id); }
    else if (what === 'done') openCard({ kind: 'done', id: STORY_ORDER.at(-1) });
    else if (what === 'replay') { restartStory(story); save(); applyLocks(); renderBar(); taunt(nextChapter(story)); }
  }
  for (const root of [intro, bar, card]) {
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-answer]');
      if (a) { pick(+a.dataset.answer); return; }
      const b = e.target.closest('[data-q]');
      if (b) act(b.dataset.q);
    });
  }
  addEventListener('keydown', (e) => {
    if (view?.kind === 'question' && ['1', '2', '3'].includes(e.key)) { pick(+e.key - 1); e.stopPropagation(); }
  }, true);

  // ------------------------------------------------ start
  if (store.get(PLAY_KEY) == null) showIntro();
  applyLocks();
  renderBar();

  return {
    isLocked: locked,
    status,
    // a click on a locked network: the next one starts its challenge, the others say why not
    blocked(id) {
      hooks.toGlobe();
      if (id === nextChapter(story)) taunt(id); else openCard({ kind: 'locked', id });
    },
    // the reading mode changed: say it all again in the other words
    relabel() {
      renderBar();
      if (!intro.hidden) showIntro();
      // a question starts its clock again, now that it reads differently
      if (view) { stopTimer(); renderCard(); }
    },
  };
}
