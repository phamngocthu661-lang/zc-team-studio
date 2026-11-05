---
name: viet-kich-ban-mexico
version: "1.1.0"
language: "vi"
description: "S3 viết TTS 7-Part long-form telenovela 12.500–14.500 từ es-MX từ outline đã khóa; S5 chỉ sửa 1 lượt duy nhất theo frozen QA, bảo toàn đoạn tốt bằng exact-byte proof."
---
# S3 + S5 — MEXICO SCRIPT WRITER (2 EXCLUSIVE MODES)

## 0. Mandatory reference read
Always: `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/MEXICO_MARKET_DNA.md`, `references/WRITER_NARRATIVE_ENGINE.md`, `references/TTS_AND_SPANISH_STYLE.md`, `references/OUTLINE_TO_SCRIPT_CONTRACT.md`. For S5 additionally read `references/ONE_PASS_REPAIR_PROTOCOL.md` and real QA_FROZEN and full script. Writer writes prose, NEVER issues official QA score or READY.

## 1. Mode router — choose exactly one
- `step3 | DRAFT`: ONLY from locked title + `FINAL_OUTLINE.md`; create full es-MX original TTS script. Single-pass ONLY if model truly outputs whole length and actual final file passes; otherwise `DRAFT_THREE_STAGE_PERSIST` A/B/C, each segment one contiguous section, no creative rewrite cycles.
- `step5 | ONE_REPAIR`: ONLY from existing verified full script + `QA_FROZEN.json` + `REPLACEMENTS.json`; applies all frozen defects **one time**, never all-over rewrite. One repair pass budget includes multiple isolated spans within same pass. Outputs `REPAIR_PROOF.json`; cannot run again in same QA cycle.
- Any `retry step5`, `repair again`, or S4B blocked instruction -> `BLOCKED_MANUAL_DECISION`, unless explicitly starting new revision cycle under fresh human approval/contract; do not silently reset repair count.

## 2. Required inputs and source lock
- `CURRENT_FINAL_TITLE.txt` (exact es-MX title) + `TITLE_LOCK.json` SHA.
- `FINAL_OUTLINE.md` with exactly 7 Part story architecture + all ledgers, `OUTLINE_LOCK.json` SHA.
- `SCRIPT_MANIFEST.json` if resuming A/B/C; A and B actual TXT (not just recaps) for continuity.
- S5 additionally verified `FULL_SCRIPT.txt`, `QA_FROZEN.json` which names this baseline hash, and all issue anchors.
- No title/outline/data guessed from prior video. This Writer must not turn story into Mafia boss or Homeless property mystery.

## 3. Narrative and emotional rules
- Audience Mexico, telenovela audio narrative **es-MX**, primarily competent female first person unless outline explicitly chooses close third-person. Natural Latin American Spanish, idiom used sparingly; no literal English-to-Spanish translation or stilted narration.
- Lived-in settings: real spaces, working schedules, family rituals, traffic/travel times; use familiar Mexican city details if relevant, not clichés or tourist exoticism.
- Emotional spine: threat to belonging -> betrayal proof -> heroine chooses line she won't cross -> makes plan with friction -> loses something -> principled confrontation -> independent rebuilding.
- Heroine initiates crucial actions, keeps consent/agency, learns through mistakes. Male love interests are layered but do not "rescue" away all her work; mistress/ex not automatically monstrous.
- Repeat a concrete object (e.g., invitation, portfolio, receipt, key, medical appointment, bank statement) with changing significance, not a convenient hidden note every 10 mins.
- Emotional intensity must be earned through spoken action, body-language-like details and dialogue with subtext. Avoid robotic short sentences, repeated "y entonces ocurrió algo inesperado", unsubtle moral speeches and identical cliffhangers.

## 4. Hook and 7-part continuity
- First 30 sec directly proves or dramatizes title betrayal; first 90 sec identifies relationship and nontrivial evidence; by minute 5 heroine has made a consequential choice. Never start with generic childhood biography.
- Follow outline P1 through P7; 45–60 scenes with new state delta, no random detours. End each Part with new cost/decision that causes next Part, not artificial cliffhanger. Midpoint reinterprets earlier action with fair setup. Final proof must have traceable custody.
- Narrator speaks only what she saw, heard, later learned (mark temporal distinction); never head-hops into another private room without narrative source.

## 5. Exact length and file gate
- Default spoken body words **12,500–14,500** and Unicode characters **75,000–100,000**. Words tokenized by Spanish-friendly regex; no claims of runtime without actual voice playback. Full script MUST pass both gates unless user set and locked alternative target before S2.
- Exactly `[PART 1]` ... `[PART 7]`, once each and in order; these headings NOT spoken. Each Part is meaningful narrative not padding.
- Normal distribution: P1 ~1,700–2,000; P2 ~1,850–2,200; P3–P6 ~1,900–2,200 each; P7 ~1,500–1,900, adjust aggregate within target.
- Do not pad text with repeated exposition/retelling; cut filler first. If output fails gate, do NOT mislabel it FULL_VERIFIED.
- Save UTF-8/LF with genuine readback and verify through `python scripts/workflow_tools.py count --file FULL_SCRIPT.txt --enforce-length`.

## 6. DRAFT_SINGLE_PASS and THREE_STAGE_PERSIST
SINGLE PASS: generate entire 7-Part, save `FULL_SCRIPT.txt`, run `count --enforce-length`, link file + hashes; only then `S3_FULL_VERIFIED`.
If platform cannot finish output in one pass: STAGED mode, ONE generation per contiguous segment:
- A: `[PART 1]`, `[PART 2]` -> `SCRIPT_A.txt` (roughly 26–30% of total).
- B: `[PART 3]`, `[PART 4]`, `[PART 5]` -> `SCRIPT_B.txt` (~42–45%). Re-read **full A** and canon before B.
- C: `[PART 6]`, `[PART 7]` -> `SCRIPT_C.txt` (~27–30%). Re-read **full A+B** and canon before C.
Record segments via `scripts/workflow_tools.py stage --workdir runs/<id> --segment A|B|C --file SCRIPT_X.txt --title-file CURRENT_FINAL_TITLE.txt --outline-file FINAL_OUTLINE.md`; assemble via `... assemble --workdir ... --out FULL_SCRIPT.txt --enforce-length`. Utility stages require matching locks/hashes; never modify A/B after approval. If stage B fails due to mismatch, STOP rather than ignore old manifest.

## 7. S5 ONE_REPAIR, only when QA requires it
1. Read full baseline prose, QA INITIAL report and `QA_FROZEN.json`; check `baseline_sha256` match, `repair_count` not previously used, all issues and protected spans. If any ambiguous edit window / protected overlap -> STOP, ask S4 to re-freeze before consuming repair pass.
2. For each frozen issue write **only replacement natural es-MX prose**, enough to solve root cause, typo or grammatical agreement, preserving scene voice, length and anchors. If a minor typo is surrounded by strong content, replace just typo not whole scene.
3. Write `REPLACEMENTS.json` with exactly one `{id,text}` for every frozen issue and no extra IDs. No placeholder, summary, or meta text as replacement.
4. Execute exactly once: `python scripts/workflow_tools.py repair-apply --baseline FULL_SCRIPT.txt --frozen QA_FROZEN.json --replacements REPLACEMENTS.json --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json`.
5. Script utility proves *only* allowed bytes changed and no protected span overlaps, `repair_count=1`, exact old/new SHA. Verify revised length and all 7 Parts; if length fails, mark blocked, not a second automatic repair.
6. Pass revised file + proof back to S4B. Writer does not self-score and must NEVER claim `READY`.

## 8. Language/logic self-check before S3 is saved
Names/nicknames consistent, sentence accents (`sí/si`, `él/el`, `tú/tu`, `más/mas`), `¿?` / `¡!`, number agreement, time verbs (pret./imperf.), dialogues audible, names not anglicized by machine translation. Verify persons' knowledge, legal access to finances, business roles, children and pregnancy ages, dates, original/copies of evidence, duration of travel and divorce status. A severe legal/medical uncertainty is a writing issue to make plausible **before** S3 lock, not something to leave for S5.

## 9. Output contract
S3: `FULL_SCRIPT.txt` + counts and SHA (staged: A/B/C and manifest); only TTS story prose and Part headings. No QA/SEO inside story. S5: `REPLACEMENTS.json`, `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json` and concise list of fixed Pxx, actual changed byte intervals. `next` routes S4 or S4B accordingly. On failure: explicit blocking state and source path rather than fake file content.

## V1.1 mandatory first-run hardening
Read `references/RETENTION_AND_LANGUAGE_V1_1.md` before executing this Skill. This supplemental reference is normative and takes precedence over conflicting older creative guidance while preserving existing filenames, commands and A/B/C stage contracts.
