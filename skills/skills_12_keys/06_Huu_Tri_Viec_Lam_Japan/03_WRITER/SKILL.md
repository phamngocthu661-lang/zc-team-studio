---
name: viet-kich-ban-japan-kuchikomi
version: "1.1.0"
language: "vi"
display_name: "Japan Senior Kuchikomi — Three Stage Script / One Repair"
description: "STEP3 viết narration Nhật 7 PART/30 口コミ, A/B/C persist và STEP5 sửa đúng một lần theo QA frozen; không chấm QA."
---
# JAPAN KUCHIKOMI WRITER — DRAFT OR ONE-REPAIR

## Mandatory
Read `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/OFFICIAL_FACT_SOURCE_RULES.md`, `references/JAPANESE_VOICE_WRITER.md`, `references/THREE_STAGE_AND_REPAIR.md`. Pick exactly one mode: `step3=DRAFT_THREE_STAGE` or `step5=ONE_REPAIR_PASS`; never combine. No SEO, no official QA self-rating, no new outline.

## STEP3 DRAFT_THREE_STAGE
Input title & outline locks, `OUTLINE.md`, all 30 review blueprints and `source_type`. Draft in natural, age-respectful ja-JP, no Vietnamese prose in narrated body. Third-person voice transitions and first-person narrator vignettes as appropriate; each one distinct enough that audio-only listeners can tell them apart.

Three physically persisted UTF-8 files:
- **A** writes `## PART 1` (#01–04) and `## PART 2` (#05–08), ending newline. If cold open, embed it as content of 口コミ01 not duplicate #1.
- **B** writes `## PART 3` (#09–12), `## PART 4` (#13–16), `## PART 5` (#17–20), ending newline.
- **C** writes `## PART 6` (#21–25), `## PART 7` (#26–30), ending newline.

Each numbered header format `口コミ01：...` at start of line through `口コミ30：...`, exactly once. Body: real speech with concrete decision and consequence, not listicle bullet filler. Avoid the same pattern “最初は...しかし...結局...” 30 times. No bracket TTS cues by default. Label fictional reconstruction in separate preface/description transparently; don't tack disclaimer repeatedly into every review.

Default narrated body count 10,500–13,500 Japanese readable characters excluding headings/numbers. Verify after actual persistence via `scripts/pipeline_guard.py assemble`; if too short, revise the draft stages (not QA repair pass) before making immutable baseline. Full script must equal A+B+C exact bytes; if A/B/C mismatch, stop, never claim saved.

## STEP5 ONE_REPAIR_PASS
Input frozen QA `QA_FROZEN.json`, exact original full script, `REPAIR_PATCHES.json`. Execute once; may correct multiple authorized local snippets for logic, Japanese spelling, particles, numerals, timing, role consistency. **Do not rewrite entire segment.** Use `repair-once` guard and produce `FULL_SCRIPT_REVISED.txt` + `REPAIR_PROOF.json`. The guard refuses proof overwrite/re-entry and only patches exact old excerpts authorized in QA ledger. Preserve title, 7 parts, 30 IDs, voice register, length within bound; no newly added 31st review. If QA marks 0 issues, skip repair entirely.

Writer never sets `QA_FINAL=READY`. Hand off to independent QA `step4-post`; if it fails, stop no second automatic revision.

## Output report
State exact file paths, hashes, voiced characters, 7 Part/30 review count, review range per stage and allowed next action. Do not claim source interviews or verified regulations without real evidence.

## V1.1 first-run correction
Do not spend the first 15–20 seconds on generic exposition: start with concrete conflict from an existing 口コミ, then promptly truthfully disclose fictional reconstruction. Write varying emotional outcomes that honor the locked STORY_SIGNATURE_MATRIX. Aim for 11,800–12,600 voiced Japanese chars, keep hard gate 10,500–13,500. Writer must document why repeated boss consultation is unavoidable, if used in >8 plots. Before baseline lock run `editorial-diagnostics` and resolve suspicious repetitions in the DRAFT phase (does not consume the one allowed post-QA repair). During STEP5 only one exact-patch attempt permitted; each frozen patch must include `review_id`.
