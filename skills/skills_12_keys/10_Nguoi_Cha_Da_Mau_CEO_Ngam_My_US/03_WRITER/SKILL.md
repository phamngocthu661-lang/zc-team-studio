---
name: viet-kich-ban-black-dad
description: Write complete US English scripts from locked Black Dad outlines; at S5 make at most one complete QA-scoped repair preserving all other bytes.
---
# SKILL 3 — WRITER V2 (S3 DRAFT OR S5 SINGLE_REPAIR)

Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/WRITER_STYLE.md`, `references/HOOK_RETENTION_SPEC.md`, actual S2 full outline and S2-frozen `02_hook_contract.json`. `DRAFT` and `SINGLE_REPAIR` are mutually exclusive modes. Do not write script during S1/S2.

## S3 — DRAFT
Write one coherent original en-US narration body in `03_draft.txt`, 6,500–8,000 words default. No headings, chapter markers, outline headings, spoken metadata, production notes, unrequested CTA or stock phrases. If generation requires A/B/C segments, concatenate in order with verified overlap and real file count before declaring complete.

**Measured first 90s**: calculate actual start positions of COST/CLUE/QUESTION and outline-specific early events. At 150 WPM they must start <=225 words (if 90s). If a required action first appears at 600 words, revise **during drafting before saving the canonical draft** or mark S3 FAIL; do not pass a knowingly broken draft to S4. Do not reveal secret ownership via narrator while claiming it remains viewer mystery. If identity is intentionally known to audience, use dramatic irony consistently.

**Emotional/retention craft**: Show father decisions under time and childcare pressure, one human face of the damage, meaningful diverse social interaction, antagonist's legitimate options, a midpoint hypothesis change, a personal setback with a choice that costs something, and an independently verified payoff. Every ~4–7 minutes new decision or consequence, not another prose explanation of accounting. Distinct dialogue voices; no facile stereotypes, generic moral monologues, overlong bureaucratic back-and-forth or 50-minute serialized padding. POV consistency; strong last image tied to father's changed behavior.

Persist accurate manifest (UTF-8 raw SHA, bytes, characters, regex words, revision_count=0, outline version, spoken language). Self-QA never declares editorial 98 or `PUBLISH_READY`.

## S5 — SINGLE_REPAIR (exactly ONE pass)
Input actual immutable original, initial independent QA and frozen `04_repair_contract.json`, revision_count=0. BEFORE applying any change ensure all related dependencies were included in contract and each `exact_before` is unique. If not, STOP for a contract clarification **before** the repair pass; do not start a cascade of retries. Replace approved scopes in one cumulative operation, write `05_revised.txt`, manifest + ledger and byte-exact reconstruction proof. Never paraphrase unflagged paragraphs or quietly fix another defect. ONE revision only (even if 3 replacements within one file). If final QA fails, only human-authorized NEW production version can initiate writing again.

## Truthfulness
Do not invent file verification, narrator runtime, continuity proof or successful repairs. Report incomplete if output under target, or unverifiable if no filesystem. Retain locked title/POV/canon unless a formal new version is approved.
