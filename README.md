# Ciena Explorer — Netlandia

A cartoon 3D globe called Netlandia, with a country on each face. **Side A**, Photonia, carries the
transport networks. **Side B**, Packetland, carries the data network that rides on
them. Spin the planet all the way round, or flip sides from the panel, then click
one of the six major networks to open it on its own in open space, where every
site can be clicked for its equipment and connections. Packets run along every link.

| Side A: transport | Side B: data network |
|---|---|
| ![](docs/overview.png) | ![](docs/side-b.png) |

## Two ways to read it: Explorer and Engineer

The switch under the title picks how the map is labelled, and the choice is remembered.

| | Explorer | Engineer |
|---|---|---|
| for | an introduction to networking: no acronyms, no part numbers | people who already know the trade |
| look | the board game: sticker cards, rounded type, a daylight sky, whales and an airliner | a flat, dark console: plain type, mono labels, no toys |
| networks | *Countrywide light highway*, *Internet core*, *Mobile phone network*… | *Long-haul RLS mesh*, *IP/MPLS core*, *5G mobile xhaul*… |
| sites | *light junction*, *booster hut*, *collector router*, *beach cable station* | *RLS ROADM site*, *RLS amplifier hut*, *aggregation router*, *cable landing station* |
| site card | what the place does and what is inside, in plain words | its role and the Ciena equipment in it |
| explainers | **Learn how it works**: data travels as light, many colours in one fibre (DWDM, in plain words), what a packet is, finding another way, who goes first, your phone call's journey | **Explore the technology**: CDC ROADMs, mesh restoration, SR-MPLS, TI-LFA, G.8032, QoS, CFM… |

Explorer's words live in `js/vocab.js` and its explainers in `js/basics.js`; a test
checks that nothing Explorer prints uses the trade's acronyms (the DWDM topic, which
is there to introduce one, is the exception). A link to an explainer only one mode
has, such as `#ipcore.sr`, switches to that mode.

## The two sides

The globe is a toy world, not a diagram: nothing is wired up on it. The equipment
stands in the landscape as landmarks (a data center campus, a landing station on
the beach, amplifier huts up the mountain road, cell towers on the hills), and each
network is a **region** of its country. Hover a region and the ground there tints
in that network's colour and its landmarks lift; click it to open the network.
An airliner circles the planet between the two countries.

**Side A, Photonia (transport)** is laid out in three bands so the networks don't
pile up: regional rings through the western towns, the countrywide RLS mesh across
the middle, and the Lumen City metro on the east coast. Coherent Isle, off the east coast, is
the stepping stone for the subsea cables.

**The submarine network wraps round the planet.** Its region runs from the strait
and Coherent Isle across the ocean to Packetland's three landing coasts, so it can be
found, and opened, from either side; both sides' panels list it.

**Side B, Packetland (data network)** has Coreburg in the middle with its pair of
core routers, the IP core meshed out to each corner, an aggregation ring hugging
the city, and the 5G xhaul ring out in the countryside.

## The six major networks

Each is a region of its country on the globe (the harbour and the strait, the
heartland, the capital, the countryside); clicking that region, or the network's
entry in the panel, opens it.

| side | network | what's in it | example Ciena gear |
|---|---|---|---|
| A | Submarine network | 4 cables, 7 landing stations, 61 repeaters; 3 cables cross to side B | GeoMesh Extreme |
| A | Long-haul RLS mesh | 8 ROADMs, each with 3+ routes, 21 amplifier huts, landing on 3 Lumen City hubs | RLS with WaveLogic 6 |
| A | Lumen City metro optical | 4 metro hubs on a packet-optical ring, 4 data centers on a DCI ring | RLS, Waveserver |
| B | IP/MPLS core | 6 core routers in a mesh, an internet exchange, cloud and 5G core data centers, and a company VPN joining 3 offices | 8100 Coherent Routers |
| B | Metro aggregation | a segment-routed ring round Coreburg on both core routers, 6 business customers on rings, 5 homes on fibre (PON) and a streaming cache | 5170, 3900 series |
| B | 5G mobile xhaul | 5 pre-aggregation hubs and 7 cell sites on a ring, uplinked into the core at 2 points; each cell site's RAN split into RU, DU and CU | 5164, 5166 |

The product names are illustrative placements, not a real network design.

| IP/MPLS core on its own | 5G xhaul on its own |
|---|---|
| ![](docs/ipcore.png) | ![](docs/xhaul.png) |

## A network on its own

Opening a network replaces the globe with just that network floating in open space:
its sites, cables, amplifiers or repeaters, and the traffic on them, with no terrain
or buildings. A network on one side is laid flat. The submarine network, which wraps
from side to side, keeps its shape round an invisible planet and is seen from high
over the pole. **Back to the globe**, the browser's back button or Esc returns.

Each network has its own address: `#submarine`, `#longhaul`, `#metro`, `#ipcore`,
`#aggregation` or `#xhaul`. A link can open straight into one, and a separate page
can later take over that address.

The submarine network opens as an undersea scene: the cables lie on the sandy sea
floor with the repeaters along them, the landing stations stand on the shore above
a translucent sea surface, and whales cruise just above the floor. On the globe,
cable-laying ships work each subsea route, and the network's glow follows the
cables all the way round the planet.

![the submarine network round the planet](docs/submarine.png)

## The 5G radio: RU, DU and CU

Every cell site's base station is split in three, as in a real 5G RAN: the radio
unit (RU) up the mast, the distributed unit (DU) that runs the real-time radio
stack, and the central unit (CU) above it. Click a cell site or hub and its card
shows which parts it hosts and where the others are.

| | sites | DU | CU |
|---|---|---|---|
| C-RAN | Cell sites 1 and 7 | pooled at Labelbrook | Labelbrook |
| C-RAN | Cell sites 4 and 5 | pooled at Framefield | Edgewater |
| D-RAN | Cell site 2 | at the foot of the mast | Labelbrook |
| D-RAN | Cell sites 3 and 6 | at the foot of the mast | Edgewater |

So the ring carries all three legs: **fronthaul** (eCPRI) from an RU to its DU,
**midhaul** (F1) from a DU to its CU, and **backhaul** (N2/N3) from the two CU
hubs into the IP core at Gateway Bay and Edgewater, on to the 5G core. A D-RAN
mast has a DU cabinet at its foot, and a hub that hosts a DU pool or a CU has a
rack beside its hut. The split is data on the cell sites in `js/world.js`
(`CRAN` and `DRAN`), and a test checks every site has all three parts and every
CU an uplink to the core. Explorer calls them the radio, the signal computer and
the organiser.

## Streaming at home: Popcorn Hill

East of Coreburg, the homes of Popcorn Hill have fibre to the door. Each home's
fibre meets the others at a passive splitter in a street cabinet, one fibre runs
on to the OLT, and the OLT hands off to the East aggregation router. Next to that
router sits the cache of Couchwave, a made-up streaming service: popular shows are
served from there, a few hops from the sofa, and a title that is not cached yet
is fetched once from the origin through the core.

The explainers play it out: **FTTH and the streaming CDN** in Engineer (PON
downstream and upstream, cache hit, cache miss) and **Your film's journey** in
Explorer, where the cache is the streaming shelf. The homes are `SOFA_STREET` in
`js/world.js`, on the `pon` layer, and a test checks every home reaches the cache
through the splitter and the OLT.

## A video meeting between offices

Tidewell, a made-up company, has an office in Gateway Bay, Edgewater and
Framefield, each on the core router of its town and all three on one L3VPN. The
explainer plays out a video meeting between Gateway Bay and Edgewater: it takes
the IGP path through the Coreburg pair, marked EF (Expedited Forwarding) so QoS
puts it in the strict-priority queue on every hop. At 9 a.m. meetings start all
over the country and the EF queue on the Coreburg pair hits its policer, so the
picture starts to freeze, and then an SR-TE policy steers Tidewell's meeting round
through Northport, where EF has headroom. Explorer tells it as the company's
private network, a fast lane for video, and the quiet road beating the short one. The offices are `BRANCH` nodes in `js/world.js`, on the `vpn` layer.

## Explore the technology

Each network's panel lists the technologies that matter in that space. Pick one and
a short explainer plays out live on the network, step by step (Next / Back, or the
arrow keys): links light up or go dark, a fibre gets cut, a labelled packet runs
its route, a queue readout fills, a fault alarm appears where it would.

| network | topics |
|---|---|
| Long-haul RLS mesh | the line system and its amplifiers · **CDC ROADMs** (colorless, directionless, contentionless, at the five-degree Crosspoint site) · mesh restoration round a fibre cut |
| Lumen City metro optical | fixed two-degree **ROADM ring** · ring protection · data center interconnect |
| Submarine | line terminals, repeaters and spectrum sharing |
| IP/MPLS core | **segment routing (SR-MPLS)**, a label stack that pops hop by hop · **video between offices**: an L3VPN, and an SR-TE policy that moves the video off a congested link · TI-LFA fast reroute |
| Metro aggregation | **G.8032** ring protection (RPL, R-APS, flush) · low-cost Ethernet aggregation (E-Line, no MPLS at the edge) · **QoS** queues on the uplink · **FTTH and the streaming CDN** (PON, cache hit and miss) · **CFM** heartbeats and loss of continuity |
| 5G mobile xhaul | **RAN split**: RU, DU and CU, with fronthaul, midhaul and backhaul between them · QoS for fronthaul · CFM to the cell site · G.8032 on the xhaul ring |

| SR-MPLS: the stack pops at each hop | G.8032: R-APS after a span fails |
|---|---|
| ![](docs/tech-sr.png) | ![](docs/tech-g8032.png) |

A topic has its own address too, such as `#ipcore.sr` or `#aggregation.g8032`.
Topics live in `js/tech.js` as data: a step is a sentence plus a function that
describes the scene using a small set of effects (`focus`, `marker`, `packet`,
`spot`, `queue`, `anchor`); the tests run every step against the network's data to
make sure it only touches sites and links that exist there.

## Netlandia Quest: the story mode

The first visit offers a choice: **Play the story** or **Explore freely**. In the
story the planet starts under cloud. Lord Lag has switched Netlandia off, and each
network is won back from one of his minions, in the order a phone's packets travel:
the **cell towers** (the Jitterbugs), the **city's businesses and homes** (the Buffer
Gremlin), the **core** (the Elephant Flows). That finishes the packet world on side B,
and the **undersea cables** appear as a new discovery (the Anchor Dragger). Across the
ocean wait the **metro optical ring** (the Spectrum Hog) and the **long-haul mesh**,
where Lord Lag himself waits.

Each network's challenge opens with the villain's taunt, then a mini-game on a board
in the card, played by touch, click or the keys 1, 2 and 3:

- **Keep the Beat** (cell towers): timing packets race from the hub to three towers;
  tap each one as it reaches its tower, while the Jitterbugs make them surge and stall.
  Misses let the towers drift out of sync.
- **Packet Tetris** (city network): packets fall toward the uplink and stack up in the
  queue you drop them in: calls and clocks in the fast lane (EF), work in business
  (AF), the web and the elephant flows in best effort. The uplink serves EF first; a
  call behind a backup, or an elephant in the fast lane, is a dropped call.
- **Packet Race** (core): your video packet races Lord Lag's from Gateway Bay to
  Edgewater three times. At each router you pick the next hop; the elephants jam a
  different road each race, while Lord Lag always takes the shortest one. In the last
  race a fibre is cut in front of you. Win two of the three.

The networks come in two levels. **Level 1, the packet world** (towers, city, core)
closes with a **final exam** after Packet Race: the core's three questions and one
from each earlier stop. **Level 2, across the ocean** (undersea cables, light ring,
long haul) closes the same way after Mesh Rescue, and then comes **the fight with Lord
Lag**: three short rounds of games already played (a packet tetris, a race with a cut
fibre, a storm), one of his three hearts gone for each round won. Every win card tells the story of your game in numbers, why you won, and a
longer paragraph on what that means in a real network.

- **Repeater Rescue** (undersea cables): light crosses the ocean through repeaters on
  the seabed; tap each one that blinks red before it loses power, then, when the anchor
  cuts a cable, move the island's traffic to its other cable while the repair ship sails.
- **Rainbow Packing** (metro optical ring): a tetris of light. Columns are colours,
  rows the ring's spans; move each request with ◀ ▶ and drop it, and a request over two
  spans needs the same colours free on both. The Spectrum Hog grabs some too.
- **Mesh Rescue** (long haul): a storm cuts fibre after fibre; for each service that
  drops, pick one of three ways round, with only two waves per fibre, so think ahead.

The games are tuned to be easy: slow motion while you choose, wide targets, and a
player who reacts in a second or two still wins. Losing is **You died**, with what that would mean in
a real network. A win
lifts the clouds, pops the landmarks back up and shows **You unlocked …** with why
you won, and the scene can then be opened like any other. Points come from the game
(or 100 a right answer plus up to 50 for speed), with 200 more for a flawless round, and every
network won is a rank, from Apprentice to Chief of the NOC. Progress and the best
score stay in the browser, the ☰ menu starts over or switches to free exploring,
and both reading modes tell the story in their own words. The full plan, with every
mini-game, is in [`docs/game-plan.md`](docs/game-plan.md).


- Globe: drag (one finger on a phone) spins the planet in any direction; scroll or
  pinch zooms. **Side A / Side B** in the panel spins it round to the other country;
  the panel also follows whichever side you've spun to.
- A network on its own: drag turns, right-drag or two fingers pan, scroll or pinch zooms.

## Run it

No build step and no dependencies; three.js r160 is vendored in `vendor/` so the
page works offline.

```sh
python3 -m http.server 8765     # then open http://localhost:8765/
node --test                     # every test in test/
node build.mjs                  # single-file page -> dist/netlandia.html
```

`dist/netlandia.html` loads three.js r160 from jsDelivr and has everything else
inlined, so it can be shared as one file.

## Code

| file | what it does |
|---|---|
| `js/world.js` | pure data: the two sides and their projections onto the planet, terrain, towns, every node and link, generated customers, amplifiers and repeaters, the six major networks, the region each covers on the globe and the links each owns |
| `js/scene.js` | three.js: the planet, sea and atmosphere, towns and trees (instanced), equipment models, solid and dashed cables, boats, wind farm, clouds |
| `js/detail.js` | a network on its own: laid flat, or round an invisible planet, with its own lights and traffic, and the effects the explainers use |
| `js/tech.js` | the technology topics for each network (Engineer mode) and the step player |
| `js/basics.js` | the introduction-to-networking topics for each network (Explorer mode) |
| `js/vocab.js` | the two reading modes: every name, label and sentence the HUD prints, in plain words and in the trade's |
| `js/story.js` | Netlandia Quest with no page in it: the order the networks unlock in, each chapter's villain, taunt, questions, win and loss in both readings, and the rules (points, lives, ranks, saved progress) |
| `js/minigames.js` | the Quest's mini-games as small simulations a test can play (start, tick, press, result, summary) plus a 2D-canvas draw: Keep the Beat, Packet Tetris, Packet Race, Repeater Rescue, Rainbow Packing, Mesh Rescue, and the fight with Lord Lag built from three of them |
| `js/game.js` | the Quest on screen: the start screen, the score bar and the challenge card; reaches the globe only through the hooks main.js hands it |
| `js/main.js` | globe camera and side switch, the networks as clickable regions with their halos and the Quest's cloud cover, the airliner, switching views, labels, picking, the site card |
| `css/net.css` | the HUD, and the Engineer theme as a second set of tokens |
| `test/tech.test.mjs` | every topic's steps, in both modes, touch only that network's sites and links; Explorer's vocabulary covers every site and network without jargon; the brief's technologies are where it asked |
| `test/world.test.mjs` | data checks: links resolve, transport on side A and data on side B, gear and fibre on land, subsea cables at sea, no two cables run alongside each other, every ROADM and core router has 3+ routes, no customer or cell site on a spur, the VPN offices on three different core routers, every cell site has an RU, DU and CU and every CU an uplink, every home reaches the streaming cache, the six networks own their own links, each network's sites stand inside its region |
| `test/story.test.mjs` | the Quest covers every network once (side B, then the ocean, then side A), every line has both readings, and the rules score, lose, win, unlock in order and reload saved progress safely |
| `test/minigames.test.mjs` | robots play every mini-game and the final fight: a careful player wins, an idle one loses; calls in best effort lose Packet Tetris, following Lord Lag's shortest road loses Packet Race, waiting for the ship loses Repeater Rescue, a two-span request needs the same colours on both, and every real sequence of choices in Mesh Rescue can still be won |
| `build.mjs` | bundles everything into `dist/netlandia.html`, and fails if two modules declare the same top-level name |
| `vendor/` | three.js r160 and OrbitControls (MIT) |

To add a site, add a node in `PLACED` and links in `LINKS` in `js/world.js` (with
`side: 1` for Packetland); the tests will tell you if it landed in the sea or on the
wrong side.
