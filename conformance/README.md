# Conformance fixtures

Example figures a validator can test against `schema/cxfigure-1.0.schema.json`
(JSON Schema Draft 2020-12).

- [`valid/`](valid/) — figures that MUST validate.
  - `scatter2d.json` — a minimal, fully-typed figure.
  - `bar-with-unknown-key.json` — carries an unrecognized `config` key and **still validates**,
    demonstrating the forward-render guarantee (unknown keys are ignored, not fatal).
- [`invalid/`](invalid/) — figures that MUST NOT validate.
  - `missing-graphtype.json` — `config.graphType` is required.
  - `wrong-type-showlegend.json` — a documented key with the wrong type.

Reference check (any Draft 2020-12 validator; example with Python `jsonschema`):

```python
import json, glob
from jsonschema import Draft202012Validator
v = Draft202012Validator(json.load(open("schema/cxfigure-1.0.schema.json")))
for f in glob.glob("conformance/valid/*.json"):
    assert not list(v.iter_errors(json.load(open(f)))), f
for f in glob.glob("conformance/invalid/*.json"):
    assert list(v.iter_errors(json.load(open(f)))), f
print("conformance OK")
```
