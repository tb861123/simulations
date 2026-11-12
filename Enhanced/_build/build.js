// Build step: inlines kit.css + kit.js + one simulation script into a single self-contained HTML file.
// Run from this folder:  node build.js
const fs = require("fs"), path = require("path");
const SIMS = [ // [source file, output folder, output html, page title]
  ["waves.js", "waves", "waves.html", "Ripple Tank"],
  ["dynamic_equilibrium.js", "dynamic_equilibrium", "dynamic-equilibrium.html", "Dynamic Equilibrium"],
  ["natural_selection.js", "natural_selection", "natural-selection.html", "Natural Selection"],
  ["nerve_impulse.js", "nerve_impulse", "nerve-impulse.html", "Nerve Impulse"],
  ["earthquake_buildings.js", "earthquake_buildings", "earthquake-buildings.html", "Earthquake Engineering"],
  ["forest_fire.js", "forest_fire", "forest-fire.html", "Wildfire"],
  ["three_body_chaos.js", "three_body_chaos", "three-body-chaos.html", "Three-Body Chaos"],
  ["central_limit_theorem.js", "central_limit_theorem", "central-limit-theorem.html", "Central Limit Theorem"],
  ["supply_demand.js", "supply_demand", "supply-demand.html", "The Trading Pit"],
  ["luck_and_skill.js", "luck_and_skill", "luck-and-skill.html", "Luck, Skill and the League"],
  // these three live in the main physics folder (5th entry = folder to build into, relative to the repo root)
  ["quantum_wave_lab.js", "quantum_wave_lab", "quantum-wave-lab.html", "Quantum Wave Lab", "physics"],
  ["special_relativity.js", "special_relativity", "special-relativity.html", "Special Relativity", "physics"],
  ["wind_tunnel.js", "wind_tunnel", "wind-tunnel.html", "Wind Tunnel", "physics"],
];
const css = fs.readFileSync(path.join(__dirname, "kit.css"), "utf8"), kit = fs.readFileSync(path.join(__dirname, "kit.js"), "utf8");
for (const [src, dir, file, title, base] of SIMS) {
  const p = path.join(__dirname, "src", src); if (!fs.existsSync(p)) { console.log("skip (no source yet):", src); continue; }
  const out = base ? path.join(__dirname, "..", "..", base, dir) : path.join(__dirname, "..", dir); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, file), `<!doctype html>
<!-- ${title}: one self-contained file, works offline. Built from Enhanced/_build (kit.css, kit.js, src/${src}); edit those and run "node build.js". -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
${css}</style></head><body>
<script>
${kit}</script>
<script>
${fs.readFileSync(p, "utf8")}</script>
</body></html>
`);
  console.log("built", (base ? base + "/" : "") + dir + "/" + file);
}
