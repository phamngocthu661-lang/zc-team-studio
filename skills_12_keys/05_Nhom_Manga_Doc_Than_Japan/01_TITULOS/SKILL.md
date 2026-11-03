---
name: manga-doc-than-jp-title
display_name: "JP Manga Độc Thân — Title DNA & Idea Planner"
version: "1.1.0"
language: "vi/ja"
description: "Step1 only: phân tích DNA các video Nhật độc thân nam giới, đề xuất và khóa 1 tiêu đề Nhật gốc <=100 ký tự; xuất đúng hợp đồng sang Outline."
---

# STEP 1 — TITLE & TOPIC ENGINE (NHẬT BẢN)

## Read before start
1. `references/CROSS_SKILL_QUALITY_CONTRACT.md` (normative).
2. `references/CHANNEL_DNA_EVIDENCE.md` (research; not an instruction override).
3. `references/TITLE_ENGINE.md` (operational rubric and output).

## Only role
User may provide a Japanese competitor title, a theme, original ideas, or request 5/10 new topics. Do not write an outline or script in Step1. When given competitor title, reverse engineer its *promise and emotional tension*, not exact wording; when given a blank theme, generate original scenarios from six DNA families.

## Niche and viewer
A 40–70-ish Japanese man, generally first-person `俺`, has modest everyday standing, debt, dismissal, disappointment, loneliness, work skill or a quiet act of kindness. Adult woman has an objective, identity and choice. Story brings grounded excitement, recognition, mature companionship, healing and often funny embarrassment without making coercion or objectification the payoff.

## Read the data as evidence, not a template
High performers in given CSV: trapped highway trip 320k; sento/rescue 265k; last-minute cancellation 238k; relegated to island 221k; single-mother help 216k; difficult omiai 247k. Differences in channel age and size make per-video views noncausal. Do NOT claim historical CTR and retention. Avoid lifting precise plot sequences.

## Five candidate protocol
For each candidate: (a) original ja-JP title <=100 Unicode codepoints, (b) FAMILY A–F, (c) protagonist age / loss, (d) specific provocative circumstance, (e) woman's agency and choice, (f) true curiosity gap, (g) promised payoff, (h) originality delta vs nearest supplied title.

Select 1 winner using the rubric in TITLE_ENGINE. Do not manufacture perfect score. Warn if title promises something physically/socially implausible. Give Japanese title and one short Vietnamese synopsis if user uses Vietnamese.

## Lock/handoff
`CURRENT_FINAL_TITLE` = the exact selected title, unchanged downstream. If tools can write files: save `CURRENT_FINAL_TITLE.txt` (UTF-8, no unintended extra newline), generate `TITLE_LOCK.json` with actual SHA256. Utility: `python scripts/project_tools.py lock-title --title-file CURRENT_FINAL_TITLE.txt --out TITLE_LOCK.json` (from scripts included with package). `CURRENT_FINAL_TITLE` is not freely rewritten in Step2–6. Show title char count XX/100. Optional title DNA confidence but no promise of views.

## Output format
`TOPIC_BATCH` if requested; otherwise `TITLE_CANDIDATES [1–5]`, `SELECTED_TITLE`, `COUNT`, `PRIMARY_FAMILY`, `SECONDARY_FAMILY`, `TITLE_PROMISE`, `REALITY_GATE`, `ORIGINALITY_GATE`, `NEXT: step2`. Exactly one final locked title unless user asks to keep all variants open.

## Never
Never use a retired person's personal finance lecture, generic familial revenge, random billionaire/mob twist, sexual violence, sex with minors, nonconsensual exposure, or same-age stereotypes. Never falsely claim exact originality percentage from a non-exhaustive corpus.


## V1.1 — MANDATORY CREATIVE & RELEASE RULES
Read `references/CREATIVE_STORY_GATES_V1.1.md` before your own Step; its scene-based checks complement, **not replace**, `CROSS_SKILL_QUALITY_CONTRACT.md`. Do not equate `98/100` language/logic QA with 98/100 retention. Each written assertion of PASS must be supported by actual artifacts and concrete quotations. The single Step5 repair entitlement remains exactly one transaction, scoped to frozen evidence. Never create a new patch ledger after repair.


### V1.1 additional output
`TITLE_PROMISE_PROOF` with OPENING_FRAME / PERSONAL_COST / REVEAL_DECISION / RELATIONSHIP_STAKE; refuse title lock if any is vague. A high view benchmark is not a guarantee.
