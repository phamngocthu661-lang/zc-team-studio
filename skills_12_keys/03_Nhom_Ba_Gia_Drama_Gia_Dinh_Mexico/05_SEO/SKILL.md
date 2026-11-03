---
name: seo-thumbnail-mexico-dona
version: "1.1.0"
language: "vi"
display_name: "Publish pack — es-MX SEO and 3 thumbnail prompts"
description: "Mexico Doña family drama: Publish pack — es-MX SEO and 3 thumbnail prompts. Part of five-skill six-step locked production workflow; uses es-MX content and single repair batch."
---

# MEXICO SEO & THUMBNAIL — STEP6

## Read order
SKILL.md, CROSS_SKILL_QUALITY_CONTRACT.md, MEXICO_DONA_STORY_DNA.md, SEO_THUMB_ENGINE.md, verified latest manuscript, exact TITLE_LOCK.json and QA_FINAL.json. If QA isn't READY on this exact script, hard block.

### Prerequisite gate
`python scripts/mexico_pipeline.py seo-gate --script FULL_SCRIPT_REVISED.txt --qa QA_FINAL.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --repair-proof REPAIR_PROOF.json --out SEO_GATE.json`
If no repair occurred, use `FULL_SCRIPT.txt` instead and OMIT `--repair-proof`. The matching source manifest and title lock remain mandatory. QA must match SHA and score≥98 and no remaining issues. Never invent a QA READY token.

### Deliver exactly
- `LOCKED_TITLE` exact, <=100; **two additional optional titles** <=100, not replacing lock.
- Es-MX short SEO description anchored to real 7-Part scenes, no main twist spoiling; custom CTA/question; no invented facts.
- Tag string <=500 chars aiming relevance; 3–5 hashtags separately.
- **Three** differentiated 16:9 thumbnail prompt variants A/B/C (not image files), each with exact physical Spanish text lines, portrait of Mexican older woman on right, heavy contrast dark/navy/white/yellow/cyan, clear props and readable text; recommended text 3–6 rows adjusted to mobile readability, **not mandated Japanese 6-line template**.
- One recommended variant with hypothesis, risk notes, 10–30sec visual opener optionally; never promise CTR performance.

Finally save actual `SEO_PUBLISH_PACK.md` with `script_sha256`, `QA_FINAL.json` hash, original title hash, and all deliverables. Audit written titles via `len()`; do not exceed caps.

## V1.1 Strict SEO + TTS
Step6 requires **both** `QA_FINAL.json` schema `MXF_INDEPENDENT_QA_FINAL_V1_1` and its exact `QA_EDITORIAL_EVIDENCE.json` (SHA matches). Run `seo-gate ... --editorial-evidence QA_EDITORIAL_EVIDENCE.json`. After gate succeeds, run `tts-export --script FULL_SCRIPT_REVISED.txt --qa QA_FINAL.json --out FULL_SCRIPT_TTS_CLEAN.txt` (for unrepaired story use the original verified script). Three thumbnail A/B/C concepts remain mandatory; renders are separately audited at phone width. See `references/SEO_THUMB_ENGINE.md`.
