# Compatibility policy

The specification version is `MAJOR.MINOR` (e.g. `1.0`), carried on every figure as
`schemaVersion`. It is **independent of any engine or product version.**

**Commitment: any spec ever emitted still renders in a current engine, via migration if needed.**

- **Additive (MINOR).** New optional keys may appear in a minor bump. A reader on an older minor
  **ignores unknown keys** and still renders. This is why the schemas keep
  `additionalProperties: true` — strict rejection of unknown keys would break the forward-render
  guarantee below.
- **Breaking (MAJOR).** Removing, renaming, or changing the meaning of a key is a major bump, and
  the engine ships a migration that upgrades an older spec on load.
- **Forward-render guarantee.** A spec written by an old version opens in a new one. The reverse
  is best-effort — unknown keys are ignored, not fatal.
- **Deprecation.** A key slated for removal is marked deprecated in the schema for **at least one
  major line** before it can be dropped.

## What `schemaVersion` means for validators

A figure without `schemaVersion` predates the contract and is treated as the pre-1.0 baseline.
Validators should **warn, not reject**, on unknown keys within a matching MAJOR line.
