# cxspec — the CanvasXpress figure specification

A versioned, self-describing **figure interchange format**: a portable JSON object that
carries a chart's data *and* the full specification needed to render it, so a figure can be
saved, shared, re-opened, and reproduced exactly — years later, by a different tool.

This repository publishes the format **independently of any one library** so that other tools
can read, write, validate, and convert it. It is not tied to a CanvasXpress release cycle.

## What's here

| Path | What it is |
|------|------------|
| [`schema/cxfigure-1.0.schema.json`](schema/cxfigure-1.0.schema.json) | JSON Schema for the persisted portable figure — the `{data, config}` object. |
| [`schema/cxplot-1.0.schema.json`](schema/cxplot-1.0.schema.json) | JSON Schema for the materialized grammar-of-graphics form (`cxplot`). |
| [`SPEC.md`](SPEC.md) | Human-readable description of the format and its guarantees. |
| [`COMPATIBILITY.md`](COMPATIBILITY.md) | The versioning + long-term compatibility policy. |
| [`conformance/`](conformance/) | Valid and invalid example figures a validator can test against. |
| [`CHANGELOG.md`](CHANGELOG.md) | Spec version history (separate from any engine version). |

## Canonical schema URLs

The schemas dereference at their `$id`:

- `https://www.canvasxpress.org/schema/cxfigure-1.0.schema.json`
- `https://www.canvasxpress.org/schema/cxplot-1.0.schema.json`

## Two guarantees worth knowing

- **Forward-render.** Any figure ever emitted still renders in a current engine — via an
  on-load migration if a breaking change occurred. See [COMPATIBILITY.md](COMPATIBILITY.md).
- **Round-trip.** Save → re-open → save reaches a fixed point: the re-exported spec is
  structurally equal to the previous one (volatile/render-derived fields aside).

## Reference implementation

[CanvasXpress](https://www.canvasxpress.org) reads and writes this format natively and provides
`cxdiff(a, b)` / `specsEqual(a, b)` (structural spec diff) and `provenanceHash(figure)`
(a stable hash over data + spec + version). The format itself is open for any tool to implement.

## Interoperability

The format is designed to be an interchange, not a silo. Converters to and from other figure
formats (e.g. Vega-Lite and Plotly figure JSON) are welcome — see
[`SPEC.md`](SPEC.md#interoperability). If you maintain a visualization tool and want a documented
mapping or a shared interchange, please open a Discussion.

## License

The specification text and schemas in this repository are licensed **CC BY 4.0** — you may
implement, adapt, and redistribute them with attribution. See [LICENSE](LICENSE).
