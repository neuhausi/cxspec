# Changelog — cxspec

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
