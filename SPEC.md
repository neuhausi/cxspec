# The CanvasXpress figure specification

## 1. Purpose

A **figure** is a single JSON object that fully describes a chart: the data it draws and the
configuration that renders it. Because both travel together, a figure is reproducible — it can be
regenerated and inspected rather than flattened into a picture whose numbers are lost.

## 2. The two forms

### 2.1 Portable figure (`cxfigure`)

The object a tool serializes and embeds in an export. Shape:

```json
{
  "schemaVersion": "1.0",
  "data":   { /* the dataset: y (matrix), x/z (annotations), ... */ },
  "config": { "graphType": "Scatter2D", "...": "the parameter vocabulary" },
  "events": { /* optional */ }
}
```

- `data` — the dataset in the CanvasXpress data model (a value matrix plus optional
  sample/variable annotations), or a data frame the engine coerces to it.
- `config` — the rendering configuration. `graphType` selects the geometry; the remaining keys
  are the parameter vocabulary. **Open by design:** unknown keys are ignored, not fatal (see
  [COMPATIBILITY.md](COMPATIBILITY.md)).
- `schemaVersion` — the `MAJOR.MINOR` contract version. Absent ⇒ pre-1.0 baseline.

Schema: [`schema/cxfigure-1.0.schema.json`](schema/cxfigure-1.0.schema.json).

### 2.2 Materialized grammar (`cxplot`)

A grammar-of-graphics read-model: layers, scales, coordinates, and facets made explicit. Useful
for tools that reason about a figure as a grammar rather than as engine configuration.

Schema: [`schema/cxplot-1.0.schema.json`](schema/cxplot-1.0.schema.json).

## 3. Guarantees

- **Forward-render** and **deprecation** — see [COMPATIBILITY.md](COMPATIBILITY.md).
- **Round-trip.** `save → re-open → save` reaches a fixed point: the re-exported spec is
  structurally equal to the previous one, ignoring volatile/render-derived fields (e.g. computed
  layout widths, random seeds, pixel dimensions). Equality is defined by a structural diff
  (`cxdiff`) treating those fields as ignorable.
- **Provenance (optional).** A stable hash over the canonicalized `{data, config, schemaVersion}`
  lets a figure in a record be verified: recompute and compare.

## 4. Validation

Validate a candidate figure against `cxfigure-1.0.schema.json` with any Draft 2020-12 validator.
Per the compatibility policy, a validator should **warn on unknown keys, not reject them** —
the schema documents the structure and the load-bearing keys, not the entire long tail of
parameters.

## 5. Interoperability

The format is meant to be an interchange. Two directions are of particular interest:

- **Vega-Lite → cxfigure** — a dependency-free reference converter ships in
  [`converters/vega-lite/`](converters/vega-lite/): marks → `graphType`, `x`/`y` encodings →
  axes, `color`/`size`/`shape` → the `*By` mappings, with unsupported constructs reported rather
  than dropped. A `cxfigure → Vega-Lite` direction and a Plotly mapping are open contributions.
- **Plotly figure JSON ⇄ cxfigure** — mapping traces ⇄ the data matrix + per-series config.

Converters and documented mappings from other tools are welcome. If you maintain a visualization
library and want to define a shared mapping, please open a Discussion in this repository.
