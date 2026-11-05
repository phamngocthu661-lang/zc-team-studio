---
name: padre-mx-seo-packaging
version: 1.1.0
description: "Step6 only. Produce fact-locked es-MX title/description/tags and 3 distinct thumbnail 16:9 hypotheses/trailer for a script with exact independent QA READY hash; never claim unrendered images."
---
# PADRE MX — SEO & THUMBNAIL PACKAGING (STEP6 ONLY)

First load shared contract + `references/MEXICO_CHANNEL_DNA.md` + `references/SEO_THUMBNAIL_RULES.md`, current script, QA_FROZEN, and outline. Never package on a QA score copied from conversation without exact SHA. Run:
```
python scripts/verify_seo_ready.py --script CURRENT_SCRIPT.txt --qa-frozen QA_FROZEN.json --outline-file CURRENT_FINAL_OUTLINE.txt --title "CURRENT_FINAL_TITLE" [--repair-proof REPAIR_PROOF.json]
```
If not PASS → block, report why. Do not use old READY against a new hash.

## Content-lock
1. `CURRENT_FINAL_TITLE` EXACT frozen locked es-MX title, <=100 chars; DO NOT replace silently.
2. Exactly 2 secondary curiosity title options also <=100 chars, no fabricated outcomes.
3. Short vivid es-MX video description based on actually written beats, not generic moral lessons, optional no hashtag/icon per user preference.
4. Primary/secondary SEO keywords, informative tags (target ~450–500 chars MAX 500 when requested); count actual Unicode characters; separate optional hashtags (3–5) if requested.
5. Three distinct **thumbnail hypotheses A/B/C**: a) very high-pressure visible injustice, b) father's silent evidence/strategy, c) consequence of victim's refusal. Each has one sharp hook text (2–6 readable lines, preferably 12–24 words total; no 40-word block) and one image prompt 16:9 with elderly father right and narrative on left; avoid direct copies of competitor images. Do not force green/yellow/red on every video; optimize legibility.
6. One trailer script 8–15 seconds, 2–3 shots actually contained in story, no false proof/reveal.
7. `PROMISE_TO_SCENE_MAP` with 3 actual scene quotes/Part refs verifying primary and thumbnail hooks. `FACT_LOCK` table people/ages/currency/ownership.

Thumbnail image generation when specifically requested: render A, B, C as three separate 16:9 images if the environment has image generation capability; never combine into a 3-up collage, never pretend prompt=rendered file, never claim A/B testing from speculative CTR.

If source contains an unresolved legal discrepancy or the script is not genuinely READY: stop packaging, do not fix content here, require new QA/production version.

## V1.1 SEO editorial double gate
After the technical preflight, independently read the revised exact-hash script and verify not only three source quotes but also the title/thumbnail reveal timing. Do not frame a pending loan APPLICATION as a signed loan, or label an owner as the formal employer unless the script establishes it. Generate three genuinely different A/B/C composition AND value propositions; not three close-ups of the same archive. If QA V1.0 approved a contradicted story, do not rely on its 99/100 score; require a new V1.1 QA review and exact source hash. Thumbnail prompts are not image files.

## V1.1 Required persisted packaging check
Before marking SEO complete, save the exact `.md` containing 2 support titles, tags, 3 thumbnail hypotheses and 3 verbatim scene quotes; run:
`python scripts/validate_seo_package.py --package STEP6_SEO_PACKAGE.md --script EXACT_QA_READY_SCRIPT.txt --title "CURRENT_FINAL_TITLE"`
Require tags 450–500 characters, three actual source quotations and three distinct 16:9 prompts. A *prompt* is not an image. On failure, regenerate ONLY the SEO metadata/prompt document; NEVER modify approved script or run Step5 again. Score and file SHA do not measure click rate or retention.
