---
name: seo-mexico
version: 1.1.0
description: "Step6 final Spanish Mexico YouTube SEO for an independently QA-approved 7-Part rural hacienda audio drama, including locked title, two secondary titles, tags, description, three distinct 16:9 thumbnail prompts, and factual Omni trailer hooks."
---

# STEP6 — SEO + THUMBNAIL + TRAILER · HISTORIAS DEL CAMPO V1.1

**Only after current exact script is QA READY.** Read `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/THUMBNAIL_DNA.md`, `references/SEO_11_SECTION_TEMPLATE.md`. Never rewrite title or story, never borrow sample competitor's channel identity.

## Preconditions and proof

- Inputs: `FINAL_TITLE.txt`, approved `FULL_SCRIPT.txt` or `FULL_SCRIPT_REVISED.txt`, `FINAL_OUTLINE.md`, `QA_REPORT.json` and `WORKFLOW_STATE.json` when available.
- Verify `QA_REPORT.status == READY`, score ≥97, no hard fails, `QA_REPORT.script_sha256` matches **this** script, `video_id` matches; if doubt, call `scripts/mexico_pipeline.py ready` or block. Initial or post-repair READY both valid.
- Read **entire** script and create `FACT_LOCK`: characters / kin / clothes if described / concrete visible props / actual place / year / pivotal moral choice / evidence / twist / what NOT revealed in packaging.

## EXACTLY 11 sections — one response and file

1. **PRIMARY LOCKED TITLE:** unchanged Spanish string, length check.
2. **SECONDARY TITLE A/B:** exactly two varied Spanish options for manual packaging test, NOT a change to primary locked title; no fabricated hook.
3. **KEYWORD STRATEGY:** primary 1–2 phrases and secondary 5–10 natural es-MX queries, no weak keyword stuffing.
4. **SYNOPSIS SHORT:** 70–110 Spanish words, no climax spoiler, fact-based.
5. **LONG DESCRIPTION:** first 160 characters promise emotional conflict; 180–300 Spanish words total; one natural CTA + fiction disclaimer, no spam.
6. **HASHTAGS:** 3–5 relevant, Spanish/ASCII tags if platform; no unrelated niche.
7. **YOUTUBE TAGS:** 18–28 comma-separated, target total within YouTube 500-character budget; avoid name `Cuentos del Viejo Campo` unless user's own channel actually uses it.
8. **THUMBNAIL STRATEGY:** `1 human conflict + 1 crucial prop + 1 rural context`, choose real scene; 2–3-word visual question; no spoiler.
9. **THUMBNAIL A/B/C PROMPTS:** 3 independent image prompts, one 16:9 frame each, no collage, photoreal cinematic 1930s-1960s Mexico (specific locked year), props/ages/clothes consistent. A conflict, B empathy, C proof/reveal; one sentence Spanish text optional; encourage no text when generative lettering unstable. Include `negative prompts` no cartoons/modern phone/unrelated faces/duplicate people/watermark.
10. **OMNI TRAILER / VISUAL HOOK:** 10s primary (2–4 shots) + optional extension to 20/30s, real screenplay beats only; motion+shot order+sound atmosphere but no invented lipsync/voice quotes, one shot at a time, stable faces/clothes.
11. **PUBLISHING FACT CHECK:** title–script–thumbnail–trailer mapping, QA hash, age/children count, spoilers, es-MX grammar, exact 2 secondary titles, tags budget, release status.

## Thumbnail & image render policy

If the production platform has a working image generation tool **and user requested actual rendered thumbnails**, render three standalone 16:9 images A/B/C in the same workflow. One prompt/one image per version; do not fake rendered files. Otherwise deliver **complete generation prompts**, not claim images already exist. No need for a separate thumbnail skill.

## Strong SEO example principle

Bad: `La verdadera historia que te hará llorar, la viuda más pobre del mundo, dueño de millonaria hacienda escondió millones` (overpromise).
Good: `Ella llevó agua al peón herido, aun cuando el pozo se estaba secando...` only if the script actually contains the injured worker, water and dry well.

## End-of-step

Export `SEO_PACKAGE.md` and optional `seo.txt`, A/B/C thumbnail prompts as independent text assets, trailer prompt. State `SEO_READY=TRUE` only after all 11 parts and proof check. If no live metrics, don't assert `vidIQ 100`, CTR estimate or exact viral potential.


## V1.1 — SEO package complete gate and packaging integrity

- Before publishing, run `ready --script APPROVED_SCRIPT --report QA_REPORT.json --state WORKFLOW_STATE.json` for the exact QA report **including its frozen report digest**; READY from QA is not proof SEO exists.
- After producing `SEO_PACKAGE.md`, run `check-seo --seo SEO_PACKAGE.md --script APPROVED_SCRIPT --report QA_REPORT.json --state WORKFLOW_STATE.json`. `seo_ready` is only true after this passes all 11 numbered sections, exact locked primary title, script-hash proof, A/B/C actual distinct thumbnail prompts, trailer 10/20/30-second labels and the 18–28 tags/≤500 chars budget.
- Each thumbnail prompt must be one **script-evidenced visual moment** in one 16:9 frame (no legible made-up last-page confession, gold, invented flames or false kin); prefer a visible face+real evidence+emotion rather than generic text block. If image is not rendered, explicitly call it a prompt only.
- Trailer shot duration is a **creative plan**, not measured video. Flag TTS timing as estimated until user hears real narration. Don't claim measured CTR, virality or keyword rankings from metadata alone.

**Formatting for automated publishing gate:** headings `## 01.`…`## 11.`; supporting title lines `**A.**` and `**B.**` exactly; three thumbnail prompts `**A —` / `**B —` / `**C —`; tags on first content line beneath section 07. See `SEO_11_SECTION_TEMPLATE.md`.
