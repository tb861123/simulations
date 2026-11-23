# Packet Switching Lab

A single, self-contained HTML file: a discrete-event network of 11 routers and two hosts. Split a message into packets and watch each router read the destination address, look it up in its routing table and forward the packet; queues build, buffers overflow, packets arrive out of order and are reassembled by sequence number, lost packets are re-sent. Cut links, trap packets in a routing loop, then switch to circuit switching and compare. It needs no install and no internet: **open `packet-switching.html` in Chrome or Edge**. Printable worksheets (one per investigation and per batch experiment, with teacher notes) are in `worksheets.html`.

Built with the shared kit from `tools/kit/src/packet_switching.js` by `node build.js` (run inside `tools/kit/`). Do not edit `packet-switching.html` by hand.

- **A Level (9618 §14.2):** Cambridge International AS & A Level Computer Science 9618 topic 14.2 Circuit switching, packet switching: benefits and drawbacks of each and where each is used, the function of a router, and how packet switching passes a message across a network.
- **Extension (beyond 9618):** store-and-forward timing and the best packet size, queues and buffers, adaptive link-state routing with Dijkstra's algorithm (§18.1), a sliding window, round-trip timers and re-sending, and the hop limit (TTL).

## What it shows

Five scenarios (web page download, busy network, link failure, routing loop and hop limit, real-time call) and free exploration. Packet switching with static or adaptive routing (routing-table arrows, queue bars, link metrics); an inspector showing each packet's header and each router's routing table; a reassembly buffer at B; an event log. Circuit switching with setup, connect and release messages, reserved links, circuit utilisation and redialling after a failure. Live graphs of arrival order and of each packet's one-way delay (jitter, late frames).

Two built-in checks: packets are conserved at every instant, and with static routing on a quiet network the finish time equals an independent store-and-forward calculation (and the circuit's equals setup + bits ÷ R + Σd).

Try this first: Cut link R6–R9 halfway through a transfer. Does the message still arrive? Now try it with a circuit.

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Packet or circuit: which finishes first? | 2: -32 ± 0 · 16: -29.3 ± 0 · 32: -26.5 ± 0 · 64: -20.4 ± 0 · 96: -14.8 ± 0 · 128: -8.62 ± 0 · 160: -3.04 ± 0 · 192: 3.13 ± 0 · 224: 8.71 ± 0 · 256: 14.9 ± 0 ms (mean ± SE, 2 runs each; exactly on the theory: store-and-forward − circuit) |
| The best packet size (extension) | 200: 266 · 300: 182 · 400: 157 · 500: 155 · 600: 154 · 800: 154 · 1000: 155 · 1200: 157 · 1500: 160 ms (exactly on the store-and-forward theory) |
| Other traffic and out-of-order arrival | 0: 6 ± 0 · 20: 8.4 ± 0.678 · 40: 8.8 ± 0.8 · 60: 8 ± 0.316 · 80: 8.8 ± 0.374 · 100: 8.2 ± 0.97 (mean ± SE, 5 runs each) |
| Small buffers and re-sending | 2: 53.5 ± 3.8 · 4: 7.25 ± 0.629 · 6: 1.5 ± 0.289 · 8: 1.5 ± 0.645 · 12: 0.25 ± 0.25 · 16: 0.5 ± 0.5 · 24: 0.75 ± 0.479 · 32: 0.75 ± 0.479 (mean ± SE, 4 runs each) |
| Jitter on a call | 0: 0 ± 0 · 25: 3.66 ± 0.527 · 50: 6.88 ± 0.392 · 75: 10.8 ± 0.317 · 90: 15.8 ± 1.16 · 100: 13.4 ± 0.996 ms (mean ± SE, 4 runs each) (theory: a circuit has none) |
| Download times on a busy network | mean 88.7, SD 14.5, SE 1.33 ms from 120 runs (quiet network: 58.4 ms) |

## The model

See "The model" tab in the page, and the comment at the top of `tools/kit/src/packet_switching.js`.

## The original version

This simulation was contributed by a colleague as a single HTML file. That file is kept, unchanged, in `original/packet-switching-lab.html`, and is linked from "The model" tab. The kit version keeps its network, event engine, scenarios and checks, and adds the Batch run, worksheets, Investigate cards and a Revise tab. It also changes the model: A now sends at most 16 unacknowledged packets at a time (a fixed sliding window), and the retransmission timer has a 10 ms clock-granularity term (RFC 6298). Without these, A flooded R1's buffer and re-sent packets that had not been lost. Router buffers now go up to 512 packets and messages up to 256 kB.
