# PADRE MX V1.1 — SHARED CROSS-SKILL PRODUCTION CONTRACT (NORMATIVE)

## System compatibility
Use the same 5-owner / 6-step routing of HOMELESS V12 (not as an extension to the old Homeless Project). Own five separate skill roots with `SKILL.md`, `VERSION.txt`, `references/`, and optional `scripts/`. A script is Spanish Mexico first person, 7 Part, UTF-8 LF; production artifacts persistent and SHA-verified; never invent existence or checksums.

| Command | Sole Owner | Allowed work | Forbidden |
|---|---|---|---|
| step1 | Title | 5 researched premises, pick and lock title | Outline or script |
| step2 | Outline | 7-Part story, canon, proof plan | Change primary title |
| step3 (A/B/C calls) | Writer DRAFT | Draft A=Parts1–2; B=Parts3–5; C=Parts6–7 then assemble | Self-certify READY |
| step4 baseline | QA AUDIT ONLY | Independent logic/continuity/es-MX/orthography review, freeze defects and authorized byte intervals | Edit any prose |
| step5 ONE TIME | Writer REPAIR | Exactly one authorized surgical correction; must keep all other bytes unchanged | 2nd edit, broad literary rewriting |
| step4 postrepair | QA AUDIT ONLY | New independent audit of revised exact hash, publish READY or BLOCKED | Reopen repair cycle |
| step6 | SEO | Package title/facts/three thumbnail A/B/C concepts | Change canonical title or add false scenes |

A `step4` after Step5 is **verification, not a second correction**. If it fails, status `BLOCKED_FINAL_NO_MORE_REPAIRS`; operator may initiate a new VIDEO VERSION with a new approved outline/script, but cannot pretend the original episode has remaining edit attempts. Do NOT re-label a second rewrite as "polish", "microfix", "QA auto repair", "punctuation only" or "round 1b". Under no circumstances shall SEO override readiness.

## Content DNA / culture
Genre: elderly father/grandfather 60–80+ subjected to family betrayal; morally earned self-respect, evidence, calm strategy, proportionate consequences, humane payoff. Spanish `es-MX` from first-person male protagonist `yo`; target Mexican adults 40+. Use everyday speech and realistic intergenerational relationships. Source sample contains Spain/English-US language; use ONLY conflict mechanics, never copy text/dialogue/names/identical fact patterns.

Mexico markers, only if plot requires: pesos mexicanos/MXN, colonia, casa de interés social, escritura pública, notaría, Registro Público de la Propiedad, IMSS/ISSSTE, pensión, juzgado familiar, abogado, acta de nacimiento, ejido, cuenta bancaria, and city neighborhoods. Legal and medical claims are narrative-specific research questions, not automatic universal powers. Never assert that a father can freeze another adult's account, annul a deed or confiscate assets by placing one call absent real authorization/contract and process. No crime-as-instruction details.

## Immutable identity
- `CURRENT_FINAL_TITLE`: exact es-MX text, ≤100 Unicode code points (spaces/punctuation included); no silent renaming.
- `title_sha12`: SHA256(exact UTF-8 title) first 12 lowercase hex chars.
- `CURRENT_FINAL_OUTLINE`: exact UTF-8 LF TXT with 7-Part canon; `outline_sha256`: SHA256(outline bytes).
- `video_id`: SHA256(title + literal LF + outline_sha256) first 16 lowercase hex chars.
- Real A/B/C segments and V2 `SCRIPT_MANIFEST.json`: prefix `PMX_<title_sha12>`; exact bytes assembled A+B+C. Avoid source reconstruction from chat memory, never change previous locked stages.
- 7 standalone headings `[PART 1]` ... `[PART 7]`; script body Unicode codepoints after removing ONLY exactly those heading lines including their line endings: 70,000–80,000 inclusive, preferred 74,000–78,000. A/B/C source complete; no placeholders, no TODO, no meta commentary. 70–80k is inherited from V12 as a *workflow standard*, not a claim that all competitor videos are the same duration.
- Segment stage/assemble scripts are correctness gates for exact bytes and length, not voice/audio/story quality engines.

## QA standards and ONE repair limit
Official 100-point rubric:
1. Hook/title promise and credible injury (10)
2. Logical causality, motivation and setup/payoff (20)
3. Timeline, ages, money, evidence and ownership continuity (20)
4. Mexican legal/medical/professional/physical realism (15)
5. es-MX idiom, spelling, accents, grammar, TTS clarity (15)
6. Father agency, character consistency and ethical consequences (10)
7. Retention, pacing, emotional closure and earned outcome (10)

Independent audit reviews all 7 Parts, logging exact quotes for factual errors. `READY` requires QA score ≥98, 7-Part length PASS, ALL hard gates PASS, ZERO actionable issues, and actual QA hash bound to current script. Score alone is never enough. Prioritize detection of logic, name inconsistencies, chronology, causation, ownership, legally impossible changes, typos, punctuation, unnatural es-MX. Optional creative enhancement goes in separate advisory notes, never in repair contract.

`QA_FROZEN` (`PADRE_MX_QA_FROZEN_V1`) `repair_round=0` or `repair_round=1`; `round=1` only with real, hash-bound `PADRE_MX_WRITER_REPAIR_PROOF_V1`. First not-ready may only authorize Step5 for classifications: LOGIC/TIMELINE/MONEY/MOTIVATION/KNOWLEDGE/ACCESS/LEGAL/PHYSICAL/NAME/CONTINUITY/ORTHOGRAPHY/GRAMMAR/PUNCTUATION/ES_MX. Never authorize novelty/pacing/expansion style edits; if there are non-fixable craft failures, BLOCK and version a rewrite separately.

Repair contract (`PADRE_MX_QA_REPAIR_CONTRACT_V1`) defines zero-based UTF-8 half-open byte zones `start_byte,end_byte` with exact SHA, anchor, affected Part and patch IDs, all consistent with original source and QA. No zone touches heading or ANY portion of a protected-strong quote, even partial overlap. ONE replacement per zone, applied together in exactly ONE user-authorized `step5`; `FULL_SCRIPT_REVISED.txt` with immutable unchanged bytes and `REPAIR_PROOF`. Never overwrite baseline, frozen QA, contracts, or proofs; use versioned paths. Writer never self-scores; QA must independently recheck revision. `--user-approved` is operator assertion, not cryptographic verification of user identity.

## SEO truth lock
Require exact READY QA file hash for current source with score≥98; if repair_round=1 require exact repair proof. Original primary title fixed; add exactly two supporting alternative titles each ≤100 chars, never silently replace locked title. Concise es-MX description without hashtags if requested; keyword tags useful and non-spammy under 500 characters if user requirement; hashtags optional separate. Three thumbnail A/B/C concepts each 16:9 and one clickable 2–4 sentence scene hook; do not claim images were rendered if only prompts were produced. Packaging must match scripted scenes; don't infer title promise from thumbnails alone.

## Authority / precedence
User's explicit requested step > this shared contract > `PADRE_MX_STEP_CONTROLLER_V1.md` > owning skill `SKILL.md` > owning references. No mixing with HomeLess/Mafia content DNA. Keep one step per request. If tool/file unavailable report actual blocker; never fabricate hashes, source counts, transcripts, claims of 98/100, images or A/B tests.


## V1.1 — Mandatory independent evidence / chronology QA gate (regression 2026-11-01)
- `freeze_qa.py` now rejects QA reviews without a 7-category rubric whose item totals **equal** the reported score and stay within individual maxima.
- Each of the seven `reviewer_evidence` entries MUST include an `anchor` exact source quote (>=18 chars) from its own Part and meaningful `logic` and `es_mx` notes. A seven-Part summary written from a remembered outline is insufficient.
- Each review MUST include `chronology: {reference_year, ages:[{name,age,anchor}], events:[{type,subject,year,anchor}]}`. The `anchor`s must be quoted from the actual script. List the narrator aged 60+ and at least one separately aged younger family member (required), then every other explicitly aged family member, and every birth/pregnancy flashback with a date inferred from nearby prose. Explicitly calculate child birth-year range from age at narrated date; check conception/pregnancy year is not later.
- `narrative_consistency.py` flags a pregnancy mentioned after a later year in the same paragraph (e.g., Daniel 41 in 2026, a 1986 paragraph then 'Teresa quedó embarazada de Daniel'). Such a warning must become an actionable `TIMELINE/CONTINUITY` finding or have a >=40-character reviewer explanation citing an exact alternative chronology passage; **never silently set READY**. Ambiguous time references are editorial risks, not proof of a medical fact.
- PASS from `freeze_qa.py` verifies that the supplied reviewer observations are traceable, not that the reviewer is independent or the manuscript is artistically superior. Review all 7 Parts for age, dates, money, legal rights, motivation, knowledge, grammar, local Spanish, punctuation and voice.
- At the post-repair `step4`, unresolved defects => `BLOCKED_FINAL_NO_MORE_REPAIRS`. DO NOT run `step5` twice; create a new VIDEO VERSION for revised content. Score 99/100 does not override a verified contradiction.
- Creative quality is a **separate editorial gate**: title promise by first meaningful scene; escalating costs and relationship changes every Part; an observable consequence and irreversible choice by Part 5/6; emotional payoff visible in the last Part; no repeated lecture/moral exposition, no miraculous hidden millions, no empty paperwork-only climax. If the story fails this gate, create a NEW VERSION from Outline/Writer; do not disguise a broad rewrite as a permitted one-time typo repair.

- SEO V1.1 `validate_seo_package.py` must be run on the saved final Markdown after `verify_seo_ready.py`. Tags target 450–500 characters; 2 secondary titles, three thumbnail prompts, three exact scene quotes and locked title must pass. SEO content-only regeneration is permitted, but manuscript edits are prohibited.
