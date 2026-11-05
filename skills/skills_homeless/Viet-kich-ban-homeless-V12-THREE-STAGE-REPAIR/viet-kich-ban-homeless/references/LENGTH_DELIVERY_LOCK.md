# LENGTH + DELIVERY LOCK — V1.6.9 — SHARED CONTRACT (THREE-STAGE FILE-FIRST)

This reference must be read with `CROSS_SKILL_QUALITY_CONTRACT.md` and `EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`. The strictest current enforcement wins over older length wording.
## 0. COUNT PROOF IS NOT OPTIONAL
Read `EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md` first. A textual instruction to count is not enough: the workflow must actually execute a deterministic character count on the exact final body and retain hash/count proof. If it cannot, full-script output is blocked.

Any mutation after counting — including a punctuation change, title/body merge, patch insertion, or formatting rewrite inside the body — invalidates the count and requires a fresh count.



## 0A. DELIVERY SURFACE — THREE-STAGE PERSIST-FIRST V1.6.9

- `step3` is called three times by the user: A = Parts 1–2, B = Parts 3–5, C = Parts 6–7. Each call authors a real segment file and locks its hash; C assembles the full file exactly from those verified sources.
- `next`/`continue` are not commands. Do not switch silently back to ONE_SHOT_FILE.
- A/B/C may be shared as explicitly labeled PARTIAL DRAFTS even if their own character counts are below 70,000. The **full 70,000–80,000-character hard gate** is applied to the 7-Part file only after C.
- Retain all story quality, canonical continuity, retention, and forensic constraints. See `THREE_STAGE_PERSIST_PROTOCOL.md`.

## 1. DELIVERY MODE

- `step3` with no segment override: write exactly the next verified segment A/B/C and deliver its TXT link. On C also deliver a verified full TXT link after successful assembly.
- Explicit Part N outside the staged workflow: partial Part only, not a valid substitute for a scheduled segment file unless user explicitly approves changes.
- Repair request: exact baseline/approved patch ledger, verified revised TXT.

## 2. TOTAL HARD BOUNDED RANGE — REPEAT UNTIL VERIFIED
Default full script:
- **HARD MINIMUM = 70,000 characters**;
- **HARD MAXIMUM = 80,000 characters**;
- **VALID = 70,000–80,000 inclusive**;
- preferred operating zone = 74,000–78,000;
- 69,999 = FAIL; 80,001 = FAIL;
- word count is diagnostic only unless user adds a word constraint;
- user may explicitly override with a new current range.

Characters include spaces, punctuation and line breaks in script body. `[PART X]` headings are excluded consistently.

**A full script outside 70k–80k MUST NOT BE DECLARED FINAL OR PUBLISHED AS A VALID COMPLETION.** Count the exact final TXT before delivery.

## 3. DEFAULT PART PLANNING ZONES — SOFT
- P1 10,200–11,000
- P2 10,200–11,000
- P3 10,200–11,000
- P4 10,200–11,000
- P5 10,200–11,000
- P6 11,800–12,800
- P7 9,800–10,800

Passing a Part zone never excuses failing total 70k–80k.

## 4. BUDGET BEFORE PROSE
In full-script mode, lock all seven budgets before drafting/output. Use Outline V2.3 Part Budget Handoff. Older outlines are normalized to the current 70k–80k range while preserving story intent and protected functions.

## 5. UNDER-70K EXPANSION ORDER — FUNCTIONAL ONLY
Expand first:
1. cause→effect bridge;
2. practical process that changes state;
3. evidence verification/triangulation;
4. reaction/subtext that changes decision;
5. pressure/consequence/temptation;
6. human beat with later payoff;
7. chronology/legal/professional steps required for realism;
8. clue reinterpretation/payoff already supported by outline.

Never pad with repeated theme, duplicate reaction, decorative description, filler dialogue or invented twist.

## 6. OVER-80K TRIM ORDER
Trim first:
1. duplicate reaction;
2. repeated theme explanation;
3. redundant sensory description;
4. repeated clue interpretation;
5. stacked documentary/legal explanation;
6. transition padding;
7. secondary dialogue that changes no state.

Protect title promise, Early Retention payoffs, mystery/clue causality, competence/restoration, pressure, difficult choice, grand reveal, legal/physical credibility, quiet humanity, emotional callback and ending-by-action.

## 7. RETENTION + STATE REGRESSION AFTER LENGTH NORMALIZATION
Re-check first-5-minute Early Retention Survival Gate, retention-desert gap, timeline, money, object/location, knowledge, access/authority, clue setup/payoff, open loops, legal/physical causality and reveal timing.

## 8. RESPONSE-BUDGET GUARD
Create and verify one staged segment per call, instead of requiring a 70k–80k manuscript in one turn. Return the segment file link and honest segment proof. A/B/C persistence is mandatory; no claim of full completion until C successfully assembles and verifies the complete file.

## 9. FINAL OUTPUT GATE — HARD
Immediately before output, exact-check total script-body characters.

PASS only if: `70,000 <= chars <= 80,000`.

Any result below 70,000 or above 80,000 is **HARD FAIL / DO NOT OUTPUT** unless the user explicitly changed the range in the current task.

## 10. USER-APPROVED THREE-STAGE PERSIST-FIRST MODE

For `SCRIPT_MODE=THREE_STAGE_PERSIST`, follow `THREE_STAGE_PERSIST_PROTOCOL.md`. This overrides legacy One-Shot and INLINE delivery wording **only** regarding routing/delivery; all hard narrative quality/length gates remain active for the final assembled script.
