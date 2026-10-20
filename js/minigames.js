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
  lanes: 3, seconds: 35, zone: [0.84, 1.0], perfect: 0.025, center: 0.92,
};
const KeepTheBeat = {
  id: 'beat',
  name: { plain: 'Keep the Beat', eng: 'Keep the Beat' },
  how: {
    plain: 'Clock messages race to three phone towers. Tap a tower\'s lane (or press 1, 2, 3) just as its clock reaches the tower. Miss and the tower drifts out of time. Watch out for the Jitterbugs!',
    eng: 'PTP timing packets run from the hub to three cell sites. Tap the lane (or 1, 2, 3) as each packet hits its site. A miss costs phase sync; the Jitterbugs add delay variation from a few seconds in.',
  },
  goal: { plain: 'Keep the towers in time for 35 seconds', eng: 'Hold phase sync for 35 s' },
  laneNames: { plain: ['Tower 1', 'Tower 2', 'Tower 3'], eng: ['Cell site 1', 'Cell site 2', 'Cell site 3'] },
  start(random = Math.random) {
    return { t: 0, random, packets: [], next: 0.6, sync: 100, score: 0, combo: 0, hits: 0, misses: 0, fx: [], over: null, bugs: false };
  },
  tick(s, dt) {
    if (s.over) return;
    s.t += dt;
    const k = Math.min(1, s.t / BEAT.seconds);
    if (!s.bugs && s.t > 8) { s.bugs = true; float(s, 1, '🐞 Jitterbugs!', false); }
    // a packet on the beat, coming faster as the song goes on
    if ((s.next -= dt) <= 0) {
      const lane = Math.floor(s.random() * BEAT.lanes);
      s.packets.push({ lane, x: 0, v: 0.36 + 0.22 * k, phase: s.random() * 6.3, bug: s.bugs && s.random() < 0.55 });
      s.next = 1.15 - 0.5 * k;
    }
    for (const p of s.packets) {
      // a Jitterbug makes its packet surge and stall, but never go backwards
      const wobble = p.bug ? 0.6 * p.v * Math.sin(s.t * 5 + p.phase) : 0;
      p.x += (p.v + wobble) * dt;
    }
    for (const p of s.packets.filter((q) => q.x > 1.04)) {
      s.packets.splice(s.packets.indexOf(p), 1);
      s.misses++; s.combo = 0; s.sync -= 20;
      float(s, p.lane, 'Drifted!', false);
    }
    for (const f of s.fx) f.t += dt;
    s.fx = s.fx.filter((f) => f.t < 1);
    if (s.sync <= 0) { s.sync = 0; s.over = 'lost'; } else if (s.t >= BEAT.seconds) s.over = 'won';
  },
  press(s, lane) {
    if (s.over) return;
    const inZone = s.packets.filter((p) => p.lane === lane && p.x >= BEAT.zone[0] - 0.04 && p.x <= BEAT.zone[1] + 0.04);
    if (!inZone.length) { s.sync -= 6; s.combo = 0; float(s, lane, 'Off beat', false); return; }
    const p = inZone.sort((a, b) => b.x - a.x)[0];
    s.packets.splice(s.packets.indexOf(p), 1);
    const perfect = Math.abs(p.x - BEAT.center) <= BEAT.perfect + 0.02;
    s.combo++; s.hits++;
    s.score += Math.round((perfect ? 30 : 15) * (1 + Math.min(s.combo, 10) / 10));
    s.sync = Math.min(100, s.sync + 4);
    float(s, lane, perfect ? 'Perfect!' : 'In sync', true);
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? s.score + s.sync * 2 : 0, flawless: s.misses === 0 };
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
const SORT = { goal: 22, lives: 3, rate: 1.3 };
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
      queues: [{ cap: 5, fill: 0, items: [] }, { cap: 6, fill: 0, items: [] }, { cap: 12, fill: 0, items: [] }],
      falling: null, wait: 0.5,
    };
  },
  spawn(s) {
    const r = s.random();
    let kind = r < 0.3 ? 'call' : r < 0.4 ? 'sync' : r < 0.65 ? 'work' : 'web';
    if (s.elephants && s.random() < 0.3) kind = 'elephant';
    const fall = Math.max(1.6, 3.4 - s.sorted * 0.08);
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
      if (k.home === 0) strike(s, lane, 'Queue full · call dropped!');
      else { s.score -= 5; float(s, lane, 'Queue full · dropped', false); }
      return;
    }
    q.fill += k.size;
    q.items.push({ kind: f.kind, size: k.size, left: k.size });
    if (k.home === lane) { s.score += 20 + quick; float(s, lane, `+${20 + quick}`, true); return; }
    if (k.home === 0) strike(s, lane, f.kind === 'sync' ? 'Clock late · out of sync!' : 'Call stuck behind the backups!');
    else if (f.kind === 'elephant' && lane === 0) strike(s, lane, 'Elephant in the fast lane!');
    else { s.score += 5; float(s, lane, 'OK, not ideal', false); }
  },
  result(s) {
    if (!s.over) return null;
    return { won: s.over === 'won', points: s.over === 'won' ? Math.max(0, s.score) + s.lives * 50 : 0, flawless: !s.lostLife };
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
function strike(s, lane, text) { s.lives--; s.lostLife = true; s.score -= 10; float(s, lane, text, false); }
function miss(s, f) {
  s.sorted++;
  if (KINDS[f.kind].home === 0) strike(s, 1, 'Nobody queued it · call dropped!');
  else { s.score -= 5; float(s, 1, 'Dropped', false); }
}

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
export const MINIGAMES = { xhaul: KeepTheBeat, aggregation: PacketTetris };
