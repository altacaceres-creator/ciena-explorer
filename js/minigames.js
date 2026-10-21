// Netlandia Quest's mini-games, played on a 2D canvas inside the challenge card. Each
// game is a small simulation (start, tick, press, result) with no page in it, so the
// tests can play it, plus a draw() for the canvas. js/game.js runs them; a chapter
// with no game here falls back to its three questions.
//
// Lanes are what the player taps: a row (Keep the Beat) or a column (Packet Tetris),
// by touch, click or the keys 1, 2 and 3.

const clamp01 = (x) => Math.max(0, Math.min(1, x));
// floating words over the board: "Perfect!", "Call dropped!"
const float = (s, lane, text, good) => s.fx.push({ lane, text, good, t: 0 });

// ---------------------------------------------------------------- Keep the Beat (5G xhaul)
// Timing packets run from the hub to three cell towers. Tap a tower's lane as its
// packet reaches the tower; a miss lets the tower drift out of sync. From a few seconds
// in, the Jitterbugs ride the packets and make them speed up and slow down.
const BEAT = {
  lanes: 3, seconds: 30, zone: [0.8, 1.02], perfect: 0.03, center: 0.91, bugsAt: 10,
};
const KeepTheBeat = {
  id: 'beat',
  name: { plain: 'Keep the Beat', eng: 'Keep the Beat' },
  how: {
    plain: 'Clock messages race to three phone towers. Tap a tower\'s lane (or press 1, 2, 3) just as its clock reaches the tower. Miss and the tower drifts out of time. Watch out for the Jitterbugs!',
    eng: 'PTP timing packets run from the hub to three cell sites. Tap the lane (or 1, 2, 3) as each packet hits its site. A miss costs phase sync; the Jitterbugs add delay variation from a few seconds in.',
  },
  goal: { plain: `Keep the towers in time for ${BEAT.seconds} seconds`, eng: `Hold phase sync for ${BEAT.seconds} s` },
  laneNames: { plain: ['Tower 1', 'Tower 2', 'Tower 3'], eng: ['Cell site 1', 'Cell site 2', 'Cell site 3'] },
  start(random = Math.random, opts = {}) {
    return { len: opts.seconds ?? BEAT.seconds, t: 0, random, packets: [], next: 0.6, sync: 100, score: 0, combo: 0, best: 0, hits: 0, perfects: 0, misses: 0, bugged: 0, fx: [], over: null, bugs: false };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    const k = Math.min(1, s.t / s.len);
    if (!s.bugs && s.t > BEAT.bugsAt) { s.bugs = true; float(s, 1, '🐞 Jitterbugs!', false); }
    // a packet on the beat, coming faster as the song goes on
    if ((s.next -= dt) <= 0) {
      const lane = Math.floor(s.random() * BEAT.lanes);
      s.packets.push({ lane, x: 0, v: 0.26 + 0.12 * k, phase: s.random() * 6.3, bug: s.bugs && s.random() < 0.4 });
      s.next = 1.6 - 0.5 * k;
    }
    for (const p of s.packets) {
      // a Jitterbug makes its packet surge and stall, but never go backwards
      const wobble = p.bug ? 0.4 * p.v * Math.sin(s.t * 4 + p.phase) : 0;
      p.x += (p.v + wobble) * dt;
    }
    for (const p of s.packets.filter((q) => q.x > 1.04)) {
      s.packets.splice(s.packets.indexOf(p), 1);
      s.misses++; s.combo = 0; s.sync -= 14;
      float(s, p.lane, 'Drifted!', false);
    }
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1);
    if (s.sync <= 0) { s.sync = 0; s.over = 'lost'; } else if (s.t >= s.len) s.over = 'won';
  },
  press(s, lane) {
    if (s.over) return;
    const inZone = s.packets.filter((p) => p.lane === lane && p.x >= BEAT.zone[0] - 0.04 && p.x <= BEAT.zone[1] + 0.04);
    if (!inZone.length) { s.sync -= 3; s.combo = 0; float(s, lane, 'Off beat', false); return; }
    const p = inZone.sort((a, b) => b.x - a.x)[0];
    s.packets.splice(s.packets.indexOf(p), 1);
    const perfect = Math.abs(p.x - BEAT.center) <= BEAT.perfect + 0.02;
    s.combo++; s.hits++; s.best = Math.max(s.best, s.combo);
    if (perfect) s.perfects++;
    if (p.bug) s.bugged++;
    s.score += Math.round((perfect ? 30 : 15) * (1 + Math.min(s.combo, 10) / 10));
    s.sync = Math.min(100, s.sync + 5);
    float(s, lane, perfect ? 'Perfect!' : 'In sync', true);
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.sync * 2 : 0, flawless: s.misses === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You caught ${s.hits} of ${s.hits + s.misses} clock messages, ${s.perfects} of them dead on time, with a longest streak of ${s.best}. ${s.bugged} had a Jitterbug riding them and still got there on the beat. The towers ended ${Math.round(s.sync)}% in step.`
      : `${s.hits}/${s.hits + s.misses} PTP packets delivered in the window (${s.perfects} centred, best run ${s.best}); ${s.bugged} survived Jitterbug delay variation. Final phase sync ${Math.round(s.sync)}%.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    const top = 34, rowH = (h - top - 8) / BEAT.lanes, x0 = 64, x1 = w - 54;
    hud(g, w, theme, `${words === 'plain' ? 'Time in step' : 'Phase sync'}`, s.sync / 100, s.score, Math.max(0, s.len - s.t));
    // the hub on the left
    g.fillStyle = theme.well; roundRect(g, 8, top + 6, 44, h - top - 20, 8); g.fill();
    g.fillStyle = theme.ink; g.font = `700 11px ${theme.font}`; g.textAlign = 'center';
    g.fillText(words === 'plain' ? 'Hub' : 'DU/CU', 30, top + 22);
    for (let i = 0; i < BEAT.lanes; i++) {
      const y = top + rowH * (i + 0.5);
      // the fibre to the tower, the beat zone and the tower itself
      g.strokeStyle = theme.muted; g.lineWidth = 3; g.setLineDash([]);
      g.beginPath(); g.moveTo(52, y); g.lineTo(x1, y); g.stroke();
      const zx = x0 + (x1 - x0) * BEAT.zone[0], zw = (x1 - x0) * (BEAT.zone[1] - BEAT.zone[0]);
      g.fillStyle = theme.accentSoft; roundRect(g, zx, y - rowH * 0.32, zw, rowH * 0.64, 8); g.fill();
      g.strokeStyle = theme.accent; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + (x1 - x0) * BEAT.center, y - rowH * 0.32); g.lineTo(x0 + (x1 - x0) * BEAT.center, y + rowH * 0.32); g.stroke();
      emoji(g, '📡', x1 + 26, y, Math.min(30, rowH * 0.6));
      g.fillStyle = theme.muted; g.font = `700 11px ${theme.font}`; g.textAlign = 'left';
      g.fillText(`${i + 1} · ${KeepTheBeat.laneNames[words][i]}`, x0, y - rowH * 0.36);
    }
    for (const p of s.packets) {
      const y = top + rowH * (p.lane + 0.5), x = x0 + (x1 - x0) * clamp01(p.x);
      g.fillStyle = theme.gold; g.beginPath(); g.arc(x, y, Math.min(15, rowH * 0.28), 0, 7); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      emoji(g, '⏱', x, y + 1, Math.min(16, rowH * 0.3));
      if (p.bug) emoji(g, '🐞', x + 12, y - 14, Math.min(18, rowH * 0.32));
    }
    floats(g, s, (lane) => [x1 - 40, top + rowH * (lane + 0.5) - rowH * 0.2], theme);
  },
  laneAt(x, y, w, h) {
    const top = 34;
    return y < top ? null : Math.min(BEAT.lanes - 1, Math.floor(((y - top) / (h - top - 8)) * BEAT.lanes));
  },
};

// ---------------------------------------------------------------- Packet Tetris (metro aggregation)
// Packets fall toward the aggregation router's uplink. Send each into a queue before it
// lands: calls into the fast lane, work into business, web and giant backups (the
// elephant flows) into best effort. The uplink serves the fast lane first.
const SORT = { goal: 18, lives: 3, rate: 1.6 };
const KINDS = {
  call: { icon: '📞', size: 1, home: 0, plain: 'Call', eng: 'Voice' },
  sync: { icon: '⏱', size: 1, home: 0, plain: 'Clock', eng: 'PTP' },
  work: { icon: '💼', size: 2, home: 1, plain: 'Work', eng: 'Business' },
  web: { icon: '🌐', size: 2, home: 2, plain: 'Web', eng: 'Web' },
  elephant: { icon: '🐘', size: 5, home: 2, plain: 'Giant backup', eng: 'Elephant flow' },
};
const PacketTetris = {
  id: 'tetris',
  name: { plain: 'Packet Tetris', eng: 'Packet Tetris' },
  how: {
    plain: 'Packets fall toward the road to the main routers. Tap a lane (or press 1, 2, 3) to drop each one in. Calls and clocks go in the fast lane, work in business, and the web and giant backups wait in "everything else". A call stuck behind a backup drops!',
    eng: 'Packets fall toward the 5170 uplink. Tap a queue (or 1, 2, 3): voice and PTP to EF, business to AF, web and elephant flows to best effort. The scheduler serves EF first. Voice behind an elephant is a dropped call.',
  },
  goal: { plain: `Sort ${SORT.goal} packets without losing three calls`, eng: `Queue ${SORT.goal} packets, three strikes and you're out` },
  laneNames: { plain: ['Fast lane', 'Business', 'Everything else'], eng: ['EF · priority', 'AF · business', 'BE · best effort'] },
  start(random = Math.random, opts = {}) {
    return {
      goal: opts.goal ?? SORT.goal, t: 0, random, lives: SORT.lives, sorted: 0, score: 0, fx: [], over: null, elephants: false, lostLife: false,
      right: 0, calls: 0, parked: 0, dropped: 0, full: 0,
      queues: [{ cap: 5, fill: 0, items: [] }, { cap: 6, fill: 0, items: [] }, { cap: 12, fill: 0, items: [] }],
      falling: null, wait: 0.5,
    };
  },
  spawn(s) {
    const r = s.random();
    let kind = r < 0.3 ? 'call' : r < 0.4 ? 'sync' : r < 0.65 ? 'work' : 'web';
    if (s.elephants && s.random() < 0.3) kind = 'elephant';
    const fall = Math.max(2.6, 4.6 - s.sorted * 0.08);
    s.falling = { kind, y: 0, fall, t: 0 };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    if (!s.elephants && s.sorted >= 6) { s.elephants = true; float(s, 1, '🐘 Here come the elephant flows!', false); }
    // the uplink serves the fast lane first, then business, then everything else,
    // each queue from its oldest packet
    let budget = SORT.rate * dt;
    for (const q of s.queues) {
      while (budget > 0 && q.items.length) {
        const it = q.items[0], take = Math.min(it.left, budget);
        it.left -= take; q.fill -= take; budget -= take;
        if (it.left <= 1e-9) q.items.shift();
      }
      if (!q.items.length) q.fill = 0;
    }
    if (!s.falling) { if ((s.wait -= dt) <= 0) PacketTetris.spawn(s); }
    else {
      const f = s.falling;
      f.t += dt; f.y = f.t / f.fall;
      if (f.y >= 1) { s.falling = null; s.wait = 0.4; miss(s, f); }
    }
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.2);
    if (s.lives <= 0) s.over = 'lost'; else if (s.sorted >= s.goal) s.over = 'won';
  },
  press(s, lane) {
    if (s.over || !s.falling) return;
    const f = s.falling, k = KINDS[f.kind], q = s.queues[lane];
    s.falling = null; s.wait = 0.35;
    s.sorted++;
    const quick = Math.round(10 * (1 - f.y));
    if (q.fill + k.size > q.cap) {
      // no room: the packet is dropped; for a call that is a dropped call
      s.full++;
      if (k.home === 0) strike(s, lane, 'Queue full · call dropped!');
      else { s.score -= 5; float(s, lane, 'Queue full · dropped', false); }
      return;
    }
    q.fill += k.size;
    q.items.push({ kind: f.kind, size: k.size, left: k.size });
    if (k.home === lane) {
      s.right++;
      if (k.home === 0) s.calls++;
      if (f.kind === 'elephant') s.parked++;
      s.score += 20 + quick; float(s, lane, `+${20 + quick}`, true); return;
    }
    if (k.home === 0) strike(s, lane, f.kind === 'sync' ? 'Clock late · out of sync!' : 'Call stuck behind the backups!');
    else if (f.kind === 'elephant' && lane === 0) strike(s, lane, 'Elephant in the fast lane!');
    else { s.score += 5; float(s, lane, 'OK, not ideal', false); }
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? Math.max(0, s.score) + s.lives * 50 : 0, flawless: !s.lostLife };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You sorted ${s.sorted} packets, ${s.right} of them into exactly the right lane. ${s.calls} calls and clocks rode the fast lane, ${s.parked} giant backup${s.parked === 1 ? '' : 's'} waited politely in "everything else", and ${s.dropped ? `${s.dropped} call${s.dropped === 1 ? ' was' : 's were'} dropped` : 'not a single call was dropped'}.`
      : `${s.sorted} packets queued, ${s.right} correctly classified: ${s.calls} voice/PTP in EF, ${s.parked} elephant flow${s.parked === 1 ? '' : 's'} in BE, ${s.full} tail drop${s.full === 1 ? '' : 's'}, ${s.dropped} voice loss${s.dropped === 1 ? '' : 'es'}.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    const top = 34, colW = w / 3, binTop = h * 0.56, binH = h - binTop - 26;
    hud(g, w, theme, `${s.sorted} / ${s.goal} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(SORT.lives - Math.max(0, s.lives))}`, s.sorted / s.goal, Math.max(0, s.score), null);
    for (let i = 0; i < 3; i++) {
      const x = colW * i + 8, q = s.queues[i];
      g.fillStyle = theme.well; roundRect(g, x, binTop, colW - 16, binH, 10); g.fill();
      // the packets waiting, stacked like blocks from the bottom, the oldest leaving first
      const unit = binH / q.cap, full = q.fill / q.cap > 0.8;
      let yb = binTop + binH;
      for (const it of q.items) {
        const bh = unit * it.left;
        g.fillStyle = full ? theme.bad : theme.lane[i];
        roundRect(g, x + 3, yb - bh + 1, colW - 22, Math.max(2, bh - 2), 6); g.fill();
        if (bh > 16) emoji(g, KINDS[it.kind].icon, x + (colW - 16) / 2, yb - bh / 2, Math.min(22, bh * 0.7));
        yb -= bh;
      }
      g.strokeStyle = theme.ink; g.lineWidth = 2; roundRect(g, x, binTop, colW - 16, binH, 10); g.stroke();
      g.fillStyle = theme.ink; g.font = `800 12px ${theme.font}`; g.textAlign = 'center';
      g.fillText(`${i + 1} · ${PacketTetris.laneNames[words][i]}`, colW * (i + 0.5), binTop - 8);
    }
    // the uplink under the queues, served left to right
    g.fillStyle = theme.muted; g.font = `700 11px ${theme.font}`; g.textAlign = 'center';
    g.fillText(words === 'plain' ? '↓ road to the main routers · the fast lane goes first' : '↓ uplink to the core · strict priority: EF, then AF, then BE', w / 2, h - 8);
    if (s.falling) {
      // the falling packet: a block as wide as the room it takes in a queue
      const f = s.falling, k = KINDS[f.kind], size = k.size >= 5 ? 46 : 34, bw = 120 + k.size * 22;
      const y = top + 14 + (binTop - top - 40) * f.y;
      g.fillStyle = theme.accent; roundRect(g, w / 2 - bw / 2, y - size / 2 - 4, bw, size + 8, 12); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.paper; roundRect(g, w / 2 - bw / 2 + 6, y - size / 2 + 2, size - 4, size - 4, 8); g.fill();
      emoji(g, k.icon, w / 2 - bw / 2 + 4 + size / 2, y, size * 0.62);
      g.fillStyle = '#ffffff'; g.font = `800 14px ${theme.font}`; g.textAlign = 'left';
      g.fillText(k[words], w / 2 - bw / 2 + size + 10, y + 5);
    }
    floats(g, s, (lane) => [colW * (lane + 0.5), binTop - 30], theme);
  },
  laneAt(x, y, w) { return Math.min(2, Math.floor((x / w) * 3)); },
};
function strike(s, lane, text) { s.lives--; s.dropped++; s.lostLife = true; s.score -= 10; float(s, lane, text, false); }
function miss(s, f) {
  s.sorted++;
  if (KINDS[f.kind].home === 0) strike(s, 1, 'Nobody queued it · call dropped!');
  else { s.score -= 5; float(s, 1, 'Dropped', false); }
}

// ---------------------------------------------------------------- Packet Race (IP/MPLS core)
// Your video packet races Lord Lag's from Gateway Bay to Edgewater, three times. At each
// router you pick the next hop; elephants jam different links each race, so read the
// map before you go. Lord Lag always takes the shortest way (the IGP path). In the last
// race a fibre is cut in front of you, and you have to find another way round.
const RACE = { races: 3, need: 2, speed: 0.4, reconverge: 1.5, think: 0.15 };
const RNODES = {
  gw: { x: 0.08, y: 0.55, plain: 'Gateway Bay', sid: 16001 },
  c1: { x: 0.36, y: 0.78, plain: 'Coreburg 1', sid: 16002 },
  c2: { x: 0.64, y: 0.78, plain: 'Coreburg 2', sid: 16003 },
  np: { x: 0.5, y: 0.2, plain: 'Northport', sid: 16004 },
  ed: { x: 0.92, y: 0.55, plain: 'Edgewater', sid: 16005 },
};
const RLINKS = [['gw', 'c1'], ['c1', 'c2'], ['c2', 'ed'], ['gw', 'np'], ['np', 'ed'], ['c1', 'np'], ['np', 'c2']];
const rkey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const rlen = (a, b) => Math.hypot((RNODES[a].x - RNODES[b].x) * 1.6, RNODES[a].y - RNODES[b].y);
// the morning's jams, one per race: where the elephants sit
const JAMS = [
  { 'c1-c2': 0.95 },                               // the backups fill the Coreburg pair: go round by Northport
  { 'c2-ed': 0.95, 'gw-np': 0.9 },                 // now both obvious ways are jammed: Coreburg 1, then up to Northport
  { 'c1-c2': 0.85 },                               // and in the last race a fibre is cut in front of you
];
function raceNeighbours(s, n) {
  return RLINKS.filter(([a, b]) => (a === n || b === n) && !s.cut.has(rkey(a, b))).map(([a, b]) => (a === n ? b : a));
}
// Lord Lag's way: fewest kilometres, whatever is on the links (the plain IGP shortest path)
function igpPath(s, from) {
  const dist = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(RNODES));
  while (todo.size) {
    let u = null;
    for (const n of todo) if (dist[n] != null && (u == null || dist[n] < dist[u])) u = n;
    if (u == null) break;
    todo.delete(u);
    for (const v of raceNeighbours(s, u)) { const d = dist[u] + rlen(u, v); if (dist[v] == null || d < dist[v]) { dist[v] = d; prev[v] = u; } }
  }
  const path = [];
  for (let n = 'ed'; n && n !== from; n = prev[n]) path.unshift(n);
  return path;
}
const racer = (at) => ({ at, to: null, p: 0, done: false, visited: new Set([at]) });
function raceSetup(s) {
  s.jam = JAMS[s.race] ?? {};
  s.cut = new Set();
  s.you = racer('gw'); s.lag = racer('gw');
  s.lagPath = igpPath(s, 'gw'); s.lagWait = 0;
  s.rt = 0; s.hitJam = false; s.cutDone = s.race !== 2;
}
// how far Lord Lag still has to go when you arrive, in seconds on clear links
function raceLead(s) {
  const r = s.lag;
  if (r.done) return 0;
  let d = r.to ? (1 - r.p) * rlen(r.at, r.to) : 0, n = r.to ?? r.at;
  for (const m of igpPath(s, n)) { d += rlen(n, m); n = m; }
  return d / RACE.speed;
}
function raceMove(s, r, dt) {
  if (r.done || !r.to) return;
  const jam = s.jam[rkey(r.at, r.to)] ?? 0;
  r.p += (RACE.speed / (1 + 3 * jam)) * dt / rlen(r.at, r.to);
  if (r.p >= 1) { r.at = r.to; r.to = null; r.p = 0; r.visited.add(r.at); if (r.at === 'ed') r.done = true; }
}
const PacketRace = {
  id: 'race',
  name: { plain: 'Packet Race', eng: 'Packet Race' },
  how: {
    plain: 'Your video call races Lord Lag\'s packet from Gateway Bay to Edgewater. At each router, tap where to go next (or press 1, 2, 3); the race slows right down while you choose. Elephants 🐘 jam different roads each race, so look before you go. Lord Lag always takes the shortest road. Win two of the three races!',
    eng: 'Your EF video packet races Lord Lag\'s from the Gateway Bay PE to Edgewater. At each node pick the next segment (1, 2, 3): you are the SR-TE head end. Elephant flows load different links each race; Lord Lag follows the IGP shortest path. In race 3 a link fails: reroute. Win two of three.',
  },
  goal: { plain: 'Three races: beat Lord Lag in at least two', eng: 'Three races to Edgewater: win at least two' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random, opts = {}) {
    const first = opts.first ?? 0, races = opts.races ?? RACE.races;
    const s = { first, races, need: opts.need ?? RACE.need, last: first + races - 1, t: 0, random, race: first, wins: 0, losses: 0, fx: [], over: null, margins: [], reroutes: 0, dodged: 0, between: 0, rt: 0 };
    raceSetup(s);
    return s;
  },
  // the choices at the router your packet is waiting at
  options(s) {
    if (s.between > 0 || s.you.done || s.you.to) return [];
    return raceNeighbours(s, s.you.at).filter((n) => !s.you.visited.has(n)).sort((a, b) => RNODES[a].y - RNODES[b].y || RNODES[a].x - RNODES[b].x).slice(0, 3);
  },
  // Lord Lag's next hop from where your packet is (the IGP shortest path)
  lagNext: (s) => igpPath(s, s.you.at)[0] ?? null,
  // seconds to Edgewater going first to `n`, with the elephants where they are
  timeVia(s, from, n) {
    const cost = (a, b) => rlen(a, b) * (1 + 3 * (s.jam[rkey(a, b)] ?? 0)) / RACE.speed;
    const dist = { [n]: 0 }, todo = new Set(Object.keys(RNODES).filter((x) => x !== from));
    while (todo.size) {
      let u = null;
      for (const x of todo) if (dist[x] != null && (u == null || dist[x] < dist[u])) u = x;
      if (u == null) break;
      todo.delete(u);
      for (const v of raceNeighbours(s, u)) if (todo.has(v) && (dist[v] == null || dist[u] + cost(u, v) < dist[v])) dist[v] = dist[u] + cost(u, v);
    }
    return cost(from, n) + (dist.ed ?? Infinity);
  },
  lanes(s, words) {
    const o = PacketRace.options(s);
    return [0, 1, 2].map((i) => (o[i] ? (words === 'plain' ? `→ ${RNODES[o[i]].plain}` : `${RNODES[o[i]].plain} · ${RNODES[o[i]].sid}`) : '—'));
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.4);
    if (s.between > 0) {
      if ((s.between -= dt) <= 0) {
        // all three races are run (the last one has the cut fibre), unless it is already lost
        if (s.race === s.last) s.over = s.wins >= s.need ? 'won' : 'lost';
        else if (s.losses > s.races - s.need) s.over = 'lost';
        else { s.race++; raceSetup(s); float(s, 1, `Race ${s.race + 1}!`, true); }
      }
      return;
    }
    // while your packet waits at a router for you to choose, the race runs in slow motion:
    // the game is about reading the map, not about quick fingers
    if (PacketRace.options(s).length) dt *= RACE.think;
    s.rt += dt;
    // race 3: a fibre fails right in front of you
    if (!s.cutDone && s.rt > 1.2 && s.you.at !== 'gw') {
      const ahead = s.you.to ?? s.you.at;
      const victim = RLINKS.map(([a, b]) => rkey(a, b)).find((k) => k.includes(ahead) && k.includes('ed')) ?? 'c2-ed';
      s.cut.add(victim); s.cutDone = true;
      float(s, 1, '✂ Fibre cut!', false);
      // a packet on the cut link turns back to where it came from
      if (s.you.to && rkey(s.you.at, s.you.to) === victim) { s.you.to = null; s.you.p = 0; }
      if (s.lag.to && rkey(s.lag.at, s.lag.to) === victim) { s.lag.to = null; s.lag.p = 0; }
      // if the cut is on Lord Lag's way, his IGP has to reconverge before he moves on
      const onHisWay = [s.lag.at, ...s.lagPath].some((n, i, a) => i && rkey(a[i - 1], n) === victim);
      if (onHisWay) { s.lagPath = igpPath(s, s.lag.to ?? s.lag.at); s.lagWait = RACE.reconverge; }
      s.reroutes++;
    }
    if (!s.lag.to && !s.lag.done && (s.lagWait -= dt) <= 0) {
      s.lagPath = igpPath(s, s.lag.at);
      s.lag.to = s.lagPath[0] ?? null;
    }
    raceMove(s, s.you, dt);
    raceMove(s, s.lag, dt);
    // first to Edgewater wins the race; a dead heat goes to you
    if (s.you.done) {
      s.margins.push(raceLead(s)); s.wins++;
      if (!s.hitJam) s.dodged++;
      float(s, 1, 'You beat Lord Lag!', true);
      s.between = 1.6;
    } else if (s.lag.done) {
      s.losses++;
      float(s, 1, 'Lord Lag got there first', false);
      s.between = 1.6;
    }
  },
  press(s, lane) {
    if (s.over) return;
    const o = PacketRace.options(s);
    if (!o[lane]) return;
    if ((s.jam[rkey(s.you.at, o[lane])] ?? 0) > 0.5) s.hitJam = true;
    s.you.to = o[lane]; s.you.p = 0;
  },
  result(s) {
    if (!s.over) return null;
    const points = s.margins.reduce((p, m) => p + 150 + Math.round(Math.min(m, 4) * 40), 0);
    return { won: s.over === 'won', points: s.over === 'won' ? points : 0, flawless: s.losses === 0 };
  },
  summary(s, words) {
    const best = s.margins.length ? Math.max(...s.margins).toFixed(1) : null;
    return words === 'plain'
      ? `You won ${s.wins} of ${s.wins + s.losses} races${best ? `, and your best beat Lord Lag by ${best} seconds` : ''}. You went round the jams ${s.dodged} time${s.dodged === 1 ? '' : 's'}${s.reroutes ? ' and found a way round the cut fibre' : ''}.`
      : `${s.wins}–${s.losses} against the IGP path${best ? `, best margin ${best} s` : ''}. Congested segments avoided ${s.dodged}×${s.reroutes ? '; rerouted after the link failure while the IGP was still reconverging' : ''}.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `Race ${s.race - s.first + 1} / ${s.races} · You ${s.wins} – ${s.losses} Lord Lag`, s.wins / s.need, PacketRace.result({ ...s, over: 'won' }).points, null);
    const top = 34, P = (n) => [24 + (w - 48) * RNODES[n].x, top + 10 + (h - top - 30) * RNODES[n].y];
    const opts = PacketRace.options(s);
    for (const [a, b] of RLINKS) {
      const [ax, ay] = P(a), [bx, by] = P(b), k = rkey(a, b), jam = s.jam[k] ?? 0, cut = s.cut.has(k);
      g.strokeStyle = cut ? theme.muted : jam > 0.5 ? theme.bad : theme.muted;
      g.lineWidth = cut ? 2 : jam > 0.5 ? 6 : 4;
      g.setLineDash(cut ? [6, 6] : []);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      g.setLineDash([]);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (cut) emoji(g, '✂', mx, my, 20);
      else for (let e = 0; e < Math.round(jam * 3); e++) emoji(g, '🐘', mx + (e - 1) * 22, my - 14, 20);
    }
    // the numbers for your next hop, on the links you can take
    opts.forEach((n, i) => {
      const [ax, ay] = P(s.you.at), [bx, by] = P(n);
      const x = ax + (bx - ax) * 0.42, y = ay + (by - ay) * 0.42;
      g.fillStyle = theme.accent; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.font = `800 13px ${theme.font}`; g.textAlign = 'center'; g.fillText(String(i + 1), x, y + 5);
    });
    for (const n of Object.keys(RNODES)) {
      const [x, y] = P(n), lbl = words === 'plain' ? RNODES[n].plain : `${RNODES[n].plain} · ${RNODES[n].sid}`;
      g.font = `800 12px ${theme.font}`; const tw = g.measureText(lbl).width;
      g.fillStyle = theme.paper; roundRect(g, x - tw / 2 - 8, y - 12, tw + 16, 24, 8); g.fill();
      g.strokeStyle = n === 'ed' || n === 'gw' ? theme.accent : theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.textAlign = 'center'; g.fillText(lbl, x, y + 4);
    }
    const dot = (r, icon, off) => {
      const [ax, ay] = P(r.at), [bx, by] = r.to ? P(r.to) : [ax, ay];
      emoji(g, icon, ax + (bx - ax) * r.p + off, ay + (by - ay) * r.p - 22, 24);
    };
    dot(s.lag, '😈', 10); dot(s.you, '🎥', -10);
    floats(g, s, () => [w / 2, top + 30], theme);
  },
  laneAt(x, y, w, h, s) {
    // a tap near one of the next routers picks it
    if (!s) return null;
    const top = 34, opts = PacketRace.options(s);
    let best = null, bd = 70;
    opts.forEach((n, i) => { const d = Math.hypot(24 + (w - 48) * RNODES[n].x - x, top + 10 + (h - top - 30) * RNODES[n].y - y); if (d < bd) { bd = d; best = i; } });
    return best;
  },
};

// ---------------------------------------------------------------- Repeater Rescue (submarine)
// Light crosses the ocean through repeaters on the seabed. One at a time they start to
// lose power and blink red: tap them before they go dark. Then the Anchor Dragger cuts the
// West cable, and the island's traffic has to move to the South cable while the repair
// ship sails out, with the South cable's repeaters to look after in turn.
const REP = { power: 22, decide: 14, ship: 14, drain: 0.16, every: 2.6, perCable: 6, lives: 3 };
const REP_CABLES = [
  { from: 'Gateway Bay', to: 'Coherent Isle West', y: 0.3 },
  { from: 'Lightmoor', to: 'Coherent Isle South', y: 0.74 },
];
const REP_CHOICES = [
  { key: 'move', right: true, plain: 'Move it to the South cable', eng: 'Restore onto the South system' },
  { key: 'wait', plain: 'Wait for the repair ship', eng: 'Wait for the cable ship' },
  { key: 'boost', plain: 'Turn the light up', eng: 'Raise launch power' },
];
const repThird = (r) => Math.min(2, Math.floor((r.i * 3) / REP.perCable));
function mixUp(a, random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const RepeaterRescue = {
  id: 'repeaters',
  name: { plain: 'Repeater Rescue', eng: 'Repeater Rescue' },
  how: {
    plain: 'Light crosses the ocean through boosters on the sea floor. When one blinks red it is running out of power: tap it (or press 1, 2, 3 for the west, middle or east of the sea) before it goes dark. Then watch out for the anchor!',
    eng: 'The signal crosses the ocean through powered repeaters. A repeater blinking red is losing its power feed: tap it (or 1, 2, 3 for the west, middle or east third) before it drops. Then the Anchor Dragger cuts a cable: restore the island\'s traffic.',
  },
  goal: { plain: 'Keep the light crossing, and the island online', eng: 'Keep the repeaters powered and restore the island' },
  laneNames: { plain: ['West', 'Middle', 'East'], eng: ['West third', 'Middle third', 'East third'] },
  start(random = Math.random, opts = {}) {
    const reps = [];
    REP_CABLES.forEach((c, ci) => { for (let i = 0; i < REP.perCable; i++) reps.push({ cable: ci, i, u: 0.16 + (0.68 * i) / (REP.perCable - 1), power: 1, drain: 0 }); });
    return {
      t: 0, random, phase: 'power', pt: 0, reps, lives: REP.lives, fixed: 0, dark: 0, score: 0, fx: [], over: null,
      next: 1.2, choices: mixUp(REP_CHOICES, random), decided: null, len: opts.seconds ?? REP.power,
    };
  },
  active: (s) => (s.phase === 'power' ? 0 : s.phase === 'ship' ? 1 : null),
  tick(s, dt) {
    if (s.over) return;
    s.t += dt; s.pt += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.4);
    const cable = RepeaterRescue.active(s);
    if (cable != null) {
      // one repeater at a time starts losing power
      if ((s.next -= dt) <= 0) {
        const healthy = s.reps.filter((r) => r.cable === cable && !r.drain);
        if (healthy.length) healthy[Math.floor(s.random() * healthy.length)].drain = REP.drain;
        s.next = REP.every * (0.8 + 0.4 * s.random());
      }
      for (const r of s.reps) {
        if (!r.drain) continue;
        r.power -= r.drain * dt;
        if (r.power <= 0) { s.lives--; s.dark++; r.power = 1; r.drain = 0; float(s, repThird(r), 'Repeater dark!', false); }
      }
    }
    if (s.phase === 'power' && s.pt >= s.len) {
      s.phase = 'anchor'; s.pt = 0;
      for (const r of s.reps) { r.power = 1; r.drain = 0; }
      float(s, 1, '⚓ The anchor cut the West cable!', false);
    } else if (s.phase === 'anchor' && s.pt >= REP.decide) {
      s.over = 'lost'; s.wrong = 'late';
    } else if (s.phase === 'ship' && s.pt >= REP.ship) {
      s.over = 'won'; float(s, 1, '🚢 Cable repaired!', true);
    }
    if (s.lives <= 0) s.over = 'lost';
  },
  press(s, lane) {
    if (s.over) return;
    if (s.phase === 'anchor') {
      const c = s.choices[lane];
      if (!c) return;
      if (!c.right) { s.over = 'lost'; s.wrong = c.key; return; }
      s.decided = s.pt; s.phase = 'ship'; s.pt = 0; s.next = 2;
      s.score += 150 + Math.round((REP.decide - s.decided) * 10);
      float(s, 1, 'Island back online!', true);
      return;
    }
    const cable = RepeaterRescue.active(s);
    if (cable == null) return;
    // a tap on a repeater (10 + its index) or a third of the sea (the weakest there)
    const r = lane >= 10 ? s.reps[lane - 10]
      : s.reps.filter((x) => x.cable === cable && x.drain && repThird(x) === lane).sort((a, b) => a.power - b.power)[0];
    if (!r || r.cable !== cable || !r.drain) return;
    s.score += 20 + Math.round(r.power * 10); s.fixed++;
    r.power = 1; r.drain = 0;
    float(s, repThird(r), 'Powered up!', true);
  },
  lanes(s, words) {
    return s.phase === 'anchor' ? s.choices.map((c) => c[words]) : RepeaterRescue.laneNames[words];
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 50 : 0, flawless: s.dark === 0 };
  },
  summary(s, words) {
    const t = s.decided != null ? s.decided.toFixed(1) : null;
    return words === 'plain'
      ? `You powered up ${s.fixed} boosters on the sea floor${s.dark ? ` and lost ${s.dark}` : ' without letting one go dark'}. When the anchor cut the West cable, you moved the island to the South cable in ${t} seconds, and the repair ship fixed the cut.`
      : `${s.fixed} repeater power faults cleared, ${s.dark} dropped. After the cut on the West system, traffic was restored onto the South system in ${t} s and held while the cable ship made the repair.`;
  },
  // the seabed: where each cable runs, as x and y for u from 0 (left shore) to 1 (the island)
  at(c, u, w, h) {
    const top = 34, x0 = 70, x1 = w - 86, y = top + (h - top) * REP_CABLES[c].y + Math.sin(Math.PI * u) * 22;
    return [x0 + (x1 - x0) * u, y];
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    const top = 34;
    const phaseText = s.phase === 'power' ? (words === 'plain' ? 'Keep the light crossing' : 'Repeater power')
      : s.phase === 'anchor' ? (words === 'plain' ? 'Move the island!' : 'Restore the traffic!') : (words === 'plain' ? 'Repair ship on its way' : 'Cable ship en route');
    const meter = s.phase === 'power' ? s.pt / s.len : s.phase === 'anchor' ? 1 - s.pt / REP.decide : s.pt / REP.ship;
    hud(g, w, theme, `${phaseText} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(REP.lives - Math.max(0, s.lives))}`, meter, s.score, null);
    // the sea, the island and the shore
    g.fillStyle = theme.sea; roundRect(g, 4, top + 4, w - 8, h - top - 8, 12); g.fill();
    g.fillStyle = theme.land; roundRect(g, w - 74, top + 14, 66, h - top - 28, 18); g.fill();
    emoji(g, '🏝', w - 41, (top + h) / 2, 30);
    g.fillStyle = theme.ink; g.font = `800 11px ${theme.font}`; g.textAlign = 'center';
    g.fillText(words === 'plain' ? 'Coherent Isle' : 'Coherent Isle', w - 41, (top + h) / 2 + 30);
    if (s.phase === 'anchor' && Math.sin(s.t * 8) > 0) { g.fillStyle = theme.bad; g.fillText('offline!', w - 41, (top + h) / 2 + 44); }
    REP_CABLES.forEach((c, ci) => {
      const cut = ci === 0 && s.phase !== 'power';
      const live = RepeaterRescue.active(s) === ci;
      g.strokeStyle = live ? theme.accent : theme.muted; g.lineWidth = live ? 4 : 3; g.setLineDash(cut ? [8, 6] : []);
      g.beginPath();
      for (let k = 0; k <= 40; k++) { const [x, y] = RepeaterRescue.at(ci, k / 40, w, h); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); g.setLineDash([]);
      const [sx, sy] = RepeaterRescue.at(ci, 0, w, h);
      g.fillStyle = theme.paper; roundRect(g, 8, sy - 13, 58, 26, 8); g.fill(); g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.font = `800 10px ${theme.font}`; g.textAlign = 'center'; g.fillText(c.from, 37, sy + 4);
      // light pulses along a cable that works
      if (!cut) for (let k = 0; k < 6; k++) { const u = ((s.t * 0.25 + k / 6) % 1); const [x, y] = RepeaterRescue.at(ci, u, w, h); g.fillStyle = live ? theme.gold : theme.muted; g.globalAlpha = live ? 0.9 : 0.35; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.globalAlpha = 1; }
      if (cut) { const [x, y] = RepeaterRescue.at(0, 0.45, w, h); emoji(g, '✂', x, y + 2, 20); emoji(g, '⚓', x + 18, y - 22, 24); }
    });
    for (const r of s.reps) {
      const [x, y] = RepeaterRescue.at(r.cable, r.u, w, h);
      const live = RepeaterRescue.active(s) === r.cable;
      const blink = r.drain && Math.sin(s.t * 10) > 0;
      g.fillStyle = !live ? theme.well : r.drain ? (blink ? theme.bad : theme.paper) : theme.good;
      g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      if (r.drain) { g.strokeStyle = theme.bad; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r.power); g.stroke(); }
    }
    if (s.phase === 'ship') { const [x, y] = RepeaterRescue.at(0, 0.45 * Math.min(1, s.pt / REP.ship), w, h); emoji(g, '🚢', x, y - 26, 26); }
    floats(g, s, (lane) => [w * (0.25 + lane * 0.25), top + 22], theme);
  },
  laneAt(x, y, w, h, s) {
    if (!s) return null;
    const cable = RepeaterRescue.active(s);
    if (cable == null) return null;
    let best = null, bd = 44;
    s.reps.forEach((r, i) => { if (r.cable !== cable) return; const [rx, ry] = RepeaterRescue.at(r.cable, r.u, w, h); const d = Math.hypot(rx - x, ry - y); if (d < bd) { bd = d; best = 10 + i; } });
    return best;
  },
};

// ---------------------------------------------------------------- Rainbow Packing (metro optical)
// A tetris of light. The columns are the colours on the fibre, the rows the four spans of
// the Lumen City ring between its hubs. Each request needs its colours free on every span
// it crosses, all in the same place (one colour end to end), so a two-span request is a
// tall piece. Move it with ◀ ▶ and drop it; the Spectrum Hog drops blocks of his own.
const RB = { cols: 12, goal: 8, patience: 16, lives: 3, hogEvery: 3 };
const RB_HUBS = ['North', 'East', 'South', 'West'];
const RB_SIZES = [
  { w: 1, plain: 'a small link', eng: '100G' },
  { w: 2, plain: 'a big link', eng: '400G' },
  { w: 3, plain: 'a data center link', eng: '800G DCI' },
];
function rbPiece(s) {
  const r = s.random();
  const size = r < 0.5 ? RB_SIZES[0] : r < 0.85 ? RB_SIZES[1] : RB_SIZES[2];
  const from = Math.floor(s.random() * 4), spans = s.random() < 0.4 ? 2 : 1;
  const rows = Array.from({ length: spans }, (_, k) => (from + k) % 4);
  return { rows, w: size.w, size, from, to: (from + spans) % 4, col: 0, t: 0 };
}
const rbFits = (s, p, col) => col >= 0 && col + p.w <= RB.cols && p.rows.every((row) => { for (let c = col; c < col + p.w; c++) if (s.grid[row][c]) return false; return true; });
const rbAnyFit = (s, p) => { for (let c = 0; c + p.w <= RB.cols; c++) if (rbFits(s, p, c)) return true; return false; };
function rbNext(s) {
  // the Spectrum Hog helps himself every few requests
  if (s.placed && s.placed % RB.hogEvery === 0 && s.hogFor !== s.placed) {
    s.hogFor = s.placed;
    const row = Math.floor(s.random() * 4), free = [];
    for (let c = 0; c + 2 <= RB.cols; c++) if (!s.grid[row][c] && !s.grid[row][c + 1]) free.push(c);
    if (free.length) { const c = free[Math.floor(s.random() * free.length)]; s.grid[row][c] = s.grid[row][c + 1] = 'hog'; s.hogs++; float(s, 1, '🐷 The Spectrum Hog grabbed some spectrum!', false); }
  }
  s.piece = rbPiece(s);
  if (!rbAnyFit(s, s.piece)) rbLose(s, 'No room anywhere!');
}
function rbLose(s, text) { s.lives--; s.lost++; float(s, 1, text, false); s.piece = null; s.wait = 0.8; }
const RainbowPacking = {
  id: 'rainbow',
  name: { plain: 'Rainbow Packing', eng: 'Rainbow Packing' },
  how: {
    plain: 'Each request needs some colours of light on the Lumen City ring. Move it with ◀ and ▶ (or 1 and 3) and drop it with the middle button (or 2). A request over two stretches of the ring needs the same colours free on both. Pack them tight: the Spectrum Hog takes whatever is left!',
    eng: 'Each request needs spectrum on the Lumen City ring. Move it with ◀ ▶ (1, 3), drop with 2. A request over two spans needs the same slots free on both (wavelength continuity). Pack without gaps: the Spectrum Hog grabs spectrum too.',
  },
  goal: { plain: `Light up ${RB.goal} connections`, eng: `Place ${RB.goal} services without blocking` },
  laneNames: { plain: ['◀ Move', 'Drop', 'Move ▶'], eng: ['◀ Lower', 'Place', 'Higher ▶'] },
  start(random = Math.random, opts = {}) {
    const s = {
      t: 0, random, grid: Array.from({ length: 4 }, () => Array(RB.cols).fill(null)), piece: null, wait: 0.3,
      placed: 0, big: 0, hogs: 0, lost: 0, bumps: 0, tight: 0, lives: RB.lives, score: 0, fx: [], over: null, goal: opts.goal ?? RB.goal,
    };
    return s;
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.4);
    if (!s.piece) { if ((s.wait -= dt) <= 0) rbNext(s); }
    else if ((s.piece.t += dt) >= RB.patience) rbLose(s, 'The request gave up waiting');
    if (s.lives <= 0) s.over = 'lost';
    else if (s.placed >= s.goal) s.over = 'won';
  },
  press(s, lane) {
    if (s.over || !s.piece) return;
    const p = s.piece;
    if (lane >= 10) { const c = Math.min(RB.cols - p.w, Math.max(0, lane - 10)); if (c !== p.col) { p.col = c; return; } lane = 1; }
    if (lane === 0) p.col = Math.max(0, p.col - 1);
    else if (lane === 2) p.col = Math.min(RB.cols - p.w, p.col + 1);
    else if (lane === 1) {
      if (!rbFits(s, p, p.col)) { s.bumps++; float(s, 1, 'Those colours are taken there', false); return; }
      const id = `p${s.placed}`;
      for (const row of p.rows) for (let c = p.col; c < p.col + p.w; c++) s.grid[row][c] = id;
      // packed tight: against the edge or against something already there
      const touches = p.col === 0 || p.rows.some((row) => s.grid[row][p.col - 1]);
      if (touches) s.tight++;
      s.placed++; if (p.w > 1) s.big++;
      const pts = 30 + (touches ? 15 : 0) + Math.round((1 - p.t / RB.patience) * 10);
      s.score += pts; float(s, 1, touches ? `Packed tight! +${pts}` : `+${pts}`, true);
      s.piece = null; s.wait = 0.4;
    }
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 40 : 0, flawless: s.lost === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You lit ${s.placed} connections, ${s.big} of them big ones, and packed ${s.tight} of them tight against the others. The Spectrum Hog grabbed ${s.hogs} piece${s.hogs === 1 ? '' : 's'} of the rainbow${s.lost ? `, and ${s.lost} request${s.lost === 1 ? '' : 's'} found no room` : ', and still every request found room'}.`
      : `${s.placed} services placed (${s.big} at 400G or more), ${s.tight} packed without a gap, ${s.lost} blocked; the Spectrum Hog took ${s.hogs} slot pair${s.hogs === 1 ? '' : 's'}.`;
  },
  grid(w, h) {
    const top = 96, left = 66, cw = (w - left - 12) / RB.cols, rh = (h - top - 10) / 4;
    return { top, left, cw, rh };
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `${s.placed} / ${s.goal} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(RB.lives - Math.max(0, s.lives))}`, s.placed / s.goal, s.score, null);
    const { top, left, cw, rh } = RainbowPacking.grid(w, h);
    // the spectrum along the top: one colour per column
    for (let c = 0; c < RB.cols; c++) { g.fillStyle = `hsl(${(c / RB.cols) * 300}, 85%, 58%)`; g.fillRect(left + c * cw, top - 10, cw, 6); }
    for (let row = 0; row < 4; row++) {
      const y = top + row * rh;
      g.fillStyle = theme.ink; g.font = `800 11px ${theme.font}`; g.textAlign = 'right';
      g.fillText(`${RB_HUBS[row][0]} → ${RB_HUBS[(row + 1) % 4][0]}`, left - 8, y + rh / 2 + 4);
      for (let c = 0; c < RB.cols; c++) {
        const v = s.grid[row][c], x = left + c * cw;
        g.fillStyle = v === 'hog' ? '#f4a6c0' : v ? `hsl(${(c / RB.cols) * 300}, 75%, 55%)` : theme.well;
        roundRect(g, x + 1.5, y + 1.5, cw - 3, rh - 3, 5); g.fill();
        if (v === 'hog') emoji(g, '🐷', x + cw / 2, y + rh / 2, Math.min(18, rh * 0.5));
      }
    }
    const p = s.piece;
    if (p) {
      const ok = rbFits(s, p, p.col);
      for (const row of p.rows) {
        g.strokeStyle = ok ? theme.good : theme.bad; g.lineWidth = 3;
        roundRect(g, left + p.col * cw + 1, top + row * rh + 1, p.w * cw - 2, rh - 2, 6); g.stroke();
        g.globalAlpha = 0.35; g.fillStyle = ok ? theme.good : theme.bad; g.fill(); g.globalAlpha = 1;
      }
      // the request itself, above the grid, with its patience running out
      const label = words === 'plain'
        ? `${RB_HUBS[p.from]} → ${RB_HUBS[p.to]} hub · ${p.size.plain}${p.rows.length > 1 ? ' · 2 stretches' : ''}`
        : `${RB_HUBS[p.from]} → ${RB_HUBS[p.to]} · ${p.size.eng} · ${p.rows.length} span${p.rows.length > 1 ? 's' : ''}`;
      g.fillStyle = theme.paper; roundRect(g, left, 36, w - left - 12, 36, 10); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.font = `800 13px ${theme.font}`; g.textAlign = 'left'; g.fillText(label, left + 10, 58);
      g.fillStyle = p.t / RB.patience > 0.7 ? theme.bad : theme.accent;
      g.fillRect(left + 6, 66, (w - left - 24) * (1 - p.t / RB.patience), 3);
    }
    floats(g, s, () => [w / 2, top + 4 * rh - 12], theme);
  },
  laneAt(x, y, w, h, s) {
    const { left, cw } = RainbowPacking.grid(w, h);
    if (!s?.piece || x < left) return null;
    return 10 + Math.floor((x - left) / cw);
  },
};

// ---------------------------------------------------------------- Mesh Rescue (long haul)
// A storm cuts the long-haul mesh one fibre after another. Every cut drops the services
// riding it; for each one, pick one of three ways round. Each fibre carries only a few
// waves, so a way round that is fine now can leave no room for the next cut: think ahead.
const MESH = { cap: 2, decide: 25, lives: 3, pause: 1.6 };
const MNODES = {
  pf: { x: 0.08, y: 0.34, name: 'Prismfield' }, rr: { x: 0.3, y: 0.1, name: 'Raman Ridge' },
  lv: { x: 0.58, y: 0.12, name: 'Lambdaview' }, cp: { x: 0.36, y: 0.52, name: 'Crosspoint' },
  eg: { x: 0.64, y: 0.54, name: 'Erbium Gap' }, sv: { x: 0.92, y: 0.36, name: 'Spectraville' },
  gb: { x: 0.2, y: 0.9, name: 'Glassbridge' }, bb: { x: 0.76, y: 0.9, name: 'Beambrook' },
};
const MLINKS = [['pf', 'rr'], ['rr', 'lv'], ['lv', 'sv'], ['pf', 'cp'], ['rr', 'cp'], ['cp', 'lv'], ['cp', 'eg'], ['lv', 'eg'], ['eg', 'sv'], ['pf', 'gb'], ['gb', 'cp'], ['gb', 'bb'], ['bb', 'eg'], ['bb', 'sv']];
const MSERVICES = [['pf', 'sv'], ['gb', 'lv'], ['rr', 'bb'], ['pf', 'eg']];
const MCOLORS = ['#e76f51', '#2f80ed', '#12a35a', '#b5179e'];
const MCUTS = ['cp-eg', 'lv-sv', 'bb-eg', 'cp-lv'];
const mkey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
const mlen = (a, b) => Math.hypot((MNODES[a].x - MNODES[b].x) * 1.6, MNODES[a].y - MNODES[b].y);
const plen = (path) => path.slice(1).reduce((d, n, i) => d + mlen(path[i], n), 0);
// every way from a to b that does not use a cut fibre or visit a node twice, shortest first
function meshPaths(s, a, b) {
  const out = [], walk = (n, path) => {
    if (n === b) { out.push(path); return; }
    if (path.length > 6) return;
    for (const [x, y] of MLINKS) {
      const m = x === n ? y : y === n ? x : null;
      if (m && !path.includes(m) && !s.cut.has(mkey(n, m))) walk(m, [...path, m]);
    }
  };
  walk(a, [a]);
  return out.sort((p, q) => plen(p) - plen(q));
}
const meshFits = (s, path) => path.slice(1).every((n, i) => (s.used[mkey(path[i], n)] ?? 0) < MESH.cap);
function meshTake(s, path, k) { path.slice(1).forEach((n, i) => { s.used[mkey(path[i], n)] = (s.used[mkey(path[i], n)] ?? 0) + k; }); }
function meshNextCut(s) {
  if (s.cutsDone >= s.cuts) { s.over = 'won'; return; }
  const k = MCUTS[s.cutsDone++];
  s.cut.add(k);
  float(s, 1, `✂ ${MNODES[k.split('-')[0]].name} – ${MNODES[k.split('-')[1]].name} cut!`, false);
  // the services on that fibre drop, and free the rest of their way
  for (const sv of s.services) {
    if (!sv.path || !sv.path.slice(1).some((n, i) => mkey(sv.path[i], n) === k)) continue;
    meshTake(s, sv.path, -1);
    sv.path = null; s.queue.push(sv);
  }
  meshAsk(s);
}
function meshAsk(s) {
  s.asking = null;
  while (s.queue.length) {
    const sv = s.queue.shift();
    const routes = meshPaths(s, sv.a, sv.b).slice(0, 3);
    if (!routes.some((r) => meshFits(s, r))) { s.lives--; s.down++; float(s, 1, `No way round: ${MNODES[sv.a].name} – ${MNODES[sv.b].name} is down`, false); continue; }
    s.asking = { sv, routes, t: 0 };
    return;
  }
  s.pause = MESH.pause;
}
const MeshRescue = {
  id: 'mesh',
  name: { plain: 'Mesh Rescue', eng: 'Mesh Rescue' },
  how: {
    plain: 'A storm is cutting the country\'s light highway, one fibre after another. When a link between two towns breaks, pick one of three ways round (tap it, or press 1, 2, 3). Each fibre has room for only two links, so think ahead: the next cut is coming!',
    eng: 'A storm cuts long-haul fibres one after another. For each service that drops, pick one of three restoration routes (1, 2, 3). Each fibre carries two waves, so a greedy choice now can block the next restoration.',
  },
  goal: { plain: 'Keep the towns connected through the storm', eng: 'Restore every service through four cuts' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random, opts = {}) {
    const s = {
      t: 0, random, cut: new Set(), used: {}, services: [], queue: [], asking: null, pause: 1.2, cuts: opts.cuts ?? MCUTS.length, cutsDone: 0,
      lives: MESH.lives, restored: 0, down: 0, full: 0, longest: 0, score: 0, fx: [], over: null,
    };
    MSERVICES.forEach(([a, b], i) => { const path = meshPaths(s, a, b)[0]; s.services.push({ a, b, path, color: MCOLORS[i] }); meshTake(s, path, 1); });
    return s;
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.6);
    if (s.asking) {
      if ((s.asking.t += dt) >= MESH.decide) { s.lives--; s.down++; float(s, 1, 'Too late: that service is down', false); meshAsk(s); }
    } else if ((s.pause -= dt) <= 0) meshNextCut(s);
    if (s.lives <= 0) s.over = 'lost';
  },
  press(s, lane) {
    if (s.over || !s.asking) return;
    const r = s.asking.routes[lane];
    if (!r) return;
    if (!meshFits(s, r)) { s.full++; float(s, 1, 'No room on that fibre!', false); return; }
    const sv = s.asking.sv;
    sv.path = r; meshTake(s, r, 1); s.restored++;
    s.longest = Math.max(s.longest, r.length - 1);
    const pts = 100 + Math.round((1 - s.asking.t / MESH.decide) * 30);
    s.score += pts; float(s, 1, `Back up! +${pts}`, true);
    meshAsk(s);
  },
  lanes(s, words) {
    const a = s.asking;
    if (!a) return ['—', '—', '—'];
    return [0, 1, 2].map((i) => {
      const r = a.routes[i];
      if (!r) return '—';
      const via = MNODES[r[1] === a.sv.b ? r[0] : r[1]].name;
      return `${words === 'plain' ? 'via' : 'via'} ${via} · ${r.length - 1} ${words === 'plain' ? 'hops' : 'spans'}${meshFits(s, r) ? '' : ' · full'}`;
    });
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 50 : 0, flawless: s.down === 0 && s.full === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `The storm cut ${s.cutsDone} fibres. You found a way round for ${s.restored} links between towns${s.down ? `, and ${s.down} went down` : ' and not one town lost its connection'}. ${s.full ? `${s.full} time${s.full === 1 ? '' : 's'} you tried a fibre that was already full.` : 'You never tried a fibre that was already full.'}`
      : `${s.cutsDone} fibre cuts, ${s.restored} services restored, ${s.down} lost; longest restoration ${s.longest} spans; ${s.full} attempt${s.full === 1 ? '' : 's'} on a full fibre.`;
  },
  pos: (n, w, h) => [30 + (w - 60) * MNODES[n].x, 44 + (h - 70) * MNODES[n].y],
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `${words === 'plain' ? 'Storm' : 'Cuts'} ${s.cutsDone} / ${s.cuts} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(MESH.lives - Math.max(0, s.lives))}`, s.asking ? 1 - s.asking.t / MESH.decide : s.cutsDone / s.cuts, s.score, null);
    const P = (n) => MeshRescue.pos(n, w, h);
    for (const [a, b] of MLINKS) {
      const [ax, ay] = P(a), [bx, by] = P(b), k = mkey(a, b), cut = s.cut.has(k), used = s.used[k] ?? 0;
      g.strokeStyle = cut ? theme.muted : used >= MESH.cap ? theme.bad : theme.muted; g.lineWidth = cut ? 2 : 3; g.setLineDash(cut ? [6, 6] : []);
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (cut) emoji(g, '✂', mx, my, 18);
      else for (let c = 0; c < MESH.cap; c++) { g.fillStyle = c < used ? theme.ink : theme.paper; g.strokeStyle = theme.ink; g.lineWidth = 1.5; g.fillRect(mx - 9 + c * 10, my - 4, 8, 8); g.strokeRect(mx - 9 + c * 10, my - 4, 8, 8); }
    }
    // the services that are up, each in its colour, slightly apart so they don't hide each other
    s.services.forEach((sv, i) => {
      if (!sv.path) return;
      g.strokeStyle = sv.color; g.lineWidth = 3; g.globalAlpha = 0.85;
      g.beginPath();
      sv.path.forEach((n, j) => { const [x, y] = P(n); const o = (i - 1.5) * 3; if (j) g.lineTo(x + o, y + o); else g.moveTo(x + o, y + o); });
      g.stroke(); g.globalAlpha = 1;
    });
    // the ways round on offer, numbered on their middle hop
    if (s.asking) {
      s.asking.routes.forEach((r, i) => {
        const fits = meshFits(s, r);
        g.strokeStyle = fits ? theme.accent : theme.bad; g.lineWidth = 6; g.globalAlpha = 0.45; g.setLineDash([10, 6]);
        g.beginPath(); r.forEach((n, j) => { const [x, y] = P(n); if (j) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
        g.setLineDash([]); g.globalAlpha = 1;
        const [bx, by] = MeshRescue.badge(s, i, w, h);
        g.fillStyle = fits ? theme.accent : theme.bad; g.beginPath(); g.arc(bx, by, 13, 0, 7); g.fill();
        g.fillStyle = '#ffffff'; g.font = `800 13px ${theme.font}`; g.textAlign = 'center'; g.fillText(String(i + 1), bx, by + 5);
      });
      const sv = s.asking.sv;
      g.fillStyle = sv.color; g.font = `800 13px ${theme.font}`; g.textAlign = 'center';
      g.fillText(`${MNODES[sv.a].name} – ${MNODES[sv.b].name} ${words === 'plain' ? 'needs a way round' : 'needs restoration'}`, w / 2, h - 8);
    }
    for (const n of Object.keys(MNODES)) {
      const [x, y] = P(n);
      g.font = `800 11px ${theme.font}`; const tw = g.measureText(MNODES[n].name).width;
      g.fillStyle = theme.paper; roundRect(g, x - tw / 2 - 6, y - 10, tw + 12, 20, 7); g.fill();
      g.strokeStyle = s.asking && (n === s.asking.sv.a || n === s.asking.sv.b) ? s.asking.sv.color : theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.textAlign = 'center'; g.fillText(MNODES[n].name, x, y + 4);
    }
    floats(g, s, () => [w / 2, 52], theme);
  },
  // where a route's number sits: halfway along it
  badge(s, i, w, h) {
    const r = s.asking.routes[i], m = r[Math.floor(r.length / 2)], m0 = r[Math.floor(r.length / 2) - 1];
    const [ax, ay] = MeshRescue.pos(m0, w, h), [bx, by] = MeshRescue.pos(m, w, h);
    return [(ax + bx) / 2 + (i - 1) * 8, (ay + by) / 2 - 14 + i * 4];
  },
  laneAt(x, y, w, h, s) {
    if (!s?.asking) return null;
    let best = null, bd = 50;
    s.asking.routes.forEach((r, i) => { const [bx, by] = MeshRescue.badge(s, i, w, h); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; best = i; } });
    return best;
  },
};

// ---------------------------------------------------------------- The fight with Lord Lag
// The finale: three short rounds of games already played, a packet tetris, a race with a
// fibre cut, and a storm on the long haul, with Lord Lag taunting between rounds. Each
// round won knocks off one of his three hearts.
const BOSS_ROUNDS = [
  { game: PacketTetris, opts: { goal: 8 }, taunt: { plain: 'Let\'s see you sort THIS, apprentice! Elephants first!', eng: 'Round one: queue this, if you can. My elephant flows are already on the uplink.' } },
  { game: PacketRace, opts: { first: 2, races: 1, need: 1 }, taunt: { plain: 'Lucky! Now race me, and mind the cut fibre!', eng: 'Round two: one race, one fibre cut. My IGP against your head end.' } },
  { game: MeshRescue, opts: { cuts: 2 }, taunt: { plain: 'Enough! My storm will cut you off for good!', eng: 'Final round: a storm on the long haul. Restore that, Chief.' } },
];
const LordLagFight = {
  id: 'boss',
  name: { plain: 'The fight with Lord Lag', eng: 'The fight with Lord Lag' },
  how: {
    plain: 'So you got this far, apprentice. Three rounds, three games you already know, a little faster and a little meaner: a packet tetris, a race with a cut fibre, and a storm. Win all three and Netlandia is yours!',
    eng: 'Lord Lag\'s last stand: three short rounds, Packet Tetris, a Packet Race with a link failure, and Mesh Rescue in a storm. Win all three to bring Netlandia back for good.',
  },
  goal: { plain: 'Win three rounds against Lord Lag', eng: 'Three rounds: win them all' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random) {
    const s = { t: 0, random, round: 0, sub: null, between: 2.4, points: 0, results: [], fx: [], over: null };
    return s;
  },
  game: (s) => BOSS_ROUNDS[s.round].game,
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    if (s.between > 0) {
      if ((s.between -= dt) <= 0) { const r = BOSS_ROUNDS[s.round]; s.sub = r.game.start(s.random, r.opts); }
      return;
    }
    const G = LordLagFight.game(s);
    G.tick(s.sub, dt);
    const res = G.result(s.sub);
    if (!res) return;
    if (!res.won) { s.over = 'lost'; return; }
    s.points += res.points; s.results.push({ game: G, st: s.sub, flawless: res.flawless });
    if (s.round === BOSS_ROUNDS.length - 1) { s.over = 'won'; return; }
    s.round++; s.sub = null; s.between = 2.6;
  },
  press(s, lane) { if (!s.over && s.sub) LordLagFight.game(s).press(s.sub, lane); },
  lanes(s, words) {
    if (!s.sub) return ['—', '—', '—'];
    const G = LordLagFight.game(s);
    return G.lanes ? G.lanes(s.sub, words) : G.laneNames[words];
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.points + 300 : 0, flawless: s.results.every((r) => r.flawless) };
  },
  summary(s, words) {
    const parts = s.results.map((r, i) => `${words === 'plain' ? 'Round' : 'R'}${words === 'plain' ? ' ' : ''}${i + 1}, ${r.game.name[words]}: ${r.game.summary(r.st, words)}`);
    return `${parts.join(' ')} ${words === 'plain' ? 'Lord Lag is beaten!' : 'Lord Lag: defeated.'}`;
  },
  draw(g, s, w, h, words, theme) {
    if (s.sub) LordLagFight.game(s).draw(g, s.sub, w, h, words, theme);
    else {
      // between rounds: Lord Lag himself, and what he has to say
      g.clearRect(0, 0, w, h);
      emoji(g, '😈', w / 2, h * 0.36, 72);
      g.fillStyle = theme.ink; g.font = `800 16px ${theme.font}`; g.textAlign = 'center';
      g.fillText(`Round ${s.round + 1} of ${BOSS_ROUNDS.length} · ${BOSS_ROUNDS[s.round].game.name[words]}`, w / 2, h * 0.62);
      g.font = `700 14px ${theme.font}`; g.fillStyle = theme.muted;
      g.fillText(`“${BOSS_ROUNDS[s.round].taunt[words]}”`, w / 2, h * 0.72, w - 40);
    }
    // Lord Lag's hearts, one lost for every round you win
    const left = BOSS_ROUNDS.length - s.results.length;
    g.font = `800 13px ${theme.font}`; g.textAlign = 'right'; g.fillStyle = theme.bad;
    g.fillText(`😈 ${'♥'.repeat(left)}${'♡'.repeat(BOSS_ROUNDS.length - left)}`, w - 10, h - 8);
  },
  laneAt(x, y, w, h, s) { return s?.sub ? LordLagFight.game(s).laneAt(x, y, w, h, s.sub) : null; },
};

// ---------------------------------------------------------------- drawing helpers
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function emoji(g, ch, x, y, size) {
  g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x, y); g.textBaseline = 'alphabetic';
}
// the strip along the top: a meter, the score and the time left
function hud(g, w, theme, label, meter, score, secondsLeft) {
  g.fillStyle = theme.well; roundRect(g, 8, 6, w * 0.5, 20, 10); g.fill();
  g.fillStyle = meter < 0.3 && secondsLeft != null ? theme.bad : theme.accent; roundRect(g, 8, 6, Math.max(20, w * 0.5 * clamp01(meter)), 20, 10); g.fill();
  g.fillStyle = theme.ink; g.font = `800 11px ${theme.font}`; g.textAlign = 'left'; g.fillText(label, 16, 20);
  g.textAlign = 'right'; g.font = `800 14px ${theme.font}`;
  g.fillText(`${secondsLeft != null ? `${Math.ceil(secondsLeft)} s · ` : ''}${score} pts`, w - 10, 21);
}
function floats(g, s, at, theme) {
  for (const f of s.fx) {
    const [x, y] = at(f.lane);
    g.globalAlpha = 1 - f.t;
    g.fillStyle = f.good ? theme.good : theme.bad; g.font = `800 15px ${theme.font}`; g.textAlign = 'center';
    g.fillText(f.text, x, y - f.t * 24);
    g.globalAlpha = 1;
  }
}

// Which chapter plays which game; the rest keep their questions for now.
// The finale after the Level 2 exam.
export const BOSS = LordLagFight;

export const MINIGAMES = {
  xhaul: KeepTheBeat, aggregation: PacketTetris, ipcore: PacketRace,
  submarine: RepeaterRescue, metro: RainbowPacking, longhaul: MeshRescue,
};
