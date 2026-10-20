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
