# Changelog

## Unreleased

- Added `converters/vega-lite/cxfigure-to-vega-lite.js`: cxfigure → Vega-Lite v5 export with an explicit
  lossy-conversion report (`report.dropped[]` with JSON pointers, `report.lossless`); shared fixture
  corpus now covers point/bar/line/area/tick/boxplot/rect/arc in both directions with round-trip tests.
- `vega-lite-to-cxfigure.js`: `encoding.theta` (arc value channel) now maps to `config.yAxis`. — cxspec

Spec versions are `MAJOR.MINOR` and independent of any engine/product version. See
[COMPATIBILITY.md](COMPATIBILITY.md) for what a bump means.

## 1.0

- First published version of the portable figure schema (`cxfigure-1.0`) and the materialized
  grammar schema (`cxplot-1.0`).
- `schemaVersion` stamped on every figure.
- Stated compatibility policy: forward-render guarantee, additive-MINOR / breaking-MAJOR,
  deprecation across at least one major line.
- Structural round-trip equality (`cxdiff` / `specsEqual`) and optional provenance hash defined.
- `cxfigure` documents the load-bearing `config` keys with types; `additionalProperties: true`
  keeps the long tail open, as the forward-render guarantee requires.
