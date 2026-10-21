// Story mode, "Netlandia Quest": the networks start locked, and each one is won back
// from Lord Lag's minions in order. This module holds the story and the rules, with
// no page or 3D in it, so the tests can play it; js/game.js puts it on screen.
//
// Every line comes in two readings, like the rest of the map: `plain` for Explorer
// and `eng` for Engineer. A challenge is three questions for now; each chapter's
// mini-game (docs/game-plan.md) will take its place one at a time.

// The order the scenes unlock in, the way a phone's packets travel: the cell towers,
// the businesses and homes of the city, the core. That finishes the packet world on
// side B; the undersea cables are then a new discovery, and across the ocean wait the
// optical networks of side A.
export const STORY_ORDER = ['xhaul', 'aggregation', 'ipcore', 'submarine', 'metro', 'longhaul'];

// The networks are played in two levels. The first ends with a final exam at its last
// stop: the core's questions and one from each earlier stop, on the whole packet world.
export const STORY_LEVELS = [
  {
    n: 1, chapters: ['xhaul', 'aggregation', 'ipcore'],
    name: { plain: 'The packet world', eng: 'Side B: the packet network' },
    exam: () => [...STORY.ipcore.questions, STORY.xhaul.questions[1], STORY.aggregation.questions[1]],
  },
  {
    n: 2, chapters: ['submarine', 'metro', 'longhaul'],
    name: { plain: 'Across the ocean', eng: 'Subsea and optical transport' },
  },
];
export const levelOf = (id) => STORY_LEVELS.find((l) => l.chapters.includes(id));
// the questions that close a level, asked after the game at its last stop
export const examAt = (id) => { const l = levelOf(id); return l?.exam && l.chapters.at(-1) === id ? l.exam() : null; };

// One rank per network won back; the first is where everyone starts.
export const STORY_RANKS = ['Apprentice', 'Technician', 'Engineer', 'Senior engineer', 'Architect', 'Principal architect', 'Chief of the NOC'];

export const STORY_LIVES = 2;          // one mistake per challenge is allowed, the second ends it
export const STORY_SECONDS = 30;       // to answer each question

// Each answer list starts with the right one; the game shuffles them.
export const STORY = {
  aggregation: {
    villain: { name: 'The Buffer Gremlin', face: '👾' },
    taunt: {
      plain: 'Mwahaha! My Buffer Gremlin has frozen every screen in Popcorn Hill on premiere night. Enjoy your spinning wheel!',
      eng: 'My Buffer Gremlin is rebuffering every stream in Popcorn Hill, and my elephant flows own your uplink. Good luck, apprentice.',
    },
    questions: [
      {
        plain: { q: 'Everyone in Popcorn Hill starts the premiere at once. Where should the show come from so it starts right away?', a: ['A copy kept in the city network, a few hops from home', 'The film studio, on the other side of the world, every time', 'The house next door'] },
        eng: { q: 'The premiere starts in every Popcorn Hill home at once. What keeps the core from carrying 300 copies of the stream?', a: ['The Couchwave CDN cache beside the East aggregation router serves the hits', 'The OLT stores each title and multicasts it to the core', 'The passive splitter caches the popular titles'] },
      },
      {
        plain: { q: 'Phone calls, video and a giant backup share one road to the main routers. What should go first?', a: ['The phone calls: they are small and cannot wait', 'The giant backup, because it is the biggest', 'Whatever arrived first, always'] },
        eng: { q: 'Voice, video and an elephant-flow backup share the 5170 uplink. How should QoS treat them?', a: ['Voice in EF (Expedited Forwarding) with strict priority, the backup in best effort', 'The backup in EF so it finishes sooner', 'One FIFO queue, so every flow is treated the same'] },
      },
      {
        plain: { q: 'A digger cuts the ring of cables round the city. How do the shops and offices on it stay online?', a: ['The traffic turns round and goes the other way round the ring', 'Everyone waits until the cable is fixed', 'The ring sends the data by satellite'] },
        eng: { q: 'A fibre on the G.8032 ring is cut. What restores traffic within 50 ms?', a: ['CFM sees the loss and the RPL is unblocked, so traffic goes the other way round', 'BGP reconverges across the core', 'The 3900 NIDs hold the traffic until the repair'] },
      },
    ],
    lose: {
      plain: 'Buffering… Movie night is over. 312 homes gave up.',
      eng: 'Rebuffering on every stream: voice and video were dropped while the backup ran. 312 homes gave up.',
    },
    win: {
      plain: 'The premiere plays in every home, calls never drop, and the ring heals itself.',
      eng: 'Hits served from the Couchwave cache, voice in EF, and G.8032 protecting the ring in under 50 ms.',
    },
    why: {
      plain: 'A copy close to home, a fast lane for calls and a ring that can turn round: that is how real city networks keep films and calls smooth.',
      eng: 'CDN caching keeps the hits off the core, strict-priority EF protects voice from elephant flows, and G.8032 with CFM switches the ring in under 50 ms.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'Every home in Popcorn Hill got the premiere from a copy a few hops away, so the show started at once and the main routers carried each film only once. On the road out of the city, calls and clock messages got the fast lane, work had its own lane, and the giant backups waited in "everything else", where waiting hurts nobody. Real city networks sort every packet like this, all day, so a backup never freezes a phone call.',
      eng: 'Hits came from the Couchwave cache beside the East aggregation router, so the core carried each title once. On the 5170 uplink, voice and PTP sat in EF with strict priority, business in AF, and the elephant flows in best effort, where a little delay costs nothing. The scheduler drains EF first, which is why voice survives a full uplink: that is hierarchical QoS doing its job on every aggregation router.',
    },
  },

  xhaul: {
    villain: { name: 'The Jitterbugs', face: '🐞' },
    taunt: {
      plain: 'My Jitterbugs are nudging the clocks. Soon no two phone towers will agree what time it is!',
      eng: 'My Jitterbugs are adding delay variation to your timing packets. Watch the cell sites drift out of phase.',
    },
    questions: [
      {
        plain: { q: 'Phone towers must agree on the exact time. What do their timing messages need on the way?', a: ['The fastest lane, with no waiting in line', 'The slowest lane, so they arrive gently', 'Nothing: a few seconds late is fine'] },
        eng: { q: 'PTP timing packets cross the xhaul ring. How should they be queued?', a: ['In the top strict-priority queue, to keep their delay variation tiny', 'Best effort: PTP corrects any delay by itself', 'In the backhaul queue with the user data'] },
      },
      {
        plain: { q: 'A tower\'s work is split in three: the radio on the mast, a signal computer and an organiser. Which one must stay close to the radio?', a: ['The signal computer: it answers the radio in a split second', 'The organiser, because it is the most important', 'None of them: distance does not matter'] },
        eng: { q: 'In the RAN split, which link has the tightest latency budget?', a: ['Fronthaul, RU to DU (eCPRI)', 'Midhaul, DU to CU (F1)', 'Backhaul, CU to the 5G core (N2/N3)'] },
      },
      {
        plain: { q: 'Where do some towers keep their signal computers?', a: ['Together in a hub building, shared by several towers', 'Inside each phone', 'In a data center on another continent'] },
        eng: { q: 'In C-RAN, where does the DU run?', a: ['Pooled at a hub site, serving several RUs', 'On the UE', 'In the 5G core data center, beside the UPF'] },
      },
    ],
    lose: {
      plain: 'The towers drifted out of step. Calls drop every time a phone moves between them.',
      eng: 'Phase error past budget: handovers fail and neighbouring cells interfere.',
    },
    win: {
      plain: 'Every tower keeps perfect time, and calls pass from tower to tower without a hiccup.',
      eng: 'Timing and fronthaul ride first, every DU sits inside its fronthaul budget, and every cell is in phase.',
    },
    why: {
      plain: 'Phone towers share the air, so they must keep perfect time, and the signal computers must sit close to their radios.',
      eng: 'TDD radio needs tight phase sync, and eCPRI fronthaul has a latency budget of about 100 µs, which limits how far a DU can sit from its RU.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'Phone towers share the same air, so they take turns to talk, and that only works if they all agree on the time to a millionth of a second. You kept their clock messages moving on the beat even with the Jitterbugs shoving them. In a real network those messages ride the very first lane, and the computer that turns radio into data sits close to the mast so it can answer in time.',
      eng: 'TDD cells transmit in turns, so every cell site needs phase alignment within about a microsecond. PTP carries that time over the xhaul ring, and delay variation (the Jitterbugs) is what breaks it, so PTP and eCPRI fronthaul ride the top strict-priority queue. The same budget limits where the DU can sit: on the mast in D-RAN, or pooled at a hub in C-RAN.',
    },
  },

  ipcore: {
    villain: { name: 'The Elephant Flows', face: '🐘' },
    taunt: {
      plain: 'My Elephant Flows are stomping through Coreburg. Tidewell\'s video meeting is about to freeze!',
      eng: 'At 9:00 my elephant flows fill the Coreburg pair. Let\'s see Tidewell\'s video meeting survive that.',
    },
    questions: [
      {
        plain: { q: 'The short road between two Tidewell offices is jammed by backups. What saves the video meeting?', a: ['Send the meeting a quieter way round, through Northport', 'Stop the meeting until the backups finish', 'Make the backups bigger so they finish sooner'] },
        eng: { q: 'The IGP path Gateway Bay → Coreburg → Edgewater is congested. What moves the video without touching the backups?', a: ['An SR-TE policy that steers the VPN\'s video via Northport', 'Raising the IGP metric on every Coreburg link', 'Remarking the video as best effort'] },
      },
      {
        plain: { q: 'How does a packet in the core know which road to take?', a: ['It carries a short list of stops, and each router reads the next one', 'It asks a person at every crossing', 'It tries every road at once'] },
        eng: { q: 'In SR-MPLS, what carries the path?', a: ['A stack of segment labels pushed at the head end', 'RSVP state kept on every router along the way', 'The TTL field of the IP header'] },
      },
      {
        plain: { q: 'A road in the core breaks. How do the routers keep traffic moving in a blink?', a: ['Each router already knows a spare road before anything breaks', 'They wait for an engineer to draw a new map', 'They send the traffic back where it came from'] },
        eng: { q: 'A core link fails. What reroutes the traffic in under 50 ms?', a: ['TI-LFA: a loop-free backup path computed and installed before the failure', 'A full IGP reconvergence with a new SPF run', 'A manual change from the NOC'] },
      },
    ],
    lose: {
      plain: 'The meeting froze on the boss\'s face. Tidewell is not happy.',
      eng: 'Jitter at 37 ms: the EF queue overflowed and the meeting froze on the CEO\'s face.',
    },
    win: {
      plain: 'The meeting is smooth, the backups still run, and a broken road is fixed in a blink.',
      eng: 'The main path is back up, and the secondary paths aren\'t overloaded anymore.',
    },
    why: {
      plain: 'Real core routers can pick the road for each kind of traffic and keep a spare road ready, so one jam or break does not stop everyone.',
      eng: 'Segment routing puts the path in the packet: SR-TE steers one flow off a hot link, and TI-LFA keeps a loop-free backup ready before anything fails.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'The morning backups jammed the short road through Coreburg, so you sent the video call round another way, and when a fibre was cut you found a way round it too. Real core routers do this: the first router writes the route into the packet as a list of stops, so one important call can skip a jam without moving everything else, and every router keeps a spare road ready before anything breaks.',
      eng: 'You were the SR-TE head end: the segment list in the packet steered the EF video round congestion while the IGP kept the bulk on the shortest path. When the link failed, the right move was a precomputed alternative, which is what TI-LFA installs on every node so traffic moves in under 50 ms instead of waiting for the IGP to reconverge.',
    },
  },

  submarine: {
    villain: { name: 'The Anchor Dragger', face: '⚓' },
    taunt: {
      plain: 'My Anchor Dragger is fishing for your cables. Say goodbye to the other side of the world!',
      eng: 'My Anchor Dragger is trawling the shelf off Coherent Isle. One cable down, and the ocean crossing goes with it.',
    },
    questions: [
      {
        plain: { q: 'Light gets weaker as it travels thousands of kilometres under the sea. What keeps it strong?', a: ['Boosters on the sea floor every so often, powered through the cable', 'Fish swimming beside the cable', 'Nothing: it is just very bright when it starts'] },
        eng: { q: 'What keeps the signal up across an ocean crossing?', a: ['Optical repeaters every 60 to 80 km, powered over the cable from the shore', 'A regenerator in every repeater, converting to electrical and back', 'Higher launch power at the landing station, and nothing else'] },
      },
      {
        plain: { q: 'An anchor cuts one undersea cable. How does an island stay online?', a: ['Its traffic moves to another cable that also lands on the island', 'It waits for the cable to heal by itself', 'Everyone on the island shares one phone'] },
        eng: { q: 'A subsea cable is cut. What keeps the island connected?', a: ['Diverse cables and landings, with traffic restored onto the surviving system', 'The repeaters route round the break', 'The line terminal raises its power past the cut'] },
      },
      {
        plain: { q: 'Where does an undersea cable come ashore?', a: ['At a landing station on the beach', 'At the top of a mountain', 'In the middle of the main square'] },
        eng: { q: 'Where does the submarine line terminal sit?', a: ['In the cable landing station, near the beach', 'On the repair ship', 'Inside the first repeater'] },
      },
    ],
    lose: {
      plain: 'The island across the sea is cut off. Lord Lag laughs.',
      eng: 'One cable, one landing: the island is isolated until the repair ship arrives.',
    },
    win: {
      plain: 'The two sides of the world are talking again.',
      eng: 'Traffic restored on the diverse system, the repeaters powered, and the repair ship on its way.',
    },
    why: {
      plain: 'Real undersea cables have boosters along the sea floor, and islands land more than one cable, so one break does not cut them off.',
      eng: 'Powered repeater chains keep the optical signal up for thousands of kilometres, and diverse cables and landings turn a cut into a repair job, not an outage.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'Undersea cables carry almost everything that crosses an ocean. Every so often along the sea floor a booster lifts the light again, powered through the cable itself from the shore. Because anchors and earthquakes do cut cables, islands land more than one, so their traffic can move to the other while a repair ship sails out.',
      eng: 'Subsea systems are chains of powered optical repeaters between landing stations, with the line terminals on shore. Cuts from anchors and trawling are routine, so operators plan diverse cables and landings and restore traffic onto a surviving system while the repair ship works. Capacity is planned with that restoration in mind.',
    },
  },

  metro: {
    villain: { name: 'The Spectrum Hog', face: '🐷' },
    taunt: {
      plain: 'My Spectrum Hog has gobbled up every colour of light in Lumen City. No room for your data centers!',
      eng: 'My Spectrum Hog has grabbed half the C-band on the Lumen City ring. Try fitting your 400G DCI into what\'s left.',
    },
    questions: [
      {
        plain: { q: 'One glass fibre in Lumen City carries many conversations at once. How?', a: ['Each one travels in its own colour of light', 'They take turns, one per day', 'The fibre is split into thousands of tiny tubes'] },
        eng: { q: 'How does one fibre pair carry many services?', a: ['DWDM: each service on its own wavelength', 'Time-sharing one wavelength between services', 'Polarization only: two services per fibre'] },
      },
      {
        plain: { q: 'At each stop on the light ring, what happens to the colours?', a: ['Some colours get on or off there, the rest pass straight through', 'Every colour stops and starts again at every stop', 'The colours swap at random'] },
        eng: { q: 'What does a ROADM do at each ring node?', a: ['Adds, drops or expresses each wavelength, all in optics', 'Converts every wavelength to electrical and back', 'Amplifies only, with no add or drop'] },
      },
      {
        plain: { q: 'The two data centers in Lumen City copy huge amounts of data. What link do they get?', a: ['Their own very fast colour of light, straight between them', 'A home internet line', 'A satellite dish on each roof'] },
        eng: { q: 'What links the two Lumen City data centers?', a: ['A DCI: 400G coherent waves on Waveserver, point to point over the ring', 'A 1G Ethernet service over the aggregation ring', 'A copper cross-connect'] },
      },
    ],
    lose: {
      plain: 'No room left on the fibre. The data centers can\'t talk.',
      eng: 'Spectrum exhausted: the DCI waves can\'t be placed without blocking.',
    },
    win: {
      plain: 'Every colour has its place, and the data centers are talking.',
      eng: 'Spectrum planned, the ROADMs express what passes through, and 400G DCI is up between the data centers.',
    },
    why: {
      plain: 'Many colours of light share one fibre, and each stop only touches the colours it needs, so one fibre carries a whole city.',
      eng: 'DWDM puts many waves on one fibre pair, and ROADMs add, drop or express each one optically, so capacity grows without new glass.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'One glass fibre in Lumen City carries many conversations at once, each in its own colour of light. At every stop, a few colours get on or off and the rest pass straight through, never slowing down. The two data centers got their own very fast colours between them, so copying huge amounts of data never gets in anyone\'s way.',
      eng: 'DWDM puts dozens of waves on one fibre pair, and the ROADM at each node adds, drops or expresses each wave optically. Planning the spectrum well, without stranding gaps, is what lets the ring take new services without new glass, like the 400G coherent DCI waves between the two data centers.',
    },
  },

  longhaul: {
    villain: { name: 'Lord Lag', face: '😈' },
    taunt: {
      plain: 'It\'s me, Lord Lag! Backhoe Bob and his crew are cutting the country\'s light highway in three places. You\'ll never keep up!',
      eng: 'Lord Lag here. Three long-haul fibre cuts in one storm, one after another. Let\'s see your mesh restore that.',
    },
    questions: [
      {
        plain: { q: 'A storm cuts three long fibres one after another. How does the light highway keep the towns connected?', a: ['It finds a new road for each cut, because the roads form a web, not a line', 'It closes the highway until the storm ends', 'It squeezes everything onto one road, even when it is full'] },
        eng: { q: 'Three fibre cuts in a row hit the long-haul network. What keeps the services up?', a: ['Mesh restoration by the control plane over the RLS mesh', '1+1 protection on every wave, and nothing else', 'The NOC re-provisions every service by hand'] },
      },
      {
        plain: { q: 'At a big crossroads of the light highway, what can the colours do?', a: ['Turn onto any road in any direction, keeping their colour', 'Only go straight on', 'Only turn left'] },
        eng: { q: 'What does a CDC ROADM add over a fixed one?', a: ['Colorless, directionless, contentionless: any wave, any direction, any port', 'More amplifier gain', 'Fixed filters on every direction'] },
      },
      {
        plain: { q: 'Long fibres between towns lose light. What stands by the road every so often?', a: ['Small huts with boosters that lift the light', 'Toll booths', 'Mirrors that send the light back'] },
        eng: { q: 'What sits every 80 km or so along a long-haul span?', a: ['In-line amplifier (ILA) huts', 'Core routers', 'Regenerators that convert every wave to electrical'] },
      },
    ],
    lose: {
      plain: 'Two towns went dark. The cuts beat you, and Lord Lag is laughing.',
      eng: 'Restoration ran out of capacity: two towns are isolated.',
    },
    win: {
      plain: 'Lord Lag is beaten, and Netlandia is back on, all of it.',
      eng: 'Three cuts restored without losing one service. Lord Lag is beaten.',
    },
    why: {
      plain: 'The light highway is a web of roads with smart crossroads, so the network can always find another way.',
      eng: 'A CDC ROADM mesh lets the control plane re-route any wave after one cut after another, as long as the capacity was planned for it.',
    },
    // the longer summary on the win card: what you just did, in a real network
    recap: {
      plain: 'The country\'s light highway is a web of long fibres between towns, with small huts that boost the light along the way. Because it is a web and not a single line, the network found a new road after every cut, and the smart crossroads let any colour of light turn any way. That is how a whole country stays connected through a storm.',
      eng: 'The long-haul RLS network is a mesh of CDC ROADMs with in-line amplifier huts along each span. Because any wave can be switched in any direction, the control plane restores services after one cut after another, as long as capacity was planned for it. That is the difference between a storm and an outage.',
    },
  },
};

// ---------------------------------------------------------------- the rules

// Points for one answer: 100 if right, plus up to 50 for answering quickly.
export function answerPoints(right, seconds) {
  if (!right) return 0;
  return 100 + Math.max(0, Math.round(50 * (1 - seconds / STORY_SECONDS)));
}
// A challenge won without a single mistake earns a bonus.
export const FLAWLESS_BONUS = 200;

export function newStory() {
  return { unlocked: [], score: 0, best: 0 };
}
// Saved progress, checked: anything unknown or out of order is dropped.
export function loadStory(saved) {
  const s = newStory();
  if (!saved || typeof saved !== 'object') return s;
  for (const id of Array.isArray(saved.unlocked) ? saved.unlocked : []) {
    if (id === STORY_ORDER[s.unlocked.length]) s.unlocked.push(id); else break;
  }
  s.score = Number.isFinite(saved.score) && saved.score > 0 ? Math.round(saved.score) : 0;
  s.best = Math.max(s.score, Number.isFinite(saved.best) ? Math.round(saved.best) : 0);
  return s;
}
export const nextChapter = (s) => STORY_ORDER[s.unlocked.length] ?? null;
export const isUnlocked = (s, id) => s.unlocked.includes(id);
export const rankOf = (s) => STORY_RANKS[Math.min(s.unlocked.length, STORY_RANKS.length - 1)];
export const storyDone = (s) => s.unlocked.length === STORY_ORDER.length;

// One attempt at a chapter's questions (or a level's exam): answers shuffled,
// lives, and the points earned so far (which only count if it is won).
export function startChallenge(id, random = Math.random, questions = STORY[id].questions) {
  return {
    id, questions, i: 0, lives: STORY_LIVES, points: 0, mistakes: 0, over: null,
    order: questions.map(() => shuffle([0, 1, 2], random)),
  };
}
// Answer the current question with the answer at screen position `pick` (or null when
// the time ran out). Returns { right, points } and moves the challenge on.
export function answer(c, pick, seconds) {
  if (c.over) return { right: false, points: 0 };
  const right = pick != null && c.order[c.i][pick] === 0;
  const points = answerPoints(right, seconds);
  c.points += points;
  if (!right) { c.mistakes++; c.lives--; }
  if (c.lives <= 0) c.over = 'lost';
  else if (++c.i >= c.questions.length) {
    c.over = 'won';
    if (!c.mistakes) c.points += FLAWLESS_BONUS;
  }
  return { right, points };
}
// Bank a won challenge: the network unlocks and its points join the score.
export function winChapter(s, c) {
  if (c.over !== 'won' || nextChapter(s) !== c.id) return s;
  s.unlocked.push(c.id);
  s.score += c.points;
  s.best = Math.max(s.best, s.score);
  return s;
}
// Start the story again from the top, keeping the best score.
export function restartStory(s) {
  return Object.assign(s, { unlocked: [], score: 0 });
}

function shuffle(a, random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
