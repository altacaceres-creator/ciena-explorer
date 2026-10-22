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
const RACE = { races: 3, need: 2, speed: 0.42, reconverge: 1.5, think: 0.15, lag: 1.15 };
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
  // Lord Lag's packet is a little quicker than yours: only a good route beats him
  r.p += ((r === s.lag ? RACE.lag : 1) * RACE.speed / (1 + 3 * jam)) * dt / rlen(r.at, r.to);
  if (r.p >= 1) { r.at = r.to; r.to = null; r.p = 0; r.visited.add(r.at); if (r.at === 'ed') r.done = true; }
}
const PacketRace = {
  id: 'race',
  name: { plain: 'Packet Race', eng: 'Packet Race' },
  how: {
    plain: 'Your video call races Lord Lag\'s packet from Gateway Bay to Edgewater. At each router, tap where to go next (or press 1, 2, 3); the race slows right down while you choose. Elephants 🐘 jam different roads each race, so look before you go. Lord Lag\'s packet is a little faster than yours, and always takes the shortest road. Win two of the three races!',
    eng: 'Your EF video packet races Lord Lag\'s from the Gateway Bay PE to Edgewater. At each node pick the next segment (1, 2, 3): you are the SR-TE head end. Elephant flows load different links each race; Lord Lag follows the IGP shortest path, a little faster than you. In race 3 a link fails: reroute. Win two of three.',
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
// North cable, and the island's traffic has to move to the South cable while the repair
// ship sails out, with the South cable's repeaters to look after in turn.
const REP = { power: 22, decide: 14, ship: 14, drain: 0.16, every: 2.6, perCable: 6, lives: 3 };
// two cables to the island, named on the board so the choice after the cut is clear
const REP_CABLES = [
  { from: 'Gateway Bay', to: 'Coherent Isle West', y: 0.3, name: { plain: 'North cable', eng: 'North system' } },
  { from: 'Lightmoor', to: 'Coherent Isle South', y: 0.74, name: { plain: 'South cable', eng: 'South system' } },
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
    plain: 'Two cables cross the ocean to Coherent Isle, the North cable and the South cable, with boosters along the sea floor. When a booster blinks red it is running out of power: tap it (or press 1, 2, 3 for the west, middle or east of the sea) before it goes dark. Then watch out for the anchor!',
    eng: 'Two subsea systems land on Coherent Isle, North and South, each a chain of powered repeaters. A repeater blinking red is losing its power feed: tap it (or 1, 2, 3 for the west, middle or east third) before it drops. Then the Anchor Dragger cuts a system: restore the island\'s traffic.',
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
      float(s, 1, '⚓ The anchor cut the North cable!', false);
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
      ? `You powered up ${s.fixed} boosters on the sea floor${s.dark ? ` and lost ${s.dark}` : ' without letting one go dark'}. When the anchor cut the North cable, you moved the island to the South cable in ${t} seconds, and the repair ship fixed the cut.`
      : `${s.fixed} repeater power faults cleared, ${s.dark} dropped. After the cut on the North system, traffic was restored onto the South system in ${t} s and held while the cable ship made the repair.`;
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
      const [, sy] = RepeaterRescue.at(ci, 0, w, h);
      g.font = `800 10px ${theme.font}`;
      const bw = Math.max(58, g.measureText(c.from).width + 12);
      g.fillStyle = theme.paper; roundRect(g, 6, sy - 13, bw, 26, 8); g.fill(); g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.textAlign = 'center'; g.fillText(c.from, 6 + bw / 2, sy + 4);
      // light pulses along a cable that works
      if (!cut) for (let k = 0; k < 6; k++) { const u = ((s.t * 0.25 + k / 6) % 1); const [x, y] = RepeaterRescue.at(ci, u, w, h); g.fillStyle = live ? theme.gold : theme.muted; g.globalAlpha = live ? 0.9 : 0.35; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); g.globalAlpha = 1; }
      if (cut) { const [x, y] = RepeaterRescue.at(0, 0.45, w, h); emoji(g, '✂', x, y + 2, 20); emoji(g, '⚓', x + 18, y - 22, 24); }
      const [nx, ny] = RepeaterRescue.at(ci, 0.62, w, h);
      g.font = `800 12px ${theme.font}`; const nw = g.measureText(c.name[words]).width + 14;
      g.fillStyle = live ? theme.accent : theme.paper; roundRect(g, nx - nw / 2, ny + 18, nw, 20, 10); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = live ? '#ffffff' : theme.ink; g.textAlign = 'center'; g.fillText(`${c.name[words]}${cut ? ' ✂' : ''}`, nx, ny + 32);
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
// the three roads round, one colour each, the same on the board and on the buttons
const MROUTE = ['#f59f00', '#7b2ff7', '#00a5b8'];
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
  tall: true,
  name: { plain: 'Mesh Rescue', eng: 'Mesh Rescue' },
  how: {
    plain: 'A storm is cutting the country\'s light highway. When a fibre is cut (✂), two towns lose their light and start blinking. Three roads round appear, each in its own colour: tap one, or its button, or press 1, 2, 3. Every fibre has room for only two lights (the two dots on it); a full fibre turns red. Save room: another cut is coming!',
    eng: 'A storm cuts long-haul fibres one after another. When a cut (✂) drops a service, its two ROADMs blink and three restoration routes appear, each in its own colour: pick one (tap, or 1, 2, 3). Each fibre carries two waves (the two dots); a full fibre turns red, so a greedy choice now can block the next restoration.',
  },
  goal: { plain: 'Keep the towns connected through the storm', eng: 'Restore every service through four cuts' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random, opts = {}) {
    const s = {
      t: 0, random, cut: new Set(), used: {}, services: [], queue: [], asking: null, pause: 1.2, cuts: opts.cuts ?? MCUTS.length, cutsDone: 0,
      lives: MESH.lives, flows: [], next: 0, restored: 0, down: 0, full: 0, longest: 0, score: 0, fx: [], over: null,
    };
    MSERVICES.forEach(([a, b], i) => { const path = meshPaths(s, a, b)[0]; s.services.push({ a, b, path, color: MCOLORS[i] }); meshTake(s, path, 1); });
    return s;
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.6);
    for (const f of s.flows) f.t += dt;
    s.flows = s.flows.filter((f) => f.t < 1.6);
    if (s.next > 0) { if ((s.next -= dt) <= 0) meshAsk(s); } else if (s.asking) {
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
    s.flows.push({ path: r, color: MROUTE[lane], t: 0 });
    s.longest = Math.max(s.longest, r.length - 1);
    const pts = 100 + Math.round((1 - s.asking.t / MESH.decide) * 30);
    s.score += pts; float(s, 1, `Back up! +${pts}`, true);
    // a moment to watch the light come back before the next question
    s.asking = null; s.next = 0.9;
  },
  lanes(s, words) {
    const a = s.asking;
    if (!a) return ['—', '—', '—'];
    return [0, 1, 2].map((i) => {
      const r = a.routes[i];
      if (!r) return '—';
      // name the route by a town on it that the other routes on offer don't pass through
      const mid = r.slice(1, -1), elsewhere = new Set(a.routes.filter((x) => x !== r).flatMap((x) => x.slice(1, -1)));
      const via = MNODES[mid.find((n) => !elsewhere.has(n)) ?? mid[0] ?? r[0]].name;
      return meshFits(s, r) ? `via ${via} · ${r.length - 1} ${words === 'plain' ? 'hops' : 'spans'}` : `✗ via ${via} · ${words === 'plain' ? 'full' : 'no capacity'}`;
    });
  },
  // each road's button wears its road's colour; a full road's goes grey
  laneColors: (s) => [0, 1, 2].map((i) => (s.asking?.routes[i] ? (meshFits(s, s.asking.routes[i]) ? MROUTE[i] : '#8a94a6') : null)),
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 50 : 0, flawless: s.down === 0 && s.full === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `The storm cut ${s.cutsDone} fibres. You found a way round for ${s.restored} links between towns${s.down ? `, and ${s.down} went down` : ' and not one town lost its connection'}. ${s.full ? `${s.full} time${s.full === 1 ? '' : 's'} you tried a fibre that was already full.` : 'You never tried a fibre that was already full.'}`
      : `${s.cutsDone} fibre cuts, ${s.restored} services restored, ${s.down} lost; longest restoration ${s.longest} spans; ${s.full} attempt${s.full === 1 ? '' : 's'} on a full fibre.`;
  },
  // on a tall, narrow board (a phone) the map turns a quarter so the towns have room
  pos: (n, w, h) => {
    const { x, y } = MNODES[n], tall = h > w * 0.85;
    return tall ? [56 + (w - 112) * y, 80 + (h - 116) * x] : [44 + (w - 88) * x, 78 + (h - 112) * y];
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    const plain = words === 'plain', a = s.asking, pulse = 0.5 + 0.5 * Math.sin(s.t * 6);
    hud(g, w, theme, `${plain ? 'Storm' : 'Cuts'} ${s.cutsDone} / ${s.cuts} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(MESH.lives - Math.max(0, s.lives))}`, a ? 1 - a.t / MESH.decide : s.cutsDone / s.cuts, s.score, null);
    const P = (n) => MeshRescue.pos(n, w, h);
    // what is happening, in one line under the meter
    const say = a
      ? `✂ ${MNODES[a.sv.a].name} ↔ ${MNODES[a.sv.b].name} ${plain ? 'lost its light! Pick a road: 1, 2 or 3' : 'is down: pick a restoration route'}`
      : s.cutsDone < s.cuts ? `⛈ ${plain ? 'The storm is moving… the next cut is coming' : 'Storm in progress: next cut incoming'}` : '';
    if (say) {
      g.font = `800 13px ${theme.font}`; const tw = Math.min(w - 16, g.measureText(say).width + 24);
      g.fillStyle = a ? a.sv.color : theme.well; roundRect(g, (w - tw) / 2, 32, tw, 24, 12); g.fill();
      g.fillStyle = a ? '#ffffff' : theme.ink; g.textAlign = 'center'; g.fillText(say, w / 2, 49, w - 28);
    }
    // the fibres: grey with two dots each (room for two lights), red when full, dashed with ✂ when cut
    const r0 = Math.max(4, Math.min(6, w / 110));
    for (const [x, y] of MLINKS) {
      const [ax, ay] = P(x), [bx, by] = P(y), k = mkey(x, y), cut = s.cut.has(k), used = s.used[k] ?? 0, full = used >= MESH.cap;
      g.strokeStyle = cut ? theme.muted : full ? theme.bad : theme.muted; g.lineWidth = cut ? 2 : full ? 4 : 3; g.setLineDash(cut ? [6, 6] : []);
      g.globalAlpha = cut ? 0.6 : 1;
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    }
    // the services that still have their light, thin and faded while a road is being picked
    s.services.forEach((sv, i) => {
      if (!sv.path) return;
      g.strokeStyle = sv.color; g.lineWidth = a ? 2 : 3; g.globalAlpha = a ? 0.35 : 0.85;
      g.beginPath();
      sv.path.forEach((n, j) => { const [x, y] = P(n); const o = (i - 1.5) * 3; if (j) g.lineTo(x + o, y + o); else g.moveTo(x + o, y + o); });
      g.stroke(); g.globalAlpha = 1;
    });
    // the roads on offer, each in its own colour, side by side where they share a fibre
    if (a) {
      a.routes.forEach((r, i) => {
        const fits = meshFits(s, r), off = (i - 1) * 7;
        g.strokeStyle = fits ? MROUTE[i] : theme.muted; g.lineWidth = fits ? 6 : 4; g.lineCap = 'round';
        g.globalAlpha = fits ? 0.6 + 0.35 * pulse : 0.45; g.setLineDash(fits ? [] : [4, 8]);
        g.beginPath();
        r.slice(1).forEach((n, j) => {
          const [ax, ay] = P(r[j]), [bx, by] = P(n), L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L * off, ny = (bx - ax) / L * off;
          g.moveTo(ax + nx, ay + ny); g.lineTo(bx + nx, by + ny);
        });
        g.stroke(); g.setLineDash([]); g.globalAlpha = 1; g.lineCap = 'butt';
      });
    }
    // the room on each fibre, drawn over the roads so it can always be read
    for (const [x, y] of MLINKS) {
      const [ax, ay] = P(x), [bx, by] = P(y), k = mkey(x, y), used = s.used[k] ?? 0, mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (s.cut.has(k)) { emoji(g, '✂', mx, my, 20); continue; }
      for (let c = 0; c < MESH.cap; c++) {
        g.beginPath(); g.arc(mx + (c - 0.5) * (r0 * 2 + 3), my, r0, 0, 7);
        g.fillStyle = c < used ? (used >= MESH.cap ? theme.bad : theme.ink) : theme.paper; g.fill();
        g.strokeStyle = theme.ink; g.lineWidth = 1.5; g.stroke();
      }
    }
    // the light coming back along the road just picked
    for (const f of s.flows) {
      const pts = f.path.map(P), segs = pts.slice(1).map((p, j) => Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1])), total = segs.reduce((x, y) => x + y, 0);
      for (let k = 0; k < 5; k++) {
        let d = clamp01(f.t / 1.1 - k * 0.07) * total, j = 0;
        while (j < segs.length - 1 && d > segs[j]) d -= segs[j++];
        const q = segs[j] ? d / segs[j] : 0, x = pts[j][0] + (pts[j + 1][0] - pts[j][0]) * q, y = pts[j][1] + (pts[j + 1][1] - pts[j][1]) * q;
        g.globalAlpha = Math.max(0, 1 - f.t / 1.6); g.fillStyle = f.color; g.beginPath(); g.arc(x, y, 7 - k, 0, 7); g.fill(); g.globalAlpha = 1;
      }
    }
    if (a) {
      a.routes.forEach((r, i) => {
        const fits = meshFits(s, r), [bx, by] = MeshRescue.badge(s, i, w, h);
        g.fillStyle = fits ? MROUTE[i] : theme.muted; g.beginPath(); g.arc(bx, by, 15, 0, 7); g.fill();
        g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.stroke();
        g.fillStyle = '#ffffff'; g.font = `800 14px ${theme.font}`; g.textAlign = 'center'; g.fillText(fits ? String(i + 1) : '✗', bx, by + 5);
      });
    }
    // the towns; the two that lost their light blink in the service's colour
    for (const n of Object.keys(MNODES)) {
      const [x, y] = P(n), lost = a && (n === a.sv.a || n === a.sv.b);
      g.font = `800 ${lost ? 13 : 11}px ${theme.font}`; const tw = g.measureText(MNODES[n].name).width, bh = lost ? 24 : 20;
      if (lost) { g.globalAlpha = 0.25 + 0.35 * pulse; g.fillStyle = a.sv.color; roundRect(g, x - tw / 2 - 12, y - bh / 2 - 6, tw + 24, bh + 12, 12); g.fill(); g.globalAlpha = 1; }
      g.fillStyle = lost ? a.sv.color : theme.paper; roundRect(g, x - tw / 2 - 6, y - bh / 2, tw + 12, bh, 7); g.fill();
      g.strokeStyle = lost ? a.sv.color : theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = lost ? '#ffffff' : theme.ink; g.textAlign = 'center'; g.fillText(MNODES[n].name, x, y + 4);
    }
    // a key along the bottom
    g.font = `700 11px ${theme.font}`; g.fillStyle = theme.muted; g.textAlign = 'left';
    g.fillText(plain ? '○○ room for 2 lights per fibre · red = full · ✂ = cut' : '○○ two waves per fibre · red = full · ✂ = cut', 10, h - 8);
    floats(g, s, () => [w / 2, h - 28], theme);
  },
  // where a route's number sits: on a hop no other route on offer takes, so the numbers
  // never sit on top of each other (else halfway along it), beside its own line
  badge(s, i, w, h) {
    const routes = s.asking.routes, r = routes[i];
    const hops = (x) => x.slice(1).map((n, j) => mkey(x[j], n));
    const others = new Set(routes.filter((_, k) => k !== i).flatMap(hops));
    const own = hops(r).findIndex((k) => !others.has(k));
    const j = own >= 0 ? own : Math.floor(r.length / 2) - 1;
    const [ax, ay] = MeshRescue.pos(r[j], w, h), [bx, by] = MeshRescue.pos(r[j + 1], w, h);
    const L = Math.hypot(bx - ax, by - ay) || 1, side = i === 1 ? 1 : i - 1;
    return [ax + (bx - ax) * 0.42 - (by - ay) / L * 20 * side, ay + (by - ay) * 0.42 + (bx - ax) / L * 20 * side];
  },
  laneAt(x, y, w, h, s) {
    if (!s?.asking) return null;
    let best = null, bd = 50;
    s.asking.routes.forEach((r, i) => { const [bx, by] = MeshRescue.badge(s, i, w, h); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; best = i; } });
    return best;
  },
};

// ---------------------------------------------------------------- Last Mile Dash (home fibre)
// Homes on three streets of Popcorn Hill ask for shows, and the buffering wheel starts
// to spin. Tap a street to serve its oldest request from the Couchwave cache. A title the
// cache doesn't have yet goes all the way to the origin once; after that it is cached,
// and everyone who asks for it again gets it straight away.
const LMD = { goal: 14, lives: 3, wait: 8, fetch: 2.6, every: 2.1 };
const LMD_STREETS = { plain: ['Maple Street', 'Popcorn Lane', 'Sofa Avenue'], eng: ['Splitter 1', 'Splitter 2', 'Splitter 3'] };
const LMD_TITLES = [
  { icon: '🎬', plain: 'The premiere', eng: 'Premiere' },
  { icon: '🦖', plain: 'Dino Docs', eng: 'Dino Docs' },
  { icon: '🚀', plain: 'Space Race', eng: 'Space Race' },
  { icon: '🐙', plain: 'Deep Sea', eng: 'Deep Sea' },
  { icon: '🎸', plain: 'Rock Night', eng: 'Rock Night' },
];
const LastMileDash = {
  id: 'lastmile',
  name: { plain: 'Last Mile Dash', eng: 'Last Mile Dash' },
  how: {
    plain: 'Homes on three streets want to watch something. Tap a street (or press 1, 2, 3) to send its oldest request a show from the Couchwave copy nearby. A show the copy doesn\'t have yet must come from far away the first time, and then it is kept for everyone. Serve them before the buffering wheel fills!',
    eng: 'Subscribers behind three splitters request titles. Tap a splitter (1, 2, 3) to serve its oldest request from the Couchwave cache. A miss is fetched from the origin once and cached, so every later request for it is a hit. Serve before the player buffers out.',
  },
  goal: { plain: `Start ${LMD.goal} shows before three homes give up`, eng: `Serve ${LMD.goal} streams, three abandoned sessions and you're out` },
  laneNames: LMD_STREETS,
  start(random = Math.random, opts = {}) {
    return {
      goal: opts.goal ?? LMD.goal, t: 0, random, reqs: [], next: 0.6, cached: new Set([0]), fetching: [],
      served: 0, hits: 0, misses: 0, gaveUp: 0, lives: LMD.lives, score: 0, fx: [], over: null,
    };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.3);
    if ((s.next -= dt) <= 0) {
      // the premiere is what most homes want; the rest is a mix
      const title = s.random() < 0.45 ? 0 : 1 + Math.floor(s.random() * (LMD_TITLES.length - 1));
      const lane = Math.floor(s.random() * 3);
      if (s.reqs.filter((r) => r.lane === lane).length < 3) s.reqs.push({ lane, title, t: 0, slot: s.reqs.filter((r) => r.lane === lane).length });
      s.next = LMD.every * (0.8 + 0.4 * s.random());
    }
    for (const r of s.reqs) r.t += dt;
    // a title on its way from the origin lands in the cache, and its request plays
    for (const f of s.fetching) f.t += dt;
    for (const f of s.fetching.filter((x) => x.t >= LMD.fetch)) {
      s.fetching.splice(s.fetching.indexOf(f), 1);
      s.cached.add(f.title);
      const r = s.reqs.indexOf(f.req);
      if (r >= 0) { s.reqs.splice(r, 1); s.served++; s.score += 15; float(s, f.req.lane, `${LMD_TITLES[f.title].icon} cached for next time`, true); }
    }
    for (const r of s.reqs.filter((x) => x.t >= LMD.wait)) {
      s.reqs.splice(s.reqs.indexOf(r), 1);
      s.fetching = s.fetching.filter((f) => f.req !== r);
      s.lives--; s.gaveUp++; float(s, r.lane, 'Buffering… they gave up', false);
    }
    if (s.lives <= 0) s.over = 'lost';
    else if (s.served >= s.goal) s.over = 'won';
  },
  press(s, lane) {
    if (s.over) return;
    const r = s.reqs.filter((x) => x.lane === lane && !s.fetching.some((f) => f.req === x)).sort((a, b) => b.t - a.t)[0];
    if (!r) return;
    if (s.cached.has(r.title)) {
      s.reqs.splice(s.reqs.indexOf(r), 1);
      s.served++; s.hits++;
      const pts = 20 + Math.round((1 - r.t / LMD.wait) * 10);
      s.score += pts; float(s, lane, `🍿 Playing! +${pts}`, true);
    } else {
      s.misses++;
      s.fetching.push({ req: r, title: r.title, t: 0 });
      float(s, lane, 'Not here yet: fetching it from far away…', false);
    }
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 40 : 0, flawless: s.gaveUp === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You started ${s.served} shows: ${s.hits} came straight from the copy nearby, and ${s.misses} had to come from far away once, then stayed close for everyone else. ${s.gaveUp ? `${s.gaveUp} home${s.gaveUp === 1 ? '' : 's'} gave up waiting.` : 'Not one home gave up waiting.'}`
      : `${s.served} streams served: ${s.hits} cache hits, ${s.misses} misses fetched from the origin and cached; ${s.gaveUp} abandoned session${s.gaveUp === 1 ? '' : 's'}. Hit ratio ${Math.round((100 * s.hits) / Math.max(1, s.hits + s.misses))}%.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `${s.served} / ${s.goal} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(LMD.lives - Math.max(0, s.lives))}`, s.served / s.goal, s.score, null);
    const top = 34, rowH = (h - top - 8) / 3, cx = 70;
    // the cache, with the titles it holds, and the origin far away
    g.fillStyle = theme.well; roundRect(g, 8, top + 6, 110, h - top - 20, 10); g.fill();
    g.fillStyle = theme.ink; g.font = `800 11px ${theme.font}`; g.textAlign = 'center';
    g.fillText(words === 'plain' ? 'Couchwave copy' : 'Couchwave cache', 63, top + 22);
    [...s.cached].forEach((t, i) => emoji(g, LMD_TITLES[t].icon, 32 + (i % 3) * 30, top + 46 + Math.floor(i / 3) * 30, 22));
    g.fillStyle = theme.muted; g.font = `800 11px ${theme.font}`; g.textAlign = 'right'; g.fillText(words === 'plain' ? 'far away 🌍' : 'origin 🌍', w - 10, top + 18);
    for (let i = 0; i < 3; i++) {
      const y = top + rowH * (i + 0.5);
      g.strokeStyle = theme.muted; g.lineWidth = 3; g.beginPath(); g.moveTo(118, y); g.lineTo(w - 20, y); g.stroke();
      g.fillStyle = theme.muted; g.font = `700 11px ${theme.font}`; g.textAlign = 'left';
      g.fillText(`${i + 1} · ${LMD_STREETS[words][i]}`, 128, y - rowH * 0.32);
      for (let k = 0; k < 3; k++) emoji(g, '🏠', 190 + k * ((w - 230) / 3) + (w - 230) / 6, y + 4, Math.min(30, rowH * 0.5));
    }
    for (const r of s.reqs) {
      const y = top + rowH * (r.lane + 0.5), x = 190 + r.slot * ((w - 230) / 3) + (w - 230) / 6;
      const fetching = s.fetching.find((f) => f.req === r);
      // the bubble over the home: the title, and the buffering wheel filling up
      g.fillStyle = theme.paper; g.beginPath(); g.arc(x, y - 26, 16, 0, 7); g.fill();
      g.strokeStyle = r.t / LMD.wait > 0.7 ? theme.bad : theme.ink; g.lineWidth = 2; g.stroke();
      emoji(g, LMD_TITLES[r.title].icon, x, y - 26, 16);
      g.strokeStyle = theme.bad; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 26, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (r.t / LMD.wait)); g.stroke();
      if (fetching) {
        const k = fetching.t / LMD.fetch, ox = w - 30, oy = top + 14;
        g.setLineDash([5, 5]); g.strokeStyle = theme.accent; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 26); g.lineTo(ox, oy); g.stroke(); g.setLineDash([]);
        const p = k < 0.5 ? k * 2 : 2 - k * 2;
        g.fillStyle = theme.accent; g.beginPath(); g.arc(x + (ox - x) * p, y - 26 + (oy - y + 26) * p, 5, 0, 7); g.fill();
      }
    }
    floats(g, s, (lane) => [w / 2, top + rowH * (lane + 0.5) + rowH * 0.36], theme);
  },
  laneAt(x, y, w, h) { const top = 34; return y < top ? null : Math.min(2, Math.floor(((y - top) / (h - top - 8)) * 3)); },
};

// ---------------------------------------------------------------- Storm Chaser (business access)
// Someone at a Tidewell office plugs a cable into two sockets of the same switch: a loop.
// Every broadcast now comes back twice, then four times, and the links fill up. Block
// one link in each loop before the storm reaches 100%, without cutting an office off.
const STORM = { lives: 3, double: 3.4 };
const STORM_ROUNDS = [
  {
    nodes: { m: [0.5, 0.18, 'Main switch'], a: [0.22, 0.6, 'Floor 1'], b: [0.78, 0.6, 'Floor 2'], p: [0.1, 0.92, 'Printers'], l: [0.9, 0.92, 'Lab'] },
    links: [['m', 'a'], ['m', 'b'], ['a', 'b'], ['a', 'p'], ['b', 'l']],
  },
  {
    nodes: { m: [0.5, 0.15, 'Main switch'], a: [0.18, 0.5, 'Sales'], b: [0.5, 0.55, 'Reception'], c: [0.82, 0.5, 'Support'], d: [0.34, 0.92, 'Meeting rooms'], e: [0.82, 0.92, 'Kitchen'] },
    links: [['m', 'a'], ['m', 'b'], ['m', 'c'], ['a', 'b'], ['b', 'd'], ['a', 'd'], ['c', 'e']],
  },
  {
    nodes: { m: [0.5, 0.15, 'Main switch'], a: [0.15, 0.45, 'Floor 1'], b: [0.85, 0.45, 'Floor 2'], c: [0.3, 0.88, 'Floor 3'], d: [0.7, 0.88, 'Floor 4'], x: [0.5, 0.55, 'Server room'] },
    links: [['m', 'a'], ['m', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['m', 'x'], ['x', 'c'], ['x', 'd']],
  },
];
const skey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);
// is the office network still in one piece without these links?
function stormConnected(r, blocked) {
  const ids = Object.keys(r.nodes), seen = new Set([ids[0]]), todo = [ids[0]];
  while (todo.length) {
    const n = todo.pop();
    for (const [a, b] of r.links) { if (blocked.has(skey(a, b))) continue; const m = a === n ? b : b === n ? a : null; if (m && !seen.has(m)) { seen.add(m); todo.push(m); } }
  }
  return seen.size === ids.length;
}
// loops left: a connected network with more links than a tree has
const stormLoops = (r, blocked) => r.links.filter(([a, b]) => !blocked.has(skey(a, b))).length - (Object.keys(r.nodes).length - 1);
// the links on offer: one that breaks a loop and two that would cut an office off, mixed
function stormOffer(s) {
  const r = STORM_ROUNDS[s.round], live = r.links.filter(([a, b]) => !s.blocked.has(skey(a, b)));
  const good = live.filter(([a, b]) => stormConnected(r, new Set([...s.blocked, skey(a, b)])));
  const bad = live.filter(([a, b]) => !stormConnected(r, new Set([...s.blocked, skey(a, b)])));
  const pick = (arr, k) => mixUp(arr, s.random).slice(0, k);
  s.offer = mixUp([...pick(good, 1), ...pick(bad, 2)], s.random).map(([a, b]) => skey(a, b));
}
const StormChaser = {
  id: 'storm',
  name: { plain: 'Storm Chaser', eng: 'Storm Chaser' },
  how: {
    plain: 'A cable plugged in twice made a loop: every message comes back again and again, and the office network fills up. Pick a link to switch off (tap it, or press 1, 2, 3) to break the loop before the storm hits 100%. But don\'t cut an office off!',
    eng: 'A patch cable has closed a loop and a broadcast storm is building. Block one link per loop (1, 2, 3), as STP or a G.8032 RPL would, before the links saturate, without partitioning the network.',
  },
  goal: { plain: 'Calm three storms', eng: 'Clear three broadcast storms' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random, opts = {}) {
    const s = { rounds: opts.rounds ?? STORM_ROUNDS.length, t: 0, random, round: 0, load: 1, blocked: new Set(), offer: [], lives: STORM.lives, calmed: 0, cutOff: 0, peak: 0, between: 0, score: 0, fx: [], over: null };
    stormOffer(s);
    return s;
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.4);
    if (s.between > 0) {
      if ((s.between -= dt) <= 0) {
        if (s.round + 1 >= s.rounds) { s.over = 'won'; return; }
        s.round++; s.blocked = new Set(); s.load = 1; stormOffer(s); float(s, 1, `Storm ${s.round + 1}!`, false);
      }
      return;
    }
    // the storm doubles every couple of seconds while a loop is left
    s.load = Math.min(100, s.load * Math.pow(2, dt / STORM.double));
    s.peak = Math.max(s.peak, s.load);
    if (s.load >= 100) {
      s.lives--; float(s, 1, 'Every port at 100%!', false);
      s.blocked = new Set(); s.load = 1; stormOffer(s);
      if (s.lives <= 0) s.over = 'lost';
    }
  },
  press(s, lane) {
    if (s.over || s.between > 0) return;
    const k = s.offer[lane];
    if (!k) return;
    const r = STORM_ROUNDS[s.round], next = new Set([...s.blocked, k]);
    if (!stormConnected(r, next)) {
      s.lives--; s.cutOff++;
      const [a, b] = k.split('-');
      float(s, 1, `That cut ${r.nodes[stormConnected(r, new Set([k])) ? a : b][2]} off!`, false);
      if (s.lives <= 0) s.over = 'lost'; else stormOffer(s);
      return;
    }
    s.blocked = next;
    if (stormLoops(r, next) > 0) { float(s, 1, 'One loop broken, there is another!', true); s.load = Math.max(1, s.load / 2); stormOffer(s); return; }
    s.calmed++;
    const pts = 100 + Math.round((100 - s.load) / 2);
    s.score += pts; float(s, 1, `Storm calmed! +${pts}`, true);
    s.load = 1; s.offer = []; s.between = 1.4;
  },
  // would blocking this link keep every office connected?
  safe: (s, k) => stormConnected(STORM_ROUNDS[s.round], new Set([...s.blocked, k])),
  lanes(s, words) {
    const r = STORM_ROUNDS[s.round];
    return [0, 1, 2].map((i) => { const k = s.offer[i]; if (!k) return '—'; const [a, b] = k.split('-'); return r.nodes[a] && r.nodes[b] ? `${words === 'plain' ? 'Switch off' : 'Block'} ${r.nodes[a][2]} – ${r.nodes[b][2]}` : '—'; });
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 40 : 0, flawless: s.cutOff === 0 && s.lives === STORM.lives };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You calmed ${s.calmed} storm${s.calmed === 1 ? '' : 's'} by switching off one link in each loop. The worst one reached ${Math.round(s.peak)}% before you stopped it${s.cutOff ? `, and ${s.cutOff} time${s.cutOff === 1 ? '' : 's'} you cut an office off by mistake` : ', and no office was ever cut off'}.`
      : `${s.calmed} broadcast storm${s.calmed === 1 ? '' : 's'} cleared by blocking one link per loop; peak load ${Math.round(s.peak)}%; ${s.cutOff} partition${s.cutOff === 1 ? '' : 's'} caused.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `${words === 'plain' ? 'Storm' : 'Load'} ${Math.round(s.load)}% · ${s.round + 1} / ${s.rounds} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(STORM.lives - Math.max(0, s.lives))}`, s.load / 100, s.score, null);
    const r = STORM_ROUNDS[s.round], top = 40, P = (n) => [20 + (w - 40) * r.nodes[n][0], top + (h - top - 26) * r.nodes[n][1]];
    r.links.forEach(([a, b]) => {
      const [ax, ay] = P(a), [bx, by] = P(b), k = skey(a, b), blocked = s.blocked.has(k), offer = s.offer.indexOf(k);
      const busy = !blocked && s.between <= 0;
      g.strokeStyle = blocked ? theme.muted : busy && s.load > 40 ? theme.bad : theme.ink; g.lineWidth = blocked ? 2 : 3 + (busy ? s.load / 25 : 0);
      g.setLineDash(blocked ? [6, 6] : []); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
      // broadcast copies racing round, more of them as the storm grows
      if (busy) for (let k2 = 0; k2 < Math.min(8, Math.ceil(s.load / 12)); k2++) { const u = (s.t * 0.9 + k2 / 8) % 1; g.fillStyle = theme.gold; g.beginPath(); g.arc(ax + (bx - ax) * u, ay + (by - ay) * u, 3, 0, 7); g.fill(); }
      if (blocked) emoji(g, '⛔', (ax + bx) / 2, (ay + by) / 2, 16);
      if (offer >= 0) { const mx = (ax + bx) / 2, my = (ay + by) / 2; g.fillStyle = theme.accent; g.beginPath(); g.arc(mx, my, 13, 0, 7); g.fill(); g.fillStyle = '#ffffff'; g.font = `800 13px ${theme.font}`; g.textAlign = 'center'; g.fillText(String(offer + 1), mx, my + 5); }
    });
    for (const n of Object.keys(r.nodes)) {
      const [x, y] = P(n), lbl = r.nodes[n][2];
      g.font = `800 11px ${theme.font}`; const tw = g.measureText(lbl).width;
      g.fillStyle = theme.paper; roundRect(g, x - tw / 2 - 8, y - 11, tw + 16, 22, 7); g.fill();
      g.strokeStyle = theme.ink; g.lineWidth = 2; g.stroke();
      g.fillStyle = theme.ink; g.textAlign = 'center'; g.fillText(lbl, x, y + 4);
    }
    if (s.round === 0 && s.t < 4) emoji(g, '📢', w - 30, top + 20, 26);
    floats(g, s, () => [w / 2, top + 6], theme);
  },
  laneAt(x, y, w, h, s) {
    if (!s) return null;
    const r = STORM_ROUNDS[s.round], top = 40, P = (n) => [20 + (w - 40) * r.nodes[n][0], top + (h - top - 26) * r.nodes[n][1]];
    let best = null, bd = 40;
    s.offer.forEach((k, i) => { const [a, b] = k.split('-'), [ax, ay] = P(a), [bx, by] = P(b); const d = Math.hypot((ax + bx) / 2 - x, (ay + by) / 2 - y); if (d < bd) { bd = d; best = i; } });
    return best;
  },
};

// ---------------------------------------------------------------- Stop the Fiber Cut (xhaul ring)
// Backhoe Bob's crew is digging all round the cell sites' fibre ring. Tap each digger
// before it reaches the fibre ("call before you dig"). In the end one gets through and
// cuts the ring: open the ring's spare link (the RPL) so traffic goes the other way round.
const CUT = { stop: 8, lives: 3, dig: 6, every: 1.9, decide: 12 };
const CUT_SITES = ['Labelbrook', 'Spinehill', 'Framefield', 'Edgewater', 'Leafdale', 'Gateway Bay'];
const CUT_CHOICES = [
  { key: 'rpl', right: true, plain: 'Open the spare link', eng: 'Unblock the RPL' },
  { key: 'wait', plain: 'Wait for the repair crew', eng: 'Wait for the splice crew' },
  { key: 'reboot', plain: 'Restart the towers', eng: 'Reboot the cell sites' },
];
const cutSector = (a) => Math.min(2, Math.floor(((a + Math.PI) / (2 * Math.PI)) * 3));
const StopTheFiberCut = {
  id: 'fibercut',
  name: { plain: 'Stop the Fiber Cut', eng: 'Stop the Fiber Cut' },
  how: {
    plain: 'Backhoe Bob\'s crew is digging near the fibre ring that joins the phone towers. Tap a digger (or press 1, 2, 3 for the west, middle or east of the ring) before it reaches the fibre. Then, if one gets through, keep the towers connected!',
    eng: 'Diggers are closing in on the xhaul ring. Stop each one (tap, or 1, 2, 3 for a third of the ring) before it hits the fibre: call before you dig. When the ring is cut anyway, restore it the G.8032 way.',
  },
  goal: { plain: `Stop ${CUT.stop} diggers, then save the ring`, eng: `Stop ${CUT.stop} diggers, then protect the ring` },
  laneNames: { plain: ['West', 'Middle', 'East'], eng: ['West arc', 'Middle arc', 'East arc'] },
  start(random = Math.random, opts = {}) {
    return {
      goal: opts.goal ?? CUT.stop, t: 0, random, phase: 'dig', pt: 0, diggers: [], next: 1, stopped: 0, hits: 0, lives: CUT.lives,
      cutAt: null, choices: mixUp(CUT_CHOICES, random), decided: null, score: 0, fx: [], over: null,
    };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt; s.pt += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.4);
    if (s.phase === 'dig') {
      if ((s.next -= dt) <= 0 && s.diggers.length < 3) {
        s.diggers.push({ a: -Math.PI + s.random() * 2 * Math.PI, p: 0 });
        s.next = CUT.every * (0.8 + 0.5 * s.random());
      }
      for (const d of s.diggers) d.p += dt / CUT.dig;
      for (const d of s.diggers.filter((x) => x.p >= 1)) {
        s.diggers.splice(s.diggers.indexOf(d), 1);
        s.lives--; s.hits++; float(s, cutSector(d.a), 'Bob hit the fibre!', false);
      }
      if (s.stopped >= s.goal) {
        // one last digger gets through anyway, on the far side from the spare link
        s.phase = 'cut'; s.pt = 0; s.diggers = []; s.cutAt = Math.PI * 0.25;
        float(s, 1, '🚜 One got through: the ring is cut!', false);
      }
    } else if (s.phase === 'cut' && s.pt >= CUT.decide) { s.over = 'lost'; s.wrong = 'late'; }
    if (s.lives <= 0) s.over = 'lost';
  },
  press(s, lane) {
    if (s.over) return;
    if (s.phase === 'cut') {
      const c = s.choices[lane];
      if (!c) return;
      if (!c.right) { s.over = 'lost'; s.wrong = c.key; return; }
      s.decided = s.pt; s.score += 150 + Math.round((CUT.decide - s.pt) * 8);
      float(s, 1, `Back up in ${Math.round(20 + s.pt * 2)} ms!`, true);
      s.over = 'won';
      return;
    }
    // a tap on a digger (10 + its index), or a third of the ring: the closest there
    const d = lane >= 10 ? s.diggers[lane - 10] : s.diggers.filter((x) => cutSector(x.a) === lane).sort((a, b) => b.p - a.p)[0];
    if (!d) return;
    s.diggers.splice(s.diggers.indexOf(d), 1);
    s.stopped++;
    const pts = 20 + Math.round((1 - d.p) * 10);
    s.score += pts; float(s, cutSector(d.a), '✋ Call before you dig!', true);
  },
  lanes(s, words) { return s.phase === 'cut' ? s.choices.map((c) => c[words]) : StopTheFiberCut.laneNames[words]; },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 40 : 0, flawless: s.hits === 0 };
  },
  summary(s, words) {
    const ms = s.decided != null ? Math.round(20 + s.decided * 2) : null;
    return words === 'plain'
      ? `You stopped ${s.stopped} diggers before they reached the fibre${s.hits ? `, and ${s.hits} got through` : ''}. When the ring was cut anyway, you opened the spare link and the towers were talking again in ${ms} milliseconds, going the other way round.`
      : `${s.stopped} excavations stopped, ${s.hits} fibre strike${s.hits === 1 ? '' : 's'}. After the cut, the RPL was unblocked and traffic restored round the ring in ${ms} ms, inside the G.8032 50 ms target.`;
  },
  // the ring, small enough that a digger at the edge of its approach still fits on the board
  ring(w, h) { const top = 34, r = Math.min(w * 0.3, (h - top) * 0.3); return { cx: w / 2, cy: top + (h - top) / 2 + 4, r, reach: Math.min(70, (h - top) / 2 - r - 22) }; },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    const label = s.phase === 'dig' ? `${s.stopped} / ${s.goal} ${words === 'plain' ? 'diggers stopped' : 'stopped'}` : (words === 'plain' ? 'The ring is cut!' : 'Ring failure');
    hud(g, w, theme, `${label} · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(CUT.lives - Math.max(0, s.lives))}`, s.phase === 'dig' ? s.stopped / s.goal : 1 - s.pt / CUT.decide, s.score, null);
    const { cx, cy, r } = StopTheFiberCut.ring(w, h);
    const rpl = -Math.PI * 0.75;    // the spare link, kept blocked until a failure
    g.lineWidth = 5;
    for (let k = 0; k < 60; k++) {
      const a0 = -Math.PI + (k / 60) * 2 * Math.PI, a1 = a0 + (2 * Math.PI) / 60;
      const nearRpl = Math.abs(((a0 - rpl + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.22;
      const nearCut = s.cutAt != null && Math.abs(((a0 - s.cutAt + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.1;
      g.strokeStyle = nearCut ? theme.bad : nearRpl && !(s.over === 'won') ? theme.muted : theme.accent;
      g.setLineDash(nearRpl && s.over !== 'won' ? [5, 5] : []);
      if (!nearCut) { g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); }
    }
    g.setLineDash([]);
    emoji(g, '⛔', cx + r * Math.cos(rpl), cy + r * Math.sin(rpl), 16);
    g.fillStyle = theme.muted; g.font = `700 10px ${theme.font}`; g.textAlign = 'center';
    g.fillText(words === 'plain' ? 'spare link' : 'RPL', cx + r * Math.cos(rpl), cy + r * Math.sin(rpl) - 14);
    if (s.cutAt != null) emoji(g, '✂', cx + r * Math.cos(s.cutAt), cy + r * Math.sin(s.cutAt), 20);
    CUT_SITES.forEach((n, i) => {
      const a = -Math.PI + ((i + 0.5) / CUT_SITES.length) * 2 * Math.PI, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      emoji(g, '📡', x, y, 20);
      g.fillStyle = theme.ink; g.font = `800 10px ${theme.font}`; g.textAlign = 'center'; g.fillText(n, x, y + 22);
    });
    const { reach } = StopTheFiberCut.ring(w, h);
    for (const d of s.diggers) {
      const dist = r + 18 + (1 - d.p) * reach;
      const x = cx + dist * Math.cos(d.a), y = cy + dist * Math.sin(d.a);
      emoji(g, '🚜', x, y, 24);
      g.strokeStyle = theme.bad; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 17, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * d.p); g.stroke();
    }
    // the sync heartbeats: steady while the ring is whole, silent across the cut
    if (s.phase === 'cut' && s.over !== 'won') { g.fillStyle = theme.bad; g.font = `800 13px ${theme.font}`; g.textAlign = 'center'; g.fillText(words === 'plain' ? 'Towers cut off!' : 'CFM: loss of continuity', cx, cy + 5); }
    else if (s.over === 'won') { g.fillStyle = theme.good; g.font = `800 13px ${theme.font}`; g.textAlign = 'center'; g.fillText(words === 'plain' ? 'The other way round ✓' : 'Traffic on the RPL ✓', cx, cy + 5); }
    floats(g, s, (lane) => [w * (0.25 + lane * 0.25), 52], theme);
  },
  laneAt(x, y, w, h, s) {
    if (!s || s.phase !== 'dig') return null;
    const { cx, cy, r, reach } = StopTheFiberCut.ring(w, h);
    let best = null, bd = 40;
    s.diggers.forEach((d, i) => { const dist = r + 18 + (1 - d.p) * reach; const dd = Math.hypot(cx + dist * Math.cos(d.a) - x, cy + dist * Math.sin(d.a) - y); if (dd < bd) { bd = dd; best = 10 + i; } });
    return best;
  },
};

// ---------------------------------------------------------------- Cable Layer (undersea cables)
// A cable ship lays a new cable from Lightmoor to Coherent Isle. The seabed slides past;
// steer into the north, middle or south lane to keep the cable clear of underwater
// volcanoes, rocky seamounts and fishing grounds, where anchors and trawls would catch it.
const LAY = { length: 34, lives: 3, speed: 0.1, every: 1.8 };
const LAY_HAZARDS = [
  { icon: '🌋', plain: 'an underwater volcano', eng: 'volcanic vent' },
  { icon: '🪨', plain: 'a rocky seamount', eng: 'seamount' },
  { icon: '🎣', plain: 'fishing grounds', eng: 'trawling ground' },
];
const CableLayer = {
  id: 'cablelayer',
  name: { plain: 'Cable Layer', eng: 'Cable Layer' },
  how: {
    plain: 'You are on the ship laying a new cable across the ocean. Tap north, middle or south (or press 1, 2, 3) to steer the cable round underwater volcanoes, rocky mountains and fishing grounds, where anchors would catch it. The Kraken keeps stirring things up!',
    eng: 'Lay a new subsea cable from Lightmoor to Coherent Isle. Steer between three corridors (1, 2, 3) to keep the route off volcanic vents, seamounts and trawling grounds, as the route survey would. The Kraken keeps stirring the seabed.',
  },
  goal: { plain: 'Lay the cable all the way to the island', eng: 'Complete the cable lay to the landing station' },
  laneNames: { plain: ['North', 'Middle', 'South'], eng: ['North corridor', 'Middle corridor', 'South corridor'] },
  start(random = Math.random, opts = {}) {
    return { len: opts.seconds ?? LAY.length, t: 0, random, lane: 1, trail: [], hazards: [], next: 1.6, dodged: 0, hits: 0, lives: LAY.lives, score: 0, fx: [], over: null };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1.3);
    // the seabed slides by: hazards come in from the right on one or two lanes
    if ((s.next -= dt) <= 0 && s.t < s.len - 3) {
      const free = Math.floor(s.random() * 3), two = s.random() < 0.35;
      for (let l = 0; l < 3; l++) if (l !== free && (two || l === (free + 1) % 3)) s.hazards.push({ lane: l, x: 1.08, kind: Math.floor(s.random() * LAY_HAZARDS.length) });
      s.next = LAY.every * (0.85 + 0.4 * s.random());
    }
    for (const z of s.hazards) z.x -= LAY.speed * dt * 2.2;
    for (const z of s.hazards.filter((x) => !x.done && x.x < 0.2)) {
      z.done = true;
      if (z.lane === s.lane) { s.lives--; s.hits++; float(s, z.lane, `Ouch: ${LAY_HAZARDS[z.kind].plain}!`, false); }
      else { s.dodged++; s.score += 15; }
    }
    s.hazards = s.hazards.filter((z) => z.x > -0.1);
    if (Math.floor(s.t * 10) !== Math.floor((s.t - dt) * 10)) s.trail.push(s.lane);
    if (s.lives <= 0) s.over = 'lost';
    else if (s.t >= s.len) { s.over = 'won'; float(s, 1, '🏝 Landed at Coherent Isle!', true); }
  },
  press(s, lane) { if (!s.over && lane >= 0 && lane < 3) s.lane = lane; },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.lives * 50 : 0, flawless: s.hits === 0 };
  },
  summary(s, words) {
    return words === 'plain'
      ? `You laid the cable all the way to Coherent Isle and steered round ${s.dodged} hazards on the seabed${s.hits ? `, though ${s.hits} caught the cable` : ', without a single scratch'}. Real cable routes are planned the same way, after a survey of the sea floor.`
      : `Cable laid end to end; ${s.dodged} hazards avoided, ${s.hits} contact${s.hits === 1 ? '' : 's'}. The same job a marine route survey does before a lay.`;
  },
  draw(g, s, w, h, words, theme) {
    g.clearRect(0, 0, w, h);
    hud(g, w, theme, `${words === 'plain' ? 'To the island' : 'Lay progress'} ${Math.round((100 * Math.min(s.t, s.len)) / s.len)}% · ${'♥'.repeat(Math.max(0, s.lives))}${'♡'.repeat(LAY.lives - Math.max(0, s.lives))}`, s.t / s.len, s.score, null);
    const top = 34, rowH = (h - top - 8) / 3, X = (u) => 10 + (w - 20) * u, Y = (l) => top + rowH * (l + 0.5);
    g.fillStyle = theme.sea; roundRect(g, 4, top + 2, w - 8, h - top - 6, 12); g.fill();
    for (let l = 0; l < 3; l++) { g.fillStyle = theme.muted; g.font = `700 11px ${theme.font}`; g.textAlign = 'left'; g.fillText(`${l + 1} · ${CableLayer.laneNames[words][l]}`, 14, Y(l) - rowH * 0.32); }
    // the cable already laid trails behind the ship
    g.strokeStyle = theme.gold; g.lineWidth = 4; g.beginPath();
    const n = Math.min(s.trail.length, 40);
    for (let k = 0; k < n; k++) { const l = s.trail[s.trail.length - n + k], x = X(0.2 - (n - k) * 0.005); if (k) g.lineTo(x, Y(l)); else g.moveTo(x, Y(l)); }
    g.lineTo(X(0.2), Y(s.lane)); g.stroke();
    for (const z of s.hazards) emoji(g, LAY_HAZARDS[z.kind].icon, X(z.x), Y(z.lane), Math.min(30, rowH * 0.55));
    emoji(g, '🚢', X(0.2), Y(s.lane) - 4, Math.min(34, rowH * 0.6));
    if (s.t > s.len - 4) emoji(g, '🏝', X(0.95), Y(1), 34);
    if (Math.sin(s.t * 0.7) > 0.6) emoji(g, '🦑', X(0.88), top + 18, 22);
    floats(g, s, (lane) => [w / 2, Y(lane) - rowH * 0.25], theme);
  },
  laneAt(x, y, w, h) { const top = 34; return y < top ? null : Math.min(2, Math.floor(((y - top) / (h - top - 8)) * 3)); },
};

// ---------------------------------------------------------------- Level 5: the fight with Lord Lag
// The last level is a recap of the whole Quest: one round for each level before it, in a
// game from that level picked at random (so a replay can bring a different one), short
// and a little meaner, with Lord Lag taunting between rounds. Each round won knocks off
// one of his hearts.
const SHORT = {
  lastmile: { goal: 6 }, tetris: { goal: 8 }, storm: { rounds: 1 },
  fibercut: { goal: 4 }, beat: { seconds: 15 }, race: { first: 2, races: 1, need: 1 },
  repeaters: { seconds: 10 }, cablelayer: { seconds: 16 },
  rainbow: { goal: 4 }, mesh: { cuts: 2 },
};
const BOSS_LEVELS = [['lastmile', 'tetris', 'storm'], ['fibercut', 'beat', 'race'], ['repeaters', 'cablelayer'], ['rainbow', 'mesh']];
const BOSS_TAUNTS = [
  { plain: 'Back to the city, apprentice. Let\'s see if you remember!', eng: 'Round one, the city network. Show me you still remember.' },
  { plain: 'Lucky! Now the towers and the core. Faster!', eng: 'Round two: the towers and the core. Faster this time.' },
  { plain: 'Down to the seabed with you!', eng: 'Round three: the subsea. My Kraken is waiting.' },
  { plain: 'Enough! My last trick: the light itself!', eng: 'Final round: the optical layer. Restore that, Chief.' },
];
const LordLagFight = {
  id: 'boss',
  name: { plain: 'The fight with Lord Lag', eng: 'The fight with Lord Lag' },
  how: {
    plain: 'So you got this far, apprentice. Four rounds, one from each level you played, a little faster and a little meaner. You never know which game I\'ll pick! Win them all and Netlandia is yours.',
    eng: 'Lord Lag\'s last stand: four short rounds, one game from each level, picked at random. Win all four to bring Netlandia back for good.',
  },
  goal: { plain: 'Win four rounds against Lord Lag', eng: 'Four rounds: win them all' },
  laneNames: { plain: ['—', '—', '—'], eng: ['—', '—', '—'] },
  start(random = Math.random, opts = {}) {
    const picks = opts.picks ?? BOSS_LEVELS.map((games) => games[Math.floor(random() * games.length)]);
    return { t: 0, random, picks, round: 0, sub: null, between: 2.4, points: 0, results: [], fx: [], over: null };
  },
  game: (s) => MINIGAMES[s.picks[s.round]],
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    if (s.between > 0) {
      if ((s.between -= dt) <= 0) { const id = s.picks[s.round]; s.sub = MINIGAMES[id].start(s.random, SHORT[id]); }
      return;
    }
    const G = LordLagFight.game(s);
    G.tick(s.sub, dt);
    const res = G.result(s.sub);
    if (!res) return;
    if (!res.won) { s.over = 'lost'; return; }
    s.points += res.points; s.results.push({ game: G, st: s.sub, flawless: res.flawless });
    if (s.round === s.picks.length - 1) { s.over = 'won'; return; }
    s.round++; s.sub = null; s.between = 2.6;
  },
  press(s, lane) { if (!s.over && s.sub) LordLagFight.game(s).press(s.sub, lane); },
  lanes(s, words) {
    if (!s.sub) return ['—', '—', '—'];
    const G = LordLagFight.game(s);
    return G.lanes ? G.lanes(s.sub, words) : G.laneNames[words];
  },
  laneColors: (s) => (s.sub && LordLagFight.game(s).laneColors?.(s.sub)) || [null, null, null],
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.points + 400 : 0, flawless: s.results.every((r) => r.flawless) };
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
      emoji(g, '😈', w / 2, h * 0.34, 72);
      g.fillStyle = theme.ink; g.font = `800 16px ${theme.font}`; g.textAlign = 'center';
      g.fillText(`Round ${s.round + 1} of ${s.picks.length} · ${MINIGAMES[s.picks[s.round]].name[words]}`, w / 2, h * 0.6);
      g.font = `700 14px ${theme.font}`; g.fillStyle = theme.muted;
      g.fillText(`“${BOSS_TAUNTS[s.round][words]}”`, w / 2, h * 0.7, w - 40);
    }
    // Lord Lag's hearts, one lost for every round you win
    const left = s.picks.length - s.results.length;
    g.font = `800 13px ${theme.font}`; g.textAlign = 'right'; g.fillStyle = theme.bad;
    g.fillText(`😈 ${'♥'.repeat(left)}${'♡'.repeat(s.picks.length - left)}`, w - 10, h - 8);
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
// The finale, Level 5.
export const BOSS = LordLagFight;

// Every game by its id; js/story.js says which network plays which.
export const MINIGAMES = {
  lastmile: LastMileDash, tetris: PacketTetris, storm: StormChaser,
  fibercut: StopTheFiberCut, beat: KeepTheBeat, race: PacketRace,
  repeaters: RepeaterRescue, cablelayer: CableLayer,
  rainbow: RainbowPacking, mesh: MeshRescue,
};
