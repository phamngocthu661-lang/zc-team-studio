---
name: escritor-y-reparacion-drama-familiar-mexico
version: "1.3.0"
language: "vi"
description: "STEP 3 three persisted ES-MX narrative segments A/B/C (70k–80k exact codepoints), and STEP 5 only QA-scoped immutable-byte repair, with verified title+outline identity."
---
> **V1.3 FIRST PRIORITY (includes V1.2):** Load `references/FAMILY_DNA_LOCK_V1_2.md` before creative generation, enforce first-person older Mexican mother/grandmother, direct family betrayal, her consequential decision, and 7-Part 70k–80k-character manuscript. Follow V1.2 supplemental reference(s) below; do not override user-locked titles.

# SKILL 3 / 5 — ESCRITOR DE DRAMA FAMILIAR MÉXICO

## Ownership split
This is ONE SKILL in two mutually exclusive modes:
- **STEP3 / THREE_STAGE_PERSIST:** write wholly new seven-Part long-form in Spanish Mexico, only one requested A/B/C segment at a time, then verify and assemble.
- **STEP5 / QA_SCOPED_REPAIR:** modify ONLY exactly frozen, user-approved UTF-8 byte windows; output revised full file + proof; never recalculate QA score or claim publication READY.
Must load bundled `references/SHARED_CROSS_SKILL_CONTRACT_V1.md`, bundled `references/MEXICO_FAMILY_STEP_CONTROLLER_V1.md`, and all references (`MASTER_SCRIPT_ENGINE.md`, `THREE_STAGE_PROTOCOL.md`, `CONTINUITY_AND_LOGIC_GATES.md`, `REPAIR_PROTOCOL.md`, `PART_CHECKLIST.md`). Never co-run both modes. No title/SEO/outline edits.

## Long-form specifications
- Produce natural, compelling, first-person **Spanish Mexico** story unless user explicitly approves a project scope exception; an outline alone may not silently change niche. The final listener hears ONLY the actual narration and dialogues, not technical labels, screenplay shot directions, outline annotations, sound effects or filler text.
- 7 Part headings exactly `[PART 1]` ... `[PART 7]` standalone; no chapter title text adjacent to headings.
- Body must be **70,000–80,000 Unicode codepoints inclusive**, preferred 74,000–78,000; whitespace, punctuation, accents, dialogue, line breaks count. Only heading lines+their newline are omitted by verifier. Segment endpoints terminate with LF and no BOM.
- A: P1–P2 desired 20,500–22,500; B: P3–P5 desired 30,500–32,500; C: P6–P7 desired 22,500–23,500. Always check full result rather than declaring targets met from estimates.
- Narrator is an older adult woman (typically 60–75), human rather than all-knowing; give her a distinct job, weaknesses, relationships, stubbornness, small routines and choices. Family members behave as people, not evil speech machines. Script respects exact locked title's promise.

## STEP3 writing procedure
1. Re-open exact user-approved `OUTLINE.txt`, locked title, title/outline hashes and CANON. If mismatch, block, don't patch title silently. Obtain current stage manifest via `segment_workflow.py inspect` for B/C. Read prior genuine stage content, NOT just stage summaries.
2. For A, map every scene planned for P1/P2; for B/C, review what was actually established in earlier Parts. Make private pacing map before prose. Only write the Part numbers belonging to requested stage.
3. Start P1 with the inciting quote/event **within 200 body chars**, verifiable clue by 450, immediate stakes by 750; micro-payoffs by 1,300 and 5,000. Don't burn the first minutes on channel salutation, biography or CTAs.
4. Each 900–1,800 chars on average, make substantial progress: discovery, decision, obstacle, change of allegiance, concrete next action, withheld truth narrowed by evidence. Natural breathing space is allowed; this is NOT a rigid line count.
5. Each scene executes protagonist goal, resistance, meaningful choice, changed material/emotional status and carry-forward tension. Don't restate exposition in new words.
6. Use lived Mexican Spanish: `me contestó`, `recámara`, `escrituras`, `notaría`, `recibo`, `consuegra`, `pensión`, `colonia` where relevant. No `vosotros`, `vale`, `piso` for apartment; avoid forced folkloric stereotypes or random named state facts.
7. Silent cast/continuity check after every Part: who knows what and why, dates, currency (MXN if specified), unpaid invoices, keys, papers, positions, rooms, ages, address, relatives, realistic travel and legal powers.
8. Save complete real prose to canonical `MXF_<title_sha12>_SCRIPT_A.txt`, then B/C; use Python tool (`segment_workflow.py`) to stage with exact `--outline-file`, no fake proof. Do not overwrite locked earlier segment or fabricate its contents.
9. After C, assemble EXACT concatenation of A+B+C bytes, check real `verify_full_script.py`, save manifest. A length failure means repair stage source honestly before claiming full passed; do not offer Step4 while failed.

## STEP5 repair procedure
Requires real frozen QA `NOT READY`, exact `QA_REPAIR_CONTRACT` from QA-owned byte windows, approved scope, canonical original baseline and unchanged outline. Writer authors replacement prose ONLY for approved zones; no touch to protected strong spans. Use scripts with `REPLACEMENTS.json` and `--user-approved` only after actual explicit user authorization. `apply_authorized_patches.py` must confirm copied immutable spans byte-for-byte, source hash, heading preservation, range compliance and revised SHA. Return revised file and proof; next Step4 independent full review. Never use Step5 to rewrite P1–P7 from scratch or erase a defect without addressing its root cause.

## Story quality standards
- More compelling than a reference through original character contradictions, credible consequences and precise Mexican details—not by raising abuse or violence levels.
- The narrator sometimes misreads a motive or must admit an old mistake; never rewrite the antagonist as secretly good without earlier evidence.
- A private decision should precede public vindication. She must **choose**, not wait for an attorney to materialize and deliver a speech.
- A debt, house, deed, marriage, property or custody outcome must obey known facts and plausible authority, with waiting/verification shown when needed.
- No high-pressure plea to subscribe in P1. A brief non-intrusive CTA after substantial payoff or at end is optional only if outlet style asks for it; avoid faux AI prompting voice in final scene.
- No first-person switch to names/other minds without framing by documents or witness accounts. No word salad from automatic transcripts.
- TTS-friendly punctuation, varied sentence lengths, short evocative paragraphing, everyday dialogues with appropriate `usted/tú` and accents. No all-caps narrative.
- Emotional closure is shown by a meal, visit, key placement, changed family routine, paid bill or boundary enacted; no 2,000-char philosophical sermon after final turning point.

## Final checks
Run Part checklist and `scripts/verify_full_script.py` after C or Step5. Always provide exact file path, full and body SHA, precise codepoint count and PASS/FAIL from tools. If tooling is absent, label claims UNVERIFIED. Success sentence from controller, no next suggestion on failure.

## V1.1 narrative quality gate before technical save
Mandatory additional reading: **`references/EMOTIONAL_RETENTION_ENGINE_V1_1.md`**. Writer must implement exact `TITLE_HOOK_BRIEF` and `PROMISE_OWNERSHIP_MAP` handed by Outline. The first five thousand codepoints require real family contrast and **active micro-consequence**; a discovery alone is not a payoff. Never 'answer' title through a retrospective summary or a magically convenient piece of paper. For each Part require a new irreversible choice, a believable cost, distinct antagonist adaptation, and a meaningful partial answer to an open loop. In P6 the title's action must happen **on stage**. P7 aftermath shows real conduct change and ambivalent feeling. A technically valid 75,000-char script that repeats one family argument or lacks a strong reversal must be treated as **EDITORIAL NOT READY**, never sent as finished quality merely because length passes.

## V1.2 — MATRIARCH NARRATIVE & ACTUAL PAYOFF
Read `references/MATRIARCH_FIRST_PERSON_STORY_V1_2.md`, Step2 `NICHE_CANON_LOCK` and `PROMISE_OWNERSHIP_MAP` for EVERY A/B/C segment. Narrator first-person Mexican older mother/grandmother throughout. Write the son's/daughter's FAMILY choice, not a stranger saving a poor person. Every Part must change family power/information/cost; mother must drive literal title-tail payoff in Part6 and emotional choice in Part7. If `firma` is in the title, the document's authority/history and 7-day timeline must be causally seeded. Do not deliver a vague `llamada` ending or generic `todos lloraron`. Keep all V1.1 code/CLI/byte guards intact; exact full body 70,000–80,000 characters, no 30–45min approximation.

## V1.3 — LIVE SCENE ENGINE / ANTI-FILLER (MANDATORY)
Read `references/SCENE_DRIVEN_RETENTION_V1_3.md` and the new Step2 maps before each A/B/C segment. Every substantial scene must execute `DESIRE → RESISTANCE → CHOICE → COST → STATE_DELTA`; do not pad 70–80k characters through repeated insults, monologues or recollections with no current consequence. Verify P4 changes the mother's theory, P6 dramatizes exact promised collision, P7 shows emotional price as changed behavior. On each Part check three successive dialogue/rumination scenes and require a *different purpose*; fix before persisting. If story is weak, declare `EDITORIAL_NOT_READY` even when `verify_full_script.py` passes. Keep unchanged segment/hash/byte repair tools and 7-Part contract.
