# MANGA JP SINGLE MEN — SIX-STEP CONTROLLER V1.1.0

Same Skill slugs and 5 Skills / 6 Steps as V1.0.0:

STEP1 `manga-doc-than-jp-title` -> title-lock (first enforce title-to-payoff proof)
STEP2 `manga-doc-than-jp-outline` -> locked 7-Part outline with NEW stakes/romance, creative preflight PASS
STEP3 `manga-doc-than-jp-writer` -> A (P1–2), B (P3–5), C (P6–7) -> deterministic full script; check visual/action beats BEFORE freezing stage
STEP4 `manga-doc-than-jp-qa` -> logic/Japanese + separate creative editorial audit, independent
STEP5 `manga-doc-than-jp-writer` -> **ONE FROZEN EDIT TRANSACTION** for confirmed logic and Japanese errors only
STEP4 read-only FINAL VERIFY -> READY_FINAL or BLOCKED_ONE_PASS_EXHAUSTED
STEP6 `manga-doc-than-jp-seo` -> metadata, 3 genuinely distinct PNG 16:9, actual visual review, technical release and strict publish gate

**Never loop Step5**. Repair patches are frozen UTF-8 byte ranges tied to baseline script SHA. No manuscript creative rewrite in QA. `READY_FINAL` is grammar/logic only: publication requires `CREATIVE_GATE_REPORT.json`, `THUMBNAIL_VISUAL_QA.json`, release gate PASS. The controller cannot auto-attest vision or human review.

## Command to validate output (after Step6)
`python scripts/release_gate.py --project-dir /path/to/episode`
`python scripts/release_gate.py --project-dir /path/to/episode --strict-publish`
If result `TECHNICAL_PASS_PUBLISH_REVIEW_REQUIRED`, inspect actual images and story creatively; do not report fully publish-ready. For an old V1 episode, preserve old contracts: V1.1.0 accepts the old file format and hashes without re-writing the episode.
