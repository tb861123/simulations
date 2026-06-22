# Edexcel iGCSE Chemistry Simulations (4CH1)

Zero-install interactive simulations for the Edexcel International GCSE Chemistry specification (4CH1). Open any file in a modern browser — no software installation required.

## How to Use

| Method | Steps |
|--------|-------|
| **Local — quickest** | Double-click `run.bat` (Windows) or open `index.html` directly in your browser |
| **Desktop shortcut** | Run `setup.bat` once; then use the "Chemistry Simulations" shortcut on your Desktop |
| **SharePoint / network drive** | Upload the whole folder to SharePoint; share the link to `index.html` |
| **Direct file** | Open any individual `0N_*.html` file directly — each is fully self-contained |

> **Internet required on first load** (or whenever the browser cache is cold) to fetch p5.js from the CDN. See *Going fully offline* below if that is a problem.

---

## Simulations

| # | File | Topic | Description |
|---|------|-------|-------------|
| 01 | `01_Particle_Theory.html` | Topic 1 | Particle arrangement in solids, liquids and gases; temperature vs state |
| 02 | `02_Atomic_Structure.html` | Topic 1 | Bohr model, electron shells, isotopes and ions for elements H–Ca |
| 03 | `03_Ionic_Bonding.html` | Topic 2 | Electron transfer animation and giant ionic lattice for NaCl, MgO, CaCl₂, KBr |
| 04 | `04_Covalent_Bonding.html` | Topic 2 | Dot-and-cross diagrams and 3-D shapes for H₂ through N₂ |
| 05 | `05_Electrolysis.html` | Topic 4 | Ion migration, electrode products and half-equations for five electrolytes |
| 06 | `06_Rates_of_Reaction.html` | Topic 5 | Collision theory particle sim + Maxwell–Boltzmann distribution |

Each simulation includes:
- Interactive controls (sliders, dropdowns, toggles)
- Live readouts updated in real time
- A *Key Equations* reference box
- Three GCSE-style exam questions with togglable mark schemes

---

## Going Fully Offline

By default every simulation loads p5.js from:

```
https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js
```

To make the suite work with **no internet connection at all**:

1. Download `p5.min.js` from the CDN above while you have internet access.
2. Create a `vendor/` folder inside this directory and save the file there:
   ```
   chem_sims/
   └── vendor/
       └── p5.min.js
   ```
3. In each `0N_*.html` file, replace the CDN `<script>` tag:
   ```html
   <!-- change this -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
   <!-- to this -->
   <script src="vendor/p5.min.js"></script>
   ```
4. All six simulations and `index.html` share the same folder, so one copy of the file covers everything.

---

## Browser Compatibility

Tested in Chrome 120+, Edge 120+, Firefox 121+. JavaScript must be enabled. No plugins or extensions required.

## Specification Coverage

These simulations support revision and teaching for the Edexcel 4CH1 specification (first assessment 2019 series). Topics covered: 1 (Particles & Atomic Structure), 2 (Bonding), 4 (Electrochemistry), 5 (Kinetics).