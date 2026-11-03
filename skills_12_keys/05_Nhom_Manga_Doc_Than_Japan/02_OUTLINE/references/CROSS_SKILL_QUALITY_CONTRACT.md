# CROSS-SKILL QUALITY CONTRACT — JP MANGA SINGLE MEN V1.1

STATUS: NORMATIVE. LANGUAGE: SCRIPT + TITLE + SEO: Japanese (ja-JP). Explanatory reports can be Vietnamese.

## Niche lock
Primary viewer fantasy: Japanese single man (俺), often age 40–70, overlooked/isolated, encounters an adult woman, confronts an emotionally and materially specific problem, protects dignity, demonstrates humble competence, forms a *mutual* adult bond. Japanese manga-voice-comic long-form 34–45 min. No retirement advice lecture, no generic elderly-family revenge, no mafia, no western-mystery property treasure.

## Six steps, exactly five installed Skills
- `step1` -> TITLE `manga-doc-than-jp-title` ONLY; emits title-lock artifact.
- `step2` -> OUTLINE `manga-doc-than-jp-outline` ONLY; emits seven-part outline and canon lock.
- `step3(A|B|C)` -> WRITER `manga-doc-than-jp-writer` drafting; write PART 1–2, 3–5, 6–7 respectively; deterministic assemble to one script.
- `step4` -> QA `manga-doc-than-jp-qa` audit *only*; no manuscript rewriting; emits defect list and optional frozen ledger.
- `step5` -> WRITER only `ONE_PASS_REPAIR`; modify precisely frozen spans *once*, generate `FULL_SCRIPT_REVISED.txt`, integrity proof. No second repair even after failed check.
- `step6` -> SEO `manga-doc-than-jp-seo` only after final QA pass; package title, SEO, 3 thumbnail directions/prompts.

## Immutable sources and handoff
`CURRENT_FINAL_TITLE` (exact Japanese string) -> `TITLE_LOCK.json` (SHA256) -> `CURRENT_FINAL_OUTLINE.txt` and `OUTLINE_LOCK.json` -> `PARTS_A/B/C.txt` -> `FULL_SCRIPT.txt` + DRAFT_PROOF -> `QA_REPORT.json`, `FROZEN_QA_LEDGER.json` -> optional ONE REPAIR `FULL_SCRIPT_REVISED.txt` + `REPAIR_PROOF.json` -> `FINAL_QA_RESULT.json` -> `SEO_PACKAGE.md`.

When a file can be created, compute SHA256 on *actual persisted UTF-8 bytes*. Do not invent hashes, paths, executed tools, files, word counts or QA PASS. A text-only model should explicitly mark artifacts as pending persistence, not pretend they exist.

## Unchanging gates
- Title <=100 Unicode code points including all punctuation and spaces. Preserve Japanese quote marks, original numeric anchors, and truth-in-title.
- 7 ordered nonempty `[PART 1]` ... `[PART 7]` with exactly one per Part.
- Story-script body (readable Japanese speech/narration only, excluding metadata/tags/roles/whitespace) hard 13,900–16,300 characters; working target 14,500–15,500. This is an *operational estimate* from reference duration, not a transcript-derived measurement: calibrate on TTS speed later.
- Voice comic speaker format `@ore: text`, `@heroine: text`, `@narrator: text`, `@side: text`; optional `@ore: [calm] text`. No silent panel descriptors inside speech. Keep standalone stage cue metadata out of spoken lines.
- 7-Part distribution working centers: 1=1900,2=2150,3=2200,4=2300,5=2150,6=2250,7=1900. Adapt +-10% by narrative needs while preserving total. A=Part1–2, B=Part3–5, C=Part6–7.
- Plot/relationship must be causal; no sudden fortune, undeclared miracle powers, erotic clickbait disconnected from body, dignity violations as romance.
- QA uses a 100-point transparent rubric as *editorial judgment*, with 98 target; score NEVER substitutes for no P0/P1, structural validity, language checks or independent verification.
- Repair budget exactly ONE attempt for each script baseline, *not one iteration per defect or per Part*. QA does not write replacement prose. Writer may touch only frozen UTF-8 byte spans from audited baseline. If repair fails, final status BLOCKED and report remaining defects; no looping/rewrite.
- Never publish `READY` before independent QA inspection of the final exact file. If no repair needed, QA may pass original unchanged.

## DNA-to-script fidelity
Six original content families: A=everyday intimate predicament, B=human kindness/single-mother, C=workplace exclusion/hidden competence, D=second-chance romance/omiai, E=rural/relocation/reset, F=odd co-living/burdened secrets. Family is not necessarily a single formula. Title, outline, characters, visual thumbnails and final action all must serve the same promise.

## Japanese accuracy and trust
Native-sounding Japanese, stable honorifics and character naming, appropriate regional specificity; clear causality in company, inheritance, medical, labor, travel or housing situations. Treat legal/medical details conservatively if unverified. Romance is between consenting adults; protect privacy and dignity; no eroticized coercion or humiliation. No direct copy of competitor dialogue, thumbnail phrases or distinctive plot turns.

## Step4 QA / Step5 repair ownership
`QA_REPORT.json` identifies issue_id, severity, evidence in Japanese, reason, impact, suggested smallest repair, exact byte windows and baseline SHA. `FROZEN_QA_LEDGER.json` contains authorized patches but not replacement prose. Step5 Writer supplies replacement lines once; the tool rejects a second edit after `REPAIR_PROOF.json` exists. Step4 may perform *read-only final validation* afterwards; it may not request another edit. Pre-existing significant flaws after this one attempt => `BLOCKED_ONE_PASS_EXHAUSTED`.

## Real time constraints
Do not silently assert 40 minutes from character count. TTS pacing varies. Track actual audio duration in later production, adjust target through explicit version change only.


## V1.1 publisher safety & creativity addition
Retain 5 Skills/6 Steps, all original file names, hashes, and the absolute **ONE** Step5 edit transaction. Before outline lock and at Step4, run eight Creative Story Gates documented in `CREATIVE_STORY_GATES_V1.1.md`. The separate `CREATIVE_EDITORIAL_STATUS` must not be inferred from the structural QA score. Step6 checks locked script+SEO+PNG images with `scripts/release_gate.py`; in strict publish mode require a full visual-image attestation and script-evidence creative report. Do not manufacture these attestations. An image can have 16:9 size but still be visually wrong. `READY_FINAL` is a logic/grammar QA status, not the same as `PUBLISH_READY`.
