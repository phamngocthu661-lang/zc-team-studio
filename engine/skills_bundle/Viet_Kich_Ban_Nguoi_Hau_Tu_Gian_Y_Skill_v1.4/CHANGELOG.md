# CHANGELOG

## v1.4

Cross-skill synchronization release.

1. Added `SHARED_PRODUCTION_CONTRACT.md` as mandatory reference.
2. Standardized word target to **7,400–7,650**, soft caution 7,750, strict total `<8,000`.
3. Standardized normal release character target to **44,000–48,000**; 40,000–55,000 is only the hard recovery envelope.
4. Added explicit `TARGET-MISS` state so 49k–55k no longer silently passes as ideal production length.
5. Preserved 1:1 Outline Beat → Script Part, continuity, heroine agency, romance boundaries, TTS-clean and YouTube-safe rules.
6. Raw DNA/historical references cannot override current operational contract.

## v1.3

Strict word-lock hardening only. **No core story-writing logic was changed.**

1. Added independent release gate: `TOTAL_WORDS < 8,000`.
2. Maximum valid total is 7,999 words.
3. Exactly 8,000 words is explicitly INVALID.
4. Changed all word-fail conditions from `>8,000` to `>=8,000`.
5. Exact word counting is mandatory when a reliable counter exists.
6. Preserved the 40,000–55,000 character contract and every core DNA, outline, Part-map, continuity, causality, heroine-agency, antagonist, style, TTS-clean, YouTube-safety, climax, and payoff rule.

---

## v1.2

Length-control hardening only. **No core story-writing logic was changed.**

### Root-cause fix

1. Replaced character-estimate-first drafting with a word-first length throttle.
2. Added mandatory target of 7,600–7,800 words.
3. Added 7,900-word soft ceiling and 8,000-word absolute invalid ceiling.
4. Kept the original hard character contract unchanged at 40,000–55,000.
5. Moved the operational character target to 44,000–48,000 to create safe headroom below 55,000.
6. Added per-Part word budgets derived from outline Beat weights.
7. Added hard stop-writing stages at 80–85%, 90–95%, and 100% of each Part word budget.
8. Added Exact Count Tool Gate: when Python/code/text-count tools are available, exact word and character counting is mandatory before release.
9. Drafts over 8,000 words are invalid even before exact character count is known.
10. Output is blocked if exact characters exceed 55,000 or if any hard length condition fails.

### Explicitly preserved

11. Same outline/source-of-truth hierarchy.
12. Same dynamic Beat → Part mapping.
13. Same single-response full-script workflow.
14. Same Mafia Boss × Maid/Underestimated Woman story engine.
15. Same heroine agency, competence, antagonist motive, dual-pressure crisis, adrenaline-crash, dialogue, continuity, causality, YouTube-safety, TTS-clean, climax, and payoff rules.

---

## v1.1

Reliability upgrade focused on preventing length overruns and producing TTS-clean scripts.

### Length enforcement

1. Changed preferred working target to 47,000–50,000 characters.
2. Added 52,000-character soft ceiling and mandatory compression behavior.
3. Kept 55,000 as absolute hard ceiling; `>55,000` is explicitly INVALID OUTPUT.
4. Added mandatory pre-draft `TARGET_TOTAL`.
5. Added proportional per-Part `PART_BUDGET`.
6. Added Part stop-writing gate at ~95–100% of budget.
7. Added anti-expansion rules for repetitive dialogue, duplicated clue explanation, unnecessary subplots, repeated internal thought, and post-turn embellishment.
8. Added final `LENGTH_STATUS = PASS/FAIL` release gate; script may not be output if count is unknown or failing.
9. Added mandatory recount after compression/expansion.

### TTS cleanup

10. Removed the v1.0 rule that requested bracketed physical/audio cues.
11. Added TTS Clean Script Lock: narration + spoken dialogue + Part headings only.
12. Explicitly banned `[silence]`, `[beat]`, `[breath]`, `[glass shatters]`, `[music]`, `[pause]`, `[SFX]`, `[bell]`, camera directions, and production notes from the script body.

### Preserved

13. Dynamic Beat → Part architecture.
14. Outline/source-of-truth hierarchy.
15. Single-response full-script workflow.
16. Continuity, causality, heroine agency, technical competence, antagonist motive, and YouTube-safety rules.

---


## v1.0

Built from the supplied mafia-boss dark-romance writing prompt and aligned to the output contract of **Viết Giàn Ý Người Hầu v1.0**.

### Fixed compatibility conflicts

1. Removed fixed 8-Part architecture.
2. Added dynamic `N = DETAILED OUTLINE beat count` architecture.
3. Added strict 1:1 Beat → Part mapping.
4. Removed one-Part-per-message and `continue` flow.
5. Added single-response full-script output.
6. Changed total hard length to 40,000–55,000 characters, with 55,000 maximum.
7. Added proportional per-Part character budgeting from outline Position percentages.
8. Added title/story-core/outline priority hierarchy.
9. Added continuity ledger and knowledge-state tracking.
10. Added physical/spatial/timeline/injury/evidence causality checks.
11. Added YouTube Community/advertiser-safety guardrails for fictional crime/violence/romance.
12. Preserved core heroine-agency, competence, antagonist-motive, dual-crisis, adrenaline-crash, dialogue, and anti-deus-ex-machina rules.
