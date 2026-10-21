// The Quest's mini-games played by robots: a perfect player wins, an idle one loses,
// and the rules teach what the chapter is about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MINIGAMES } from '../js/minigames.js';
import { STORY } from '../js/story.js';

// a repeatable dice
const seeded = (n = 7) => () => ((n = (n * 16807) % 2147483647) / 2147483647);
const run = (game, s, seconds, each) => { for (let t = 0; t < seconds && !s.over; t += 1 / 60) { game.tick(s, 1 / 60); each?.(s); } };

test('every mini-game belongs to a chapter and has its words in both readings', () => {
  for (const [id, g] of Object.entries(MINIGAMES)) {
    assert.ok(STORY[id], id);
    for (const k of ['name', 'how', 'goal', 'laneNames']) assert.ok(g[k].plain && g[k].eng, `${id}.${k}`);
    assert.equal(g.laneNames.plain.length, 3);
    for (const f of ['start', 'tick', 'press', 'result', 'draw', 'laneAt']) assert.equal(typeof g[f], 'function', `${id}.${f}`);
  }
});

test('Keep the Beat: tapping each packet in the zone wins; never tapping loses; random taps cost sync', () => {
  const G = MINIGAMES.xhaul;
  const good = G.start(seeded());
  run(G, good, 60, (s) => { for (const p of [...s.packets]) if (p.x >= 0.9 && p.x <= 0.95) G.press(s, p.lane); });
  const r = G.result(good);
  assert.equal(r.won, true);
  assert.ok(r.flawless && r.points > 300, JSON.stringify(r));

  const idle = G.start(seeded());
  run(G, idle, 60);
  assert.equal(G.result(idle).won, false);
  assert.ok(idle.t < 35, 'drifts out of sync before the end');

  const spam = G.start(seeded());
  G.press(spam, 0);
  assert.ok(spam.sync < 100, 'a tap with nothing there is off the beat');
});

test('Packet Tetris: every packet in its own queue wins; calls in best effort or elephants in the fast lane lose', () => {
  const G = MINIGAMES.aggregation;
  const home = { call: 0, sync: 0, work: 1, web: 2, elephant: 2 };
  const good = G.start(seeded(3));
  run(G, good, 300, (s) => { if (s.falling && s.falling.y > 0.2) G.press(s, home[s.falling.kind]); });
  const r = G.result(good);
  assert.equal(r.won, true, `lives ${good.lives}`);
  assert.ok(good.elephants, 'the elephant flows showed up');

  const wrong = G.start(seeded(3));
  run(G, wrong, 300, (s) => { if (s.falling && s.falling.y > 0.2) G.press(s, s.falling.kind === 'elephant' ? 0 : 2); });
  assert.equal(G.result(wrong).won, false, 'calls behind the backups drop');

  const idle = G.start(seeded(3));
  run(G, idle, 300);
  assert.equal(G.result(idle).won, false, 'a call nobody queues is dropped');
});

test('Packet Race: reading the jams beats Lord Lag, following his shortest road does not, and the cut needs a reroute', () => {
  const G = MINIGAMES.ipcore;
  // a smart player: the quickest way given the elephants, decided after a human-ish pause
  const smart = G.start(seeded(5));
  let wait = 0;
  run(G, smart, 120, (s) => {
    const o = G.options(s);
    if (!o.length) { wait = 0; return; }
    if ((wait += 1 / 60) < 0.5) return;
    const lane = bestHop(s, o);
    G.press(s, lane);
  });
  const r = G.result(smart);
  assert.equal(r.won, true, `wins ${smart.wins} losses ${smart.losses}`);
  assert.equal(smart.reroutes, 1, 'the fibre was cut in the last race');

  // a sheep: always the hop Lord Lag would take, a moment late
  const sheep = G.start(seeded(5));
  wait = 0;
  run(G, sheep, 120, (s) => {
    const o = G.options(s);
    if (!o.length) { wait = 0; return; }
    if ((wait += 1 / 60) < 0.5) return;
    const lane = o.indexOf(G.lagNext(s));
    G.press(s, lane >= 0 ? lane : 0);
  });
  assert.equal(G.result(sheep).won, false, 'the shortest road is the jammed one');

  const idle = G.start(seeded(5));
  run(G, idle, 120);
  assert.equal(G.result(idle).won, false);
});

// the hop that starts the quickest way to Edgewater, elephants included
function bestHop(s, options) {
  const G = MINIGAMES.ipcore;
  let best = 0, bt = Infinity;
  options.forEach((n, i) => { const t = G.timeVia(s, s.you.at, n); if (t < bt) { bt = t; best = i; } });
  return best;
}

// ---------------------------------------------------------------- Level 2 and the finale
const robots = {
  // power up any repeater that has lost a third of its power; at the anchor, move the traffic
  submarine: (G, s) => {
    if (s.phase === 'anchor') { G.press(s, s.choices.findIndex((c) => c.right)); return; }
    s.reps.forEach((r, i) => { if (r.drain && r.power < 0.65) G.press(s, 10 + i); });
  },
  // the leftmost column where the request fits, then drop
  metro: (G, s) => {
    const p = s.piece;
    if (!p || p.t < 0.5) return;
    for (let c = 0; c + p.w <= 12; c++) if (p.rows.every((row) => s.grid[row].slice(c, c + p.w).every((v) => !v))) { G.press(s, 10 + c); G.press(s, 10 + c); return; }
  },
  // the first way round that has room
  longhaul: (G, s) => {
    if (!s.asking || s.asking.t < 1) return;
    G.press(s, s.asking.routes.findIndex((r) => r.slice(1).every((n, j) => (s.used[[r[j], n].sort().join('-')] ?? 0) < 2)));
  },
};

for (const id of ['submarine', 'metro', 'longhaul']) {
  test(`${MINIGAMES[id].name.plain}: a careful robot wins, an idle one loses`, () => {
    const G = MINIGAMES[id];
    const good = G.start(seeded(11));
    run(G, good, 400, (s) => robots[id](G, s));
    const r = G.result(good);
    assert.equal(r.won, true, `${id}: ${JSON.stringify({ lives: good.lives, over: good.over })}`);
    assert.ok(G.summary(good, 'plain').length > 40 && G.summary(good, 'eng').length > 40);
    const idle = G.start(seeded(11));
    run(G, idle, 400);
    assert.equal(G.result(idle).won, false, `${id}: doing nothing loses`);
  });
}

test('Repeater Rescue: waiting for the repair ship instead of moving the traffic loses', () => {
  const G = MINIGAMES.submarine;
  const s = G.start(seeded(4));
  run(G, s, 200, (t) => { if (t.phase === 'anchor') G.press(t, t.choices.findIndex((c) => c.key === 'wait')); else robots.submarine(G, t); });
  assert.equal(G.result(s).won, false);
  assert.equal(s.wrong, 'wait');
});

test('Rainbow Packing: a request over two spans needs the same colours free on both', () => {
  const G = MINIGAMES.metro;
  const s = G.start(seeded(2));
  s.grid[1][0] = 'hog';
  s.piece = { rows: [0, 1], w: 1, size: { w: 1 }, from: 0, to: 2, col: 0, t: 0 };
  G.press(s, 1);
  assert.equal(s.placed, 0, 'column 0 is taken on the second span');
  G.press(s, 2); G.press(s, 1);
  assert.equal(s.placed, 1);
  assert.ok(s.grid[0][1] && s.grid[1][1], 'the same column on both spans');
});

test('Mesh Rescue: every choice through the storm can still be won; bad ones cost towns', () => {
  const G = MINIGAMES.longhaul;
  const settle = (s) => { for (let n = 0; n < 2000 && !s.over && !s.asking; n++) G.tick(s, 0.5); return s; };
  const outcomes = [];
  const play = (picks) => {
    const s = settle(G.start(seeded(1)));
    let k = 0;
    while (!s.over) {
      const options = s.asking.routes.map((r, i) => i);
      const i = picks[k++] ?? 0;
      if (i >= options.length) return null;
      const full = s.full; G.press(s, i);
      if (s.full > full) return null;        // a full fibre: not a choice anyone keeps
      settle(s);
    }
    return s;
  };
  // every sequence of up to three choices at each of the first six questions
  for (let n = 0; n < 3 ** 6; n++) {
    const picks = Array.from({ length: 6 }, (_, k) => Math.floor(n / 3 ** k) % 3);
    const s = play(picks);
    if (s) outcomes.push(s);
  }
  assert.ok(outcomes.length > 5);
  assert.ok(outcomes.every((s) => s.over === 'won'), 'easy: no sequence of real choices loses outright');
  assert.ok(outcomes.some((s) => s.down > 0), 'but some choices leave a town cut off');
  assert.ok(outcomes.some((s) => s.down === 0), 'and the best ones lose nothing');
});

test('The fight with Lord Lag: three rounds of games already played; idle loses the first', async () => {
  const { BOSS } = await import('../js/minigames.js');
  const s = BOSS.start(seeded(9));
  const home = { call: 0, sync: 0, work: 1, web: 2, elephant: 2 };
  run(BOSS, s, 600, (b) => {
    if (!b.sub) return;
    const G = BOSS.game(b), t = b.sub;
    if (G === MINIGAMES.aggregation) { if (t.falling && t.falling.y > 0.2) BOSS.press(b, home[t.falling.kind]); }
    else if (G === MINIGAMES.ipcore) { const o = G.options(t); if (o.length) { let best = 0, bt = Infinity; o.forEach((n, i) => { const x = G.timeVia(t, t.you.at, n); if (x < bt) { bt = x; best = i; } }); BOSS.press(b, best); } }
    else robots.longhaul(G, t);
  });
  const r = BOSS.result(s);
  assert.equal(r.won, true, `round ${s.round}`);
  assert.equal(s.results.length, 3);
  assert.ok(BOSS.summary(s, 'plain').includes('Lord Lag is beaten'));
  const idle = BOSS.start(seeded(9));
  run(BOSS, idle, 600);
  assert.equal(BOSS.result(idle).won, false);
  assert.equal(idle.round, 0);
});
