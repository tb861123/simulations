# Networks and Encryption

A single, self-contained HTML file: Send a message as packets that take their own routes, arrive out of order, get lost and are re-sent, then reassembled; compare circuit switching; encrypt with Caesar and Vigenère and crack Caesar by frequency analysis; run toy RSA with public and private keys and a digital signature. It needs no install and no
internet: **open `networking-and-encryption.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/networking_and_encryption.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `networking-and-encryption.html` by hand.

- **AS Level (9618):** Cambridge International AS & A Level Computer Science 9618 (AS) topics 2 and 6: networks, packets and routers, IP addresses; security, and the purpose of encryption (plaintext, ciphertext, keys), with simple ciphers such as Caesar and Vigenère as examples.
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topics 14 and 17: the TCP/IP protocol suite, circuit switching and packet switching, the role of routers; symmetric and asymmetric encryption, public and private keys, digital signatures and certificates. The RSA arithmetic is beyond the syllabus but shows how a key pair works.

## What it shows

Packet switching: a network of routers; each packet of your message is routed by the delays at the moment it is sent, so packets overtake each other, some are lost (red ✕) and re-sent after a timeout, and the receiver reassembles them by sequence number. A Level: circuit switching with one reserved path. Ciphers: plaintext and ciphertext, the substitution, letter-frequency charts against English, and an automatic frequency-analysis crack. A Level RSA: n, φ, e and d from two primes, encryption and decryption, and signing a hash with the private key.

Try this first: Set 10% packet loss and send the message. How does it still arrive complete?

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| Re-sending lost packets | 0: 1 ± 0 · 0.02: 1.08 ± 0.005 · 0.05: 1.24 ± 0.0176 · 0.1: 1.49 ± 0.0261 · 0.15: 1.88 ± 0.0125 · 0.2: 2.45 ± 0.0307 · 0.3: 4.13 ± 0.0589 (mean ± SE, 4 runs each) (theory: 1/(1 − p)⁴) |
| Out-of-order arrival | 0: 0 ± 0 · 0.2: 0.02 ± 0.00707 · 0.4: 0.688 ± 0.035 · 0.6: 1.61 ± 0.0685 · 0.8: 2.41 ± 0.059 · 1: 3.03 ± 0.053 (mean ± SE, 4 runs each) |
| Brute-forcing a Caesar cipher | mean 12.7, SD 7, SE 0.313 from 500 runs (theory: (1 + 25)/2) |
| How much text does frequency analysis need? | 5: 0.463 ± 0.0318 · 10: 0.763 ± 0.0333 · 20: 0.94 ± 0.00577 · 40: 1 ± 0 · 80: 1 ± 0 · 160: 1 ± 0 (mean ± SE, 3 runs each) |
| Does RSA always decrypt? (A level) | mean 1, SD 0, SE 0 from 100 runs (theory: always) |

## The model

Dijkstra routing on randomly varying link delays; independent packet loss per link; Caesar, Vigenère and RSA with real arithmetic on small numbers. Assumptions and simplifications are listed inside the simulation under **The model**.
