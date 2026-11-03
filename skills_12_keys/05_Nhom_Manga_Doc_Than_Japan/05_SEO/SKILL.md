---
name: manga-doc-than-jp-seo
display_name: "JP Manga Độc Thân — SEO & 3 Thumbnail A/B/C"
version: "1.1.0"
language: "vi/ja"
description: "Step6 chỉ sau QA READY: khóa title, viết SEO ja-JP, tags, hashtags, 3 thumbnail A/B/C prompts và nếu có image tool render 3 ảnh 16:9 riêng."
---

# STEP 6 — SEO + THUMBNAIL PACKAGING

## Mandatory reading
`references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/CHANNEL_DNA_EVIDENCE.md`, `references/SEO_THUMBNAIL_PROTOCOL.md`. Require a verified *final* script and `FINAL_QA_RESULT.json` or initial no-repair QA with `READY`. If no QA pass, return `BLOCKED_AWAITING_QA`, not polished package from invented story.

## Title lock
Primary title is exact `CURRENT_FINAL_TITLE` from Step1. Do not rewrite/polish the locked primary. Generate **exactly two** original supporting title options, both natural ja-JP <=100 codepoints; clearly secondary. Do not silently replace primary. Primary remains packaging winner unless human chooses otherwise through new title-lock process.

## Japanese SEO output
- Target keywords chosen from actual script: `独身男性`, `50代`, `60代`, `大人の恋愛`, `人生再出発`, `恋愛漫画`, `ヒューマンドラマ`, `感動する話`, `年の差恋愛` only if facts match.
- One compelling short description in Japanese, ~180–320 Japanese codepoints, with faithful premise, no ending spoiler, no generic fluffy template.
- Tags ~430–500 characters total comma separated (YouTube tag field has a 500-character platform limit; validator must check exact len <=500).
- 3–5 relevant hashtags (if user asks no hashtags, follow user); channel playlist suggested by main content family.
- A 12-second hook line / short video opening prompt only if requested or supports actual title premise; avoid copyrighted music.

## Three A/B/C thumbnails — not a duplicate triplet
Supply 3 distinct hypotheses and prompts for **three separate 16:9** landscape images; manga colored Japanese adult webtoon. A=awkward situation/contrast, B=quiet dignity/surprise, C=emotional second chance. Each has separate shot, expression, primary relationship, background and font placement. Default layout: 1–2 manga panels, 2–4 legible Japanese caption clusters (NOT the unrelated 6-line K1 template), thick dark outlines, bright yellow/magenta/green text, two large expressive characters, facial focus, safe margins. Exact Japanese text must be short, proofread, story-accurate and avoid fabricated images/claims. Adult outfits age-appropriate; never undress without premise/need; heroine must not appear childlike.

If current chat actually has image generation capability, render A, B, C as **three separate images** and report them; if not, deliver complete prompts and mark `IMAGES_NOT_RENDERED` — do not claim image files exist. Never fake image paths.

## Reporting
`PRIMARY_TITLE_LOCKED`, `SUPPORTING_TITLE_1`, `SUPPORTING_TITLE_2`, each count/100; `DESCRIPTION`, `TAGS` count/500, `HASHTAGS`, `THUMBNAIL_A/B/C` with short Japanese captions, compositional prompt and reason. `SCRIPT_PROOF` + `FINAL_QA_STATUS`, image rendering outcome. The SEO skill never repairs story or changes protagonist canon.


## V1.1 — MANDATORY CREATIVE & RELEASE RULES
Read `references/CREATIVE_STORY_GATES_V1.1.md` before your own Step; its scene-based checks complement, **not replace**, `CROSS_SKILL_QUALITY_CONTRACT.md`. Do not equate `98/100` language/logic QA with 98/100 retention. Each written assertion of PASS must be supported by actual artifacts and concrete quotations. The single Step5 repair entitlement remains exactly one transaction, scoped to frozen evidence. Never create a new patch ledger after repair.


### V1.1 hard separation of statuses
`SEO_METADATA.json` tied to exact SHA of FINAL_SCRIPT_JA_TTS.txt; scripts must not change here. **PUBLISH_READY requires BOTH a verified script and actual image-level visual QA for each of A/B/C plus passed independent creative review.** Run `python scripts/release_gate.py --project-dir OUTPUT` for deterministic checks, `--strict-publish` for review attestations. If missing actual full-frame inspection or creative evidence, report `TECHNICAL_PASS_PUBLISH_REVIEW_REQUIRED`, not `READY_FINAL_FOR_UPLOAD`.
