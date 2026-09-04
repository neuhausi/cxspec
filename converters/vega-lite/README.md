# vega-lite → cxfigure converter

A dependency-free reference converter from a subset of [Vega-Lite](https://vega.github.io/vega-lite/)
to the [cxfigure](../../schema/cxfigure-1.0.schema.json) format. It exists to demonstrate that
cxfigure is an *interchange*, not a silo — and as a starting point for a fuller mapping.

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

It re-converts each example and checks the output matches the committed `.cxfigure.json`. The
committed outputs are also validated against the cxfigure JSON Schema in CI.
