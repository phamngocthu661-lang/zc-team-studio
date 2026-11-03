# V1.1 validation report (executed 2026-11-01)

- Real USM-002 final story: `verify_script.py` **PASS**, 8,061 whitespace words, SHA-256 `fcf6a28e1fbef855698e6534e1741894c643dce818ae3a0300b5373f796e23a1`, zero automatic TTS violations.
- Real USM-002 one-edit ledger: `verify_one_repair.py` **PASS**; one permitted P2 change at UTF-8 source bytes [16475,16598), replacement 120 bytes, zero unauthorized changes.
- Real USM-002 complete unmodified package: `verify_bundle.py` **FAIL**, stale Part 3 and QA file missing verbatim LOCKED_TITLE. WARN: Step4 metrics SEO snapshot status `NOT_READY` vs final handoff `SEO_READY` (not inherently wrong; stage label ambiguous). Multiple original handoff aliases now additionally warned if absent.
- Test copy with only derived Part 3 synchronized and QA-title metadata restored (FINAL SCRIPT UNCHANGED, same SHA): `verify_bundle.py` **PASS_WITH_WARNINGS** (only metadata snapshot-stage ambiguity remains). This is a diagnostic copy, not a second repair to script.
- Regression suite: **12/12 tests passed**, including excerpt-form patch, byte-offset patch, overlapping/ambiguous/repeated repair rejections, no-edit path, extra unauthorized change rejection, word tokenizer, TTS marker and stale final Part detection.
- Qualitative content: independent editorial review still required; an automated checker cannot certify chemistry, originality, audience retention or visual thumbnail quality. Thumbnail B's Colorado/New Mexico prompt mismatch must be corrected if that option is used.

All tests used actual Python and real input files except named synthetic regression fixtures. The source USM-002 ZIP remains unmodified.
