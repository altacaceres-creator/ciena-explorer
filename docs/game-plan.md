# Netlandia Quest: story plan for a game mode

Netlandia starts dark. Each mini-game wins back one part of the network, and each win ends with a short
lesson on what that win means in a real network. Win them all and the whole map is lit, ready to explore
freely.

> “I think doing the mini games is a way to slowly show the network. Otherwise, it's a bit boring to just
> openly explore.”

This is the plan: the whole story first, then each part filled in one level at a time.

## Premise: Lord Lag has switched off Netlandia

On the night of the big premiere, every screen in Popcorn Hill freezes on a spinning wheel. Lord Lag, who
hates anything that arrives on time, has sent his minions across Netlandia. They fill queues, dig up fibre,
start storms and knock the cell sites out of step. The map goes dark one network at a time.

You are the new apprentice at the Netlandia network operations center. Your guide is Pip, a small packet
with a header for a hat. Starting from one living room, you win the network back hop by hop, from the home
outward to the undersea cables where Lord Lag hides.

## Cast

| | Who | What they do |
|---|---|---|
| 🙂 | **You** | The apprentice. Every win promotes you one rank: Apprentice, Technician, Engineer, Architect, Chief of the NOC. |
| 📦 | **Pip** | A packet with a header hat. Explains each game in one line and cheers when you win. In Engineer mode Pip uses the real terms. |
| 😈 | **Lord Lag** | The nemesis. Shows up between levels with a taunt, and as the final boss at the submarine landing. |
| 👾 | **The Buffer Gremlin** | Spins the loading wheel on every screen in Popcorn Hill. |
| 🐘 | **The Elephant Flows** | Huge backups and downloads that stomp into the queues. “Oh no! Here come the elephant flows.” |
| 📢 | **The Broadcast Banshee** | Screams one frame into a loop until every port is full. |
| 🚜 | **Backhoe Bob** | Digs where he shouldn't, and always finds the fibre. |
| 🐞 | **The Jitterbugs** | Nudge timing packets late, so the cell sites drift out of step. |
| 🐷 | **The Spectrum Hog** | Takes the whole width of the light on a fibre for itself. |

## The route: eight levels, from the sofa to the seabed

The order follows a packet's trip outward: home, city, mobile, core, then the optical networks underneath.
Every level unlocks a layer that already exists in Netlandia and the explainers that go with it. That way
the game reuses the map, the packets and the queues that are already built.

| Level | Network | Mini-game | Villain |
|---|---|---|---|
| Prologue | Home fibre (PON) | Last Mile Dash | The Buffer Gremlin |
| 1 | Metro aggregation | Packet Tetris | The Elephant Flows |
| 2 | Business access | Storm Chaser | The Broadcast Banshee |
| 3 | Collector ring | Stop the Fiber Cut | Backhoe Bob |
| 4 | 5G mobile xhaul | Keep the Beat | The Jitterbugs |
| 5 | IP/MPLS core | Packet Race | Lord Lag |
| 6 | Lumen City metro optical | Rainbow Packing | The Spectrum Hog |
| 7 | Long-haul RLS mesh | Mesh Rescue | Backhoe Bob's crew |
| Finale | Submarine network | The Deep Boss | Lord Lag |

### Prologue · Home fibre (PON) · Last Mile Dash

Guide one packet of the premiere from the Couchwave cache to a home in Popcorn Hill: splitter, OLT,
aggregation router, cache. Tap the next hop before the Buffer Gremlin's wheel fills up. In the second
round the show isn't in the cache, so the packet has to go all the way to the origin, and players feel
how much longer it takes.

- **Villain:** The Buffer Gremlin
- **You died:** “Buffering… Movie night is over. 312 homes gave up.”
- **You won:** “You unlocked Home fibre. The premiere plays in every home.”
- **Why it works:** a cache a few hops from the sofa means the show starts at once and the core carries
  each title only once.
- **Unlocks:** `pon` layer · FTTH and the streaming CDN · Your film's journey

### Level 1 · Metro aggregation · Packet Tetris

Packets fall toward the uplink of the East aggregation router: voice, timing, video, business, web. Drop
each one into its queue. The queues drain at the speed of the link. Midway, the Elephant Flows arrive,
giant blocks of backup traffic. Put them in best effort, where they can wait, and keep the voice queue
from overflowing.

- **Villain:** The Elephant Flows
- **You died:** “The voice queue overflowed. Grandma's call to Coreburg dropped.”
- **You won:** “You unlocked the City collector ring. Voice and timing packets are EF, and nobody's call
  drops while the backups run.”
- **Why it works:** QoS marks each packet. EF (Expedited Forwarding) goes first in a small strict queue,
  and elephants wait in best effort, which can be delayed without anyone noticing.
- **Unlocks:** `agg` layer · Quality of service · Low-cost Ethernet aggregation

### Level 2 · Business access · Storm Chaser

Someone at Tidewell's Framefield office plugs a cable into two ports of the same switch. Each broadcast
frame now comes back as two, then four, then eight. The links fill up on screen. Find the loop and block
one link before the storm reaches 100%.

- **Villain:** The Broadcast Banshee
- **You died:** “Every port at 100%. The whole office is offline.”
- **You won:** “You unlocked Business connections. The loop is blocked and the office is back online.”
- **Why it works:** an Ethernet loop must keep one link blocked, or frames circle forever. That blocked link
  is what G.8032 calls the RPL, and storm control caps broadcasts at the edge.
- **Unlocks:** `access` layer · business customers on the rings

### Level 3 · Collector ring · Stop the Fiber Cut

Phase one: Backhoe Bob drives around Coreburg. Tap each digger before it reaches a marked fibre route,
which is the “call before you dig” check. Phase two: Bob gets one through anyway. The ring is cut, so open
the blocked link before the clock passes 50 ms. CFM heartbeats on screen show the moment the far end goes
silent.

- **Villain:** Backhoe Bob
- **You died:** “Too slow. Six businesses lost their connection and the phones are ringing at the NOC.”
- **You won:** “You saved the whole office from losing its internet connection. Traffic went the other way
  round the ring in 43 ms.”
- **Why it works:** CFM notices the cut within milliseconds, and G.8032 unblocks the RPL, so traffic takes
  the other side of the ring in under 50 ms.
- **Unlocks:** G.8032 ring protection · Connectivity fault management

### Level 4 · 5G mobile xhaul · Keep the Beat

A rhythm game. The cell sites pulse to a clock, and timing packets travel the ring on the beat. The
Jitterbugs nudge packets late. Tap to put timing and fronthaul in the top queue, and keep every cell site
in step. In the bonus round, place each DU close enough to its radio to stay inside the fronthaul delay
budget, as C-RAN or D-RAN.

- **Villain:** The Jitterbugs
- **You died:** “The cell sites drifted out of sync. Calls drop every time a phone moves between towers.”
- **You won:** “You unlocked the Mobile phone network. Timing and fronthaul ride first, and every cell site
  is in step.”
- **Why it works:** fronthaul and timing have tiny delay budgets, so they get the strictest queue, and the
  DU can only sit as far from the RU as that budget allows.
- **Unlocks:** `xhaul` layer · RAN split: RU, DU, CU · QoS for 5G xhaul · G.8032 on the xhaul ring

### Level 5 · IP/MPLS core · Packet Race

Your packet, the Tidewell video meeting, races Lord Lag's packet from Gateway Bay to Edgewater. Lord Lag
piles the morning backups onto the short way through Coreburg. Pick the labels that steer your packet round
the quiet way through Northport. Then a core link fails mid-race, and the backup path has to be ready
before it happens.

- **Villain:** Lord Lag, in person, with his congestion
- **You died:** “Your packet arrived 37 ms late. The meeting froze on the CEO's face.”
- **You won:** “You fixed it. The main path is back up, and the secondary paths aren't overloaded anymore.”
- **Why it works:** segment routing puts the path in the packet as a label stack. SR-TE moves one flow off a
  busy link, and TI-LFA has the detour ready before a link fails.
- **Unlocks:** `ipcore` and `vpn` layers · Segment routing · Video between offices · TI-LFA

### Level 6 · Lumen City metro optical · Rainbow Packing

Side A, under the routers. Tetris with light: each request is a wavelength of a certain width that has to
fit into the fibre's spectrum, the same colour all the way round the ring. The Spectrum Hog throws in a
block that takes half the band. Pack it without gaps and connect both data centers.

- **Villain:** The Spectrum Hog
- **You died:** “No room left on the fibre. The data centers can't talk.”
- **You won:** “You unlocked the City light ring. 400G between the data centers, on one fibre pair.”
- **Why it works:** a ROADM adds, drops or passes each wavelength. Planning the spectrum well puts more
  traffic on the same glass.
- **Unlocks:** `metro` and `dci` layers · Fixed ROADM ring · Ring protection · Data center interconnect

### Level 7 · Long-haul RLS mesh · Mesh Rescue

A storm crosses Netlandia, and Lord Lag's minions cut three long-haul fibres one after another. For each
cut, pick a new route for the wavelengths that were on it before the timer runs out, without sending them
over a fibre that is already full.

- **Villain:** Backhoe Bob's whole crew, in the rain
- **You died:** “Two towns went dark. The cuts beat you.”
- **You won:** “You unlocked the Countrywide light highway. Three cuts and not one town lost.”
- **Why it works:** a mesh with CDC ROADMs can send any wavelength any way round, so the control plane
  restores traffic after one cut after another.
- **Unlocks:** `backbone` and `regional` layers · The line system · CDC ROADMs · Mesh restoration

### Finale · Submarine network · The Deep Boss

Lord Lag's lair is on the seabed. He drags an anchor across one undersea cable, and the island across the
sea starts to go dark. In round one, move its traffic to the other cable before the island goes dark. In
round two, keep the repeaters powered while the repair ship is on its way. Lord Lag throws everything from
the earlier levels at you: elephants, a storm, Jitterbugs.

- **Villain:** Lord Lag
- **You died:** “The island is cut off. Lord Lag laughs. Try again?”
- **You won:** “Netlandia is back on, all of it. You are Chief of the NOC.”
- **Why it works:** islands land on more than one cable, so one can carry the other's traffic, and a powered
  line of repeaters keeps light strong across thousands of kilometres.
- **Unlocks:** `submarine` layer · Line terminals and repeaters · Free explore · Demo mode

## Every level, the same loop

1. **Taunt.** Lord Lag or a minion appears over the dark part of the map with one line. The camera flies
   there.
2. **Play.** A mini-game of one to two minutes, on the real map with the real nodes. Pip explains the
   controls in one sentence.
3. **Win or die.** Losing shows what it would mean in real life (“the whole office is offline”) and offers
   a retry. Winning lights up the layer.
4. **Unlock card.** “Congratulations, you unlocked …”, then why you won and how that win shows up in a real
   network. A button opens the matching explainer for anyone who wants more.

Example cards:

> **Explorer: You unlocked the City collector ring**
> You put calls in the fast lane and made the giant downloads wait. That's what real routers do: every
> packet gets a label for how urgent it is.

> **Engineer: You unlocked Metro aggregation**
> Voice and sync marked EF (DSCP 46) in a strict priority queue, elephant flows in best effort with WRED.
> Uplink 82% full, zero voice drops.

> **You died: Every port at 100%**
> The Broadcast Banshee won this round. In a real network, a loop with no blocked link takes the whole
> office offline in seconds. Try again?

## Modes

- **Story** is the new front door: the map starts dark and the levels unlock in order. Progress is saved in
  the browser.
- **Free explore** is today's Netlandia, everything lit. It stays one tap away from the start (“skip the
  story”), so nobody who just wants the map is forced through the games.
- **Demo** plays the story by itself, with Pip winning each level and the unlock cards on screen. It loops
  for a booth screen or the start of a talk.
- **Explorer and Engineer** both work in every mode. The games are the same, and only the words change, the
  way the explainers already do.

## Building it

| Step | What | Done when |
|---|---|---|
| 1 · Shell | Story mode on the start screen, locked layers drawn dark, progress saved, the taunt, unlock card and “you died” card | The map can lock and unlock a layer, with a card |
| 2 · First slice | Prologue and Level 1 (Last Mile Dash, Packet Tetris), built on the explainers' existing packets and queues | Someone new plays both and can say what EF means |
| 3 · Levels 2–5 | Storm Chaser, Stop the Fiber Cut, Keep the Beat, Packet Race | Side B fully playable |
| 4 · Levels 6–7, finale | Rainbow Packing, Mesh Rescue, The Deep Boss | The whole map unlocks |
| 5 · Demo mode | The story on autoplay | Loops unattended for ten minutes |

Each level is a module of its own in `js/games/` that gets the scene and the explainer helpers and reports
win or lose, so the levels can be built and reviewed one PR at a time.

## To decide together

- Is Lord Lag the right nemesis, or would a name from inside the company land better?
- Does the outward order (home first, sea last) work, or should the optical side come earlier for a
  transport audience?
- Phone and touch support for every game, or desktop first?
- Should the games keep score, so people at a booth can compete?
- Which level do we build first after the shell? Packet Tetris shows the most for the least work.
