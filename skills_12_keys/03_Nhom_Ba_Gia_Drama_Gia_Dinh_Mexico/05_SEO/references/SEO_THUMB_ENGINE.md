# SEO / THUMBNAIL V1.1 — SHA-LOCKED PUBLISHING, CLEAN TTS

## Eligibility: strict, no inferred READY
Never publish from only `score=98`, legacy V1 READY, or a self-declared manual review. Use the exact current final script, `QA_FINAL.json`, original title/manifest, optional one-repair proof and **SHA-bound `QA_EDITORIAL_EVIDENCE.json`**. Run `seo-gate --editorial-evidence QA_EDITORIAL_EVIDENCE.json` with prior arguments; require `MXF_SEO_GATE_V1_1` and BOTH `TECH_PASS=true` and `EDITORIAL_PASS=true`. Missing evidence, missing contexts, P1, stale hash = NOT_READY/STOP. Do not bypass through hand editing JSON.

## Locked metadata for ONE video
1. Locked primary title VERBATIM (<=100 code points); 2 distinct OPTIONAL secondary variants <=100 labeled not locked; short natural es-MX description anchored in ACTUAL script and no false `historia real`; relevant comma-separated tags no more than 500 chars (not a quota); 3–5 relevant hashtags if channel format requires; three separate thumbnail hypotheses A/B/C (not copied from competing imagery); optional video hook 8–30 seconds grounded in existing scenes. Never claim measured CTR or guaranteed view improvement.
2. Thumbnail visual: 16:9 (3840×2160 or 1536×864). Legible older woman's face, clear dramatic interaction, bold high-contrast Spanish copy. Avoid 6-line Japanese format rule; choose 3–6 real physical lines depending on actual title and phone legibility. Right-face occupancy ~35–42% only as design starting point. Text must stay in 5% safe margin; no fake receipts or photos not in script; avoid spelling errors on image.
3. Mobile check: view at approx 320px width; manually verify readability (word size, contrast, safe margin, no 7th wrapped line), facial emotion, relationship to actual plot, and variation across A/B/C. Thumbnail prompt is NOT a generated and checked image. Report clearly whether a final image exists.

## NEW TTS clean export
After QA READY, run:
`python scripts/mexico_pipeline.py tts-export --script FULL_SCRIPT_REVISED.txt --qa QA_FINAL.json --out FULL_SCRIPT_TTS_CLEAN.txt`
If there was no repair, use original verified FULL_SCRIPT.txt instead. The command removes exactly seven standalone `[PART N]` heading lines, preserves body text and checks hash/count. Do NOT feed `[PART 1]`/technical marks into TTS. Keep the full headed version for QA and provenance; do not overwrite it.

## Publish audit evidence
Output `SEO_PUBLISH_PACK.md` with exact locked title, metadata character counts, 3 thumbnail designs, chosen hypothesis, `QA_FINAL.json` SHA, `QA_EDITORIAL_EVIDENCE.json` SHA, source script SHA, TTS clean hash if exported, and explicit thumbnail status `PROMPT_ONLY` vs `IMAGE_RENDERED_AND_REVIEWED`. Keep the audit result factual, not a marketing score.
