---
name: viet-seo-mexico
version: "1.1.0"
language: "vi"
description: "S6 SEO + thumbnail/trailer Mexico es-MX only after exact QA_FINAL READY SHA; primary title locked + 2 alternates; 3 distinctive 16:9 thumbnail A/B/C concepts and prompts, metadata and 10/20/30s trailer."
---
# S6 — MEXICO SEO + THUMBNAILS + OMNI TRAILER (READY-ONLY)

## 0. Scope & read
Mandatory `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/MEXICO_MARKET_DNA.md`, `references/SEO_METADATA_ENGINE.md`, `references/THUMBNAIL_VISUAL_DNA.md`, `references/TRAILER_AND_OUTPUT_TEMPLATE.md`. Read actual complete final script and `QA_FINAL.json`, locked exact title, outline. Do not SEO an unaudited draft.

## 1. Evidence-first publication gate
Verify:
- Exact `CURRENT_FINAL_TITLE.txt` unchanged and `QA_FINAL.title_sha256` matches.
- Exact final script is the version that QA read. `QA_FINAL.script_sha256` equals actual bytes; `QA_FINAL.status=READY`, `qa_score>=97`, no blocking issues, `repair_count` 0 or 1.
- `QA_FINAL` confirms complete full read, logic & spelling sweeps and original issue checks if repaired. If missing, S6 BLOCKED regardless of attractive title.
- Run `python scripts/workflow_tools.py seo-gate --title-file CURRENT_FINAL_TITLE.txt --script FULL_SCRIPT_REVISED.txt --qa-final QA_FINAL.json --workdir runs/<video_id>` (use original FULL_SCRIPT if repair_count=0). Do not invent successful terminal output or image renders.

## 2. FULL FINAL SCRIPT read
Extract `REAL_FACT_SUMMARY`: roles + exact city; betrayal and what occurs on screen/audio; protagonist's choice; proof object; final consequence; key emotional change; names, objects, numbers and timeframes. Do not include any scene, document, car/house/child/asset not in the script. List any unsupported packaging claim as `REMOVED_UNSUPPORTED`.

## 3. PRIMARY TITLE LOCK + exactly TWO alternatives
`PRIMARY_TITLE`: EXACT S1 lock, never auto-rewrite. `ALTERNATE_A` and `ALTERNATE_B`: 100 Unicode chars or less, plausible original story angles, es-MX native phrasing, no new facts. Provide character counts and one-line click rationale. Supporting titles are optional future A/B test labels, not authority to change locked title.

## 4. SEO outputs (es-MX unless instructions)
A. Primary + 2 alternate titles.
B. Primary keywords: 1–3 thematic phrases from actual events, not repetitive stuffing (`infidelidad`, `traición`, `mi esposo`, `divorcio`, etc. depending on story).
C. Secondary: 5–10 factual contextual phrases (`amante`, `primer amor`, `gala`, `secretaria`, `renunciar`, etc. only when present).
D. 2–4 paragraph compelling Spanish video description 160–300 words: paragraph 1 title promise and character hurt (without finale), paragraph 2 tension/evidence, paragraph 3 choice/teaser, paragraph 4 natural CTA/fiction framing if appropriate. No full spoiler.
E. 3–5 relevant Spanish hashtags, avoid #Shorts for 100-min long form.
F. 15–25 semantically varied tags comma-separated; adhere to YouTube length constraints if known/verified, not generic uploader tags.
G. YouTube chapter suggestions 7 Parts only with `00:00` for first and remaining `TBD` until rendered voice timings measured. No invented timestamp precision.
H. Pinned comment: 1 audience discussion question in es-MX, invite perspectives without shaming.
I. Thumbnail A/B/C: 3 separately usable prompts and copy texts (not one combined collage), plus recommended winner & experiment rationale.
J. Trailer/10-sec video audio hook (Spanish narration exact or paraphrased only from script).
K. 20–30-sec multi-shot video teaser prompt with continuity and no unscripted events.
L. Final factual integrity + source SHA + proof status report.

## 5. Thumbnail strategy
Study `references/THUMBNAIL_VISUAL_DNA.md`. Reference thumbnails: cinematic heroine foreground, betrayal couple behind, high contrast **yellow/white/red** Spanish copy on dark background, some cyan accents. Ensure 16:9, one powerful moment per thumbnail, heroine reaction distinct A/B/C, not 3 frames jammed together. Copy text 8–20 words default for mobile readability; competitor thumbnails use far more text, but excessive text can fail legibility. Do not lift exact model characters or copyrighted reference composition wholesale. Create 3 distinct A/B/C:
A `CONFRONTACION`: woman's reaction + betrayer in same gala/hospital/room; verbal shock/promise.
B `PRUEBA`: woman holding relevant real evidence (contract/phone/receipt), face and proof readable, minimal red signal.
C `SALIDA/PODER`: clear active exit or earned dignity/reversal, her agency central, male relegated to reaction.
- Prompt language can be English for image model with **exact Spanish text overlays** specified. If image generator cannot reliably render typography, generate background scene without text and add verified overlays in editor.
- If image tool is available AND the user requests actual thumbnails, render A/B/C as real separate 16:9 images and report exact files. If only prompts are produced, record `THUMBNAILS_RENDERED=FALSE`, never claim images exist.

## 6. Trailer 10/20/30 sec truthfulness
Propose 10s 3-shot hook and optional 20–30s 5–8-shot trailer. Each shot must match real script scene/characters/clothes/property/time, 16:9, camera action, one consistent cast/wardrobe, no random reveals not in story, no graphic violence, no intimate-photo leaks. Trailer hook should open with concrete scene, finish on one unanswered central choice. Spanish voiceover must be intelligible and not contradict title.

## 7. Deliverables and final gate
Save `SEO_PACKAGE.md` with 12 sections above, plus `seo.txt` convenient upload text, `THUMBNAIL_A_PROMPT.txt`, `THUMBNAIL_B_PROMPT.txt`, `THUMBNAIL_C_PROMPT.txt`, `TRAILER_PROMPT.txt`. Record `PRIMARY_TITLE_LOCKED`, `source_script_sha256`, `qa_final_status`, `rendered_images` true only with actual image files. Avoid external fake CTR claims. State `S6_SEO_DONE` only if package actually exists and evidence passes.

## V1.1 mandatory first-run hardening
Read `references/SEO_SCENE_AND_ASSET_TRUTH_V1_1.md` before executing this Skill. This supplemental reference is normative and takes precedence over conflicting older creative guidance while preserving existing filenames, commands and A/B/C stage contracts.
