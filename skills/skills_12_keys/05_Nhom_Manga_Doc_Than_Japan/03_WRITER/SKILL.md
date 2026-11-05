---
name: manga-doc-than-jp-writer
display_name: "JP Manga Độc Thân — Writer + One-Pass Repair"
version: "1.1.0"
language: "vi/ja"
description: "Step3(A/B/C) viết 7-Part kịch bản voice manga ja-JP trong 3 lần; Step5 sửa đúng 1 lần theo ledger QA đã khóa; không chấm QA."
---

# STEP 3 + STEP 5 — TWO EXCLUSIVE MODES

## Prerequisite references
Read `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/CHANNEL_DNA_EVIDENCE.md`, `references/WRITER_PROTOCOL.md`; at Step5 also read `references/ONE_PASS_REPAIR.md`. If conflict: user explicit instruction > exact locked title > shared contract > this skill > craft/examples.

## MODE A: STEP3 `DRAFT_THREE_STAGE`
Read locked exact title and outline/canon. Draft only specified stages:
- `step3(A)` = `[PART 1]`, `[PART 2]` in `PARTS_A.txt`.
- `step3(B)` = `[PART 3]`, `[PART 4]`, `[PART 5]` in `PARTS_B.txt`.
- `step3(C)` = `[PART 6]`, `[PART 7]` in `PARTS_C.txt`.

Do not summarize, truncate or skip scenes. Persist to exact UTF-8 files. On C, assemble all seven once; run deterministic validation and show file proofs. No fresh plot invention contradicting canon. If prior stages unavailable, request exact files rather than pretending to continue them. The Writer does not issue QA score or READY.

### Writing craft
High-level Japanese first-person `俺` narrator with manga cast dialogue. Natural Japanese punctuation, stable honorifics, occasional light comedy, meaningful silences, no bloated inner monologues or moral lectures. Anchor every scene in a physical action/object. At most 2 paragraphs of explanation consecutively without changing interpersonal action. Adult female character must have work/home ambitions and independent decisions; mutual respect as romantic tension. Avoid fetishizing age, mistaken touching, accidental exposure as repeated devices. Keep each reveal paid off by previous facts; no magical paperwork, miraculous medicine, sudden billions.

### Readable character count
Hard 13,900–16,300 after removing `[PART N]` headings, speaker prefixes and optional leading emotion markers, and *all whitespace*. Punctuation and quoted dialogue count. This convention is for validation, not a perfect TTS timing measurement. Tool `python scripts/project_tools.py check-script --script FULL_SCRIPT.txt` prints exact counts and part order. No zero-count outputs allowed. Actual story text on each line begins `@ore:`, `@heroine:` etc. Use `@narrator:` only for meaningful narrator voice, not file metadata.

## MODE B: STEP5 `ONE_PASS_REPAIR`
Triggered only after Step4 produced an independent frozen ledger tied to the baseline full script SHA. Read original + full report + canon; repair only evidence-backed P0/P1 logic/continuity and confirmed Japanese typo/grammar/unnatural honorifics. Writer fills replacement strings for the exact frozen UTF-8 byte ranges. Run `python scripts/one_pass_repair.py apply --baseline FULL_SCRIPT.txt --ledger FROZEN_QA_LEDGER.json --replacements REPLACEMENTS.json --project-dir PROJECT_DIR` exactly ONCE, then present `FULL_SCRIPT_REVISED.txt` and proof. It refuses another repair if proof already exists. Don't rewrite unaffected Parts, don't claim QA PASS, don't reset score.

## Exact step5 ordering
1. Freeze full baseline hash and QA report; do not silently rebase.
2. Review all defects and select smallest contiguous byte ranges covering full lines/paragraphs to fix.
3. Replace in-place in single complete patch plan; no iterative `repair→review→repair` loop.
4. Verify unmodified byte segments identical, seven Parts, body length, format.
5. Return to independent QA for read-only final validation; unresolved serious issue => BLOCKED, no second attempt.

## Output
`STEP3_STAGE`, `PARTS_COUNT`, `READABLE_CHARS`, `SHA256`, `FULL_SCRIPT_PATH`, `DRAFT_PROOF`; or `STEP5_ONE_PASS_USED: TRUE`, `FIXED_IDS`, `REPAIR_PROOF_PATH`, `VALIDATION`, `NEXT: step4 final verify`.


## V1.1 — MANDATORY CREATIVE & RELEASE RULES
Read `references/CREATIVE_STORY_GATES_V1.1.md` before your own Step; its scene-based checks complement, **not replace**, `CROSS_SKILL_QUALITY_CONTRACT.md`. Do not equate `98/100` language/logic QA with 98/100 retention. Each written assertion of PASS must be supported by actual artifacts and concrete quotations. The single Step5 repair entitlement remains exactly one transaction, scoped to frozen evidence. Never create a new patch ledger after repair.
