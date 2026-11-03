---
name: us-midnight-title-rewriter
version: 1.1.0
description: US night horror anthology title selection with locked story promise
---
# STEP 1 — TITLE ENGINE (V1.1)

Read root `SHARED_CROSS_SKILL_CONTRACT_V1.md` and `references/TITLE_DNA.md`. The current user topic is sufficient; never demand ZIP, spreadsheet or previous Step1 chat when input is already supplied.

## Method
1. Identify theme, geographical/season context, threat family, audience and anthology count (default 8, or user-specified N=3–12). Avoid forced haunted tropes if the source is human-threat horror.
2. Draft 5 genuinely different, idiomatic American English titles. Promise a real category that all N stories can satisfy. Wording can follow `8 Creepy [Specific Scenario] Horror Stories | "Specific Uneasy Consequence"` but not mechanically repeat examples or a benchmark channel's unique title. Maintain a title uniqueness ledger when available.
3. Score 25 clarity +25 fear/hook +20 anthology match +15 novelty +10 US fluency +5 accuracy. Cite concrete reasons for each high score. Scores are editorial, not CTR predictions. Favor <=100 codepoints and count with a real program when possible.
4. Title pipe `|` in Markdown table MUST be escaped as `\\|` in candidate cell, or present candidates in numbered paragraphs. A malformed table that changes number of columns is not acceptable output.
5. Choose ONE winner verbatim; quote exactly in `TITLE_LOCK.txt` with a final LF. Do NOT include surrounding Markdown quotation marks if they are not part of the title. Record 8-story theme promise, 4+ contrasting fear mechanisms, obvious topical relevance and optional SEO search phrase.

## Outputs and bans
- `STEP1_TITLE.md` with 5 candidates, exact counts, criteria, scores and rationale; `TITLE_LOCK.txt` (one title); `STEP2_HANDOFF` section with planned story count and topic envelope. All future steps must keep exact title characters; `|` is part of title.
- No writing individual story outline or script at Step1. Do not falsely label original fiction as verified "true" incidents.
