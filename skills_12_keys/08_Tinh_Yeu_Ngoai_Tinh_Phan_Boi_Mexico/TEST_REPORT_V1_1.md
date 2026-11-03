# V1.1 TEST REPORT

Source fixture: `8-Mesa_de_Laurel_TAT_CA_STEPS.zip` extracted as a read-only content reference (no original narrative bytes edited).

- Prior V1 13 synthetic unit tests: PASS.
- Added V1.1 10 unit tests: PASS.
- Total: **23/23 unit tests PASS**.
- V1.1 `audit-run --workdir <first-run> --require-seo`: `MECHANICAL_PASS_EDITORIAL_REVIEW_REQUIRED` with verified SHA, 12.588 words, 77.448 body characters, 7 parts, one repair; flags duplicated `modas de moda` as advisory.
- V1.1 strict `seo-gate ... --workdir <first-run>`: `PASS_STRICT_MECHANICAL_ONLY`.
- Tests included: legacy absolute path relocation, reject local altered stage, altered title lock, modified final script, missing proof, absent SEO artifact, duplicate phrase warning, correct strict gate.

All tests are file-structure and integration-mechanics checks, not independent native-speaker grading. Detailed editorial findings in `AUDIT_PRIMERA_EJECUCION.md`.

- `audit-run` exposes `title_ledger_verified=false` when ledger is not supplied, rather than asserting cross-video deduplication; provide optional `--ledger` for affirmative matching check.
