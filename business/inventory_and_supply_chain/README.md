# Stock Control and the Supply Chain

A single, self-contained HTML file: a bike shop's tyres on a live bar-gate stock graph (re-order level, lead time, re-order quantity, buffer stock, lorries on the way), just-in-time with reliable and unreliable suppliers, the costs of holding and ordering stock, and the bullwhip effect up a four-stage supply chain. It needs no install and no
internet: **open `inventory-and-supply-chain.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built from `tools/kit/src/inventory_and_supply_chain.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `inventory-and-supply-chain.html` by hand.

- **Standard (GCSE):** Pearson Edexcel GCSE Business (1BS0) 2.3.2 working with suppliers: bar-gate stock graphs, JIT, procurement and logistics.
- **Advanced (A level):** Pearson Edexcel A level Business (9BS0) 2.4.3 stock control (diagrams, buffer stock, poor stock control, JIT, lean production). EOQ and the bullwhip effect are marked beyond the spec.

## What it shows

**Stock control:** the bar-gate graph over the last 90 days with the maximum, re-order level and buffer stock marked, orders placed, deliveries on their way, days with empty shelves, and the stock on the shelf; controls for demand and its variation, lead time, re-order quantity, buffer, JIT and late deliveries; at A level the holding, ordering and lost-sales costs and the cost curve against order size. **Supply chain:** shoppers, shop, wholesaler, distributor and factory, each ordering from the next; the swing in orders grows at every stage, especially after a small permanent rise in demand.

## Batch run

| Experiment | What it compares |
|---|---|
| Buffer stock and stockouts | % of delivery cycles with a stockout against 1 − Φ((buffer − d/2) ÷ σ√L) |
| Re-order quantity and cost (A level) | daily cost against H(Q/2 + buffer) + S·d/Q, minimum at the EOQ |
| JIT and late deliveries | lost sales against the % of late deliveries |
| Bullwhip and lead time (beyond spec) | variance ratio against 1 + 2L/p + 2L²/p² |
| Up the chain (beyond spec) | variance ratio at each stage |
