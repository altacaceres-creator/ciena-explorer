// The Quest's mini-games played by robots: a perfect player wins, an idle one loses,
// and the rules teach what the chapter is about.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MINIGAMES } from '../js/minigames.js';
import { STORY } from '../js/story.js';

// a repeatable dice
const seeded = (n = 7) => () => ((n = (n * 16807) % 2147483647) / 2147483647);
const run = (game, s, seconds, each) => { for (let t = 0; t < seconds && !s.over; t += 1 / 60) { game.tick(s, 1 / 60); each?.(s); } };

test('every mini-game is played at a network\'s stop and has its words in both readings', () => {
  for (const [id, g] of Object.entries(MINIGAMES)) {
    assert.ok(Object.values(STORY).some((ch) => ch.stages.includes(id)), id);
    for (const k of ['name', 'how', 'goal', 'laneNames']) assert.ok(g[k].plain && g[k].eng, `${id}.${k}`);
    assert.equal(g.laneNames.plain.length, 3);
    for (const f of ['start', 'tick', 'press', 'result', 'draw', 'laneAt']) assert.equal(typeof g[f], 'function', `${id}.${f}`);
  }
});

test('Keep the Beat: tapping each packet in the zone wins; never tapping loses; random taps cost sync', () => {
  const G = MINIGAMES.beat;
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
  const G = MINIGAMES.tetris;
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
  const G = MINIGAMES.race;
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
  const G = MINIGAMES.race;
  let best = 0, bt = Infinity;
  options.forEach((n, i) => { const t = G.timeVia(s, s.you.at, n); if (t < bt) { bt = t; best = i; } });
  return best;
}

// ---------------------------------------------------------------- Level 2 and the finale
const robots = {
  // power up any repeater that has lost a third of its power; at the anchor, move the traffic
  repeaters: (G, s) => {
    if (s.phase === 'anchor') { G.press(s, s.choices.findIndex((c) => c.right)); return; }
    s.reps.forEach((r, i) => { if (r.drain && r.power < 0.65) G.press(s, 10 + i); });
  },
  // the leftmost column where the request fits, then drop
  rainbow: (G, s) => {
    const p = s.piece;
    if (!p || p.t < 0.5) return;
    for (let c = 0; c + p.w <= 12; c++) if (p.rows.every((row) => s.grid[row].slice(c, c + p.w).every((v) => !v))) { G.press(s, 10 + c); G.press(s, 10 + c); return; }
  },
  // serve the street whose oldest request has waited longest
  lastmile: (G, s) => {
    const waiting = s.reqs.filter((r) => !s.fetching.some((f) => f.req === r) && r.t > 0.6);
    if (waiting.length) G.press(s, waiting.sort((a, b) => b.t - a.t)[0].lane);
  },
  // block the link on offer that keeps every office connected
  storm: (G, s) => {
    if (s.between > 0 || s.t - (s.lastPress ?? -9) < 1) return;
    const lanes = G.lanes(s, 'plain');
    const i = s.offer.findIndex((k) => G.safe(s, k));
    if (i >= 0 && lanes[i] !== '—') { s.lastPress = s.t; G.press(s, i); }
  },
  // stop the digger closest to the fibre; when the ring is cut, open the spare link
  fibercut: (G, s) => {
    if (s.phase === 'cut') { if (s.pt > 1) G.press(s, s.choices.findIndex((c) => c.right)); return; }
    s.diggers.forEach((d, i) => { if (d.p > 0.45) G.press(s, 10 + i); });
  },
  // steer into the lane with no hazard coming
  cablelayer: (G, s) => {
    const near = s.hazards.filter((z) => z.x > 0.2 && z.x < 0.45);
    if (near.some((z) => z.lane === s.lane)) G.press(s, [0, 1, 2].find((l) => !near.some((z) => z.lane === l)));
  },
  // a plan: guards on the middle spots, then detectives, a speed bump, and more guards
  firewall: (G, s) => {
    const plan = [[1, 0], [2, 0], [1, 1], [0, 1], [3, 2], [4, 0], [5, 1]];
    const step = plan.find(([k]) => !s.towers[k]);
    if (!step) return;
    const costs = [3, 4, 2];
    if (s.coins < costs[step[1]]) return;
    G.press(s, 10 + step[0]); G.press(s, step[1]);
  },
  // ping, drive to the mark (waiting for jellyfish to drift by), ping again closer
  dive: (G, s) => {
    if (s.between > 0) return;
    if (!s.mark) { if (!s.pulse) G.press(s, 1); return; }
    if (Math.abs(s.x - s.mark.x) < 0.01 && !s.pulse && s.mark.band > 0.02) { G.press(s, 1); return; }
    const ahead = Math.sign(s.mark.x - s.x);
    const danger = s.jellies.some((j) => (j.x - s.x) * ahead > 0 && Math.abs(j.x - s.x) < 0.09 && Math.abs(G.jellyY(j, s.t) - 0.6) < 0.2);
    if (danger) { s.goto = null; s.dir = 0; } else if (s.goto !== s.mark.x) G.press(s, 10 + Math.round(s.mark.x * 100));
  },
  // nudge toward the middle, join when lined up
  splice: (G, s) => {
    if (s.arc > 0 || (s.nextNudge ?? 0) > s.t) return;
    if (Math.abs(s.o) < 0.12) G.press(s, 1);
    else { G.press(s, s.o > 0 ? 0 : 2); s.nextNudge = s.t + 0.12; }
  },
  // repeat what was shown
  memory: (G, s) => { if (s.phase === 'input' && s.wait > 0.3) G.press(s, s.seq[s.pos]); },
  // turn each switch on the planned path until it is right, one turn every so often
  lightpath: (G, s) => {
    if (s.between > 0 || (s.nextTurn ?? 0) > s.t) return;
    const i = s.pz.tiles.findIndex((tl, k) => tl.path && (tl.kind === 'straight' ? tl.rot % 2 !== s.pz.solved[k] % 2 : tl.rot !== s.pz.solved[k]));
    if (i >= 0) { G.press(s, 10 + i); s.nextTurn = s.t + 0.25; }
  },
  // the first way round that has room
  mesh: (G, s) => {
    if (!s.asking || s.asking.t < 1) return;
    G.press(s, s.asking.routes.findIndex((r) => r.slice(1).every((n, j) => (s.used[[r[j], n].sort().join('-')] ?? 0) < 2)));
  },
};

for (const id of Object.keys(robots)) {
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
  const G = MINIGAMES.repeaters;
  const s = G.start(seeded(4));
  run(G, s, 200, (t) => { if (t.phase === 'anchor') G.press(t, t.choices.findIndex((c) => c.key === 'wait')); else robots.repeaters(G, t); });
  assert.equal(G.result(s).won, false);
  assert.equal(s.wrong, 'wait');
});

test('Rainbow Packing: a request over two spans needs the same colours free on both', () => {
  const G = MINIGAMES.rainbow;
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
  const G = MINIGAMES.mesh;
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

test('Level 5, the fight with Lord Lag: a round from each level, in any game of it; idle loses the first', async () => {
  const { BOSS } = await import('../js/minigames.js');
  const home = { call: 0, sync: 0, work: 1, web: 2, elephant: 2 };
  const play = (picks) => {
    const s = BOSS.start(seeded(9), { picks });
    run(BOSS, s, 900, (b) => {
      if (!b.sub) return;
      const id = b.picks[b.round], G = MINIGAMES[id], t = b.sub;
      if (id === 'tetris') { if (t.falling && t.falling.y > 0.2) BOSS.press(b, home[t.falling.kind]); }
      else if (id === 'race') { const o = G.options(t); if (o.length) { let best = 0, bt = Infinity; o.forEach((n, i) => { const x = G.timeVia(t, t.you.at, n); if (x < bt) { bt = x; best = i; } }); BOSS.press(b, best); } }
      else if (id === 'beat') { for (const p of [...t.packets]) if (p.x >= 0.9 && p.x <= 0.95) BOSS.press(b, p.lane); }
      else robots[id](G, t);
    });
    return s;
  };
  for (const picks of [['tetris', 'race', 'repeaters', 'mesh'], ['lastmile', 'beat', 'cablelayer', 'rainbow'], ['storm', 'fibercut', 'repeaters', 'mesh'], ['tetris', 'firewall', 'dive', 'memory'], ['storm', 'firewall', 'splice', 'lightpath']]) {
    const s = play(picks);
    assert.equal(BOSS.result(s).won, true, `${picks.join(' ')}: round ${s.round}`);
    assert.equal(s.results.length, 4);
    assert.ok(BOSS.summary(s, 'plain').includes('Lord Lag is beaten'));
  }
  // left to pick, every round is a game from its own level
  const s = BOSS.start(seeded(3));
  assert.deepEqual(s.picks.map((id) => Object.entries(STORY).find(([, ch]) => ch.stages.includes(id))[0]).map((c) => ({ aggregation: 1, xhaul: 2, ipcore: 2, submarine: 3, metro: 4, longhaul: 4 })[c]), [1, 2, 3, 4]);
  const idle = BOSS.start(seeded(9));
  run(BOSS, idle, 600);
  assert.equal(BOSS.result(idle).won, false);
  assert.equal(idle.round, 0);
});

test('Last Mile Dash: a show the cache doesn\'t have goes to the origin once, then every request for it is a hit', () => {
  const G = MINIGAMES.lastmile;
  const s = G.start(seeded(5));
  s.reqs.push({ lane: 0, title: 3, t: 0, slot: 0 });
  G.press(s, 0);
  assert.equal(s.misses, 1);
  run(G, s, 3);
  assert.ok(s.cached.has(3), 'cached after the first fetch');
  s.reqs.push({ lane: 1, title: 3, t: 0, slot: 0 });
  const hits = s.hits; G.press(s, 1);
  assert.equal(s.hits, hits + 1);
});

test('Storm Chaser: blocking a link that cuts an office off costs a life; the safe one calms the storm', () => {
  const G = MINIGAMES.storm;
  const s = G.start(seeded(6));
  const bad = s.offer.findIndex((k) => !G.safe(s, k)), good = s.offer.findIndex((k) => G.safe(s, k));
  G.press(s, bad);
  assert.equal(s.lives, 2);
  G.press(s, s.offer.findIndex((k) => G.safe(s, k)));
  assert.equal(s.calmed, 1);
  assert.ok(good >= 0);
});

test('Stop the Fiber Cut and Cable Layer: the wrong move loses', () => {
  const F = MINIGAMES.fibercut, f = F.start(seeded(2));
  run(F, f, 200, (s) => { if (s.phase === 'cut') F.press(s, s.choices.findIndex((c) => c.key === 'wait')); else robots.fibercut(F, s); });
  assert.equal(F.result(f).won, false);
  assert.equal(f.wrong, 'wait');
  const C = MINIGAMES.cablelayer, c = C.start(seeded(2));
  run(C, c, 60, (s) => { const z = s.hazards.find((h) => h.x > 0.2 && h.x < 0.3); if (z) C.press(s, z.lane); });
  assert.equal(C.result(c).won, false, 'steering into every hazard sinks the lay');
});

test('Guard the Gate: guards alone let the disguised bots through; a detective stops them; customers always pass', () => {
  const G = MINIGAMES.firewall;
  // only guards, as many as can be afforded
  const s = G.start(seeded(3));
  run(G, s, 400, (x) => { const k = x.towers.findIndex((t, i) => !t && i < 6); if (k >= 0 && x.coins >= 3) { G.press(x, 10 + k); G.press(x, 0); } });
  assert.ok(s.breaches > 0 && s.masksStopped === 0, `masks get past plain rules (${s.breaches} breaches)`);
  assert.ok(s.towers.every((t) => !t || t.key === 'guard'));
  // a detective stops a disguised bot in range
  const d = G.start(seeded(3), { build: 0 });
  d.coins = 10; G.press(d, 10 + 1); G.press(d, 1);
  d.packets = [{ kind: 'mask', d: 1.6 }, { kind: 'good', d: 1.62 }];
  d.spawns = [{ at: 99, kind: 'good' }]; d.wave = 0;
  for (let i = 0; i < 30; i++) G.tick(d, 1 / 60);
  assert.equal(d.masksStopped, 1);
  assert.ok(d.packets.some((p) => p.kind === 'good'), 'the customer is never stopped');
  // building needs coins, and a built spot can't be built on again
  const c = G.start(seeded(3));
  c.coins = 2; G.press(c, 10 + 0); G.press(c, 0);
  assert.equal(c.towers[0], null); assert.equal(c.poor, 1);
  G.press(c, 2);
  assert.equal(c.towers[0].key, 'bump'); assert.equal(c.coins, 0);
  // a built spot can be swapped, with half its price back
  c.coins = 3; G.press(c, 10 + 0); G.press(c, 2);
  assert.equal(c.coins, 3, 'the same tower again does nothing');
  G.press(c, 1);
  assert.deepEqual([c.towers[0].key, c.coins, c.swapped], ['detective', 3 - (4 - 1), 1]);
});

test('Robot Dive: each ping marks the cut more closely; searching by lamp alone runs the battery down', () => {
  const G = MINIGAMES.dive;
  const s = G.start(seeded(5));
  const bands = [];
  for (let i = 0; i < 3; i++) { G.press(s, 1); run(G, s, 2); bands.push(s.mark.band); assert.ok(Math.abs(s.mark.x - s.cut) <= s.mark.band / 2 + 1e-9); }
  assert.deepEqual(bands, [0.12, 0.05, 0.015]);
  // never pinging: drive slowly back and forth by lamp, and lose to the battery
  const blind = G.start(seeded(5));
  run(G, blind, 400, (x) => { if (x.between > 0 || x.dir) return; G.press(x, x.x < 0.5 ? 2 : 0); });
  assert.ok(blind.found < 3, `found ${blind.found}`);
});

test('Fiber Splice: an offset core loses light; too far off must be redone; the losses add up to a budget', () => {
  const G = MINIGAMES.splice;
  const s = G.start(seeded(2));
  s.o = 0; G.press(s, 1);
  assert.equal(s.done.length, 1); assert.ok(s.done[0] < 0.03, 'lined up: almost nothing lost');
  run(G, s, 2);
  s.o = 0.5; G.press(s, 1);
  assert.ok(s.done[1] > s.done[0] * 4, 'off by half a core: much more lost');
  run(G, s, 2);
  s.o = 0.9; G.press(s, 1);
  assert.deepEqual([s.done.length, s.redone, s.lives], [2, 1, 2], 'too far off: redone, a life gone');
  // sloppy joins blow the budget even without a redo
  const b = G.start(seeded(2));
  for (let i = 0; i < 6 && !b.over; i++) { b.o = 0.62; b.arc = 0; G.press(b, 1); }
  assert.equal(b.over, 'lost'); assert.equal(b.why, 'budget');
  // nudges move the fibre
  const n = G.start(seeded(2)); n.o = 0; G.press(n, 0); G.press(n, 0); assert.ok(Math.abs(n.o + 0.32) < 1e-9);
});

test('Colour Memory: the pattern grows a colour a round; a wrong colour shows the same pattern again', () => {
  const G = MINIGAMES.memory;
  const s = G.start(seeded(6));
  const at = (phase) => { for (let i = 0; i < 2000 && s.phase !== phase && !s.over; i++) G.tick(s, 1 / 60); };
  at('input');
  const first = [...s.seq];
  assert.equal(first.length, 3);
  G.press(s, (s.seq[0] + 1) % 3);
  assert.deepEqual([s.lives, s.phase], [2, 'pause']);
  at('input');
  assert.deepEqual(s.seq, first, 'the same pattern again');
  for (const c of first) G.press(s, c);
  assert.equal(s.seq.length, 4, 'one colour more');
  assert.deepEqual(s.seq.slice(0, 3), first);
});

test('Light Path: every puzzle can be solved, the light stops at the first wrong switch, and four turns come back round', () => {
  const G = MINIGAMES.lightpath;
  for (let seed = 1; seed <= 30; seed++) {
    const s = G.start(seeded(seed));
    assert.equal(s.trace.done, false, 'never solved from the start');
    for (let k = 0; k < s.pz.tiles.length; k++) if (s.pz.tiles[k].path) s.pz.tiles[k].rot = s.pz.solved[k];
    G.press(s, 10 + s.pz.tiles.findIndex((tl) => tl.path)); for (let n = 0; n < 3; n++) G.press(s, 1);   // a full turn of one switch
    assert.equal(s.trace.done, true, `seed ${seed}`);
  }
  const s = G.start(seeded(4));
  const before = s.pz.tiles.map((tl) => tl.rot);
  G.press(s, 10); for (let n = 0; n < 3; n++) G.press(s, 1);
  assert.deepEqual(s.pz.tiles.map((tl) => tl.rot), before);
  assert.equal(s.turns, 4);
});
