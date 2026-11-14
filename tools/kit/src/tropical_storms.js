/* =====================================================================
   TROPICAL STORMS
   A hurricane (typhoon, cyclone: the same thing in different oceans) is
   a heat engine. Warm sea water evaporates; the moist air spirals in
   towards low pressure, rises in towering clouds and releases its heat
   as the vapour condenses, which lowers the pressure further.

   The model follows each storm hour by hour with two simple rules.

   1. HOW STRONG?  Over warm sea a storm's winds grow towards a limit set
      by the sea temperature (its "potential intensity"); nothing grows
      below about 26.5 °C. Growth also needs the Earth's spin (none within
      about 5° of the equator) and winds that do not change much with
      height (low "wind shear"). Over land or cool water the fuel is cut
      off and the winds die away.

   2. WHERE TO?    A storm is carried by the winds around it: west with
      the trade winds, drifting towards the pole, then curving east when
      it reaches the westerlies.

   The map is a simplified North Atlantic. UNITS: wind in metres per
   second inside the model (shown in mph and km/h), degrees, hours.
   ===================================================================== */
const MPH = 2.237, KMH = 3.6;
const CATS = [[0, "tropical depression", "#8fb7d9"], [17.5, "tropical storm", "#69d17a"], [33, "category 1 hurricane", "#ffe066"], [43, "category 2 hurricane", "#ffb347"], [50, "category 3 hurricane", "#ff8a3d"], [58, "category 4 hurricane", "#ff5a4d"], [70, "category 5 hurricane", "#d94dff"]];
const catOf = V => { let k = 0; for (let i = 0; i < CATS.length; i++) if (V >= CATS[i][0]) k = i; return k; };
// ---- the map: rough coastlines as [longitude, latitude] corners ----
const LAND = [
  [[-100, 50], [-100, 24], [-97.5, 26], [-97, 28], [-94, 29.5], [-90, 29.2], [-89, 30.3], [-85.5, 29.8], [-83, 29], [-82.5, 27.5], [-81.8, 25.8], [-80.3, 25.3], [-80, 27], [-81.3, 30.5], [-80.5, 32.2], [-78.5, 33.9], [-76.5, 34.7], [-75.6, 35.3], [-76, 37], [-74, 39.5], [-74, 40.6], [-71, 41.5], [-70, 42], [-70.5, 43.5], [-67, 44.8], [-64.5, 45.3], [-61, 45.5], [-60, 46.5], [-64, 48.5], [-66, 50]],
  [[-100, 24], [-97.8, 22.5], [-96, 19], [-94.5, 18.3], [-91.5, 18.6], [-90.5, 21], [-87, 21.5], [-88, 17.5], [-88.5, 15.8], [-84, 15.8], [-83.3, 12.5], [-83.5, 10], [-81.5, 9], [-79.5, 9.5], [-77.3, 8.5], [-77, 7], [-75.5, 10.8], [-72, 12], [-71.5, 10.5], [-68, 11.5], [-64, 10.5], [-61.5, 10.5], [-60, 8.5], [-57, 6], [-52, 4.5], [-50, 1.5], [-50, 0], [-100, 0]],
  [[-85, 21.8], [-82, 23.2], [-79.5, 22.8], [-77, 21.5], [-74.2, 20.2], [-77.5, 19.9], [-81, 22], [-84, 21.9]],
  [[-74.4, 18.4], [-72.8, 19.9], [-70, 19.8], [-68.4, 18.5], [-71, 17.8]], [[-78.3, 18.4], [-76.3, 18.2], [-77.2, 17.8]], [[-67.2, 18.5], [-65.6, 18.3], [-66.5, 17.9]],
  [[-5, 0], [-5, 5], [-8, 4.5], [-11.5, 7], [-13.3, 9], [-15, 11], [-16.7, 12.5], [-17.3, 14.7], [-16.5, 16], [-16.3, 19], [-17, 21], [-16, 23.5], [-14.5, 26], [-13, 27.7], [-10, 29.5], [-9.7, 31.5], [-8.5, 33.3], [-6.5, 34.2], [-5.9, 35.8], [-5, 36]],
  [[-5, 36], [-6.3, 36.6], [-7.4, 37.2], [-8.9, 37], [-9.5, 38.8], [-8.8, 41.5], [-9.2, 43.2], [-8, 43.7], [-5, 43.5]]
];
const CITIES = [["Miami", -80.2, 25.8], ["New Orleans", -90.1, 30], ["Houston", -95.4, 29.8], ["New York", -74, 40.7], ["Havana", -82.4, 23.1], ["Cancún", -86.8, 21.2], ["San Juan", -66.1, 18.4], ["Dakar", -17.4, 14.7], ["Lisbon", -9.1, 38.7], ["Charleston", -79.9, 32.8]];
function onLand(lon, lat) { for (const poly of LAND) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside; } if (inside) return true; } return false; }

// sea-surface temperature (°C): warmest in the tropics and in late summer; `warm` is extra warming you add
function sst(lon, lat, day, warm) { return 29.4 - 0.0095 * Math.pow(Math.max(0, Math.abs(lat) - 12), 2.05) + (lon < -82 && lat > 19 && lat < 31 ? 0.7 : 0) + 1.0 * Math.cos(2 * Math.PI * (day - 255) / 365) - 1.0 + warm; }
// the strongest winds a sea of this temperature can support (m/s): the storm's speed limit
const potential = T => T < 25 ? 0 : T < 28.5 ? 15 + 12.5 * (T - 25) : Math.min(92, 58.75 + 6 * (T - 28.5));
// central pressure (hPa) that goes with a given wind speed, from a standard formula used by forecasters
const pressureOf = V => 1010 - Math.pow(V * 1.944 / 6.7, 1 / 0.644);

class Storm {
  constructor(lon, lat, rand, name, fav = 1) { this.fav = fav;   /* fav: how favourable the air around it is (dry, dusty air off the Sahara holds many storms back) */ this.lon = lon; this.lat = lat; this.V = 12; this.age = 0; this.rand = rand; this.name = name; this.track = [[lon, lat, 12]]; this.peak = 12; this.dead = false; this.land = false; this.hits = []; this.wob = [0, 0]; this.why = ""; }
  /* one hour.  E = { day, warm (°C added), shear (m/s), depth (m of warm water), ridge (latitude of the high-pressure ridge) } */
  step(E) {
    const r = this.rand, lat = this.lat, V = this.V, wasLand = this.land; this.land = onLand(this.lon, lat);
    // ---- RULE 1: how strong? ----
    let dV;
    if (this.land) { dV = -V / 13; this.why = "over land: cut off from its supply of warm, moist air"; }
    else {
      // a strong, slow storm stirs up cooler water from below; if the warm layer is shallow this cools the sea under the storm
      const T = sst(this.lon, lat, E.day, E.warm) - 2.6 * (V / 60) ** 2 * (40 / E.depth), Vp = potential(T) * this.fav, spin = K.clamp((Math.abs(lat) - 4) / 6, 0, 1);
      dV = V < Vp ? 0.05 * spin * V * (1 - Math.pow(V / Vp, 3)) : -0.035 * (V - Vp);
      dV -= 0.0042 * Math.max(0, E.shear - 4) * V;                                    // wind shear tilts the storm over and blows its warm core away
      this.why = Vp < 20 ? "sea too cool: below about 26.5 °C" : spin < 0.3 ? "too close to the equator: not enough spin" : E.shear > 13 ? "torn apart by wind shear" : V > Vp * 0.93 ? "as strong as this sea temperature allows" : "strengthening over warm water";
      this.T = T; this.Vp = Vp;
    }
    this.V = Math.max(0, V + dV + 0.5 * r.gauss());
    if (this.land && !wasLand && this.V > 15) this.hits.push({ lon: this.lon, lat, V: this.V, t: E.day, speed: this.speed || 5 });
    // ---- RULE 2: where to? carried by the surrounding winds (m/s), plus a small drift towards the pole ----
    const d = lat - E.ridge; let u = d < -12 ? -6 : d < 0 ? -6 * (-d / 12) : Math.min(13, d * 1.1), v = 1.3 + 2.6 * Math.exp(-((d / 7) ** 2));
    this.wob[0] += -0.05 * this.wob[0] + 0.45 * r.gauss(); this.wob[1] += -0.05 * this.wob[1] + 0.3 * r.gauss(); u += this.wob[0]; v += this.wob[1];
    this.speed = Math.hypot(u, v); this.lon += u * 3.6 / (111 * Math.cos(lat * Math.PI / 180)); this.lat += v * 3.6 / 111;      // 1 m/s = 3.6 km/h; 1° of latitude = 111 km
    this.age++; if (this.V > this.peak) this.peak = this.V; if (this.age % 3 === 0) this.track.push([this.lon, this.lat, this.V]);
    if (this.V < 8 || this.lat > 52 || this.lon > -3 || this.lon < -101 || this.age > 600) this.dead = true;
  }
}
// what the storm does when it comes ashore.  C = { shelf (1 steep to 2 wide and shallow), wall (m), evac (%), strong (true/false) }
function impact(hit, C) {
  const surge = 0.0015 * hit.V * hit.V * C.shelf + (1010 - pressureOf(hit.V)) * 0.01;      // wind piles water against the coast; low pressure lets the sea rise 1 cm per hPa
  const rain = Math.min(900, 80 + 1500 / Math.max(1.5, hit.speed));                         // a slow-moving storm dumps its rain on one place
  const wind = 100 * K.clamp(Math.pow(Math.max(0, hit.V - (C.strong ? 40 : 25)) / (C.strong ? 50 : 38), 2.2), 0, 1);     // share of buildings badly damaged by wind
  const flood = K.clamp((surge - C.wall) / 4, 0, 1) * 100;                                  // share of the low-lying coast under water
  return { surge, rain, wind, flood, danger: Math.max(flood, wind * 0.4) * (1 - C.evac / 100) };
}
const ENV0 = { day: 255, warm: 0, shear: 7, depth: 60, ridge: 29 };
// one storm from start to finish, without drawing
function life(lon, lat, E, rnd) { const s = new Storm(lon, lat, rnd, ""), e = Object.assign({}, ENV0, E); while (!s.dead) { s.step(e); if (s.age % 24 === 0) e.day++; } return s; }
// a whole season (1 June to 30 November) without drawing: returns counts
function season(E, rnd) {
  const e = Object.assign({}, ENV0, E), storms = []; let named = 0, hurr = 0, major = 0, land = 0;
  for (let h = 0; h < 183 * 24; h++) { e.day = 152 + h / 24; if (rnd() < spawnRate(e.day) / 24) storms.push(spawn(rnd, "")); for (const s of storms) if (!s.dead) { s.step(e); if (s.dead) { if (s.peak >= 17.5) named++; if (s.peak >= 33) hurr++; if (s.peak >= 50) major++; if (s.hits.some(q => q.V >= 33)) land++; } } }
  return { named, hurr, major, land };
}
const spawnRate = day => 0.022 + 0.16 * Math.exp(-(((day - 255) / 38) ** 2));     // new disturbances per day: most leave Africa in August to October
function spawn(rnd, name) { const u = rnd(), fav = rnd() < 0.3 ? 1.0 + 0.16 * rnd() : 0.25 + 0.5 * rnd();   /* about three in ten meet nothing to hold them back */ return u < 0.7 ? new Storm(-20 - rnd() * 18, 9 + rnd() * 6, rnd, name, fav) : u < 0.87 ? new Storm(-62 - rnd() * 20, 12 + rnd() * 6, rnd, name, fav) : new Storm(-86 - rnd() * 8, 20 + rnd() * 5, rnd, name, fav); }
const NAMES = ["Ana", "Bill", "Claudette", "Danny", "Elsa", "Fred", "Grace", "Henri", "Ida", "Julian", "Kate", "Larry", "Mindy", "Nicholas", "Odette", "Peter", "Rose", "Sam", "Teresa", "Victor", "Wanda"];

// ---- Climate averages (1991–2020, rounded). T = mean monthly temperature (°C), R = rainfall (mm). Sources are listed in "The model". ----
const STATIONS = {
  sing: { name: "Singapore (1°N)", lat: 1.4, belt: "under the ITCZ: rising air, low pressure, rain all year", T: [26.6, 27.2, 27.7, 28.2, 28.6, 28.6, 28.2, 28.1, 27.9, 27.8, 27.1, 26.6], R: [246, 114, 178, 172, 171, 137, 155, 163, 141, 168, 255, 317] },
  miami: { name: "Miami, USA (26°N)", lat: 25.8, belt: "edge of the subtropical high; hurricane season June to November", T: [20.1, 21.0, 22.6, 24.6, 26.9, 28.4, 29.0, 29.1, 28.4, 26.6, 23.7, 21.4], R: [47, 57, 73, 87, 171, 252, 165, 224, 247, 171, 82, 58] },
  cairo: { name: "Cairo, Egypt (30°N)", lat: 30, belt: "under the subtropical high: sinking air, hot desert", T: [14.0, 15.4, 18.0, 21.5, 25.0, 27.5, 28.5, 28.5, 26.7, 24.0, 19.5, 15.5], R: [5, 4, 4, 1, 0, 0, 0, 0, 0, 1, 3, 6] },
  london: { name: "London, UK (51°N)", lat: 51.5, belt: "in the westerlies near the polar front: depressions all year", T: [5.7, 6.1, 8.2, 10.7, 13.9, 17.0, 19.3, 18.9, 16.2, 12.8, 8.7, 6.1], R: [55, 41, 42, 44, 49, 46, 45, 50, 49, 69, 59, 55] },
  reyk: { name: "Reykjavík, Iceland (64°N)", lat: 64.1, belt: "under the sub-polar low: rising air, frequent storms", T: [-0.5, 0.0, 0.6, 3.0, 6.5, 9.3, 11.2, 10.7, 8.0, 4.6, 1.5, 0.0], R: [76, 72, 82, 58, 44, 50, 52, 62, 67, 86, 73, 79] },
  barrow: { name: "Utqiaġvik, Alaska (71°N)", lat: 71.3, belt: "under the polar high: sinking cold air, a cold desert", T: [-25, -27, -26, -18, -6, 2, 5, 4, -1, -9, -18, -23], R: [4, 4, 3, 3, 4, 8, 25, 25, 15, 10, 5, 4] }
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// ---- Three real storms. Figures as reported by the sources named in "The model". ----
const CASES = [
  { name: "Typhoon Haiyan", where: "Philippines, 8 November 2013", col: "#ff6b6b", deaths: 6300, damage: 2.2, gdp: 2800, surge: "over 5 m at Tacloban (locally about 7 m)", wind: "about 315 km/h: category 5, one of the strongest storms ever to reach land", people: "16 million affected, 4.1 million displaced, 1.1 million homes damaged; 1061 people missing", why: "A lower-middle-income country. Many homes were built of light materials. Tacloban lies on a low coast at the head of Leyte Gulf, which funnelled the surge. Warnings were given, but 'storm surge' was not widely understood, and many shelters were themselves flooded." },
  { name: "Hurricane Katrina", where: "USA, 29 August 2005", col: "#74c0fc", deaths: 1833, damage: 125, gdp: 44000, surge: "8.5 m on the Mississippi coast", wind: "about 205 km/h at landfall (category 3); 280 km/h at its peak over the Gulf (category 5)", people: "about 1 million displaced; 80% of New Orleans flooded when levees and floodwalls failed", why: "A high-income country. Forecasts were good and New Orleans was ordered to evacuate, but about 100 000 people without cars stayed. Much of the city lies below sea level behind levees, which failed. The cost in money was enormous." },
  { name: "Cyclone Idai", where: "Mozambique, Zimbabwe and Malawi, March 2019", col: "#8ce99a", deaths: 1300, damage: 2.2, gdp: 500, surge: "4.4 m at Beira", wind: "about 175 km/h at landfall (category 2)", people: "about 3 million affected; 90% of Beira damaged; river floods formed an 'inland sea'; cholera followed", why: "One of the world's poorest countries. Beira is low-lying; many homes were of mud and thatch; warnings reached few rural people. The slow-moving storm dropped huge amounts of rain inland, causing floods and landslides." }
];

// ---------------- The page ----------------
const E = Object.assign({}, ENV0), C = { shelf: 1.5, wall: 2, evac: 50, strong: true };
let view = "map", month = 8, station = "sing", cellParts = null;
let storms = [], old = [], rate = 6, hours = 0, acc = 0, seasonOn = false, tally = { named: 0, hurr: 0, major: 0 }, ilog = [], focus = null, lastHit = null, nameNo = 0, rng = K.rng(Date.now() % 99991 + 5), clouds = null, bgKey = "", bg = null;
function clearAll() { storms = []; old = []; ilog = []; focus = null; lastHit = null; tally = { named: 0, hurr: 0, major: 0 }; nameNo = 0; hours = 0; }
function start(lon, lat, V) { const s = new Storm(lon, lat, rng, NAMES[nameNo++ % NAMES.length]); s.V = s.peak = V; storms.push(s); focus = s; ilog = []; }   // a ready-made storm for an investigation
function seed(lon, lat) { if (onLand(lon, lat)) { ui.tip("Storms form over the sea: click on water", 3000); return; } if (storms.length >= 5) storms.shift(); const s = new Storm(lon, lat, rng, NAMES[nameNo++ % NAMES.length]); storms.push(s); focus = s; ilog = []; }

const ui = K.app({
  title: "Tropical Storms", subject: "Geography",
  blurb: "Grow a hurricane from warm sea, steer it across an ocean and bring it ashore",
  reset: () => { set({}); },
  levels: { std: "Standard (GCSE)", adv: "Advanced (extension)", specs: { std: "Pearson Edexcel GCSE (9–1) Geography A (1GA0) Topic 2 Weather hazards and climate change: tropical cyclones (formation, structure, movement, hazards, impacts, responses).", adv: "Edexcel A level Geography (9GE0) has no weather hazards topic. This level goes further for interest: the Coriolis effect, potential intensity, wind power and the statistics of storm seasons." } },
  missions: [
    { title: "Why here? The global circulation", q: "This is the pattern of winds that covers the whole Earth. Where does air rise, and where does it sink? What is the weather like in each place? Why do tropical cyclones form in the red bands and get carried west?", hint: "The Sun heats the equator most. Air rises there (low pressure, cloud, heavy rain: the ITCZ), flows towards the poles high up, and sinks at about 30° (high pressure, clear skies, the great deserts). That loop is the Hadley cell. Air flowing back to the equator along the surface is turned by the Earth's spin and becomes the trade winds, blowing from the east: these carry tropical cyclones westwards. There are two more cells in each hemisphere, and the whole pattern shifts north and south with the seasons (move the Month slider).", setup() { set({ view: "globe", month: 8, station: "sing" }); } },
    { title: "Reading a climate graph", q: "Look at the climate graph for Singapore, then Cairo, then London (bars are rainfall, the line is temperature). For each, work out the total rain in a year and the range of temperature. How does the global circulation explain the differences?", hint: "Singapore sits under the rising air of the ITCZ: hot all year (a range of only 2 °C) with over 2000 mm of rain. Cairo is under the sinking air of the subtropical high: almost no rain. London is in the westerlies, where depressions bring rain in every month and temperatures follow the seasons. Miami's wet summer and autumn are its hurricane season.", setup() { set({ view: "globe", month: 6, station: "sing" }); } },
    { title: "The birth of a hurricane", q: "A cluster of thunderstorms has drifted off the coast of West Africa in September. Watch it cross the ocean. How long does it take to become a hurricane? What happens to its shape as it strengthens?", hint: "Over sea warmer than about 26.5 °C the air above is fed with heat and water vapour. The storm organises from a ragged cluster into spiral bands turning anticlockwise, and above about 33 m/s (74 mph) a clear, calm eye opens in the middle. It takes several days and thousands of kilometres of warm water. It is named when it becomes a tropical storm.", setup() { set({}); seed(-22, 11.5); } },
    { title: "What does a storm need?", q: "Three experiments. (1) Cool the sea by 3 °C and start a storm. (2) Put the sea back and raise the wind shear to 16 m/s. (3) Put that back and click to start a storm at 3°N, almost on the equator. Which of them grow?", hint: "None. A tropical cyclone needs: sea warmer than about 26.5 °C (and warm to a depth of 50 m or so) to supply heat and moisture; low wind shear, so that the rising column of warm air is not tilted over and blown apart; and to be at least 5° from the equator, where the Earth's spin gives the inflowing air its twist (the Coriolis effect). That is why hurricanes form in a band between about 5° and 30°, in late summer.", setup() { set({ warm: -3 }); seed(-30, 12); } },
    { title: "Inside the storm", q: "Let the storm reach category 3 or more, then study the cross-section below the map. Where is the air rising fastest? Where is it sinking? Where are the strongest winds, and what is it like in the eye?", hint: "Air spirals in at the surface, picking up heat and moisture from the sea, and rises violently in the eyewall, a ring of towering cloud with the heaviest rain and the strongest winds. It flows out at the top. In the eye itself air sinks and warms, so it is calm and often clear. The pressure there is so low that the sea surface bulges upwards under it.", setup() { set({ warm: 0.5 }); seed(-35, 12); } },
    { title: "Why does it curve?", q: "Start storms at several places along the African side of the ocean and compare their tracks. Which way do they move at first? Where do they turn? Move the 'High-pressure ridge' slider and see what happens to the turn.", hint: "In the tropics storms are carried west by the trade winds, drifting slowly towards the pole. When they reach the edge of the subtropical high (the ridge, at about 30°N) they curve north, then north-east as the mid-latitude westerlies take over. Where the ridge sits decides whether a storm hits the Caribbean, the United States, or curves harmlessly out to sea. Forecasting the track is mostly forecasting the steering winds.", setup() { set({}); seed(-20, 10); seed(-28, 14); } },
    { title: "Landfall", q: "This storm is heading for the coast. Watch the wind speed on the graph as it crosses the shoreline. How quickly does it weaken, and why?", hint: "Over land the storm loses its supply of warm, moist air, and the rough ground slows the wind. The winds roughly halve every half day or so. But the rain goes on: the worst flooding is often hundreds of kilometres inland, days after landfall. Crossing a narrow island such as Cuba weakens a storm only briefly; it can strengthen again over the warm Gulf of Mexico.", setup() { set({ ridge: 33 }); start(-70, 21.5, 52); } },
    { title: "The storm surge", q: "When a hurricane comes ashore the report below the map gives the height of the storm surge. Compare a steep coast with a wide, shallow continental shelf. How high must a sea wall be to keep a category 4 surge out?", hint: "Most hurricane deaths are caused by water, not wind. Onshore winds pile the sea up against the coast, most of all where the sea bed shelves gently (as in the Gulf of Mexico or the Bay of Bengal), and the low pressure lifts the sea further. A category 4 or 5 storm on a shallow coast can raise the sea by 6 to 9 m: Hurricane Katrina's surge reached 8.5 m in 2005.", setup() { set({ ridge: 36, warm: 1 }); start(-84, 24, 62); } },
    { title: "Rich coast, poor coast", q: "Run the same strong storm ashore twice. First with strong buildings, a 4 m sea wall and 90% of people evacuated; then with weak buildings, no wall and 10% evacuated. Compare the 'people in danger' figure.", hint: "The hazard is the same; the disaster is not. Wealthier countries can afford forecasting, warnings, evacuation routes, sea defences and strongly built homes, so far fewer people die, though the cost of the damage in money is usually higher. Typhoon Haiyan (Philippines, 2013) killed over 6000 people; Hurricane Katrina (USA, 2005) about 1800 and cost over $100 billion; Cyclone Idai (Mozambique, 2019) over 1000.", setup() { set({ ridge: 36, warm: 1, strong: true, wall: 4, evac: 90 }); start(-84, 24, 64); } },
    { title: "Three real storms", q: "Compare Typhoon Haiyan, Hurricane Katrina and Cyclone Idai. Which storm was strongest? Which killed most people? Which cost most? Do the three rankings match? Explain the differences.", hint: "Haiyan was the strongest and the deadliest, but the weaker Katrina cost over fifty times as much, and Idai, weaker still, killed nearly as many as Katrina in a far smaller population. Deaths depend heavily on development: warnings, evacuation, strong buildings, sea defences, and help afterwards. Cost in money is highest in rich countries because there is more expensive property to destroy, though the loss is a far larger share of income in poor ones. Physical factors matter too: Leyte Gulf funnelled Haiyan's surge, and New Orleans lies below sea level.", setup() { set({ view: "cases" }); } },
    { title: "A whole season", q: "Switch on 'Run a hurricane season' and watch from June to November. In which months do most storms form? How many reach hurricane strength, and how many hit land?", hint: "The season peaks in August to October, when the sea is warmest. In an average Atlantic season there are about 14 named storms, of which 7 become hurricanes and 3 become major hurricanes (category 3 or more). The numbers vary a lot from year to year by chance alone, as well as with conditions such as El Niño, which raises wind shear over the Atlantic and suppresses storms.", setup() { set({ season: true, rate: 24 }); } },
    { title: "A warmer world", q: "Run a season, note the numbers, then warm the sea by 2 °C and run another. Are there more storms? Are they stronger? Look at the storm categories reached.", hint: "Warmer seas raise the speed limit: the strongest storms get stronger, and a larger share reach categories 4 and 5. Whether there will be MORE storms is much less certain, and many studies expect about the same number or fewer. Warmer air also holds more moisture, so storms bring heavier rain, and a higher sea level makes every surge worse.", setup() { set({ season: true, rate: 24, warm: 2 }); } },
    { lvl: "adv", title: "The power of the wind", q: "The damage report shows wind damage for the storm that just came ashore. Compare a category 1 landfall (about 35 m/s) with a category 4 (about 60 m/s). The wind is under twice as fast: how many times more damage does it do?", hint: "The force of the wind on a building goes as the square of its speed, and the power it delivers as the cube. A category 4 hurricane has about (60/35)³ ≈ 5 times the destructive power of a category 1, and real damage data rise faster still, because once roofs fail everything inside is exposed. Small increases in peak wind matter a great deal.", setup() { set({ ridge: 36, warm: 1.5, strong: false }); start(-84, 24, 58); } }
  ],
  batch: [
    { title: "Sea temperature and strength", question: "How does the strongest wind a storm reaches depend on how warm the sea is?", how: "Each run: a storm is started in mid-ocean (38°W, 12°N) in September with the sea warmer or cooler than today by the amount shown. The result is its peak wind.", xLabel: "change in sea temperature (°C)", yLabel: "peak wind (mph)", xs: [-4, -3, -2, -1, 0, 1, 2, 3], reps: 8, yMin: 0, theory: x => potential(sst(-45, 16, 258, x)) * MPH, theoryLabel: "limit set by the sea temperature along its path", run: (x, r) => life(-38, 12, { warm: x }, r).peak * MPH, note: "Each storm takes a slightly different path and may hit land or cooler water before it reaches its limit, so most fall short of the dashed line." },
    { title: "Wind shear", question: "How much wind shear can a storm survive?", how: "Each run: a storm started at 38°W, 12°N in September, with the wind changing by the chosen amount between the surface and high levels.", xLabel: "wind shear (m/s)", yLabel: "peak wind (mph)", xs: [0, 3, 6, 9, 12, 15, 18, 22], reps: 8, yMin: 0, run: (x, r) => life(-38, 12, { shear: x }, r).peak * MPH, note: "El Niño years bring stronger shear over the Atlantic, which is why they tend to have quiet hurricane seasons." },
    { title: "Distance from the equator", question: "How close to the equator can a tropical cyclone form?", how: "Each run: a disturbance is started at 35°W at the chosen latitude. The result is 100 if it became a hurricane, 0 if not, so the mean is the percentage that did.", xLabel: "starting latitude (°N)", yLabel: "became a hurricane (%)", xs: [1, 3, 5, 7, 9, 12, 15, 18, 22, 26, 30], reps: 20, yMin: 0, yMax: 100, run: (x, r) => life(-35, x, {}, r).peak >= 33 ? 100 : 0, note: "Near the equator there is too little Coriolis effect to start the rotation; far from it the sea is too cool. Each run is all-or-nothing, so only the mean shows the pattern." },
    { title: "Dying over land", question: "How fast do a hurricane's winds fall after it comes ashore?", how: "Each run: a 60 m/s (134 mph) hurricane crosses the coast of a large landmass. The wind is read the chosen number of hours later.", xLabel: "hours after landfall", yLabel: "wind speed (mph)", xs: [0, 3, 6, 9, 12, 18, 24, 36], reps: 6, yMin: 0, theory: x => 60 * MPH * Math.exp(-x / 13), theoryLabel: "halving every 9 hours", run(x, r) { const s = new Storm(-99, 35, r, ""); s.V = 60; const e = Object.assign({}, ENV0, { ridge: 60 }); for (let h = 0; h < x; h++) { s.lon = -99; s.lat = 35; s.step(e); } return s.V * MPH; } },
    { title: "Storm surge against wind speed", question: "How does the height of the surge depend on the wind?", how: "Each run: a storm of the chosen strength comes ashore on a wide, shallow shelf. Surge heights vary by ±10% with the shape of the coast.", xLabel: "wind speed at landfall (mph)", yLabel: "storm surge (m)", xs: [40, 60, 80, 100, 120, 140, 160], reps: 6, yMin: 0, theory: x => impact({ V: x / MPH, speed: 5 }, { shelf: 2, wall: 0, evac: 0, strong: true }).surge, theoryLabel: "∝ wind speed squared", run: (x, r) => impact({ V: x / MPH, speed: 5 }, { shelf: 2, wall: 0, evac: 0, strong: true }).surge * (1 + 0.1 * r.gauss()) },
    { title: "Storms in a season", question: "How many hurricanes form in a season, and how much does it vary?", how: "Each run: a whole season from 1 June to 30 November with today's sea temperatures. The result is the number of hurricanes.", xLabel: "", yLabel: "hurricanes in the season", reps: 200, bins: 16, lo: -0.5, hi: 15.5, theory: 7.2, theoryLabel: "real average 1991–2020", run: (x, r) => season({}, r).hurr, note: "Nothing about the climate changes from run to run here: the spread is pure chance. So one very active or very quiet season, on its own, says little about climate change." },
    { title: "Major hurricanes in a warmer world", question: "How does warming the sea change the number of the strongest storms?", how: "Each run: a whole season with the sea warmed by the amount shown. The result is the number of major hurricanes (category 3 or more).", xLabel: "sea warmed by (°C)", yLabel: "major hurricanes in the season", xs: [-1, 0, 1, 2, 3], reps: 30, yMin: 0, run: (x, r) => season({ warm: x }, r).major, note: "The model keeps the number of disturbances and the wind shear the same. In the real atmosphere both may change with warming, which is why projections of storm numbers are uncertain while projections of the strongest storms' intensity are more confident." }
  ],
  revise: {
    ideas: [
      { lvl: "std", tag: "1GA0 Topic 2", text: "Global atmospheric circulation: air rises at the equator (low pressure, rain) and sinks at about 30° (high pressure, deserts) in the Hadley cells; Ferrel and polar cells lie beyond. Surface winds (trade winds, westerlies) are deflected by the Coriolis effect. The circulation moves heat from the equator towards the poles." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "Tropical cyclones form over oceans between about 5° and 30° from the equator, in late summer and autumn, where the sea is warmer than about 26.5 °C to a depth of around 50 m and wind shear is low." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "Structure: a calm, clear eye of sinking air; an eyewall of towering cloud with the strongest winds and heaviest rain; spiral rain bands. They rotate anticlockwise in the northern hemisphere and clockwise in the southern." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "They are steered west by the trade winds and often curve away from the equator. They lose energy over land or cooler water, where the supply of heat and moisture is cut off." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "Hazards: strong winds, storm surge, intense rainfall and coastal and river flooding, landslides. The Saffir–Simpson scale ranks hurricanes from category 1 to 5 by wind speed." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "Impacts and responses differ between countries at different levels of development: forecasting, warning and evacuation, sea defences and building design reduce deaths." },
      { lvl: "std", tag: "1GA0 Topic 2", text: "Climate change: warmer oceans are expected to make the strongest storms more intense and wetter, and higher sea level makes surges worse. Changes in the number of storms are uncertain." },
      { lvl: "beyond", tag: "Beyond the spec", text: "The Coriolis parameter f = 2Ω sin φ is zero at the equator, which is why cyclones cannot form there. Wind force rises as V² and wind power as V³." }
    ],
    questions: [
      { lvl: "std", marks: 3, q: () => `Use the climate graph for ${STATIONS[station].name}. Calculate the annual range of temperature and the total annual rainfall. (Monthly temperatures, °C: ${STATIONS[station].T.join(", ")}. Monthly rainfall, mm: ${STATIONS[station].R.join(", ")}.)`, ans: () => { const st = STATIONS[station]; return `<ul><li>Range = highest − lowest = ${Math.max(...st.T)} − ${Math.min(...st.T) < 0 ? "(" + Math.min(...st.T) + ")" : Math.min(...st.T)}</li><li>= ${(Math.max(...st.T) - Math.min(...st.T)).toFixed(1)} °C</li><li>Total rainfall = ${st.R.reduce((a, b) => a + b, 0)} mm</li></ul>`; } },
      { lvl: "std", marks: 4, q: "Explain why there is a belt of heavy rainfall near the equator and a belt of deserts at about 30° north and south.", ans: "<ul><li>At the equator the Sun's heating is strongest, so warm, moist air rises (low pressure)</li><li>As it rises it cools and its water vapour condenses, giving cloud and heavy rain</li><li>The air flows towards the poles at height and sinks at about 30° (high pressure)</li><li>Sinking air warms and dries, so clouds do not form: clear skies and deserts</li></ul>" },
      { lvl: "std", marks: 6, q: "Using named examples, explain why the impacts of tropical cyclones differ between countries at different levels of development.", ans: "<ul><li>Typhoon Haiyan (Philippines, 2013): about 6300 deaths; damage about US$2.2 billion</li><li>Hurricane Katrina (USA, 2005): about 1800 deaths; damage about US$125 billion</li><li>Deaths are usually higher in less developed countries: weaker buildings, less effective warning and evacuation, fewer defences, slower emergency response</li><li>Economic losses are higher in developed countries: more valuable property and infrastructure (and more is insured)</li><li>Physical factors also matter: storm strength, surge funnelled by the coastline (Leyte Gulf), land below sea level (New Orleans)</li><li>A developed country can still suffer badly where defences fail or poorer people cannot evacuate (Katrina)</li></ul>" },
      { lvl: "std", marks: 3, q: "State three conditions needed for a tropical cyclone to form.", ans: "<ul><li>Sea surface temperature above about 26.5 °C (to a depth of about 50 m)</li><li>Low wind shear</li><li>A location at least 5° from the equator (so the Coriolis effect can make it spin); also accept: a pre-existing disturbance / cluster of thunderstorms, moist air</li></ul>" },
      { lvl: "std", marks: 4, q: "Describe the structure of a tropical cyclone and the weather in each part.", ans: "<ul><li>Eye in the centre: sinking air, calm, clear or lightly clouded, very low pressure</li><li>Eyewall around it: towering cumulonimbus cloud, the strongest winds and heaviest rain</li><li>Spiral rain bands further out: heavy showers and strong, gusty winds</li><li>Whole system rotating (anticlockwise in the northern hemisphere), hundreds of kilometres across</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain why a tropical cyclone weakens after it reaches land.", ans: "<ul><li>It is cut off from its source of energy: warm ocean water</li><li>so there is less evaporation and less heat released by condensation</li><li>Friction with the rougher land surface also slows the winds</li></ul>" },
      { lvl: "std", marks: 2, q: () => { const s = focus || { V: 55 }; return `A storm has sustained winds of ${Math.round(Math.max(s.V, 20) * MPH)} mph. Use the Saffir–Simpson scale (category 1: 74–95 mph; 2: 96–110; 3: 111–129; 4: 130–156; 5: 157 or more) to classify it, and state the main hazard to people on the coast.`; }, ans: () => { const s = focus || { V: 55 }, V = Math.max(s.V, 20); return `<ul><li>${V < 33 ? "Below hurricane strength (a tropical storm or depression)" : CATS[catOf(V)][1].replace(" hurricane", "")}</li><li>Storm surge / coastal flooding (the cause of most deaths)</li></ul>`; } },
      { lvl: "std", marks: 4, q: "Explain why the impacts of tropical cyclones are often greater in developing countries than in developed countries.", ans: "<ul><li>Less money for forecasting, warning systems and evacuation, so more people are caught in the storm</li><li>Homes are often weakly built and in vulnerable places such as low-lying coasts</li><li>Fewer sea defences and emergency services; slower rescue and recovery</li><li>People depend on farming and fishing, so livelihoods are destroyed; disease spreads where water supplies are contaminated</li></ul>" },
      { lvl: "std", marks: 3, q: "Explain how climate change may affect tropical cyclones.", ans: "<ul><li>Warmer oceans provide more energy, so the strongest storms may become more intense</li><li>Warmer air holds more water vapour, so rainfall is heavier</li><li>Sea level rise makes storm surges higher and coastal flooding worse (the number of storms may not increase)</li></ul>" },
      { lvl: "adv", marks: 3, q: "The force of the wind on a wall is proportional to the square of the wind speed. Compare the force exerted by a 70 m/s wind with that of a 35 m/s wind, and comment on what this means for building damage.", ans: "<ul><li>Ratio of speeds = 2</li><li>Ratio of forces = 2² = 4 (and of power, 2³ = 8)</li><li>A category 5 storm is far more than 'five times' a category 1: damage rises very steeply with wind speed</li></ul>" },
      { lvl: "adv", marks: 3, q: "Atmospheric pressure in the eye of a storm is 920 hPa; outside the storm it is 1010 hPa. The sea surface rises about 1 cm for every 1 hPa fall in pressure. Calculate the rise under the eye and explain why the total storm surge is much larger.", ans: "<ul><li>Pressure difference = 90 hPa</li><li>Rise = 90 cm = 0.9 m</li><li>Most of the surge is water piled against the coast by the onshore wind, especially over a shallow continental shelf</li></ul>" },
      { lvl: "adv", marks: 3, q: "In a 30-year record there were on average 7 hurricanes per season. One season had 12. Suggest why this alone is weak evidence of a change in climate.", ans: "<ul><li>Counts of rare, independent events vary by chance (roughly a Poisson distribution, with a standard deviation of about √7 ≈ 2.6)</li><li>12 is about two standard deviations above the mean, which is expected occasionally</li><li>A trend over many seasons, not one season, is needed</li></ul>" }
    ]
  },
  notes: `<h3>What is being modelled</h3>
<ul><li><b>Sea temperature</b> depends on latitude and the time of year, peaking in mid-September, with the Gulf of Mexico a little warmer.</li>
<li><b>Strength:</b> each hour, over the sea, a storm's wind grows by about 5% towards a limit (the "potential intensity") that is zero below 25 °C, rises steeply (12.5 m/s per °C) up to 28.5 °C and more gently (6 m/s per °C) above that. Growth is reduced near the equator and by wind shear above 4 m/s. A strong storm cools the sea beneath it if the warm layer is shallow. Over land the wind falls by about 7% an hour.</li>
<li><b>Track:</b> the storm moves with a steering wind that blows from the east at 6 m/s in the tropics, falls to nothing at the high-pressure ridge and becomes a westerly beyond it, plus a drift towards the pole and a random wobble.</li>
<li><b>Landfall report:</b> surge = wind piling water against the shore (∝ wind², more on a shallow shelf) plus 1 cm per hPa of pressure fall. Rain is greater for slow-moving storms. Wind damage rises steeply with speed and depends on building strength.</li>
<li><b>A season</b> starts disturbances at random, each with its own luck in the air around it (many real disturbances are held back by dry, dusty air), most of them off West Africa and most in August to October, at a rate chosen to give roughly the real Atlantic averages.</li>
<li><b>The cloud picture</b> is drawn to suit the storm's strength; it is not calculated.</li></ul>
<h3>Simplifications</h3>
<ul><li>The whole storm is one number (its peak wind) at one point. Real storms differ greatly in size, and size matters as much as strength for surge and rain.</li>
<li>The steering winds are the same every day and at every longitude. Real tracks depend on weather systems that change daily, which is what makes forecasting hard.</li>
<li>The map is a rough sketch of the North Atlantic, with no mountains, and the cities are for orientation only.</li>
<li>The landfall figures are indications from simple formulas, not predictions for real places. "People in danger" is an index, not a count of casualties.</li>
<li>Warming is applied to the sea only: the number of disturbances, the wind shear and the steering winds stay the same.</li>
<li>The global circulation picture is the standard three-cell diagram. The real atmosphere is far less tidy, especially the Ferrel cell, and the belts are broken up by continents and mountains.</li></ul>
<h3>Sources for the real data</h3>
<ul><li><b>Climate averages</b> (1991–2020, rounded): Meteorological Service Singapore; NOAA NCEI climate normals (Miami, Utqiaġvik); Met Office (London Heathrow); Egyptian Meteorological Authority / WMO (Cairo, approximate); Icelandic Met Office (Reykjavík, approximate).</li>
<li><b>Haiyan:</b> NDRRMC final report, April 2014 (6300 dead, 1061 missing); IFRC final report MDRPH014 and field surveys for the surge; JTWC for the wind; damage about PHP 95 billion.</li>
<li><b>Katrina:</b> NOAA National Hurricane Center report; NOAA NCEI billion-dollar disasters (about US$125 billion in 2005 dollars); about 1830 deaths is the most often quoted total.</li>
<li><b>Idai:</b> UN OCHA, WMO and World Bank; over 1300 deaths across three countries.</li></ul>
<h3>The earlier version</h3>
<p>The previous version of this simulation, with its worksheets, is still here: <a href="original/tropical-storms.html" style="color:var(--accent)">open the earlier version</a>.</p>`
});

// ---------------- Controls ----------------
const ctl = {};
let g = ui.group("");
ctl.view = K.seg(g, { value: "map", options: [["map", "Storm map"], ["globe", "Global winds"], ["cases", "Three real storms"]], on: v => setView(v) });
const globeGroup = g = ui.group("Global circulation");
ctl.month = K.slider(g, { label: "Month", min: 0, max: 11, step: 1, value: 8, fmt: v => MONTHS[v], on: v => month = v });
ctl.station = K.seg(g, { label: "Climate graph for", value: "sing", options: [["sing", "Singapore"], ["miami", "Miami"], ["cairo", "Cairo"]], on: v => { station = v; ctl.station2.set(""); } });
ctl.station2 = K.seg(g, { value: "", options: [["london", "London"], ["reyk", "Reykjavík"], ["barrow", "Utqiaġvik"]], on: v => { station = v; ctl.station.set(""); } });
const mapGroups = [];
g = ui.group("The ocean and the air"); mapGroups.push(g);
ctl.warm = K.slider(g, { label: "Sea temperature", min: -4, max: 4, step: 0.5, value: 0, fmt: v => v === 0 ? "as today" : (v > 0 ? "+" : "") + v + " °C", on: v => { E.warm = v; } });
ctl.shear = K.slider(g, { label: "Wind shear", min: 0, max: 25, step: 1, value: 7, unit: "m/s", on: v => { E.shear = v; }, tip: "How much the wind changes between the surface and 12 km up" });
ctl.depth = K.slider(g, { label: "Depth of warm water", min: 15, max: 120, step: 5, value: 60, unit: "m", on: v => { E.depth = v; } });
ctl.ridge = K.slider(g, { label: "High-pressure ridge at", min: 22, max: 38, step: 1, value: 29, unit: "°N", on: v => { E.ridge = v; } });
ctl.day = K.slider(g, { label: "Date", min: 152, max: 334, step: 1, value: 255, fmt: v => dateOf(v), on: v => { E.day = v; } });
g = ui.group("Storms"); mapGroups.push(g);
K.note(g, "Click anywhere on the sea to start a cluster of thunderstorms there.");
ctl.season = K.toggle(g, { label: "Run a hurricane season (June to November)", value: false, on: v => { seasonOn = v; if (v) { clearAll(); E.day = 152; } } });
let r1 = K.row(g); K.btn(r1, "Clear the map", () => clearAll());
g = ui.group("The coast it hits"); mapGroups.push(g);
ctl.shelf = K.seg(g, { label: "Sea bed offshore", value: 1.5, options: [[1, "steep"], [1.5, "average"], [2, "wide and shallow"]], on: v => { C.shelf = v; } });
ctl.wall = K.slider(g, { label: "Sea defences", min: 0, max: 8, step: 0.5, value: 2, fmt: v => v ? v + " m high" : "none", on: v => { C.wall = v; } });
ctl.evac = K.slider(g, { label: "People evacuated in time", min: 0, max: 100, step: 5, value: 50, unit: "%", on: v => { C.evac = v; } });
ctl.strong = K.seg(g, { label: "Buildings", value: true, options: [[false, "weakly built"], [true, "built to resist wind"]], on: v => { C.strong = v; } });
g = ui.group("Watch"); mapGroups.push(g);
ctl.rate = K.slider(g, { label: "Speed", min: 2, max: 48, step: 2, value: rate, fmt: v => v + " hours a second", on: v => rate = v });
const read = K.readout(g, [["name", "storm"], ["wind", "strongest winds"], ["cat", "category"], ["p", "pressure in the eye"], ["sea", "sea temperature beneath"], ["lim", "speed limit here"], ["why", "now"], ["tally", "this season"]]);
function dateOf(d) { const m = [["June", 152], ["July", 182], ["August", 213], ["September", 244], ["October", 274], ["November", 305]]; let k = 0; for (let i = 0; i < m.length; i++) if (d >= m[i][1]) k = i; return Math.floor(d - m[k][1] + 1) + " " + m[k][0]; }
function setView(v) { view = v; ctl.view.set(v); for (const q of mapGroups) q.style.display = v === "map" ? "" : "none"; globeGroup.style.display = v === "globe" ? "" : "none"; casesBox.style.display = v === "cases" ? "" : "none"; }
function set(o) {
  setView(o.view || "map"); if (o.month != null) { month = o.month; ctl.month.set(month); } if (o.station) { station = o.station; ctl.station.set(""); ctl.station2.set(""); (STATIONS[station] && ["sing", "miami", "cairo"].includes(station) ? ctl.station : ctl.station2).set(station); }
  Object.assign(E, ENV0, { warm: o.warm || 0, ridge: o.ridge || 29, shear: o.shear == null ? 7 : o.shear }); Object.assign(C, { shelf: 1.5, wall: o.wall == null ? 2 : o.wall, evac: o.evac == null ? 50 : o.evac, strong: o.strong == null ? true : o.strong });
  ctl.warm.set(E.warm); ctl.shear.set(E.shear); ctl.depth.set(E.depth); ctl.ridge.set(E.ridge); ctl.day.set(255); ctl.shelf.set(1.5); ctl.wall.set(C.wall); ctl.evac.set(C.evac); ctl.strong.set(C.strong);
  clearAll(); seasonOn = !!o.season; ctl.season.set(seasonOn); if (seasonOn) E.day = 152; rate = o.rate || 6; ctl.rate.set(rate);
}

// ---------------- The map ----------------
const cv = ui.canvas(() => { bgKey = ""; });
const LON0 = -100, LON1 = -5, LAT0 = 3, LAT1 = 50, X = lon => (lon - LON0) / (LON1 - LON0) * cv.w, Y = lat => (LAT1 - lat) / (LAT1 - LAT0) * cv.h;
const seaCol = T => { const f = K.clamp((T - 16) / 15, 0, 1); return [Math.round(10 + 150 * f * f), Math.round(40 + 70 * f), Math.round(110 - 45 * f)]; };
function paintMap() {   // sea coloured by temperature, land, cities: redrawn only when something changes
  const w = cv.w, h = cv.h; bg = document.createElement("canvas"); bg.width = w; bg.height = h; const c = bg.getContext("2d"), gx = 96, gy = 48, im = c.createImageData(gx, gy);
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { const lon = LON0 + (i + .5) / gx * (LON1 - LON0), lat = LAT1 - (j + .5) / gy * (LAT1 - LAT0), col = seaCol(sst(lon, lat, E.day, E.warm)), k = 4 * (j * gx + i); im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255; }
  const tmp = document.createElement("canvas"); tmp.width = gx; tmp.height = gy; tmp.getContext("2d").putImageData(im, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(tmp, 0, 0, w, h);
  // the 26.5 °C line: storms can only grow on the warm side of it
  c.strokeStyle = "rgba(255,255,255,.7)"; c.setLineDash([6, 5]); c.lineWidth = 1.3; c.beginPath(); let pen = false; for (let lon = LON0; lon <= LON1; lon += 1) { let lat = null; for (let la = 12; la < 50; la += 0.25) if (sst(lon, la, E.day, E.warm) < 26.5) { lat = la; break; } if (lat == null || onLand(lon, lat)) { pen = false; continue; } pen ? c.lineTo(X(lon), Y(lat)) : c.moveTo(X(lon), Y(lat)); pen = true; } c.stroke(); c.setLineDash([]);
  c.fillStyle = "rgba(255,255,255,.85)"; c.font = "11px Segoe UI,sans-serif"; c.textAlign = "left"; { let la = 12; while (la < 50 && sst(-45, la, E.day, E.warm) >= 26.5) la += 0.25; if (la < 49) c.fillText("sea cooler than 26.5 °C north of this line", X(-52), Y(la) - 6); }
  c.strokeStyle = "rgba(255,255,255,.13)"; c.lineWidth = 1; c.fillStyle = "rgba(255,255,255,.45)"; for (let la = 10; la <= 40; la += 10) { c.beginPath(); c.moveTo(0, Y(la)); c.lineTo(w, Y(la)); c.stroke(); c.fillText(la + "°N", 4, Y(la) - 3); }
  c.fillStyle = "#1f2a22"; c.strokeStyle = "#5d7a5f"; c.lineWidth = 1.2; for (const poly of LAND) { c.beginPath(); poly.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.closePath(); c.fill(); c.stroke(); }
  c.font = "10.5px Segoe UI,sans-serif"; for (const [n, lon, lat] of CITIES) { c.fillStyle = "#e9eef7"; c.beginPath(); c.arc(X(lon), Y(lat), 2.2, 0, 6.3); c.fill(); c.fillStyle = "rgba(233,238,247,.8)"; c.textAlign = lon > -20 ? "right" : "left"; c.fillText(n, X(lon) + (lon > -20 ? -5 : 5), Y(lat) - 4); }
  c.fillStyle = "rgba(233,238,247,.5)"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("NORTH AMERICA", X(-90), Y(38)); c.fillText("AFRICA", X(-10), Y(20)); c.fillText("ATLANTIC OCEAN", X(-45), Y(33)); c.font = "11px Segoe UI,sans-serif"; c.fillText("Gulf of Mexico", X(-90), Y(25)); c.fillText("Caribbean Sea", X(-74), Y(14.5));
}
const puff = (() => { const s = document.createElement("canvas"); s.width = s.height = 32; const c = s.getContext("2d"), gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.5, "rgba(245,248,255,.22)"); gr.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); return s; })();
function makeClouds() { clouds = []; const r = K.rng(11); for (let i = 0; i < 1100; i++) clouds.push({ u: Math.pow(r(), 0.75), arm: i % 3, j: r() - .5, s: 0.6 + r() * 0.9, jr: r() - .5 }); }
function drawStorm(c, s, tsec) {
  const V = s.V, org = K.clamp((V - 12) / 38, 0, 1), sz = (2.4 + 3.4 * K.clamp(V / 65, 0, 1)) * cv.w / (LON1 - LON0), cx = X(s.lon), cy = Y(s.lat), eye = V > 33 ? 0.07 + 0.06 * org : 0, n = Math.round(350 + 750 * K.clamp(V / 45, 0.15, 1));
  for (let i = 0; i < n; i++) {
    const p = clouds[i]; let u = p.u; if (u < eye) continue; if (V > 33 && u < eye + 0.1) u = eye + 0.012 + (u - eye) * 0.35;                // the eyewall: a dense ring round the clear eye
    // spiral arms, wound anticlockwise (northern hemisphere), tighter and tidier the stronger the storm
    const th = 2.094 * p.arm - 3.1 * Math.log(u + 0.07) + p.j * (5.2 - 4.3 * org) - tsec * (0.25 + 0.5 / (u + 0.2)) * (0.5 + V / 60), rr = (u + p.jr * 0.1 * (1 - org)) * sz;
    const px = cx + Math.cos(th) * rr, py = cy + Math.sin(th) * rr * 0.92, ps = (6 + 8 * (1 - u)) * p.s * (0.6 + 0.4 * org) * sz / 60; c.globalAlpha = K.clamp(0.16 + 0.34 * (1 - u) + 0.1 * org, 0, 1) * K.clamp(V / 14, 0.3, 1); c.drawImage(puff, px - ps, py - ps, ps * 2, ps * 2);
  }
  c.globalAlpha = 1;
}
function draw(tsec) {
  const c = cv.ctx, w = cv.w, h = cv.h, key = [w, h, Math.round(E.day / 4), E.warm].join(); if (key !== bgKey) { paintMap(); bgKey = key; }
  c.drawImage(bg, 0, 0, w, h);
  // steering winds: faint arrows
  c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 1.2; for (let la = 8; la <= 46; la += 6.3) for (let lo = -94; lo < -8; lo += 9) { if (onLand(lo, la)) continue; const d = la - E.ridge, u = d < -12 ? -6 : d < 0 ? -6 * (-d / 12) : Math.min(13, d * 1.1), v = 1.3 + 2.6 * Math.exp(-((d / 7) ** 2)), L = 2.4, ph = (tsec * 0.6 + lo * 0.37 + la) % 1, x0 = X(lo) + u * L * (ph - .5) * 2, y0 = Y(la) - v * L * (ph - .5) * 2, an = Math.atan2(-v, u); c.globalAlpha = Math.sin(ph * Math.PI); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + Math.cos(an) * 9, y0 + Math.sin(an) * 9); c.lineTo(x0 + Math.cos(an) * 9 + Math.cos(an + 2.6) * 4, y0 + Math.sin(an) * 9 + Math.sin(an + 2.6) * 4); c.stroke(); } c.globalAlpha = 1;
  // tracks, coloured by strength
  const tr = (s, a) => { c.lineWidth = 2.2; c.globalAlpha = a; for (let i = 1; i < s.track.length; i++) { c.strokeStyle = CATS[catOf(s.track[i][2])][2]; c.beginPath(); c.moveTo(X(s.track[i - 1][0]), Y(s.track[i - 1][1])); c.lineTo(X(s.track[i][0]), Y(s.track[i][1])); c.stroke(); } c.globalAlpha = 1; };
  for (const s of old) tr(s, 0.5); for (const s of storms) tr(s, 0.95);
  for (const s of old) for (const q of s.hits) { c.strokeStyle = CATS[catOf(q.V)][2]; c.lineWidth = 1.5; c.beginPath(); c.arc(X(q.lon), Y(q.lat), 6, 0, 6.3); c.stroke(); }
  for (const s of storms) { drawStorm(c, s, tsec); c.fillStyle = "#fff"; c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "center"; c.shadowColor = "#000"; c.shadowBlur = 4; c.fillText((s.V >= 17.5 ? s.name + " · " : "") + Math.round(s.V * MPH) + " mph", X(s.lon), Y(s.lat) - (3 + 3.2 * K.clamp(s.V / 65, 0, 1)) * w / 95 - 6); c.shadowBlur = 0; if (s === focus && storms.length > 1) { c.strokeStyle = "rgba(255,255,255,.6)"; c.setLineDash([3, 4]); c.beginPath(); c.arc(X(s.lon), Y(s.lat), 16, 0, 6.3); c.stroke(); c.setLineDash([]); } }
  // key
  c.font = "10.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillStyle = "rgba(6,10,20,.72)"; c.fillRect(6, h - 22, 470, 18); let kx = 12; for (const [v, name, col] of CATS) { c.fillStyle = col; c.fillRect(kx, h - 16, 12, 6); c.fillStyle = "#dfe6f3"; const t = name.replace("tropical ", "").replace(" hurricane", "").replace("category ", "cat "); c.fillText(t, kx + 16, h - 10); kx += 22 + c.measureText(t).width; }
  if (lastHit) { const im = impact(lastHit, C), bx = w - 268, by = h - 138; c.fillStyle = "rgba(8,12,22,.9)"; c.strokeStyle = CATS[catOf(lastHit.V)][2]; c.lineWidth = 1.5; c.beginPath(); c.roundRect(bx, by, 258, 128, 9); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.font = "600 12.5px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("LANDFALL: " + lastHit.name + " near " + lastHit.place, bx + 10, by + 18); c.font = "12px Segoe UI,sans-serif"; c.fillStyle = "#dfe6f3";
    [`${CATS[catOf(lastHit.V)][1]}, ${Math.round(lastHit.V * MPH)} mph (${Math.round(lastHit.V * KMH)} km/h)`, `storm surge ${im.surge.toFixed(1)} m` + (im.surge > C.wall ? `: over the ${C.wall} m defences` : `: held by the defences`), `low-lying coast flooded: ${im.flood.toFixed(0)}%`, `rain ${Math.round(im.rain)} mm · buildings badly damaged ${im.wind.toFixed(0)}%`, `people in danger: ${im.danger.toFixed(0)} in every 100`].forEach((t, i) => c.fillText(t, bx + 10, by + 38 + i * 18)); }
}
// ---------------- Global winds: the three cells in each hemisphere ----------------
const casesBox = K.$("div", "", CASES.map(q => `<div style="border:1px solid ${q.col};border-radius:12px;padding:12px 14px;background:rgba(10,16,28,.92);overflow:auto"><h3 style="margin:0;color:${q.col};font-size:17px">${q.name}</h3><div style="color:#aab6cc;font-size:12.5px;margin-bottom:8px">${q.where}</div>
<table style="font-size:13px;border-collapse:collapse;width:100%">${[["Deaths", q.deaths.toLocaleString()], ["Cost of damage", "US$" + q.damage + " billion"], ["Income per person", "US$" + q.gdp.toLocaleString() + " a year"], ["Winds", q.wind], ["Storm surge", q.surge], ["People", q.people]].map(r => `<tr><td style="color:#aab6cc;padding:3px 8px 3px 0;vertical-align:top;white-space:nowrap">${r[0]}</td><td style="padding:3px 0">${r[1]}</td></tr>`).join("")}</table><p style="font-size:13px;margin:8px 0 0;color:#dfe6f3">${q.why}</p></div>`).join(""));
casesBox.style.cssText = "position:absolute;inset:0;display:none;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:12px;background:#070b14;z-index:2;color:#eef2f8"; ui.stage.append(casesBox); const _sv = setView; setView = v => { _sv(v); if (v === "cases") casesBox.style.display = "grid"; };
const itcz = () => 7 * Math.sin(2 * Math.PI * (month - 3.6) / 12);        // the belts follow the overhead Sun north in the northern summer and south in the winter
function drawGlobe(tsec) {
  const c = cv.ctx, w = cv.w, h = cv.h, sh = itcz(); c.fillStyle = "#070b14"; c.fillRect(0, 0, w, h);
  // ---- the globe, with pressure belts and surface winds ----
  const R = Math.min(h * 0.4, w * 0.17), gx = w * 0.19, gy = h * 0.52, yOf = lat => gy - R * Math.sin(lat * Math.PI / 180), half = lat => R * Math.cos(lat * Math.PI / 180);
  c.save(); c.beginPath(); c.arc(gx, gy, R, 0, 6.3); c.clip();
  for (let la = -90; la < 90; la += 2) { const l = la + 1 - sh * (1 - Math.abs(la + 1) / 90), d = Math.min(Math.abs(Math.abs(l) - 30), 60), wet = Math.abs(l) < 12 || (Math.abs(l) > 50 && Math.abs(l) < 68), dry = Math.abs(Math.abs(l) - 28) < 9 || Math.abs(l) > 78; c.fillStyle = wet ? "#2f6f8f" : dry ? "#8a7a55" : "#33608a"; c.fillRect(gx - R, yOf(la + 2), 2 * R, yOf(la) - yOf(la + 2) + 1); }
  for (const z of [1, -1]) { c.fillStyle = "rgba(255,90,80,.16)"; c.fillRect(gx - R, yOf(z > 0 ? 30 : -5), 2 * R, Math.abs(yOf(5) - yOf(30))); }
  // wind arrows drift across; the Coriolis effect turns moving air to the right in the north and to the left in the south
  const belts = [[4, 26, -1, -0.55, "#ffd28a"], [34, 56, 1, 0.5, "#9fd0ff"], [64, 84, -1, -0.5, "#e6e6ff"]];
  c.lineWidth = 1.8; for (const z of [1, -1]) for (const [a, b, ux, uy, col] of belts) for (let k = 0; k < 9; k++) { const la = z * (a + (b - a) * ((k * 0.37) % 1)) + sh * 0.6, ph = (tsec * 0.12 * ux + k * 0.23 + 10) % 1, x = gx - half(la) + 2 * half(la) * (ux > 0 ? ph : 1 - (-ph + 1) % 1), y = yOf(la), dx = ux * 13, dy = -uy * z * 9; c.strokeStyle = c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.lineTo(x + dx, y + dy); c.stroke(); const an = Math.atan2(dy, dx); c.beginPath(); c.moveTo(x + dx, y + dy); c.lineTo(x + dx + Math.cos(an + 2.5) * 6, y + dy + Math.sin(an + 2.5) * 6); c.lineTo(x + dx + Math.cos(an - 2.5) * 6, y + dy + Math.sin(an - 2.5) * 6); c.fill(); }
  c.restore(); c.strokeStyle = "rgba(220,230,250,.5)"; c.lineWidth = 1.2; c.beginPath(); c.arc(gx, gy, R, 0, 6.3); c.stroke();
  c.font = "11.5px Segoe UI,sans-serif"; c.textAlign = "left"; const lab = (lat, t, col) => { c.fillStyle = col; c.fillText(t, gx + half(lat) + 8, yOf(lat) + 4); };
  lab(sh, "LOW: rain (ITCZ)", "#9fe0ff"); lab(30 + sh * .6, "HIGH: deserts", "#e8d39a"); lab(-30 + sh * .6, "HIGH", "#e8d39a"); lab(60 + sh * .4, "LOW", "#9fe0ff"); lab(-60 + sh * .4, "LOW", "#9fe0ff"); lab(86, "HIGH", "#e8d39a");
  lab(16 + sh * .6, "NE trade winds", "#ffd28a"); lab(-16 + sh * .6, "SE trade winds", "#ffd28a"); lab(45 + sh * .5, "westerlies", "#9fd0ff"); lab(-45 + sh * .5, "westerlies", "#9fd0ff"); lab(73, "polar easterlies", "#e6e6ff");
  c.fillStyle = "rgba(255,150,140,.9)"; c.textAlign = "center"; c.fillText("tropical cyclones form in the red bands", gx, gy - R - 10);
  const st = STATIONS[station]; c.fillStyle = "#fff"; c.beginPath(); c.arc(gx - half(st.lat) * 0.35, yOf(st.lat), 4, 0, 6.3); c.fill(); c.textAlign = "right"; c.fillText(st.name.split(",")[0].split(" (")[0], gx - half(st.lat) * 0.35 - 7, yOf(st.lat) + 4);
  // ---- the slice from pole to pole: six cells of circulating air ----
  const x0 = w * 0.53, x1 = w - 16, yb = h * 0.8, yt = h * 0.26, XL = lat => x0 + (lat + 90) / 180 * (x1 - x0), km = (yb - yt) / 17;
  const sky = c.createLinearGradient(0, yt, 0, yb); sky.addColorStop(0, "#0b1730"); sky.addColorStop(1, "#2a4d78"); c.fillStyle = sky; c.fillRect(x0, yt, x1 - x0, yb - yt); c.fillStyle = "#1d3324"; c.fillRect(x0, yb, x1 - x0, 7);
  const cells = [[sh, 30 + sh * .6, 15, 1, "Hadley cell"], [30 + sh * .6, 60 + sh * .4, 11, -1, "Ferrel cell"], [60 + sh * .4, 90, 8, 1, "Polar cell"], [-30 + sh * .6, sh, 15, -1, "Hadley cell"], [-60 + sh * .4, -30 + sh * .6, 11, 1, "Ferrel cell"], [-90, -60 + sh * .4, 8, -1, "Polar cell"]];
  if (!cellParts) { cellParts = []; for (let k = 0; k < 6; k++) for (let i = 0; i < 34; i++) cellParts.push([k, i / 34]); }
  c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center";
  cells.forEach(([a, b, top, dir, name], k) => { const xa = XL(a) + 5, xb = XL(b) - 5, ya = yb - 6, yT = yb - top * km, per = 2 * (xb - xa) + 2 * (ya - yT); c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 1; c.strokeRect(xa, yT, xb - xa, ya - yT); c.fillStyle = "rgba(233,238,247,.75)"; c.fillText(name, (xa + xb) / 2, (ya + yT) / 2 + 4);
    for (const q of cellParts) { if (q[0] !== k) continue; let d = ((q[1] + dir * tsec * 0.035) % 1 + 1) % 1 * per, x, y; const W = xb - xa, H = ya - yT; if (d < W) { x = xa + d; y = yT; } else if (d < W + H) { x = xb; y = yT + d - W; } else if (d < 2 * W + H) { x = xb - (d - W - H); y = ya; } else { x = xa; y = ya - (d - 2 * W - H); } c.fillStyle = y > ya - 4 ? "#ffd28a" : x < xa + 3 || x > xb - 3 ? "#ff9d8a" : "#9fd0ff"; c.beginPath(); c.arc(x, y, 2.2, 0, 6.3); c.fill(); } });
  // weather at the surface: cloud and rain where air rises, clear skies where it sinks
  const cloud = (lat, big) => { const x = XL(lat); c.fillStyle = "rgba(240,244,252,.85)"; for (const [dx, dy, r] of [[-12, 0, 9], [0, -6, 12], [12, 0, 9]]) { c.beginPath(); c.arc(x + dx, yb - (big ? 60 : 38) + dy, r * (big ? 1.3 : 1), 0, 6.3); c.fill(); } c.strokeStyle = "rgba(150,190,255,.8)"; c.beginPath(); for (let i = -2; i <= 2; i++) { const yy = yb - 30 + ((tsec * 60 + i * 9) % 22); c.moveTo(x + i * 7, yy); c.lineTo(x + i * 7 - 2, yy + 6); } c.stroke(); c.fillStyle = "#9fe0ff"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("L", x, yb + 22); };
  const clear = lat => { const x = XL(lat); c.fillStyle = "#ffe066"; c.beginPath(); c.arc(x, yb - 34, 8, 0, 6.3); c.fill(); c.fillStyle = "#e8d39a"; c.font = "600 13px Segoe UI,sans-serif"; c.fillText("H", x, yb + 22); };
  cloud(sh, true); cloud(60 + sh * .4); cloud(-60 + sh * .4); clear(30 + sh * .6); clear(-30 + sh * .6); clear(88); clear(-88);
  c.fillStyle = "rgba(233,238,247,.7)"; c.font = "11px Segoe UI,sans-serif"; for (const la of [-90, -60, -30, 0, 30, 60, 90]) c.fillText(la === 0 ? "equator" : Math.abs(la) + "°" + (la > 0 ? "N" : "S"), XL(la), yb + 38); c.textAlign = "left"; c.fillText("15 km", x0 + 4, yt + 12); c.fillStyle = "#fff"; c.beginPath(); c.moveTo(XL(st.lat), yb + 2); c.lineTo(XL(st.lat) - 5, yb + 11); c.lineTo(XL(st.lat) + 5, yb + 11); c.fill();
  c.fillStyle = "#eef2f8"; c.font = "600 13px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("A slice through the atmosphere from pole to pole, in " + MONTHS[month], x0, yb + 62);
}
// the classic climate graph: rainfall as bars, temperature as a line
function drawClimate() {
  const c = xs.ctx, w = xs.w, h = xs.h, st = STATIONS[station], L = 44, Rr = 40, T = 26, B = 26, pw = w - L - Rr, ph = h - T - B, rmax = Math.max(100, Math.ceil(Math.max(...st.R) / 50) * 50), tmin = Math.min(0, Math.floor(Math.min(...st.T) / 10) * 10), tmax = 30;
  c.fillStyle = K.cssVar("--panel"); c.fillRect(0, 0, w, h); c.fillStyle = K.cssVar("--text"); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText(st.name, L + 62, 15); c.font = "11px Segoe UI,sans-serif"; c.fillStyle = K.cssVar("--muted");
  c.strokeStyle = K.cssVar("--grid"); c.lineWidth = 1; for (let k = 0; k <= 4; k++) { const y = T + ph - ph * k / 4; c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke(); c.textAlign = "right"; c.fillStyle = "#6fb1ff"; c.fillText(Math.round(rmax * k / 4), L - 5, y + 4); c.textAlign = "left"; c.fillStyle = "#ff8a70"; c.fillText(Math.round(tmin + (tmax - tmin) * k / 4), L + pw + 5, y + 4); }
  c.fillStyle = "rgba(111,177,255,.75)"; st.R.forEach((r, i) => { const bw = pw / 12; c.fillRect(L + i * bw + 3, T + ph - ph * r / rmax, bw - 6, ph * r / rmax); });
  c.strokeStyle = "#ff8a70"; c.lineWidth = 2.2; c.beginPath(); st.T.forEach((t, i) => { const x = L + (i + .5) * pw / 12, y = T + ph - ph * (t - tmin) / (tmax - tmin); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
  c.fillStyle = K.cssVar("--muted"); c.textAlign = "center"; MONTHS.forEach((m, i) => { c.fillStyle = i === month ? K.cssVar("--text") : K.cssVar("--muted"); c.fillText(m[0], L + (i + .5) * pw / 12, h - 9); }); c.textAlign = "left"; c.fillStyle = "#6fb1ff"; c.fillText("rain (mm)", 4, 15); c.textAlign = "right"; c.fillStyle = "#ff8a70"; c.fillText("°C", w - 6, 15);
}
K.pointer(cv.el, { down(p) { if (view !== "map") return; const lon = LON0 + p.x / cv.w * (LON1 - LON0), lat = LAT1 - p.y / cv.h * (LAT1 - LAT0); let near = null; for (const s of storms) if (Math.hypot(X(s.lon) - p.x, Y(s.lat) - p.y) < 22) near = s; if (near) { focus = near; ilog = near.track.map((q, i) => [i * 3 / 24, q[2] * MPH]); } else seed(lon, lat); } });

// the cross-section through the storm, in the dock
const xsBox = K.$("div", "k-chart"); ui.dock.append(xsBox); const xs = K.canvas(xsBox, () => { });
function drawSection(tsec) {
  const c = xs.ctx, w = xs.w, h = xs.h, s = focus && !focus.dead ? focus : null; c.fillStyle = K.cssVar("--panel"); c.fillRect(0, 0, w, h); c.fillStyle = K.cssVar("--text"); c.font = "600 12px Segoe UI,sans-serif"; c.textAlign = "left"; c.fillText("A slice through the storm", 12, 15);
  const sky = c.createLinearGradient(0, 22, 0, h - 26); sky.addColorStop(0, "#0d1a33"); sky.addColorStop(1, "#27466e"); c.fillStyle = sky; c.fillRect(8, 22, w - 16, h - 48);
  const sea = h - 26, cx = w / 2, V = s ? s.V : 0, org = K.clamp((V - 12) / 38, 0, 1), top = sea - (h - 60) * (0.35 + 0.6 * org), eye = V > 33 ? 14 + 10 * org : 0, bulge = s && !s.land ? (1010 - pressureOf(V)) * 0.06 : 0;
  c.fillStyle = s && s.land ? "#3a3326" : "#0e3a63"; c.beginPath(); c.moveTo(8, h - 6); c.lineTo(8, sea); for (let x = 8; x <= w - 8; x += 4) c.lineTo(x, sea - bulge * Math.exp(-(((x - cx) / 60) ** 2))); c.lineTo(w - 8, h - 6); c.fill();
  if (!s) { c.fillStyle = "rgba(233,238,247,.7)"; c.font = "12.5px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillText("Click the sea on the map to start a storm", cx, sea - 40); return; }
  // cloud: towers either side of the eye, spreading into a flat top; rain bands further out
  c.fillStyle = "rgba(240,244,252,.9)"; for (const side of [-1, 1]) { c.beginPath(); c.moveTo(cx + side * eye, sea - 6); c.quadraticCurveTo(cx + side * (eye + 4), top + 10, cx + side * (eye + 14), top); c.lineTo(cx + side * (w * 0.42), top + 6); c.quadraticCurveTo(cx + side * (w * 0.44), top + 22, cx + side * (w * 0.3), top + 24); c.lineTo(cx + side * (eye + 60 * (0.4 + org)), top + 26); c.quadraticCurveTo(cx + side * (eye + 46 * (0.4 + org)), sea - 30, cx + side * (eye + 40 * (0.4 + org)), sea - 6); c.fill();
    for (let b = 1; b <= 2; b++) { const bx = cx + side * (eye + 60 + b * w * 0.1); c.beginPath(); c.ellipse(bx, sea - 26 - 14 * org, 16, 22 + 16 * org, 0, 0, 6.3); c.fill(); } }
  if (!eye) { c.beginPath(); c.ellipse(cx, (top + sea) / 2, 22, (sea - top) / 2, 0, 0, 6.3); c.fill(); }
  // rain
  c.strokeStyle = "rgba(150,190,255,.7)"; c.lineWidth = 1; c.beginPath(); for (let k = 0; k < 46; k++) { const side = k % 2 ? 1 : -1, x = cx + side * (eye + 6 + ((k * 37) % 50) * (0.4 + org)), y = sea - 8 - ((k * 53 + tsec * 140) % 40); c.moveTo(x, y); c.lineTo(x - 2, y + 7); } c.stroke();
  // air movement
  const arrow = (x1, y1, x2, y2, col) => { const an = Math.atan2(y2 - y1, x2 - x1); c.strokeStyle = c.fillStyle = col; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 + Math.cos(an + 2.6) * 7, y2 + Math.sin(an + 2.6) * 7); c.lineTo(x2 + Math.cos(an - 2.6) * 7, y2 + Math.sin(an - 2.6) * 7); c.fill(); };
  for (const side of [-1, 1]) { arrow(cx + side * w * 0.4, sea - 12, cx + side * (eye + 50), sea - 12, "#ffd28a"); arrow(cx + side * (eye + 22), sea - 20, cx + side * (eye + 22), top + 34, "#ff8a70"); arrow(cx + side * (eye + 40), top - 8, cx + side * w * 0.38, top - 8, "#9fd0ff"); }
  if (eye) arrow(cx, top + 30, cx, sea - 30, "#9fd0ff");
  c.font = "11px Segoe UI,sans-serif"; c.textAlign = "center"; c.fillStyle = "#ffd28a"; c.fillText("warm, moist air drawn in", cx - w * 0.28, sea + 14); c.fillStyle = "#ff8a70"; c.fillText(eye ? "eyewall: fastest winds" : "rising air, heavy rain", cx + w * 0.2, sea + 14); c.fillStyle = "#9fd0ff"; c.fillText("air flows out at 12–15 km", cx + w * 0.26, top - 14); if (eye) { c.fillStyle = "#fff"; c.fillText("eye", cx, top + 22); c.fillText(Math.round(pressureOf(V)) + " hPa", cx, sea - 14 - bulge); }
}
const chI = K.chart(ui.dock, { title: "Strength of the storm you are following", xLabel: "days since it formed", yLabel: "wind (mph)", yMin: 0 });

// ---------------- The loop ----------------
let frame = 0, tsec = 0;
ui.run(dt => {
  if (view !== "map") { tsec += dt; return; }
  acc += rate * Math.max(dt, 1 / 120); tsec += dt * Math.min(3, rate / 6);
  while (acc >= 1) {
    acc--; hours++; if (seasonOn || storms.length) { E.day += 1 / 24; if (E.day > 334) { if (seasonOn) { seasonOn = false; ctl.season.set(false); ui.tip(`Season over: ${tally.named} named storms, ${tally.hurr} hurricanes, ${tally.major} major hurricanes`, 12000); } E.day = 334; } }
    if (seasonOn && rng() < spawnRate(E.day) / 24) { const s = spawn(rng, NAMES[nameNo % NAMES.length]); storms.push(s); if (!focus || focus.dead) { focus = s; ilog = []; } }
    for (const s of storms) { const wasNamed = s.peak >= 17.5; s.step(E); if (!wasNamed && s.peak >= 17.5) { s.name = NAMES[nameNo++ % NAMES.length]; }
      if (s.hits.length && !s.hits[s.hits.length - 1].seen) { const q = s.hits[s.hits.length - 1]; q.seen = true; q.name = s.name; let best = CITIES[0], bd = 1e9; for (const ct of CITIES) { const d = Math.hypot(ct[1] - q.lon, ct[2] - q.lat); if (d < bd) { bd = d; best = ct; } } q.place = best[0]; if (!lastHit || q.V >= 25) lastHit = q; }
      if (s === focus && s.age % 3 === 0) ilog.push([s.age / 24, s.V * MPH]);
      if (s.dead) { old.push(s); if (old.length > 40) old.shift(); if (s.peak >= 17.5) tally.named++; if (s.peak >= 33) tally.hurr++; if (s.peak >= 50) tally.major++; } }
    storms = storms.filter(s => !s.dead); if (focus && focus.dead && storms.length) { focus = storms[storms.length - 1]; ilog = focus.track.map((q, i) => [i * 3 / 24, q[2] * MPH]); }
  }
  if (Math.abs(ctl.day.value - Math.round(E.day)) >= 1) ctl.day.set(Math.round(E.day));
}, () => {
  if (view === "globe") {
    drawGlobe(tsec); if (frame++ % 6) return; drawClimate(); const st = STATIONS[station], tot = st.R.reduce((a, b) => a + b, 0);
    chI.draw([{ type: "bars", w: 6, color: "#6fb1ff", alpha: .8, pts: Object.values(STATIONS).map(q => [q.lat, q.R.reduce((a, b) => a + b, 0)]) }, { type: "dots", r: 5, color: "#fff", pts: [[st.lat, tot]] }], { title: "Rain in a year against latitude", xLabel: "latitude (°N)", yLabel: "mm a year", xMin: -5, xMax: 80, yMin: 0 });
    ui.hud(`<b style="font-size:14px">${st.name}</b><br>${st.belt}<br>${tot} mm of rain a year · ${Math.min(...st.T)} to ${Math.max(...st.T)} °C`); return;
  }
  if (view === "cases") { if (frame++ % 10) return; const c = xs.ctx; c.fillStyle = K.cssVar("--panel"); c.fillRect(0, 0, xs.w, xs.h); const mx = 6300, bw = (xs.w - 80) / 3; c.font = "600 12px Segoe UI,sans-serif"; c.fillStyle = K.cssVar("--text"); c.textAlign = "left"; c.fillText("Deaths", 14, 16); CASES.forEach((q, i) => { const bh = (xs.h - 64) * q.deaths / mx; c.fillStyle = q.col; c.fillRect(40 + i * bw + 12, xs.h - 26 - bh, bw - 24, bh); c.fillStyle = K.cssVar("--text"); c.textAlign = "center"; c.font = "12px Segoe UI,sans-serif"; c.fillText(q.deaths.toLocaleString(), 40 + (i + .5) * bw, xs.h - 31 - bh); c.fillStyle = K.cssVar("--muted"); c.fillText(q.name.split(" ")[1], 40 + (i + .5) * bw, xs.h - 9); });
    chI.draw([{ type: "bars", w: 0.6, color: "#ffd166", alpha: .85, pts: CASES.map((q, i) => [i + 1, q.damage]) }], { title: "Cost of the damage (US$ billion): Haiyan · Katrina · Idai", xLabel: "", yLabel: "US$ billion", xMin: 0.3, xMax: 3.7, yMin: 0, xFmt: v => Math.abs(v - Math.round(v)) < 0.01 ? ["", "Haiyan", "Katrina", "Idai"][Math.round(v)] || "" : "" }); ui.hud(""); return; }
  if (frame === 0 || chI.opts.xFmt) chI.opts.xFmt = null;
  draw(tsec); if (frame++ % 3 === 0) drawSection(tsec); if (frame % 6) return;
  const s = focus, bands = CATS.slice(2).map((q, i) => ({ y: q[0] * MPH, label: "cat " + (i + 1), color: q[2] }));
  chI.draw([{ pts: ilog, color: K.cssVar("--s0"), width: 2.4 }], { title: "Strength of the storm you are following", xLabel: "days since it formed", yLabel: "wind (mph)", xFmt: null, hlines: bands.slice(0, s && s.peak > 55 ? 5 : 3), xMin: 0, xMax: Math.max(6, ilog.length ? ilog[ilog.length - 1][0] + 1 : 6), yMax: Math.max(140, s ? s.peak * MPH * 1.15 : 140) });
  if (s) { read.set("name", s.V >= 17.5 || s.peak >= 17.5 ? s.name : "not yet named"); read.set("wind", Math.round(s.V * MPH) + " mph (" + Math.round(s.V * KMH) + " km/h)"); read.set("cat", CATS[catOf(s.V)][1]); read.set("p", Math.round(pressureOf(s.V)) + " hPa"); read.set("sea", s.land ? "over land" : (s.T || 0).toFixed(1) + " °C"); read.set("lim", s.land ? "–" : Math.round((s.Vp || 0) * MPH) + " mph"); read.set("why", s.dead ? "it has died away" : s.why); } else for (const k of ["name", "wind", "cat", "p", "sea", "lim", "why"]) read.set(k, "–");
  read.set("tally", `${tally.named} named · ${tally.hurr} hurricanes · ${tally.major} major`);
  ui.hud(`<b style="font-size:14px">${dateOf(E.day)}</b>` + (s && !s.dead ? `<br><span style="color:${CATS[catOf(s.V)][2]}">${s.V >= 17.5 ? s.name + ": " : ""}${CATS[catOf(s.V)][1]}</span><br>${Math.round(s.V * MPH)} mph · ${Math.round(pressureOf(s.V))} hPa<br><span style="color:#ffd28a">${s.why}</span>` : `<br>click the sea to start a storm`) + (seasonOn || tally.named ? `<br>${tally.named} named · ${tally.hurr} hurricanes · ${tally.major} major` : ""));
});
makeClouds(); setView("map"); seed(-24, 11.5);
ui.tip("Click warm sea to start a storm · it is steered by the wind arrows and fed by warm water", 9000);
