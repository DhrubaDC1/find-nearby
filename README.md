<div align="center">

<img src="docs/banner.svg" alt="Find Nearby — discover what's around you" width="100%" />

<br />

**Just landed somewhere new? Open Find Nearby, tap once, and the city unfolds around you in 3D:<br/>sights, food, coffee and late-night spots, with real walking routes and a map that follows the sun.**

<br />

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white&labelColor=20232a)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white&labelColor=1a1a2e)](https://vite.dev)
[![Mapbox](https://img.shields.io/badge/Mapbox_GL-3-4264FB?style=for-the-badge&logo=mapbox&logoColor=white&labelColor=0b1026)](https://docs.mapbox.com/mapbox-gl-js/)
[![Motion](https://img.shields.io/badge/Motion-14-FF4D8D?style=for-the-badge&logo=framer&logoColor=white&labelColor=2a0f1f)](https://motion.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge&labelColor=0f1f14)](LICENSE)

[![Stars](https://img.shields.io/github/stars/DhrubaDC1/find-nearby?style=social)](https://github.com/DhrubaDC1/find-nearby/stargazers)
&nbsp;
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-c084fc?style=flat-square)](#-contributing)

[**Features**](#-features) · [**Screenshots**](#-screenshots) · [**Quick start**](#-quick-start) · [**How it works**](#-how-it-works) · [**Roadmap**](#-roadmap)

<br />

<img src="docs/screens/night-detail.jpg" alt="Find Nearby at night: a glowing walking route through the Louvre courtyard to a nearby venue" width="100%" />

<sub>Paris at 10 PM: one tap from the Louvre courtyard to the nearest late-night spot, with the walking route drawn in 3D.</sub>

</div>

<br />

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🌍 Cinematic arrival
You start on a slowly spinning 3D globe. Share your location and the camera **flies from orbit down to your street**, then slowly circles the buildings around you.

</td>
<td width="50%" valign="top">

### 🌗 A map that follows the sun
Dawn, day, dusk and night lighting are picked **from your local clock**, and the whole interface changes color with it. It also changes what opens first: ☕ coffee at dawn, 🍸 bars at night.

</td>
</tr>
<tr>
<td valign="top">

### 🚶 Walking distance at a glance
Glowing **5 / 10 / 15-minute walk rings** (Mapbox Isochrone) show how far you can actually get on foot. Every place shows its walking time, not just a distance.

</td>
<td valign="top">

### 🗺️ Real routes, real ETAs
Tap any place to see a **gradient walking route** drawn in 3D, a real ETA from the Directions API, opening hours, ratings, phone and website, plus one-tap hand-off to Google Maps or Apple Maps.

</td>
</tr>
<tr>
<td valign="top">

### 🎲 Surprise me
Can't decide? One button picks a random place nearby, flies you there and opens it. Handy when you're new somewhere.

</td>
<td valign="top">

### 📱 Made for your phone
On a phone the panels become **bottom sheets**, the camera keeps the map visible above them, and it respects `prefers-reduced-motion`. It's keyboard friendly too (<kbd>Esc</kbd> closes a place).

</td>
</tr>
</table>

<div align="center">

| 📸 Sights | 🍜 Food | ☕ Coffee | 🏛️ Museums | 🌳 Parks | 🍸 Nightlife | 🛍️ Shopping | 🛏️ Stays |
|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|

</div>

## 📸 Screenshots

<div align="center">

### Day ↔ Night, automatically

<table>
<tr>
<td><img src="docs/screens/day-detail.jpg" alt="Daytime: Louvre Museum details with hours, phone and website" /></td>
<td><img src="docs/screens/night.jpg" alt="Nighttime: 25 nightlife spots glowing around the Louvre" /></td>
</tr>
<tr>
<td align="center"><sub>☀️ <b>Day</b>: details, today's hours, one-tap directions</sub></td>
<td align="center"><sub>🌙 <b>Night</b>: the city lights up, bars pop in</sub></td>
</tr>
</table>

### In your pocket

<table>
<tr>
<td width="33%"><img src="docs/screens/mobile.jpg" alt="Mobile list view" /></td>
<td width="33%"><img src="docs/screens/mobile-detail.jpg" alt="Mobile place detail with walking route" /></td>
<td width="33%"><img src="docs/screens/intro.jpg" alt="Intro screen on a 3D globe" /></td>
</tr>
<tr>
<td align="center"><sub>Browse by walking time</sub></td>
<td align="center"><sub>Route + ETA</sub></td>
<td align="center"><sub>"Just landed?"</sub></td>
</tr>
</table>

</div>

## 🚀 Quick start

> **You need:** Node 20.19+ and a free [Mapbox public token](https://account.mapbox.com/access-tokens/) (`pk.…`).

```bash
git clone https://github.com/DhrubaDC1/find-nearby.git
cd find-nearby
npm install
cp .env.example .env        # then paste your token into VITE_MAPBOX_TOKEN
npm run dev
```

Open **http://localhost:5173**, tap **📍 Use my location**, and you're in. If you'd rather not share your location, type a city, street or hotel instead.

<details>
<summary><b>📦 Scripts</b></summary>

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` (static, so you can host it anywhere) |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the tests (Node's built-in test runner, no extra dependencies) |

</details>

<details>
<summary><b>🔐 About the token</b></summary>

Mapbox `pk.` tokens are made to be used in the browser, so there's no backend to run. Before deploying, add a **URL restriction** to your token in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/) so only your domain can use it.

</details>

<details>
<summary><b>📲 Test on your phone</b></summary>

Geolocation needs HTTPS. Run `ngrok http 5173` and open the `*.ngrok-free.app` URL on your phone. The dev server already accepts ngrok hosts.

</details>

## 🧠 How it works

Everything comes from Mapbox. There's no backend, no database and no state library: **4 runtime dependencies** in total.

```mermaid
flowchart LR
    U(("📍 You")) --> G["Geocoding v6<br/><sub>“You're in Koreatown, New York”</sub>"]
    U --> I["Isochrone<br/><sub>5 · 10 · 15 min walk rings</sub>"]
    U --> S["Search Box<br/><sub>25 places per category</sub>"]
    S --> P{{"🗂️ Place"}}
    P --> D["Directions<br/><sub>walking route + ETA</sub>"]
    P --> T["Static Images<br/><sub>satellite thumbnails</sub>"]
    G & I & S & D & T --> M["🗺️ Mapbox GL Standard<br/><sub>3D · lightPreset from your clock</sub>"]
```

| Need | Mapbox API |
|---|---|
| Where am I? | [Geocoding v6](https://docs.mapbox.com/api/search/geocoding/) (reverse + forward fallback) |
| What's nearby? | [Search Box: category search](https://docs.mapbox.com/api/search/search-box/) |
| How far on foot? | [Isochrone](https://docs.mapbox.com/api/navigation/isochrone/) |
| How do I get there? | [Directions (walking)](https://docs.mapbox.com/api/navigation/directions/) |
| What does it look like? | [Static Images](https://docs.mapbox.com/api/maps/static-images/) (satellite) |
| The map itself | [Mapbox GL JS v3, Standard style](https://docs.mapbox.com/mapbox-gl-js/) |

<details>
<summary><b>🗂️ Project structure</b></summary>

```
src/
├── App.jsx          state, intro, categories, layout
├── MapView.jsx      mapbox-gl: globe, fly-in, pins, rings, route
├── PlaceList.jsx    category chips + animated card list
├── PlaceDetail.jsx  place panel: route ETA, hours, links
├── api.js           every Mapbox call + small formatters
├── light.js         clock → dawn / day / dusk / night
└── styles.css       glass UI, themed per light preset
```

The whole app is about 600 lines of JavaScript, small enough to read in one sitting.

</details>

## 🗺️ Roadmap

- [x] 3D globe intro + cinematic fly-in
- [x] Auto day / dusk / night lighting
- [x] 5/10/15-min walk isochrones
- [x] Walking routes with live ETA
- [x] Opening hours, ratings, phone, website
- [x] Mobile bottom sheets
- [ ] ❤️ Save favorites
- [ ] 🔎 Search-as-you-type for any place
- [ ] 🔗 Shareable links to a place
- [ ] 🌐 Multi-language UI
- [ ] ☀️ Sun-position lighting (real sunrise/sunset instead of fixed hours)

Have an idea? [Open an issue](https://github.com/DhrubaDC1/find-nearby/issues).

## 🤝 Contributing

PRs are welcome! Keep it simple: no new dependency when a few lines will do.

1. Fork and create a branch: `git checkout -b feat/amazing-thing`
2. `npm test && npm run build`
3. Open a PR with a screenshot or GIF of your change

## 📄 License

[MIT](LICENSE) © Dhruba Chakraborty

Map data © [Mapbox](https://www.mapbox.com/about/maps/) © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

<br />

<div align="center">

### ⭐ If Find Nearby helped you find something good, give it a star!

<a href="https://star-history.com/#DhrubaDC1/find-nearby&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=DhrubaDC1/find-nearby&type=Date&theme=dark" />
    <img alt="Star history" src="https://api.star-history.com/svg?repos=DhrubaDC1/find-nearby&type=Date" width="600" />
  </picture>
</a>

<sub>Built with ☕ and Mapbox, for everyone who's ever landed somewhere and wondered <i>"what's good around here?"</i></sub>

</div>
