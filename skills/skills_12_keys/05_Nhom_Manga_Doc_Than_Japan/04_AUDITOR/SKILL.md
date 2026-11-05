---
name: manga-doc-than-jp-qa
display_name: "JP Manga Độc Thân — Independent QA (Logic & Japanese)"
version: "1.1.0"
language: "vi/ja"
description: "Step4: kiểm định độc lập logic, continuity, ngữ pháp/chính tả tiếng Nhật; xuất đúng 1 ledger sửa; sau Step5 chỉ verify read-only, không cho vòng sửa thứ hai."
---

# STEP 4 — INDEPENDENT QA ONLY, ONE REPAIR ENTITLEMENT

## Mandatory reading
`references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/QA_ONE_PASS_PROTOCOL.md`, `references/JAPANESE_LANGUAGE_AND_LOGIC_CHECKLIST.md`. Read full title, outline, canon, seven Part script; no inspection by snippets alone. Reviewer never authors manuscript replacement text.

## Exactly ONE authorized repair
Allowed state sequence:
```
DRAFT_FROZEN -> QA_INITIAL -> [READY_WITHOUT_REPAIR OR LEDGER_FROZEN]
LEDGER_FROZEN -> WRITER_STEP5_REPAIR_APPLIED_ONCE -> QA_FINAL_READ_ONLY
QA_FINAL_READ_ONLY -> [READY_FINAL OR BLOCKED_ONE_PASS_EXHAUSTED]
```
No second `LEDGER_FROZEN` on same baseline, no rewrite by QA, no recursion and no 'repair round 2'. If no major issues, Step4 issues READY with no Step5 needed. Only Writer Step5 can execute the single scoped repair.

## Priority scope (user instruction)
**First** check real-world story logic and continuity: who knows what, timelines, ages, names, employment authority, transport, money, medical/accident plausibility, objects and setup/payoff. **Second** Japanese proofreading: incorrect kana/kanji, particles, verb inflection, unnatural honorifics, time expressions, duplicated characters, unnatural TTS voices. Third minimal format checks. Do not consume repair budget on purely decorative style preferences. No needless broad rewrites or replot.

## Pass order — no skipped Parts
1. **Preflight:** persist exact baseline SHA256, verify Title/Outline identity, `[PART 1]..[PART 7]`, readable char count from real bytes, explicit speaker labels.
2. **Full read #1 — causality:** P1..P7, track timeline, core objective/obstacle, who decides, why consequences follow, emotional evolution, mystery setup/payoff and promise fulfillment. Record quotes with nearest Part and line.
3. **Full read #2 — Japanese language:** every speaker utterance checked for Japanese correctness; verify written name/term and honorific consistency, particle grammar, lexical sense, spelling (誤字・脱字), punctuation and subtitle/TTS readability. No fabricated complete coverage claim; read all Parts.
4. **Edge check:** first/last 5 dialogue turns of every Part and bridging logic, especially mid-point and final reveal; check consent and heroine agency.
5. **Deductions and severity:** rubric independently scored; P0, P1, P2, P3 defect list, exact evidence, minimal authorized byte windows; freeze ONE ledger if repairs needed.
6. **Final post-repair:** read final exact revised script, verify repair proof, independently recompute score, enforce no outstanding P0/P1 and no prohibited changes; issue READY or BLOCKED, but NEVER authorize second fix.

## Rubric 100
Logic & causality 35; continuity / canon 20; Japanese proofreading 25; natural dialogue/honorifics 10; format/title promise/voice comic 10. Editorial target 98; real defects deduct demonstrably. E.g., critical impossible plot P0 may zero publication readiness regardless score. A 98 score cannot override a single P0/P1.

## Severity
- `P0` fatal: impossible core mechanism, fact fabrications that break story, major consent violation or title deception.
- `P1` severe: impossible character knowledge, unearned climax, wrong chronology, major language error reversing meaning, inconsistent ages/jobs/family ties.
- `P2` repairable: specific misused kanji/particles, misaddressing with cumulative impact, prose continuity slips.
- `P3` optional: punctuation/flow no change to meaning. P3 usually excluded from ledger.

## QA output, machine-readable when possible
`QA_REPORT.md`, `QA_REPORT.json` (baseline SHA, counts, 7-Part evidence matrix, score deductions, severity), `FROZEN_QA_LEDGER.json` containing sorted exact UTF-8 byte spans and hashes. Do not add replacement text in ledger. Use helper script to freeze real original hashes and spans. After Step5: `FINAL_QA_RESULT.json` with `repair_attempts_used:1`, `final_script_sha256`, `score`, `open_issues`, `status:READY_FINAL|BLOCKED_ONE_PASS_EXHAUSTED`.

## No-fabrication rule
Script introspection and SHA must be from the real complete file if runtime supports it. If text is truncated or only summary provided, report `BLOCKED_MISSING_MANUSCRIPT`, not 100/100 or READY. No independent QA certification by Writer or SEO.


## V1.1 — MANDATORY CREATIVE & RELEASE RULES
Read `references/CREATIVE_STORY_GATES_V1.1.md` before your own Step; its scene-based checks complement, **not replace**, `CROSS_SKILL_QUALITY_CONTRACT.md`. Do not equate `98/100` language/logic QA with 98/100 retention. Each written assertion of PASS must be supported by actual artifacts and concrete quotations. The single Step5 repair entitlement remains exactly one transaction, scoped to frozen evidence. Never create a new patch ledger after repair.


### V1.1 output distinction
Always state `TECHNICAL_INTEGRITY`, `LOGIC_AND_JAPANESE_QA`, `CREATIVE_EDITORIAL_STATUS`, and `THUMBNAIL_VISUAL_STATUS` independently. Score 98 on its 100-point grammar/logic rubric does not certify pacing or Japanese native editorial review. Exact 1 repair remains unchanged.
