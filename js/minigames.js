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
  start(random = Math.random) {
    return { t: 0, random, packets: [], next: 0.6, sync: 100, score: 0, combo: 0, best: 0, hits: 0, perfects: 0, misses: 0, bugged: 0, fx: [], over: null, bugs: false };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    const k = Math.min(1, s.t / BEAT.seconds);
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
    if (s.sync <= 0) { s.sync = 0; s.over = 'lost'; } else if (s.t >= BEAT.seconds) s.over = 'won';
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
    hud(g, w, theme, `${words === 'plain' ? 'Time in step' : 'Phase sync'}`, s.sync / 100, s.score, Math.max(0, BEAT.seconds - s.t));
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
  start(random = Math.random) {
    return {
      t: 0, random, lives: SORT.lives, sorted: 0, score: 0, fx: [], over: null, elephants: false, lostLife: false,
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
    if (s.lives <= 0) s.over = 'lost'; else if (s.sorted >= SORT.goal) s.over = 'won';
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
    hud(g, w, theme, `${s.sorted} / ${SORT.goal} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(SORT.lives - Math.max(0, s.lives))}`, s.sorted / SORT.goal, Math.max(0, s.score), null);
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
  start(random = Math.random) {
    const s = { t: 0, random, race: 0, wins: 0, losses: 0, fx: [], over: null, margins: [], reroutes: 0, dodged: 0, between: 0, rt: 0 };
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
        if (s.race === RACE.races - 1) s.over = s.wins >= RACE.need ? 'won' : 'lost';
        else if (s.losses > RACE.races - RACE.need) s.over = 'lost';
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
    hud(g, w, theme, `Race ${Math.min(s.race + 1, RACE.races)} / ${RACE.races} · You ${s.wins} – ${s.losses} Lord Lag`, s.wins / RACE.need, PacketRace.result({ ...s, over: 'won' }).points, null);
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
export const MINIGAMES = { xhaul: KeepTheBeat, aggregation: PacketTetris, ipcore: PacketRace };
