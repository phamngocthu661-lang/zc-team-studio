---
name: wrv-us-viral-title-rewriter
version: 1.1.0
description: "Step1 women revenge US viral title engine; lock exactly one Iron Rose or Quiet Triumphs DNA and select a novel <=100-character English title."
---
# STEP 1 — VIẾT LẠI TIÊU ĐỀ PHỤ NỮ BÁO THÙ (US)

Load: `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/TITLE_DNA_AND_SCORING.md`, root `BENCHMARK_DATASET_ANALYSIS.md`.

**Input:** user seed/title/genre constraint; do not require a competitor link if given only a premise. **Output:** ONLY title set + locked winning premise; do not write outline/script.

1. Classify primary DNA: `IRON_ROSE` (female military veteran/servicewoman facing family betrayal, child endangerment, misappropriation, wrongful intimidation, military identity) OR `QUIET_TRIUMPH` (married/divorcing woman, financial control/ownership, betrayal, grounded legal or asset reversal). Never automatically introduce military scenes into finance premise or magic $1B inheritance into military one.
2. Extract story ingredients: female POV, betrayal offender + relationship, concrete trigger setting, material clue, credible agency lever, single escalating twist, moral cost, earned payoff. Outline honest mechanism in one line — no promise impossible to fulfill.
3. Create **5 genuinely different** US English clickable headlines <=100 chars including spaces/punctuation; prefer ~65–95. Mix title mechanisms rather than five copies of `Then I...`. Preserve user locked specifics.
4. Score each /100 using reference rubric. Novelty gate: do not reuse benchmark wording, exact number, protagonist names, 10+ word sequence or story premise; flag overlap. Make one primary winner and two backups; ask user to lock only if user has not selected a winner.
5. Emit `LOCKED_TITLE`, `STORY_DNA`, `CLICK_PROMISE`, `EVIDENCE_OBJECT`, `HEROINE_AGENCY`, `PLAUSIBILITY_GUARD`, `DUPLICATE_CHECK`. Count with Python `len()` when tool available; no fictitious precise numbers.

**WIN conditions:** hook within first clause, understandable without context, specific cause / result, woman owns the reversal, single question worth watching, compliant with Youtube. Do not reveal final solution in full. For military DNA, command chain does not replace police/legal procedure; for financial DNA, she only controls what she owns/is authorized to control.

**No** claims that real witnesses/records exist without source. Avoid graphic child injury descriptions in titles; family protection can carry the stakes without sensational harm.

## V1.1 mandatory before locking a title
Read `references/TITLE_PROMISE_OWNER_GATE_V11.md`. Reject title concepts which cannot carry a **non-substitutable named payoff**. Add output fields `PAYOFF_OWNER`, `OWNER_EVIDENCE`, `PAYOFF_SCENE`, `PROMISE_OWNER_GATE`, `JURISDICTION_PENDING`. If a title implies a legal result, sketch the conditions that would need to be proved; do not suggest that an exhibit automatically wins custody or property.
