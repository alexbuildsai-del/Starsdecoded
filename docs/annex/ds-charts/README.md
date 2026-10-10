# Chart parts

The one natal chart of Stars Decoded, written down as design-system parts. One chart, drawn once, used everywhere in a **state**. From the ideation Review 09/10 (`docs/specs/draft/review-09-10.md` §2b; the model is `docs/annex/chart-model-review-09-10.html`).

Each folder has a `preview.html` (a self-contained card, group "Charts") and a `README.md`.

| Folder | What it covers |
|---|---|
| `Chart/` | The whole chart: its parts, the measurements, the build order every animation uses |
| `SignRing/` | The twelve signs and the degree ticks |
| `Houses/` | Whole sign houses, counted from the rising sign; lighting one house |
| `Planets/` | Renders, drawn points (Chiron, nodes), lanes, going backwards (R) |
| `Horizon/` | The flat horizon and the rising marker; no MC |
| `Lines/` | Lines between planets (the engine's aspect list) |
| `Colour/` | The colours, the three-colour rule, six ways to point at something |
| `ChartStates/` | Every state, which layers it shows, where it is used; the gaps |
| `Teaching/` | The five teaching loops |
| `Loading/` | The report and pair loading stories, drawn on this chart |
| `TwoCharts/` | One link between two people, on both charts |
| `EveryChart/` | Every chart in the product today and the state that replaces it |

`chart.js` is the drawing code the previews use (`sky()` and its helpers), kept readable for the builders. It is a reference, not shipped code: the product's chart is built in React on `web/src/components/chart/wheel-geometry.ts`, which already holds these radii.

Rules that hold for every part:

- One chart. A state only switches layers, dims, rings or lights. No second set of radii.
- Real chart data only, computed by the engine. The previews use Thibault, Beatrice and Athena (the repo's sample people), the sky over London on 9 October 2026, and Thibault without a birth time.
- At most three colours on a screen: the chapter colour, one content colour, the greys. Brass means lit.
- Anything a screen needs that no state gives is decided in an ideation: reuse a state, adapt one, or add one here.
- Tested for consistency (the Owner, 2026-10-10): `check:ds` and the critical `chart-consistency.test.ts` hold every chart to these pages (spec Review 09/10, acceptance 11; the design-system spec, scope 8).
