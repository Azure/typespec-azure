# Package Knowledge Bases

This directory contains knowledge base files maintained by the doc-updater pipeline.

## Files

- `<package>.md` — Knowledge base for a package (API signatures, feature mappings, doc conventions)
- `<package>.meta.json` — Metadata tracking the last analyzed commit and PR number

## Important

Do **not** edit these files manually — they are maintained by the doc-updater agent sessions.

The knowledge base is built and updated as a byproduct of the doc-update session.
The agent records useful discoveries (API signatures, feature→doc mappings, conventions)
as it updates documentation, so future runs can build on that knowledge.
