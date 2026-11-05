---
name: seo-thumbnail-trailer-drama-familiar-mexico
version: "1.3.0"
language: "vi"
description: "STEP 6 — QA-READY-only Spanish Mexico title/SEO metadata, exactly 2 secondary titles, 3 truly distinct 16:9 thumbnails and a 10–30-second Omni teaser grounded in verified 7-Part full story."
---
> **V1.3 FIRST PRIORITY (includes V1.2):** Load `references/FAMILY_DNA_LOCK_V1_2.md` before creative generation, enforce first-person older Mexican mother/grandmother, direct family betrayal, her consequential decision, and 7-Part 70k–80k-character manuscript. Follow V1.2 supplemental reference(s) below; do not override user-locked titles.

# SKILL 5 — SEO / 3 MINIATURAS / OMNI TRÁILER (ES-MX)

## Publication gate — never skip
Own STEP6 only. Load shared contract, controller, this SKILL and all references (`SEO_DNA_MEXICO.md`, `THUMBNAIL_VISUAL_PLAYBOOK.md`, `OMNI_TRAILER_SPEC.md`, `PUBLISH_OUTPUT_TEMPLATE.md`, `SEO_QA_GATE.md`). Require exact full persisted source and the **most recent** independent QA frozen READY for THAT source SHA; source file SHA, body SHA, title + outline identity and score ≥98 must match. Call `scripts/verify_seo_ready.py` with `--script`, `--qa-frozen`, `--title`, `--outline-file`; controller separately verifies recency/version history. Tool gate is technical, NOT fact checking of proposed SEO sentences. No QA READY / missing actual file => blocked, not publish-ready metadata.

## Outputs: complete 12-item publish pack
1. `VIDEO_ID` + source SHA + exact 7-Part source confirmed, `SEO_GATE` PASS with tool JSON summary.
2. `PRIMARY_LOCKED_TITLE`: exact es-MX LOCKED_TITLE, cannot rewrite a character.
3. `SECONDARY_TITLE_A`: original title alternative ≤100 chars, supporting only.
4. `SECONDARY_TITLE_B`: a second distinct title alternative ≤100 chars, supporting only. Exactly two, not four or five.
5. `SEO_DESCRIPTION`: 90–160 Spanish words as a strong default; compelling factual hook and protagonist's emotional dilemma, one next-action open loop, no ending spoilers, no fabricated incidents, no hashtags/icons in description by default, no "historia real" without proof.
6. `SEO_TAGS`: comma-separated Spanish keywords, targeting 480–500 **Unicode characters including separators and spaces** and MUST be ≤500; no hashtags, no spam or competitor channel names, first 3–5 tags match exact topic and characters. If can't reach 480 naturally, relevance beats padding and report true count.
7. `HASHTAGS`: 0–3 relevant, separately and only if desired (`#HistoriasDeFamilia #TraiciónFamiliar #MadresValientes`); avoid claiming tags are mandatory for reach.
8. `THUMBNAIL_HYPOTHESES` three differing click promises with what script evidence supports each.
9. `THUMBNAIL_PROMPT_1`: single original cinematic photorealistic 16:9 artwork, protagonist 60+ prominent, readable face/action, one evidence object, distinct framing/emotion.
10. `THUMBNAIL_PROMPT_2`: separate image, visually meaningfully different camera/foreground/setting, same title context, not a collage.
11. `THUMBNAIL_PROMPT_3`: separate image, contrasting third emotional staging; can depict mid-conflict, discovery or aftermath, but must not reveal false secret.
12. `OMNI_TRAILER_10_30s` with 4–6 timecoded shot beats, original Spanish voiceover, on-screen text, ambient sounds/music direction, spoiler-free end CTA. Add final `FACT_LOCK / PUBLISH_QA` checklist under #12.

## Content positioning
Audience: Mexico Spanish adults, often parents/grandparents concerned with dignity, family financial exploitation, manipulation and rebuilding boundaries. Avoid shallow all-caps SEO spam and misleading legal certainty. SEO primary keywords draw from actual script's family relationship and real offense: `madre`, `hijo`, `nuera`, `consuegra`, `casa`, `escrituras`, `cumpleaños`, `herencia`, `humillación`, `límites`, `respeto`, `relatos familiares`. Never inject `juez`, `veneno`, `millonaria`, `Monaco`, `narcotráfico` if not in script.

## Thumbnail strategy
User's example video shows stable portrait of an older woman with B-roll/waveform/subtitles. This is video-frame evidence, NOT a confirmed competitor thumbnail image. Our thumbnails should be individually generated, no collage, 16:9 true (e.g., 3840×2160 or 1920×1080). The 3 prompts must differ by 40–60% in framing/secondary architecture/prop/light/emotional staging but **retain the core title event**. Keep woman physically adult/older with realistic facial features, no Hollywood caricature. If rendering Japanese text is an unrelated project, do not import 6-line typography requirement here.

Options for thumbnail overlay: short authentic Spanish phrase 2–6 words in bold high contrast where readable; if actual generation struggles with typography, suggest text-free photorealistic render then edit overlay in CapCut. Don't claim perfect embedded typography. Do not imply three generated images were created when only three prompts were supplied. Respect user-specific `no text` request when stated.

## Trailer
10–30s, 4–6 escalating microshots: affront quote, visible evidence, emotional response, physical decision, consequence hint and cliffhanger. Do not reveal the entire family secret; don't rely on footage that hasn't been generated; prompts can be used in later production. Voiceover must be native es-MX, short enough for plausible speech rate.

## Packaging QA
- Exact locked title; 2 supporting titles only; all title lengths counted; description/tag claims cite precise Part/scene in editorial side notes; no narrative ending spoilers.
- 3 prompts = 3 separate images, not contact sheet; distinct framing and visible human agency; contrast for mobile.
- Trailer is grounded and consistent with scripts, no real-person defamation; ad-friendly; no false realism claim.
- Report exact tag char count verified if script run, otherwise UNVERIFIED. Technical verification does not certify CTR, views or SEO ranking.
- On successful Step6, no next-step suggestion.

## V1.1 promise-integrity / thumbnail hook alignment
Before producing 3 separate prompts, retrieve source's actual offensive act and the earned *consequential decision* from the final script. Align image hypotheses to (1) exact relational injustice, (2) emotional contrast between elder and preferred relative, (3) just-before-decision collision; three variants must not all show someone looking at a phone or deed. Thumbnail can imply an upcoming change but must NEVER depict a legal power/reveal not in P6. Secondary titles must independently pass the V1.1 two-score editorial logic as plausible packaging hooks (but PRIMARY stays immutable). Stronger hook is an editorial hypothesis, not validated uplift.

## V1.2 — MOTHER-CENTERED FAMILY PACKAGING
Read `references/MOTHER_FAMILY_PACKAGING_LOCK_V1_2.md`; preserve locked primary title and QA-ready source. Three separate thumbnail prompts must depict the SAME older Mexican mother/grandmother's family wound, relationship contrast and own concrete choice, never unrelated poor-worker, millionaire or child-rescue visuals. 2 secondary titles still require niche gate. Omni Trailer uses older woman's first-person voice, accurate specific confrontation, no invented phone-call/judge reveal. Never advertise 30–45 minutes based solely on 70k–80k characters.

## V1.3 — A/B/C VISUAL HOOK DIVERSITY & FACT LOCK (MANDATORY)
Read `references/SEO_THUMBNAIL_VARIETY_V1_3.md` after V1.2. Confirm the original technical QA frozen READY and editorial `DRAMA_QUALITY_V1_3: PASS` for EXACT same current script SHA before packaging for publication; do not alter the SHA-based frozen JSON format. Three 16:9 thumbnail hypotheses must differ in question shown: (A) family betrayal, (B) inequality between relatives, (C) mother facing an earned consequential choice. Distinct visuals, same characters/canon; don't replace the story with a poor-person rescue or unearned judge surprise. Only claim 3 IMAGES rendered if actual image files exist; otherwise label prompts only. Keep existing 12-item output contract and two secondary titles.
