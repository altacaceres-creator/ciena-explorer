// Story mode, "Netlandia Quest": the networks start locked, and each one is won back
// from Lord Lag's minions in order. This module holds the story and the rules, with
// no page or 3D in it, so the tests can play it; js/game.js puts it on screen.
//
// Every line comes in two readings, like the rest of the map: `plain` for Explorer
// and `eng` for Engineer. Each network plays one or more mini-games (js/minigames.js),
// its stops; its questions come back in the final exam of its level.

// The order the networks unlock in: the city first (homes, businesses and its ring),
// then the cell towers and the core. That finishes the packet world on side B; the
// undersea cables are then a new discovery, and across the ocean wait the optical
// networks of side A.
export const STORY_ORDER = ['aggregation', 'xhaul', 'ipcore', 'submarine', 'metro', 'longhaul'];

// Five levels. Each of the first four plays the games of its networks and ends with a
// final exam on all of them; the fifth is the fight with Lord Lag, a round from each.
export const STORY_LEVELS = [
  {
    n: 1, chapters: ['aggregation'],
    name: { plain: 'The city', eng: 'Metro aggregation' },
    exam: () => [...STORY.aggregation.questions, ...EXTRA_QUESTIONS.city],
  },
  {
    n: 2, chapters: ['xhaul', 'ipcore'],
    name: { plain: 'The towers and the core', eng: 'xhaul and the IP core' },
    exam: () => [...STORY.xhaul.questions, ...STORY.ipcore.questions],
  },
  {
    n: 3, chapters: ['submarine'],
    name: { plain: 'Under the sea', eng: 'Subsea' },
    exam: () => [...STORY.submarine.questions, ...EXTRA_QUESTIONS.sea],
  },
  {
    n: 4, chapters: ['metro', 'longhaul'],
    name: { plain: 'The light', eng: 'Optical transport' },
    exam: () => [...STORY.metro.questions, ...STORY.longhaul.questions],
  },
  {
    n: 5, chapters: [], boss: true,
    name: { plain: 'The final fight', eng: 'The final fight' },
  },
];
export const BOSS_LEVEL = STORY_LEVELS.at(-1);
export const levelOf = (id) => STORY_LEVELS.find((l) => l.chapters.includes(id));
// the questions that close a level, asked after the last game of its last network
export const examAt = (id) => { const l = levelOf(id); return l?.exam && l.chapters.at(-1) === id ? l.exam() : null; };

// A rank for every network won back, and the last one for beating Lord Lag.
export const STORY_RANKS = ['Apprentice', 'Technician', 'Engineer', 'Senior engineer', 'Lead engineer', 'Architect', 'Principal architect', 'Chief of the NOC'];

export const STORY_LIVES = 2;          // one mistake per challenge is allowed, the second ends it
export const STORY_SECONDS = 30;       // to answer each question

// Each answer list starts with the right one; the game shuffles them.
export const STORY = {
  aggregation: {
    stages: ['lastmile', 'tetris', 'storm'],
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
    stages: ['fibercut', 'beat'],
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
    stages: ['firewall', 'race'],
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
    stages: ['repeaters', 'dive', 'splice', 'cablelayer'],
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
    stages: ['memory', 'rainbow'],
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
    stages: ['lightpath', 'mesh'],
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

// Each game's own villain, taunt, loss and lesson (the lesson closes a stop that is not
// the last of its network).
export const STAGES = {
  lastmile: {
    villain: { name: 'The Buffer Gremlin', face: '👾' },
    taunt: {
      plain: 'Mwahaha! My Buffer Gremlin has frozen every screen in Popcorn Hill on premiere night. Enjoy your spinning wheel!',
      eng: 'My Buffer Gremlin is rebuffering every stream in Popcorn Hill. Let\'s see your cache hit ratio, apprentice.',
    },
    lose: {
      plain: 'Buffering… Movie night is over. The homes gave up.',
      eng: 'Too many abandoned sessions: the streams buffered out before they were served.',
    },
    lesson: {
      plain: 'A copy of each popular show kept a few hops from home starts it at once, and it only has to cross the network once.',
      eng: 'The CDN cache next to the aggregation router serves the hits; a miss is fetched once from the origin and then cached for everyone.',
    },
  },
  tetris: {
    villain: { name: 'The Elephant Flows', face: '🐘' },
    taunt: {
      plain: 'Here come my Elephant Flows! Giant backups stomping down the road out of the city. Good luck keeping your calls alive!',
      eng: 'My elephant flows are on the 5170 uplink. Let\'s see your QoS keep voice alive.',
    },
    lose: {
      plain: 'The fast lane filled up behind a backup, and the calls dropped.',
      eng: 'Voice queued behind elephant flows: EF starved, calls dropped.',
    },
    lesson: {
      plain: 'Calls and clocks go first in a small fast lane, and the giant backups wait in "everything else", where waiting hurts nobody.',
      eng: 'Strict-priority EF for voice and PTP, AF for business, best effort for the elephants: the scheduler serves EF first.',
    },
  },
  storm: {
    villain: { name: 'The Broadcast Banshee', face: '📢' },
    taunt: {
      plain: 'Eeeee! Someone plugged a cable in twice at Tidewell. My Broadcast Banshee is screaming round and round!',
      eng: 'A patch cable closed a loop at Tidewell. My Broadcast Banshee is flooding every port.',
    },
    lose: {
      plain: 'Every port at 100%. The whole office is offline.',
      eng: 'Broadcast storm: every link saturated, the office network is down.',
    },
    lesson: {
      plain: 'A network of switches must never have a loop in use: one link in each loop stays switched off, ready for when it is needed.',
      eng: 'Loops must be blocked (STP, or the RPL on a G.8032 ring), and storm control caps broadcasts at the edge.',
    },
  },
  fibercut: {
    villain: { name: 'Backhoe Bob', face: '🚜' },
    taunt: {
      plain: 'Backhoe Bob here! My crew is digging all round the phone towers\' fibre. Oops, was that a cable?',
      eng: 'Backhoe Bob\'s crew is excavating along the xhaul ring. No locate requests filed, of course.',
    },
    lose: {
      plain: 'Too many diggers hit the fibre, and the towers went quiet.',
      eng: 'Multiple fibre strikes: the ring is down and the cell sites are isolated.',
    },
    lesson: {
      plain: 'Calling before you dig keeps most diggers off the cables, and the ring keeps one spare link ready for the cut that happens anyway.',
      eng: 'Locate requests prevent most strikes; for the rest, G.8032 unblocks the RPL and restores the ring in under 50 ms.',
    },
  },
  beat: {
    villain: { name: 'The Jitterbugs', face: '🐞' },
    taunt: {
      plain: 'My Jitterbugs are nudging the clocks. Soon no two phone towers will agree what time it is!',
      eng: 'My Jitterbugs are adding delay variation to your timing packets. Watch the cell sites drift out of phase.',
    },
    lose: {
      plain: 'The towers drifted out of step. Calls drop every time a phone moves between them.',
      eng: 'Phase error past budget: handovers fail and neighbouring cells interfere.',
    },
    lesson: {
      plain: 'Phone towers take turns to talk, so their clock messages ride the fastest lane and arrive right on the beat.',
      eng: 'PTP rides the top strict-priority queue, so delay variation stays inside the phase budget of each cell site.',
    },
  },
  firewall: {
    villain: { name: 'The Botnet', face: '🤖' },
    taunt: {
      plain: 'Beep boop! Thousands of my bots are heading for your data center, hidden among your customers. Some even wear a disguise. Your gate can\'t check them all!',
      eng: 'My botnet is aimed at your data center: scans, floods, and payloads disguised as normal traffic. Let\'s see your filters hold.',
    },
    lose: {
      plain: 'The bots got through the gate and the data center is overloaded. Nobody can reach their files. Lord Lag cheers.',
      eng: 'Malicious traffic breached the perimeter; the data center is saturated and its services are down.',
    },
    lesson: {
      plain: 'A gate checks every packet against a list of rules: let it in, or keep it out. Simple rules stop plain bots, a closer look catches the ones in disguise, and since every gate can only check so many at once, real networks put several in a row.',
      eng: 'A firewall matches each packet against an ordered rule list (ACL): permit or deny. Known-bad traffic is dropped cheaply; disguised payloads need deep packet inspection (IPS); every filter has finite throughput, so floods are met with rate limiting and defence in depth.',
    },
  },
  race: {
    villain: { name: 'Lord Lag', face: '😈' },
    taunt: {
      plain: 'At nine o\'clock my Elephant Flows fill the roads through Coreburg. Race me to Edgewater, if you dare!',
      eng: 'At 9:00 my elephant flows fill the Coreburg pair. Race your SR-TE head end against my IGP.',
    },
    lose: {
      plain: 'Lord Lag\'s packet got there first. The meeting froze on the boss\'s face.',
      eng: 'Lost the race to the IGP path: the video meeting froze on the CEO\'s face.',
    },
    lesson: {
      plain: 'Pick the road for each call by where the jams are, not just by distance, and keep a spare road ready.',
      eng: 'Segment routing lets the head end steer around congestion, and TI-LFA keeps a backup path ready before a failure.',
    },
  },
  repeaters: {
    villain: { name: 'The Anchor Dragger', face: '⚓' },
    taunt: {
      plain: 'My Anchor Dragger is fishing for your cables. Say goodbye to the other side of the world!',
      eng: 'My Anchor Dragger is trawling the shelf off Coherent Isle. One cable down, and the ocean crossing goes with it.',
    },
    lose: {
      plain: 'The island across the sea is cut off. Lord Lag laughs.',
      eng: 'One cable, one landing: the island is isolated until the repair ship arrives.',
    },
    lesson: {
      plain: 'Boosters on the sea floor, powered from the shore, keep the light strong, and an island lands more than one cable.',
      eng: 'Powered repeater chains keep the signal up; diverse cables and landings turn a cut into a repair job.',
    },
  },
  dive: {
    villain: { name: 'The Jellyfish Gang', face: '🪼' },
    taunt: {
      plain: 'Blub blub! The cable is cut somewhere down in the dark, and we are everywhere. Good luck finding it before your little robot runs out of power!',
      eng: 'The break is somewhere on a long, dark seabed, and we drift right across your ROV\'s path. Find it before the battery dies.',
    },
    lose: {
      plain: 'The robot\'s battery ran out three times and the cut is still lost in the dark. The island stays offline.',
      eng: 'Three ROV dives ended on a flat battery with the fault unlocated; the island remains on its last path.',
    },
    lesson: {
      plain: 'To find a break at the bottom of the sea, engineers send a flash of light down the cable from the shore and time its echo: the longer it takes to come back, the farther away the break is. Then the robot goes straight there.',
      eng: 'An OTDR fires pulses into the fibre and times the reflection from the break, locating the fault to within metres from the landing station, so the repair ship and its ROV head straight for it.',
    },
  },
  splice: {
    villain: { name: 'The Big Swell', face: '🌊' },
    taunt: {
      plain: 'Heave-ho! I will rock your little ship back and forth, and your tiny glass threads will never line up again!',
      eng: 'Sea state five and rising. Good luck aligning cores a few microns wide on a rolling deck.',
    },
    lose: {
      plain: 'The joins leak too much light, and the storm is here. The cable goes back into the sea still broken.',
      eng: 'Splice loss blew the link budget before the weather window closed; the repair is abandoned.',
    },
    lesson: {
      plain: 'The glass core that carries the light is thinner than a hair, so the two ends must line up almost perfectly before they are melted together. Every join loses a little light, and all those little losses add up along the cable, so each one has to be as good as it can be.',
      eng: 'A fusion splicer aligns cores of about 9 µm before firing the arc; lateral offset becomes splice loss (dB). Losses add up in the link budget along with the fibre and the connectors, so every splice is measured and remade if it is over tolerance.',
    },
  },
  cablelayer: {
    villain: { name: 'The Kraken', face: '🦑' },
    taunt: {
      plain: 'Lay a new cable across MY ocean? My Kraken will stir up every volcano and fishing boat on the way!',
      eng: 'A new cable lay through the Kraken\'s waters. Hope your route survey was good.',
    },
    lose: {
      plain: 'The cable caught on the seabed too many times. Back to port!',
      eng: 'Too many hazards on the route: the lay is abandoned.',
    },
    lesson: {
      plain: 'Before a cable is laid, the sea floor is surveyed so the route steers clear of volcanoes, steep rocks and fishing grounds.',
      eng: 'A marine route survey keeps the lay off hazards and trawling grounds, with burial and armour where anchors could reach.',
    },
  },
  memory: {
    villain: { name: 'The Smudger', face: '🦝' },
    taunt: {
      plain: 'Hee hee! I smudged all the colours on the light ring. Now nobody knows which colour goes where. Can you remember them? I bet you can\'t!',
      eng: 'I scrambled the channel plan on the ring. Neither end knows which wavelength carries what. Re-learn it, if you can keep up.',
    },
    lose: {
      plain: 'The colours got mixed up, and the films went to the bank while the bank\'s money went to the cinema. The Smudger giggles.',
      eng: 'Channel mismatch: services dropped on the wrong ports at the far end. The ring is misdelivering traffic.',
    },
    lesson: {
      plain: 'One fibre carries many colours of light at the same time, and each colour is a separate channel, like lanes on a road. Both ends must agree which colour is which, so each message reaches the right place.',
      eng: 'DWDM carries each service on its own wavelength; ROADMs add, drop or pass each one by colour, so the channel plan must match at every node or traffic lands on the wrong port.',
    },
  },
  rainbow: {
    villain: { name: 'The Spectrum Hog', face: '🐷' },
    taunt: {
      plain: 'My Spectrum Hog has gobbled up every colour of light in Lumen City. No room for your data centers!',
      eng: 'My Spectrum Hog has grabbed half the C-band on the Lumen City ring. Try fitting your DCI in what\'s left.',
    },
    lose: {
      plain: 'No room left on the fibre. The data centers can\'t talk.',
      eng: 'Spectrum exhausted: the waves can\'t be placed without blocking.',
    },
    lesson: {
      plain: 'Each link gets its own colours of light, the same all the way along, and packing them tight leaves room for more.',
      eng: 'Wavelength continuity end to end, and a well-packed spectrum, let the ring grow without new fibre.',
    },
  },
  lightpath: {
    villain: { name: 'Professor Prism', face: '🔮' },
    taunt: {
      plain: 'Ah-ha! I have turned every light switch between Prismfield and Spectraville the wrong way. The light goes round in circles and nowhere at all!',
      eng: 'Every cross-connect between Prismfield and Spectraville has been scrambled. Your wavelengths now terminate in the middle of nowhere.',
    },
    lose: {
      plain: 'The light never reached Spectraville, and the far city stays dark. Professor Prism takes a bow.',
      eng: 'No end-to-end light path was restored in time; the long-haul services stay down.',
    },
    lesson: {
      plain: 'At each crossroads of the light highway, a switch can send each colour straight on or round a bend, with no need to turn it into electricity first. The light only gets through if every switch on the way is set right, with no gaps.',
      eng: 'Each ROADM degree can express or drop each wavelength, and CDC ROADMs can steer any colour any way under software control. A light path works only when every cross-connect from end to end is set consistently.',
    },
  },
  mesh: {
    villain: { name: 'Backhoe Bob\'s crew', face: '⛈' },
    taunt: {
      plain: 'A storm! And Backhoe Bob\'s whole crew is out in it, cutting the country\'s light highway in three places!',
      eng: 'A storm front and Backhoe Bob\'s crew: successive long-haul fibre cuts. Let\'s see your mesh restore that.',
    },
    lose: {
      plain: 'Two towns went dark. The cuts beat you.',
      eng: 'Restoration ran out of capacity: two towns are isolated.',
    },
    lesson: {
      plain: 'A web of fibres with smart crossroads can always find another way, if there is room to spare on it.',
      eng: 'A CDC ROADM mesh restores wave after wave, as long as the capacity was planned for it.',
    },
  },
};

// Extra questions for the exams of the levels with a single network.
export const EXTRA_QUESTIONS = {
  city: [
    {
      plain: { q: 'Someone plugs one cable into two sockets of the same office switch, and the network floods with copies. What stops it?', a: ['Keeping one link switched off in every loop, ready for when it is needed', 'Buying a faster switch', 'Sending every message twice'] },
      eng: { q: 'A patch cable closes a loop on the access switches and a broadcast storm starts. What prevents it?', a: ['Blocking one link in every loop (STP or the G.8032 RPL), plus storm control', 'More bandwidth on the uplink', 'A larger MTU'] },
    },
    {
      plain: { q: 'The homes of Popcorn Hill share one fibre from the street cabinet. What divides it between them?', a: ['A splitter in the cabinet that needs no power', 'A router in every garden', 'A satellite dish on the roof'] },
      eng: { q: 'In XGS-PON, what sits between the OLT and the homes?', a: ['A passive optical splitter', 'An active Ethernet switch on every street', 'A DWDM ROADM'] },
    },
  ],
  sea: [
    {
      plain: { q: 'How do engineers choose where an undersea cable runs?', a: ['They survey the sea floor and steer clear of volcanoes, steep rocks and fishing grounds', 'They drop it in a straight line', 'The fish choose the way'] },
      eng: { q: 'How is a subsea cable route chosen?', a: ['A marine survey avoids hazards and trawling grounds, with burial and armour near shore', 'The shortest great circle, whatever the seabed', 'By depth alone: the deeper the better, everywhere'] },
    },
    {
      plain: { q: 'Near the beach, where boats and anchors are, how is an undersea cable protected?', a: ['It is buried under the sea floor and wrapped in thicker armour', 'It floats on the surface', 'It is painted bright orange'] },
      eng: { q: 'How is a subsea cable protected in shallow water?', a: ['Armoured and buried by a plough', 'Left unarmoured to save weight', 'Laid in loops so it can stretch'] },
    },
  ],
};

// ---------------------------------------------------------------- the rules

// Points for one answer: 100 if right, plus up to 50 for answering quickly.
export function answerPoints(right, seconds) {
  if (!right) return 0;
  return 100 + Math.max(0, Math.round(50 * (1 - seconds / STORY_SECONDS)));
}
// A challenge won without a single mistake earns a bonus.
export const FLAWLESS_BONUS = 200;

// Two ways to play. The full story plays every stop of every network (about an hour).
// The quick run, for a booth, plays one game per level, picked at random, in its short
// version, then a short quiz; each win brings back the level's networks together, and
// Lord Lag ends it with two rounds from the games just played (about ten minutes).
export const STORY_MODES = ['quick', 'full'];
export const QUICK_QUIZ = 2;
// a quick run's games: one from each level, at random
export function quickPicks(random = Math.random) {
  return Object.fromEntries(STORY_LEVELS.filter((l) => !l.boss).map((l) => {
    const games = l.chapters.flatMap((id) => STORY[id].stages);
    return [l.n, games[Math.floor(random() * games.length)]];
  }));
}
export function newStory(mode = 'full', random = Math.random) {
  // the score is two scores added up: knowledge (questions and exams) and games
  return { mode, picks: mode === 'quick' ? quickPicks(random) : {}, unlocked: [], stage: 0, final: false, score: 0, know: 0, play: 0, best: 0 };
}
export const isQuick = (s) => s.mode === 'quick';
// the network that plays a game
export const ownerOf = (gid) => STORY_ORDER.find((id) => STORY[id].stages.includes(gid)) ?? null;
// Saved progress, checked: anything unknown or out of order is dropped.
export function loadStory(saved) {
  const s = newStory();
  if (!saved || typeof saved !== 'object') return s;
  if (saved.mode === 'quick') {
    s.mode = 'quick';
    // a pick has to be one of its own level's games, else a fresh one
    const fresh = quickPicks();
    for (const l of STORY_LEVELS.filter((x) => !x.boss)) {
      const p = saved.picks?.[l.n];
      s.picks[l.n] = l.chapters.some((id) => STORY[id].stages.includes(p)) ? p : fresh[l.n];
    }
  }
  for (const id of Array.isArray(saved.unlocked) ? saved.unlocked : []) {
    if (id === STORY_ORDER[s.unlocked.length]) s.unlocked.push(id); else break;
  }
  // a quick run brings a level back whole, so a level half won is not won at all
  if (isQuick(s)) s.unlocked = s.unlocked.filter((id) => levelOf(id).chapters.every((c) => s.unlocked.includes(c)));
  const next = nextChapter(s);
  s.stage = next && Number.isInteger(saved.stage) && saved.stage > 0 && saved.stage < stagesOf(s, next).length ? saved.stage : 0;
  s.final = saved.final === true && s.unlocked.length === STORY_ORDER.length;
  const pts = (x) => (Number.isFinite(x) && x > 0 ? Math.round(x) : 0);
  s.know = pts(saved.know);
  // a save from before the two scores counts all its points as games
  s.play = saved.play == null ? Math.max(0, pts(saved.score) - s.know) : pts(saved.play);
  s.score = s.know + s.play;
  s.best = Math.max(s.score, pts(saved.best));
  return s;
}
// the network to win back next; in a quick run, the one that plays its level's game
export function nextChapter(s) {
  const id = STORY_ORDER[s.unlocked.length] ?? null;
  return id && isQuick(s) ? ownerOf(s.picks[levelOf(id).n]) : id;
}
// a network's stops: all of them, or in a quick run just its level's game
export const stagesOf = (s, id) => (isQuick(s) ? [s.picks[levelOf(id).n]] : STORY[id].stages);
// the game to play next in the network being won back
export const nextStage = (s) => { const id = nextChapter(s); return id ? stagesOf(s, id)[s.stage] : null; };
export const isUnlocked = (s, id) => s.unlocked.includes(id);
// every network back, and Lord Lag still to beat
export const bossNext = (s) => !nextChapter(s) && !s.final;
export const rankOf = (s) => STORY_RANKS[Math.min(s.unlocked.length + (s.final ? 1 : 0), STORY_RANKS.length - 1)];
export const storyDone = (s) => s.final;
const bankPoints = (s, play, know = 0) => {
  s.play += play; s.know += know; s.score = s.play + s.know;
  s.best = Math.max(s.best, s.score);
};
// A stop cleared that is not the network's last: on to its next game.
export function winStage(s, id, points) {
  if (nextChapter(s) !== id || s.stage >= stagesOf(s, id).length - 1) return s;
  s.stage++;
  bankPoints(s, points);
  return s;
}
// One attempt at a chapter's questions (or a level's exam): answers shuffled,
// lives, and the points earned so far (which only count if it is won).
export function startChallenge(id, random = Math.random, questions = STORY[id].questions) {
  return {
    id, questions, i: 0, lives: STORY_LIVES, points: 0, mistakes: 0, over: null,
    wrong: [],          // the questions missed, for the review at the end: { i, pick } (pick null: time ran out)
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
  if (!right) { c.mistakes++; c.lives--; c.wrong.push({ i: c.i, pick: pick == null ? null : c.order[c.i][pick] }); }
  if (c.lives <= 0) c.over = 'lost';
  else if (++c.i >= c.questions.length) {
    c.over = 'won';
    if (!c.mistakes) c.points += FLAWLESS_BONUS;
  }
  return { right, points };
}
// The network's last stop won (and its level's exam, if it closes one): it unlocks and
// the points join the score: the questions' to knowledge, the last game's (`play`) to games.
export function winChapter(s, c, play = 0) {
  if (c.over !== 'won' || nextChapter(s) !== c.id) return s;
  // a quick run brings back the whole level at once
  if (isQuick(s)) s.unlocked.push(...levelOf(c.id).chapters.filter((id) => !s.unlocked.includes(id)));
  else s.unlocked.push(c.id);
  s.stage = 0;
  bankPoints(s, play, c.points);
  return s;
}
// Lord Lag beaten: the story is over.
export function winFinal(s, points) {
  if (!bossNext(s)) return s;
  s.final = true;
  bankPoints(s, points);
  return s;
}
// Start the story again from the top, keeping the best score.
export function restartStory(s, mode = s.mode, random = Math.random) {
  return Object.assign(s, { mode, picks: mode === 'quick' ? quickPicks(random) : {}, unlocked: [], stage: 0, final: false, score: 0, know: 0, play: 0 });
}
// the quiz that closes a level in a quick run: a couple of its exam's questions, at random
export function quickQuiz(id, random = Math.random) {
  const all = [...examAt(levelOf(id).chapters.at(-1))];
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  return all.slice(0, QUICK_QUIZ);
}
// For testing (the ?dev menu): put the story just before a stop, every network before
// it already won. `id` null means just before the fight with Lord Lag.
export function jumpTo(s, id, stage = 0) {
  const k = id ? STORY_ORDER.indexOf(id) : STORY_ORDER.length;
  if (k < 0) return s;
  // a jump is into the full story, where every stop has its place
  return Object.assign(s, { mode: 'full', picks: {}, unlocked: STORY_ORDER.slice(0, k), stage: id ? Math.max(0, Math.min(stage, STORY[id].stages.length - 1)) : 0, final: false });
}

// What the story lets slip about the next network before you get there: a riddle,
// not a name, so the player wonders what is under the clouds.
export const TEASERS = {
  aggregation: {
    plain: 'Somewhere in the city, homes are waiting for their shows to start…',
    eng: 'Somewhere in the metro, the access and aggregation layer has gone dark…',
  },
  xhaul: {
    plain: 'Up on the hills, tall towers have gone quiet. Phones can\'t find them…',
    eng: 'Up on the hills, the cell sites have lost sync and backhaul…',
  },
  ipcore: {
    plain: 'At the heart of the country, the biggest routers are fast asleep…',
    eng: 'At the centre of the country, the core routers are down…',
  },
  submarine: {
    plain: 'Something is moving under the sea…',
    eng: 'Something lies on the ocean floor, linking the two countries…',
  },
  metro: {
    plain: 'Far across the ocean, a city made of light is flickering…',
    eng: 'Across the ocean, a metro optical ring is losing its colours…',
  },
  longhaul: {
    plain: 'A highway of light once crossed the far country. Now it is dark…',
    eng: 'A long-haul photonic mesh spans the far country. It is dark…',
  },
};

function shuffle(a, random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- the notebook
// What the player has learned and where they slipped, kept across restarts: every game
// and exam tried and how it went, every question ever missed (and whether it was got
// right later), and the networks won back, whose lessons it collects.
export function newNotebook() {
  return { games: {}, exams: {}, misses: {}, won: [] };
}
// every question has a stable name, so a miss survives a reload: 'ipcore.2', 'extra.sea.0'
const QUESTION_KEYS = new Map([
  ...Object.entries(STORY).flatMap(([id, ch]) => ch.questions.map((q, k) => [q, `${id}.${k}`])),
  ...Object.entries(EXTRA_QUESTIONS).flatMap(([id, qs]) => qs.map((q, k) => [q, `extra.${id}.${k}`])),
]);
const QUESTIONS_BY_KEY = new Map([...QUESTION_KEYS].map(([q, k]) => [k, q]));
export const questionKey = (q) => QUESTION_KEYS.get(q) ?? null;
export const questionOf = (key) => QUESTIONS_BY_KEY.get(key) ?? null;
const tally = (x) => ({ tries: Math.max(0, Math.round(+x?.tries || 0)), wins: Math.max(0, Math.round(+x?.wins || 0)) });
// Saved notebook, checked: games, exams and questions that don't exist any more are dropped.
export function loadNotebook(saved, gameIds = []) {
  const nb = newNotebook();
  if (!saved || typeof saved !== 'object') return nb;
  for (const [gid, x] of Object.entries(saved.games ?? {})) if (gameIds.includes(gid)) nb.games[gid] = tally(x);
  for (const [id, x] of Object.entries(saved.exams ?? {})) if (STORY[id]) nb.exams[id] = tally(x);
  for (const [key, x] of Object.entries(saved.misses ?? {})) {
    const q = questionOf(key);
    if (!q || !x) continue;
    const picks = (Array.isArray(x.picks) ? x.picks : []).filter((p) => p === null || [1, 2].includes(p));
    nb.misses[key] = { times: Math.max(1, Math.round(+x.times || 1)), picks: picks.slice(-3), fixed: x.fixed === true };
  }
  nb.won = STORY_ORDER.filter((id) => Array.isArray(saved.won) && saved.won.includes(id));
  return nb;
}
// a game played to the end (or given up): won or not
export function noteGame(nb, gid, won) {
  const g = nb.games[gid] ??= { tries: 0, wins: 0 };
  g.tries++; if (won) g.wins++;
  return nb;
}
// a level's exam, named by the network it closes
export function noteExam(nb, id, won) {
  const e = nb.exams[id] ??= { tries: 0, wins: 0 };
  e.tries++; if (won) e.wins++;
  return nb;
}
// one answer: a miss is kept with the answer picked (null: the time ran out); a miss
// answered right later is marked fixed, but stays in the notebook
export function noteAnswer(nb, q, right, pick) {
  const key = questionKey(q);
  if (!key) return nb;
  const m = nb.misses[key];
  if (right) { if (m) m.fixed = true; return nb; }
  const x = nb.misses[key] ??= { times: 0, picks: [], fixed: false };
  x.times++; x.picks = [...x.picks, pick].slice(-3); x.fixed = false;
  return nb;
}
export function noteChapter(nb, id) {
  if (STORY[id] && !nb.won.includes(id)) nb.won = STORY_ORDER.filter((x) => x === id || nb.won.includes(x));
  return nb;
}

// ---------------------------------------------------------------- the board
// The best runs played on this device, for a booth: a name, the score and its two
// halves, and the rank reached. Kept to the top ten.
export const BOARD_SIZE = 10;
// a name as typed, kept short and plain: letters, digits, spaces and . ' -
export const boardName = (s) => String(s ?? '').replace(/[^\p{L}\p{N} .'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
const byScore = (a, b) => b.score - a.score || a.at - b.at;
export function loadBoard(saved) {
  if (!Array.isArray(saved)) return [];
  const pts = (x) => (Number.isFinite(x) && x > 0 ? Math.round(x) : 0);
  return saved
    .filter((e) => e && boardName(e.name) && pts(e.score) > 0)
    .map((e) => ({ name: boardName(e.name), score: pts(e.score), know: pts(e.know), play: pts(e.play), rank: STORY_RANKS.includes(e.rank) ? e.rank : STORY_RANKS[0], at: pts(e.at) }))
    .sort(byScore).slice(0, BOARD_SIZE);
}
// Put a run on the board: returns its place (0 is the top), or -1 when it doesn't make
// the top ten (or has no name or no points).
export function addToBoard(board, name, s, at = Date.now()) {
  const n = boardName(name);
  if (!n || !(s.score > 0)) return -1;
  const e = { name: n, score: s.score, know: s.know, play: s.play, rank: rankOf(s), at };
  board.push(e);
  board.sort(byScore);
  board.length = Math.min(board.length, BOARD_SIZE);
  return board.indexOf(e);
}
