# AGENTS.md — Codex instructions for shapez-CE-industrial-reengineering

This repository is a planned independent fork of shapez Community Edition with power, logistics, snippet, save-migration, and performance features.

Read `docs/README.md` and relevant docs before changing code. In the docs, `[확정]` marks explicit user requirements; `[제안]` marks proposals NOT approved as fixed behavior. Prefer small, testable, reversible changes.

Critical rules:
- Preserve user save compatibility through a read-only legacy importer and a versioned migration path. Never overwrite legacy `.bin` saves. Never silently delete unknown buildings, stored shapes, or in-flight items.
- Do NOT commit user save files, decoded JSON dumps, credentials, or third-party mod code/assets without confirmed redistribution rights.
- Default Shapez production buildings must continue to work without electric power. Power is for advanced features and optional 2x overclock.
- Keep simulation correctness and item conservation. Test rotations, mirroring, loading/saving, belt backpressure, and power deficits.
- Profile JS/TS first; do not rewrite the whole engine in C++/Wasm without benchmark evidence.
- Check the actual checkout for available package scripts/API paths. Report what you actually tested versus what was not tested.
- Update docs/12-decisions-and-open-questions.md when a decision becomes confirmed or a prototype rule changes.

First task recommendation: inspect upstream repo, record commit SHA, verify disk space/build dependencies, and document lint/build results without changing game behavior. See `docs/11-codex-workflow.md`.
