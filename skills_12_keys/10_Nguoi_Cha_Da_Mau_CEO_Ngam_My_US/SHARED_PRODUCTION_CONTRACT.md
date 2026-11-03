# SHARED PRODUCTION CONTRACT — BLACK DAD US V2.0

## 0. Compatibility and version lock
Drop-in replacement for V1: same five installed Skill directory names, `SKILL.md` entrypoints, workflow STEP identifiers (S1 Title → S2 Outline → S3 Draft → S4 Initial QA → S5 SINGLE_REPAIR if needed → S4 Final Verify → S6 SEO), controller filename, output filenames and status keys. V2 ADDS optional-for-legacy/required-for-V2 proof `04_hook_proof.json` and `scripts/validate_production.py`. Do not require users to rename existing project IDs, titles or files. V1 runs are historical and never silently retroactively altered.

Commands `start/next/status/redo` retain meaning. S5 is writer mode, NOT an extra Skill. S4 owns final reread. `redo` never authorizes an additional script revision after `revision_count=1`.

## 1. Source and authority precedence
Explicit current user instruction > persisted approved project manifest > exactly LOCKED_TITLE and approved outline canon > this shared contract > niche research/competitor patterns. None of these authorizes plagiarism, unproved analytics, imaginary file/hash, or invented real-world authority. Any change to LOCKED_TITLE or the foundational canon requires a user-approved NEW production version.

## 2. Hard identity / deliverable contracts
Persist per unique `video_id`: `01_title.json`, `02_outline.md`, `02_hook_contract.json`, `03_draft.txt`, `03_draft.manifest.json`, `04_qa_initial.md`, optional `04_repair_contract.json`, optional `05_revised.txt` / `05_revised.manifest.json` / `05_repair_ledger.json`, `04_qa_final.md` (if revised), `04_hook_proof.json`, `06_seo.txt`, `RUN_STATUS.json`.
Keep `project_id`, `video_id`, `locked_title`, `outline_version`, `audience=US`, `language=en-US` stable. If no revision is required, final script is draft, and `04_qa_initial.md` explicitly records `PASS_PUBLISH_READY`; don't create a fabricated repair file.

Persist TXT content exactly (UTF-8, no extra headings or TTS instructions in body). Actual SHA-256 is over file bytes. Word count is regex `\b[\w]+(?:['’][\w]+)*\b` with UNICODE (see script). Never infer artifacts from message snippets; files must actually exist.

## 3. State machine
`S1_TITLE_APPROVED → S2_OUTLINE_APPROVED → S3_DRAFT_COMPLETE → S4_INITIAL_AUDIT → [PUBLISH_READY if no defects | S5_SINGLE_REPAIR if correctable] → S4_FINAL_VERIFY → [PUBLISH_READY | NEEDS_HUMAN_REVIEW] → S6_SEO`.
`revision_count` is 0 or 1, never 2. Initial QA must freeze the complete dependency-closed repair plan BEFORE S5. One cumulative file creation constitutes one repair even if it has multiple authorized corrections. No iterative trial-and-error repair. On final FAIL stop as NEEDS_HUMAN_REVIEW, never automatically edit again. Earlier stage redo must not overwrite a published final version.

## 4. Audience, themes and quality guardrails
US English (en-US), normally Black American single father with active child care, work competence, dignity and choices; CEO/wealth may be concealed ally/antagonist/father per approved DNA. Five story families (owner, kindness, underestimated skill, family/service, CEO second chance) are **creative directions** not compulsory identical plots. Subvert status bias with testable evidence and human consequence, NOT money as magical solution. No stereotyping, child as mere prop, miraculous cures, unverifiable veteran credentials, instantaneous legal verdicts, omnipotent CEO, implausible safety-critical repair. Fiction ≠ license for easily disproved US law, money, medical or workplace procedure.

## 5. Length and narration clock
Default 6,500–8,000 spoken English WORDS, not character equivalents; flexible for user overrides. Choose narration speed explicitly, default `150 WPM` for timing estimates (actual TTS differs). At 150 WPM: 30 sec≈75 words, 60 sec≈150, 90 sec≈225, 5 min≈750. Do not promise an exact YouTube runtime from a word count. Count body after saving.

## 6. HOOK GATE — real first-90-second measurement
A storyboard time label is not proof. Every approved S2 outline **AND frozen `02_hook_contract.json`** must define a specific `opening_cost`, `mystery_trigger`, `viewer_question` and show which TITLE-PROMISE aspect must be displayed by 90s versus deliberately deferred. For each event required by 90s, both S3 and S4 must locate an exact quote in the actual TXT and compute **start word offset** and `seconds = start_word * 60 / narration_wpm`. Under 150 WPM, the last of the required first-90s events must start at <=225 words. An optional late-payoff reveal is okay ONLY if outline explicitly defers it; an event contractually promised by 90 sec and actually at word 605 is a HARD FAIL. Check timing after revision on the final script.

S4 FINAL passes only with `04_hook_proof.json` matching the S2-frozen `02_hook_contract.json`; each proof event must include `id`, `anchor` (exact unique substring), `max_seconds`, `word_start`, `estimated_start_seconds` (see validator; tool recomputes offsets, no invented estimates). Require `cost`, `clue`, `question` in the first 90 sec and any outline-specific early event. Cannot game hook by using a placeholder keyword instead of the actual promised event: editorial QA must confirm the cited excerpt demonstrates the event. Avoid revealing a *hidden* identity to audience prematurely if its surprise is an important narrative promise; choose an intentional dramatic irony exception explicitly in outline.

## 7. Retention and promise gate
P1 begins with immediate tangible cost; early unresolved question, actionable clue and father choice. By minute ~5 a new fact challenges the original assumption; every ~4–7 mins a different action/evidence/cost changes the audience's understanding, not another redundant document reading. Midpoint changes hypothesis, P5 includes hard cost/choice, P6 independently establishes payoff, P7 shows tangible change without magic. `Title promise` must be LITERALLY true: if CEO only freezes a grant while independent board keeps service running, title must not claim CEO directly closed an independently operated business. If title already locked, S2 must build an honest causal chain and QA must flag unfixable contradiction for human review—not secretly retitle.

## 8. QA rubric + hard failures
Score /100: logic/causality 30; continuity/timeline 20; en-US grammar/spelling 20; grounded plausibility 10; title proof 10; emotional coherence 5; pacing/retention 5. Need >=97 **AND** no CRITICAL/HIGH defects **AND** HOOK_GATE PASS **AND** verified file/manifest/lineage **AND** no unresolved material title contradiction. A nominal 98 never overrides a failed hook, authority, continuity, title or checksum gate. Correct proofread issues with `exact_before → exact_after` and protect intentional dialect.

## 9. Exactly one repair with protected baseline
Initial QA reads FULL body, verifies date/day and child care, timeline, money/authority/technical realism, plot proof, first-90s event offsets and English proofreading. Record every eligible defect including downstream spans. Freeze one `04_repair_contract.json` with nonoverlapping exact anchors, unique occurrences, expected replacements and dependency closure. If a problem cannot be repaired without global retelling, write `NEEDS_HUMAN_REVIEW` rather than pretending a micro-patch is enough. Writer applies ONE cumulative authorized patch and records all edits. `05_repair_ledger.json` supports byte-exact reverse reconstruction, zero out-of-scope changes. FINAL QA verifies entire narrative and tool evidence, never edits and never initiates second revision.

## 10. Publication truth
`PUBLISH_READY` only if human editorial QA and deterministic file/lineage checker pass. `scripts/validate_production.py <run_dir> --phase pre-seo` checks before S6; rerun without `--phase` after SEO. The validator checks deterministically and reports semantic checks still require editorial review. SEO uses exact final file SHA and exactly locked primary title; prompts do NOT constitute generated thumbnails. If proof missing, set `UNVERIFIED` or `NEEDS_HUMAN_REVIEW` and block SEO. Historical V1 runs can be inspected in `--legacy` mode, but legacy mode NEVER certifies V2 creative quality.
