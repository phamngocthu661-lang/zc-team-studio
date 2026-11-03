# JAPANESE SEO & THUMBNAIL DNA V1.0

## Evidence from supplied material
Channel 15 top thumbnails 001–012 use expressive brightly colored adult manga characters, bold top setup line and oversized bottom curiosity line, black outlines, magenta/green/yellow and speech bubbles. Channel 16 uses adult man and woman in ordinary scenes (omiai, neighbor, camper, company), reaction contrast, bold 2–4 text zones. Video frames show softer cinematic adult manga visual language with Japanese subtitles. Thumbnail and film style intentionally differ: thumbnail amplifies moment, story frames hold attention emotionally.

## Create THREE hypotheses
A (SITUATION): close scene two adults in embarrassing or difficult situation, protagonist's surprised face, heroine has purposeful action; demonstrate exact trigger.
B (DIGNITY): hero in workwear or simple jacket helps someone; meaningful prop (keys/receipt/umbrella), protagonist's kindness and small-life realism.
C (RELATIONSHIP): mutual look at turning point, heroine choice visible, warm/cold contrast, background clues grounded in plot.

Each prompt must explicitly specify:
```
16:9 landscape (1920x1080 concept), polished mature Japanese manga / colored webtoon;
identity and ages from script; outfit; unique setting; focal faces 40%+;
strong depth and light; no celebrity likeness;
2–4 Japanese text clusters positioned clear of faces;
exact JA text as selected; no irrelevant sexual tease or false spoilers;
no watermark, logo, or duplicate images.
```
If generated image has spelling errors, report and correct using an available image-edit tool if asked; do not claim exact lettering from the generator is guaranteed. Design can separate text from art and add confirmed typography in image editor later.

## Packaging checks
1. Primary title exact, 2 supporting <=100. 2. Tags <=500 by string count after join. 3. Description contains title promise and natural Japanese. 4. Thumbnails have different visual hypotheses not recolors. 5. No spoilers, no clickbait disconnected from story. 6. SEO in ja-JP; Vietnamese reports allowed. 7. Image statuses truthful and each render separate.

## Example caption styles (not a fixed wording template)
`「振り向かないで」` / `俺が選んだのは…` / `まさか、あの人が？` / `50歳独身の俺` / `「帰ってきて」` / `雨の夜の出会い`.
Check that sample text matches real script; never blindly paste each episode. Caption text should be short and anchored in an illustrated scene.


## V1.1 render-then-inspect visual QA — MUST REVIEW ACTUAL THREE IMAGES
For A/B/C, before publish, OPEN the actual final PNGs, zoom to full size and review at approx 320px phone scale. A valid PNG header or 16:9 ratio is only a TECHNICAL pass.
1. **Text exact:** transcribe visible physical caption clusters and compare to approved Japanese string; wrong kanji, missing phrase, extra labels or English/brand banners => FAIL. Proofread kanji and punctuation including 「」; font overlays must not cover eyes/faces.
2. **Event fidelity:** depict the correct **scene, month/season, props and actions**. Do not use February cherry blossoms when story says late-February cold and blossoms appear in April. Don't show a smiling couple when protagonist is startled by an urgent plea; heroine must hold the story's paper tube in A.
3. **Adult appearance:** all adults must look age-consistent (57-year-old single man and 50-year-old woman, not a young model). Keep their faces identifiable across all variants with clothing continuity where applicable.
4. **B design:** avoid decorative targeting rings, annotation-looking circles or meaningless arrows that claim importance without visual evidence. Let workwear/document/character decision communicate dignity.
5. **C design:** if promise is a secret plan, the plan itself and heroine's *active reveal* must be visible, not merely the couple's attractive faces and large text block.
6. **A/B/C distinctness:** different moment, lens/shot, action, and facial emotion, not 3 crops of the same shared character portrait.
7. **Visual balance:** text readable at mobile size, keep all major content within 5% safe margins, heads not accidentally chopped, clean type blocks 2–4, and no added logos/watermarks not requested.

If any visual check FAILS, mark `THUMBNAIL_VISUAL_QA: FAIL` and do not label FINAL. Image rerender/layout correction is not a manuscript Step5 repair; it is part of STEP6 image production, and must not secretly alter script/title. Do not fabricate success when visual review cannot be performed.

When actually reviewed, save `THUMBNAIL_VISUAL_QA.json` with each A/B/C sha256 of PNG, 6 true/false fields `exact_caption_japanese`, `actual_scene_matches_script`, `age_and_expression`, `mobile_readability`, `variant_distinct`, `no_unwanted_graphics`, and concrete `observations` >=20 chars. Do not fabricate visual inspection results. Run `scripts/release_gate.py --strict-publish` to check attestation fields and the evidence-backed `CREATIVE_GATE_REPORT.json`. This cannot independently inspect images or guarantee future CTR.

## V1.1 SEO tag quality refinement
A 442/500-character field can still be diluted by redundant synonyms; avoid padding with dozens of broad low-specificity variants. Prefer an intent-oriented group of 25–45 grounded tags (scene/location/job, adult character/relationship, exact niche, emotional promise); near-500-character target only if truly relevant. The YouTube 500-character hard limit remains unchanged. Do not assert SEO quality from character length alone.
