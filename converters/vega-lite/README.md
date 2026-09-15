# vega-lite ⇄ cxfigure converters

Two dependency-free reference converters between a subset of [Vega-Lite](https://vega.github.io/vega-lite/)
and the [cxfigure](../../schema/cxfigure-1.0.schema.json) format — **in both directions**. They exist to
demonstrate that cxfigure is an *interchange*, not a silo, and as a starting point for a fuller mapping.

| File | Direction | Output |
|---|---|---|
| `vega-lite-to-cxfigure.js` | Vega-Lite → cxfigure | `{ schemaVersion, data, config, _unsupported? }` |
| `cxfigure-to-vega-lite.js` | cxfigure → Vega-Lite v5 | `{ spec, report }` — `report.dropped[]` enumerates every input the export could not express (JSON pointer + reason); `report.lossless` is true only when nothing was dropped |

Lossy conversions are **explicit and reported, never silent**, in both directions.

## Usage

```js
// Node
const { vegaLiteToCxfigure } = require('./vega-lite-to-cxfigure');
const figure = vegaLiteToCxfigure(vegaLiteSpec);   // -> { schemaVersion, data, config, _unsupported? }

// Browser
<script src="vega-lite-to-cxfigure.js"></script>
const figure = vegaLiteToCxfigure(vegaLiteSpec);
```

The output is a valid cxfigure and can be handed straight to a CanvasXpress constructor.

## What maps

| Vega-Lite | cxfigure |
|-----------|----------|
| `mark` point/circle/square | `graphType: Scatter2D` |
| `mark` bar / line / area / tick / rect / boxplot / arc | `Bar` / `Line` / `Area` / `Dotplot` / `Heatmap` / `Boxplot` / `Pie` |
| `data.values` (inline records) | tabular data-frame form (`[[header…],[row…]]`) |
| `encoding.x.field` / `y.field` | `config.xAxis` / `yAxis` |
| `encoding.color/size/shape.field` | `config.colorBy` / `sizeBy` / `shapeBy` |
| `title` | `config.title` |

## Exporting: cxfigure → Vega-Lite

```js
const { cxfigureToVegaLite } = require('./cxfigure-to-vega-lite');
const { spec, report } = cxfigureToVegaLite(figure);   // figure = { data, config } (matrix or data-frame form)
// spec   -> a Vega-Lite v5 spec (validates against vega-lite-schema.json; renders with vega-embed)
// report -> { graphType, mark, mapped: [...], dropped: [{ path: '/config/smpTextRotate', reason: '...' }], lossless: false }
```

| cxfigure | Vega-Lite |
|---|---|
| `graphType` Scatter2D / Bar / Line / Area / Dotplot / Boxplot / Heatmap / Pie | `mark` point / bar / line / area / tick / boxplot / rect / arc |
| matrix `y` (vars × smps) + `x`/`z` annotations | `data.values` records: scatter = one per variable (sample columns + z); 1-D/heatmap/pie = long form `{sample, variable, value, …x, …z}` |
| `xAxis` / `yAxis` (scatter), `colorBy` / `sizeBy` / `shapeBy` | `encoding.x/y/color/size/shape` (type inferred: quantitative vs nominal) |
| `graphOrientation`, `smpTitle`, `xAxisTitle`, `groupingFactors[0]` (1-D) | axis swap, axis titles, boxplot category |
| `title`, `subtitle`, `showLegend:false`, `colors`, `colorSpectrum`, `xAxisTransform:"log10"`, `width`, `height` | `title`, `legend:null`, `scale.range`, `scale.type:"log"`, `width`, `height` |
| anything else (`events`, `afterRender`, extra `y` layers, every other config key) | **`report.dropped`** |

## What does NOT map (yet)

Reported in the output's `_unsupported` array rather than dropped silently: `transform`,
aggregates/bins/`timeUnit`, selections/params, expression fields, remote `data.url`, and
multi-view specs (`layer`/`facet`/`concat`/`repeat`). Contributions welcome.

## Examples & test

[`examples/`](examples/) holds Vega-Lite inputs (`*.vl.json`) and their converted outputs
(`*.cxfigure.json`). Run the test (Node, no dependencies):

```
node test.js
```

It re-converts every example in both directions and checks the committed outputs
(`*.vl.json` → `*.cxfigure.json`; `*.cx.json` → `*.export.vl.json` + `*.export.report.json`), then
runs the **round trip** on the shared corpus: `vl → cx → vl` must keep the mark, the encoded fields
and the data records, and `cx → vl → cx` must keep the graphType, axes and every record (73 checks).
`UPDATE=1 node test.js` rewrites the committed outputs deliberately. The exported specs were also
validated against the Vega-Lite v5 JSON Schema and rendered with vega-embed (all eight draw the
expected marks) when the exporter was added.
