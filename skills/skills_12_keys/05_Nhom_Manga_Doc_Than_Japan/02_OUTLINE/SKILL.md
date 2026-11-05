---
name: manga-doc-than-jp-outline
display_name: "JP Manga Độc Thân — Seven-Part Outline Architect"
version: "1.1.0"
language: "vi/ja"
description: "Step2 only: giải mã TITLE LOCK, thiết kế outline manga voice comic 7 Part có retention, canon Nhật, logic nghề nghiệp/quan hệ và handoff cho Writer."
---

# STEP 2 — OUTLINE ENGINE

## Mandatory references
Read `references/CROSS_SKILL_QUALITY_CONTRACT.md`, `references/CHANNEL_DNA_EVIDENCE.md`, `references/OUTLINE_HANDOFF.md` before constructing any blueprint.

## Input
Exact `CURRENT_FINAL_TITLE` / `TITLE_LOCK.json`, Family A–F and any user constraints. If title cannot be fulfilled without an implausible event or disrespectful romantic conduct, mark `TITLE_SERVICEABILITY_BLOCKED`, propose minimal title reconsideration to Step1, do NOT silently change title.

## Seven-part causal architecture
1. **OPEN INCIDENT — 0–3 min**: open in unusual real-world moment; explain immediate problem briefly; plant primary question and man’s vulnerability.
2. **CONSTRAINT / TRUST — 3–9 min**: establish daily life, woman's autonomous goal, concrete obstacles, initial bond under plausible boundaries.
3. **FIRST COST / TURN — 9–15 min**: previous action creates cost; hero chooses to help/withdraw, female makes an independent action; new evidence changes interpretation.
4. **MIDPOINT REFRAME — 15–21 min**: undo viewer's first understanding; reveal only a *partial* secret, prove it with object or decision; a harder moral dilemma follows.
5. **RELATIONSHIP RISK — 21–28 min**: trust or reputation jeopardized; no random break-up from withheld information if one natural sentence would resolve it.
6. **CLIMAX BY ACTION — 28–36 min**: irreversible choice; gain caused by earlier skills/alliances/paperwork, not sudden fortune; heroine contributes independently.
7. **AFTERMATH / MUTUAL HOME — 36–42 min**: material consequences, consent and realistic timeline; return to the opening object/image with changed meaning; end on action not sermon.
Time positions approximate; final running time must be measured from actual TTS. Parts fixed seven, whether family is romantic/comedy/workplace.

## Title promise anchors
Extract protagonist's age/job, adult woman's age/relationship if known, triggering locale/object, initial injustice, suspense line, actual transformation, credibility landmines. Lock in `PROMISE_TABLE` with planned proof and payoff part. Every surprise must have at least one prior setup. Every major loop closed by Part7.

## Make the characters act, not merely explain
Hero: competency + flaw + specific personal boundary + practical sacrifice. Heroine: want independent of man + decision + consequence. Secondary characters not generic villains; realistic authority, finances and occupation. Respect Japanese hierarchy and speech levels. Avoid use of `先輩`, `課長`, `社長` inconsistently; preserve ages and timeline.

## Mandatory output schema
`TITLE_LOCK`, `DNA_FAMILY_MAIN`, `DNA_FAMILY_SECONDARY`, `VIEWER_PROMISE`, `STORY_CORE`, `CHARACTER_BIBLE`, `SEVEN_PART_OUTLINE` with target readable char budget each, `RETENTION_MAP` (question/change of state every 4–6 min), `SETUP_PAYOFF_LEDGER`, `CANON_STATE_MATRIX`, `JAPANESE_REALITY_GATE`, `TTS_VOICE_ROSTER`, `END_ACTION`, `FINAL_OUTLINE_SELF_CHECK`.

## Handoff
Save actual file `CURRENT_FINAL_OUTLINE.txt` and `OUTLINE_LOCK.json`; tool `python scripts/project_tools.py lock-outline --title-lock TITLE_LOCK.json --outline CURRENT_FINAL_OUTLINE.txt --out OUTLINE_LOCK.json`. Hash only actual files. If no filesystem, show text template but mark pending. Next step exactly `step3(A)`.

## No other roles
No script prose, final QA, repair or SEO in Step2. No baseless 98/100 claim.


## V1.1 — MANDATORY CREATIVE & RELEASE RULES
Read `references/CREATIVE_STORY_GATES_V1.1.md` before your own Step; its scene-based checks complement, **not replace**, `CROSS_SKILL_QUALITY_CONTRACT.md`. Do not equate `98/100` language/logic QA with 98/100 retention. Each written assertion of PASS must be supported by actual artifacts and concrete quotations. The single Step5 repair entitlement remains exactly one transaction, scoped to frozen evidence. Never create a new patch ledger after repair.


### V1.1 gate before publishing outline
Do not save `OUTLINE_LOCK.json` until `CREATIVE_PREFLIGHT_PASS: TRUE` with Part-by-Part stakes and manga shot map. Report 8-gate evidence, explicit weakest Part and pre-lock improvement. This is outline planning, not a second Step5 manuscript repair.
