---
name: viet-gian-y-japan-kuchikomi
version: "1.1.0"
language: "vi"
display_name: "Japan Senior Kuchikomi — 30 Review Outline"
description: "STEP2: chuyển locked Japanese title thành outline nguyên bản gồm 7 phần trình bày/30 口コミ độc lập, retention/canon/money consistency và budget thực tế cho giọng Nhật."
---
# STEP2 — GIÀN Ý 30 KUCHIKOMI, 7 EDITORIAL PARTS

## Bắt buộc
Đọc `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/OFFICIAL_FACT_SOURCE_RULES.md`, `references/OUTLINE_ARCHITECTURE.md`, `references/RETENTION_AND_ORIGINALITY.md`. Không viết full scripts, không thay title, không QA/SEO. Input: exact `TITLE_LOCK.json` + user topic/source nature. If title has unfulfillable numeric/legal premise, signal blocker back to Step1.

## Stage 1: Core proposition
Write a Japanese one-line `VIEWER_DECISION`: sau 30 trải nghiệm, người xem tuổi 60–70 sẽ cân nhắc gì thực tế (chọn nơi ở, tiếp tục làm, xem phiếu lương, ngân sách, cách hỏi thông tin...). `AUDIENCE_PAIN`, `COUNTER-EXPECTATION`, `PROMISED_DELIVERY`, `FAMILY=A..F`.

## Stage 2: 30 original vignettes
For each `口コミ01` through `口コミ30` include in outline:
`VOICE` (age band + gender when relevant, anonymous); `SCENE` (specific place/prop); `EXPECTED`; `ACTUAL`; `ONE_CREDIBLE_DETAIL` (never unverified scheme/legal number); `CONSEQUENCE`; `EMOTIONAL_COLOR` (shame, relief, humor, regret, discovery, gratitude); `PAYOFF/LESSON` (varied, not moral lecture); `FACT_CHECK_NEEDED`; `UNIQUENESS_SIGNATURE`.

These are 30 **independent** accounts, do not force one hero or “narrative reveals” that require unrelated strangers to coordinate. In actual narrated script reveal strongest first, emotional peak near #10/#21/#27, contrast positive and negative outcomes.

## Stage 3: 7 chapters for compatibility
Use exact `## PART 1` ... `## PART 7` and review sequence: 1–4, 5–8, 9–12, 13–16, 17–20, 21–25, 26–30. Do not assign a review twice. Provide chapter hook and bridging sentence without new character contradictions. No duplicated vignettes (different jobs, family ties, settings, choices and endings). Minimum 6 positive/agency cases, minimum 5 funny/relief cases, at least 5 contrasting viewpoints, never 30 catastrophes.

## Stage 4: Budget
Target 10,500–13,500 narrated Japanese chars inclusive spoken bridging (ideally 11,800–12,600); assign 300–440 narrative chars per review depending 30–40min target, with budget for intro/transition/conclusion. Output per-Part budget sum. If user gives exact shorter/longer runtime, calculate explicitly, mark custom profile and do not silently override default.

## Stage 5: Fact/copyright gate
- If no true testimony files: state `FORMAT=fictional reconstructions`; do not say `実際に聞いた30人` or `視聴者から届いた`.
- For pension, age pension timing, work insurance, public housing eligibility: evidence source URL+date or `VERIFY_OFFICIAL_BEFORE_SCRIPT`; no invented certainty.
- Avoid copying competitor 30 anecdotes; unique scenario fingerprint ledger.

## Output
`OUTLINE.md`: source lock, 30 review items, 7 Part, budget, stakes curve, diversity matrix, fact-check list, final `CANON`. Persist UTF-8 and run `python scripts/pipeline_guard.py outline-lock --title-lock OUTPUT/TITLE_LOCK.json --outline OUTPUT/OUTLINE.md --output OUTPUT/OUTLINE_LOCK.json` and report hash/video_id.

## Handoff
Exact unchanged title + full outline path/hash + video_id, max 30 review slots, stage A=Parts1–2, B=Parts3–5, C=Parts6–7; writer must not retcon “real testimony” or add reviews.

## V1.1 mandatory STORY_SIGNATURE_MATRIX
Before outline lock, provide a row per 口コミ: occupation, age/gender/family, signature situation, irreversible/temporary cost, decision owner, **ending mechanism**, emotion, exact title promise link and scenario fingerprint. Verify coverage of ≥6 ending types, ≥4 bittersweet/unsolved choices, ≥4 genuinely good surprises, ≥4 light/humorous turns. Do not reduce 30 stories to `problem → consult supervisor → solved`. Use reference `OUTLINE_ARCHITECTURE.md` V1.1.
