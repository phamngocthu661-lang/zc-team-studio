---
name: kiem-tra-kich-ban-japan-kuchikomi
version: "1.1.0"
language: "vi"
display_name: "Japan Senior Kuchikomi — Logic & Japanese Proofread QA"
description: "STEP4 forensic audit toàn bộ 30 口コミ, ngữ pháp/chính tả Nhật, logic/tính tiền/thời gian, lập 01 frozen patch ledger; STEP4-POST chỉ kiểm tra sau đúng 01 lần sửa. QA không viết lại body."
---
# STEP4 — KIỂM TRA LOGIC VÀ CHÍNH TẢ, MỘT LẦN CHỈNH SỬA TỐI ĐA

## Mandatory source contract
Read `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/OFFICIAL_FACT_SOURCE_RULES.md`, `references/QA_LOGIC_JP_CHECKLIST.md`, `references/ONE_REPAIR_QA_PROTOCOL.md`. Read exact title, outline, full script in full; if too long, checkpoint per chapter but don't mark READY until all 30 reviews checked. No prose changes in QA (Writer owns Step5). Do not claim numerical score alone is proof of zero faults.

## step4 (one comprehensive before-repair audit)
1. `qa-preflight` mechanistic: validates the persisted full script vs manifest, 7 Part, 30 distinct numbered reviews, real narrated count.
2. Full read pass A from #1→#30: compare **each** with outline promised facts, age/time/location/jobs/pension/payment/action/consequences. Each claim affecting decisions must either be sourced or made explicitly approximate/fictional.
3. Full read pass B from #30→#1: Japanese grammar, kanji, kana, readings, small っ/長音, particle は/が/を/に, punctuation/read-aloud, repeated lines, speaker register; search duplicates.
4. Cross-story audit: no repeated plot with swapped names; story arc has negative/positive variety and preserves specific title promise; no accidentally claiming 30 verified interviews.
5. Freeze **ALL** actionable issues once as unique exact old snippets with patch IDs, severity and reason. Prioritize logic first, spelling second. No new “improve emotions everywhere” patches. If no flaws, `qa_decision=READY` and go to post-final QA or SEO.

## QA_FROZEN JSON
Required fields: `original_sha256` exact sha256 FULL_SCRIPT, `qa_decision` (`READY`, `NEEDS_ONE_REPAIR`, `BLOCKED`), `editorial_review_completed=true`, `covered_reviews=30`, `authorized_patches` array. Patch fields `patch_id`, `category` (`logic`, `spelling`, `fact`, `continuity`), `old_text` exact unique substring, `reason`, `new_text_hint` optional. User cannot submit a vague range like "rewrite all Part3". Every patch must correct *known defect*, not invent content.

## step4-post (once only)
After Step5 one-pass repair, read entire changed passages + context, verify every QA issue solved and no unintended effects anywhere, verify factual references. Re-run mechanistic preflight. Publish `QA_FINAL.json` with:
`script_sha256`, `title_sha256`, `outline_sha256`, `status`=`READY|BLOCKED`, `editorial_verified` true only after real independent read, `blocking_issue_count`, `checked_review_count=30`, `repair_rounds` 0 or 1, and notes. If BLOCKED, stop. **Do not automatically authorize second revision.**

## Scoring (editorial aid, not gate substitute)
35 logic (time/money/identity/causality), 25 Japanese orthography/style, 20 factual truth & disclosure, 15 story diversity/retention, 5 technical format. Score ≤95 if any material logic/spelling defect. READY requires **zero known blocking issues** and exact artifact gates; never pass from score alone.

## Output in Vietnamese
Table defect ID, review number, priority, exact problematic phrase, fix target, rationale, safety/source status; total count and explicit single repair permission. After post QA show READY/BLOCKED with evidence, no hidden repeated rewrite.

## V1.1 independent QA upgrade
Use a per-review evidence matrix with quoted Japanese text; check the outline canon's speaker attributes (gender, age, partner, retirement history) against every drafted scene, not just headings. Explicitly flag repeated solution mechanisms and repeated moralizing closure. Group all approved defects into ONE frozen patch ledger with `review_id` integer, then Writer patches once; QA after repair only accepts/rejects, never opens auto-rewrite #2. Run mechanical `editorial-diagnostics` and separately review all warnings; never call its warnings actual Japanese-language QA. Report `EDITORIAL_READY`, `TECHNICAL_PASS` and `PUBLISH_READY` as three separate checks.
