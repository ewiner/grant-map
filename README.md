# Grant's Memoirs — Interactive Movement Map

An interactive web map for following Ulysses S. Grant's geographic movements through his *Personal Memoirs* (1885). Navigate all 69 chapters of the book and watch Grant's journey unfold — from his Ohio boyhood, through West Point and the Mexican-American War, to commanding the Union armies in the Civil War.

**[Live Demo →](https://www.perplexity.ai/computer/a/grant-s-memoirs-movement-map-Y4h6QVizR9WiCkVCHSC1yw)**

---

## Features

- **Chapter-by-chapter navigation** across all 69 chapters (Vol. I: Early Life & Mexican War; Vol. II: Civil War Command)
- **372 geolocated movements** extracted from the full text, each annotated with date and description
- **Numbered teardrop markers** on an interactive Leaflet map with dashed route polylines
- **Jump-to-chapter** dropdown with chapters grouped by volume
- **Dark mode** with CARTO Dark Matter tiles — fully themed map, sidebar, and popups
- **Mobile responsive** — slide-over sidebar with backdrop dismiss, floating action button, touch-friendly targets
- **Keyboard navigation** — ← → arrow keys to step through chapters

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Map | [Leaflet](https://leafletjs.com/) with [CARTO](https://carto.com/) tile layers |
| Styling | Tailwind CSS v3 + custom CSS design system |
| UI components | shadcn/ui |
| Backend | Express (minimal stub — app is effectively static) |
| Data | Static TypeScript file generated from geocoded JSON |

---

## Data Pipeline

The geographic data was extracted from the Project Gutenberg edition of Grant's *Personal Memoirs* ([ebook #4367](https://www.gutenberg.org/ebooks/4367)) in several steps:

1. **Text acquisition** — Downloaded full text (~1.6 MB, 27,552 lines) and split into 69 individual chapter files
2. **Movement extraction** — Each chapter was read by an LLM to identify geographic movements, dates, and purpose descriptions, producing structured JSON
3. **Geocoding** — Location names were geocoded via Nominatim (OpenStreetMap); ambiguous or failed lookups were resolved manually with known coordinates
4. **Audit** — All 372 coordinates were validated for geographic plausibility; 31 erroneous points (wrongly placed in South America, Europe, or the wrong Mexican state) were corrected
5. **Embedding** — Final geocoded data was compiled into `client/src/data/chapters.ts` for zero-runtime-cost static delivery

---

## Running Locally

```bash
git clone https://github.com/<your-username>/grant-map.git
cd grant-map
npm install
npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

To build for production:

```bash
npm run build
# output: dist/public/
```

---

## Project Structure

```
grant-map/
├── client/
│   └── src/
│       ├── data/chapters.ts       # 372 geocoded movements (generated)
│       ├── pages/MapPage.tsx      # Main app — map + sidebar
│       └── index.css              # Design system (parchment/blue/gold)
├── server/                        # Minimal Express stub
├── shared/schema.ts               # TypeScript types (Chapter, Movement)
└── dist/public/                   # Production build output
```

---

## Vibe-Coded with Perplexity Computer

This project was built entirely through natural-language conversation using **[Perplexity Computer](https://www.perplexity.ai/computer)**, an AI agent that can research, write code, debug, and deploy — all from plain English instructions.

The underlying AI models powering the work:
- **Claude Sonnet 4.5 / Claude Sonnet 4.6** (Anthropic) — primary coding and reasoning agent
- **GPT-4o** (OpenAI) — used for text extraction subagents (chapter geographic movement parsing)
- **Nominatim / OpenStreetMap** — automated geocoding of location names

No code was written by hand. The entire pipeline — from downloading the Gutenberg text, through parallel chapter parsing, geocoding, React app construction, iterative QA, and deployment — was orchestrated through conversation.

---

## Source Text

*Personal Memoirs of U.S. Grant* by Ulysses S. Grant (1885).  
Public domain. Source: [Project Gutenberg #4367](https://www.gutenberg.org/ebooks/4367).

---

## License

[MIT License](LICENSE) — see `LICENSE` for details.

Map tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors © [CARTO](https://carto.com/attributions).
