---
name: viet-seo-mexico-celebrity
version: "1.1.0"
language: vi
publish_language: es-MX
description: "STEP6: exact-title SEO on QA READY Spanish Mexico celebrity documentary: two alternates, honest thumbnail ABC, 8-second visual hook, fact-safe packaging."
---
# SKILL — SEO / THUMBNAIL SAO MEXICO V1.1

**V1.1 bắt buộc:** Đọc `references/V11_UPGRADE_NOTES.md` và shared contract trước khi chạy. Phát hiện RUN đầu Pedro Infante là bộ test regression bắt buộc, nhưng không phải dữ liệu sự thật cho các tập sau.

## 0. Exclusive role
Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/MEXICO_SEO_PACKAGING.md`, `references/THUMBNAIL_DNA_AND_PROMPTS.md`. STEP6 ONLY, no rewording of script, no changing locked title, no accusations unsupported in approved script.

## 1. Required source and checks
Require `LOCKED_TITLE`, latest actual original/revised `FULL_SCRIPT*.txt`, `QA_FINAL.json` `status=PASS_READY` on same SHA256 and score>=97, full source register. If QA file stale or earlier file hash mismatches, BLOCK; don't produce ready-to-publish SEO from unauthorized version. **BẮT BUỘC V1.1:** Chạy `python scripts/mexico_tools.py qa-check-strict --dir <episode_delivery_folder>` trước SEO. `seo-check` V1.0 chỉ là compatibility check, KHÔNG đủ làm release gate.

## 2. EXACTLY 12 output items
1. `PRIMARY TITLE` — byte-for-byte user-locked, es-MX, never edit.
2. `SUPPORTING TITLE 1` — original verified angle, ≤100 characters.
3. `SUPPORTING TITLE 2` — alternative keyword framing, ≤100 characters.
4. `VIDEO DESCRIPTION` — Spanish: 2-line hook, 2–4 grounded summary paragraphs, relevant attribution, careful disclosure/methodology, 1 CTA, real source/credits section.
5. `HASHTAGS` — 3 to 5 meaningful hashtags (specific name + genre + documentary).
6. `TAGS` — 15–25 relevant Spanish search phrases, avoid misleading gossip terms.
7. `PINNED COMMENT` — thoughtful audience question that does not prejudge allegations or invite harassment.
8. `THUMBNAIL A` — main face + evidence-safe inset, bold es-MX text (headline and subline), full English image prompt.
9. `THUMBNAIL B` — visual alternate angle and new short Spanish text, full prompt.
10. `THUMBNAIL C` — strongest documented career reversal frame, new short text, full prompt.
11. `WINNING THUMBNAIL` — A/B/C choice and factual/legibility rationale, no claim CTR is proven.
12. `8-SECOND VISUAL HOOK` — single original 8-second video-generation shot plan or multi-cut sequence, voiceover es-MX ≤20 words, no fabricated interview/audio or identity-swap evidence.

## 3. Thumbnail DNA
Compositional reference to sample corpus: 16:9, near-photorealistic editorial collage, recognizably depicted public figure using properly licensed photo or explicitly identified illustrative depiction, main portrait right ~40%, secondary public image/neutral concrete object in yellow-outlined circular inset left, thick yellow arrow pointing to documented clue; deep burgundy/dark background; bold condensed yellow headline with black stroke 3–5 Spanish words; small white secondary hook 4–9 Spanish words. High contrast, mobile readable. Avoid unsupported private-scene composites, fake courts/medical records, humiliating transformation, fake pregnancy/divorce documents, fake tears, false "proof".

## 4. SEO safety and truth
No invented screenshot, death cause, secret child, diagnosis, criminal act, divorce or motives. Sources included as actual URLs, not generic `fuentes en la descripción` placeholder; only quote authorized short passage. If source not available, output draft with `SOURCE_LINKS_MISSING`, not publish ready. Avoid combining actor's face with unrelated fabricated arrest imagery.

## 5. Final
Export `SEO_PACK.md`, optionally 3 exact image-generation prompts (not rendered thumbnails unless user separately requests actual images), and one 8s original cinematic teaser prompt. Keep `PRIMARY TITLE` exact. Include QA fingerprint/SHA checked status. End without automatic next-step.
