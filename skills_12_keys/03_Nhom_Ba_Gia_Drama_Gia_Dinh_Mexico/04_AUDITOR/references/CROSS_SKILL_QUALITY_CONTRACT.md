# CROSS-SKILL QUALITY CONTRACT — MEXICO FAMILIA V1.1 (NORMATIVE)

## Purpose and exact roles
Project: **Doña / madre mayor × humillación familiar × límites × hogar/patrimonio × prueba × justicia emocional**. Audience: adult Mexico and Mexican diaspora, spoken storytelling in natural es-MX, first-person retrospective, typically female narrator aged 60–80. Adult family themes, NOT a sexual-content skill. Fiction must never pretend to be proven true; don't label *historia real* unless factual authenticity is documented.

| Step | Owner | May do | Must not do |
|---|---|---|---|
| 1 | Title | Research, vary, score, lock 1 current title | Invent completed plot as fact; silently change a lock |
| 2 | Outline | Design 7 Parts and story bible; lock outline | Write finished screenplay or alter title without step1 |
| 3 | Writer DRAFT | Generate FULL original es-MX story in 3 persisted A/B/C segments | Invent QA approval, skip segments, fake length |
| 4 | Independent QA | Read entire story, check logic/orthography, freeze precise defects, final verification | Write replacement narrative; self-approve a fake inspection |
| 5 | Writer REPAIR | Execute **exactly ONE** QA-approved surgical edit batch | Repair without frozen ledger, start a second batch, edit outside zones |
| 6 | SEO | Publish metadata and 3 thumbnail concepts on exact QA READY manuscript | Publish on stale/NOT_READY QA; change locked title |

## Non-negotiable identity chain
1. UTF-8 exact locked title, title_sha256; <=100 Unicode characters including spaces/punctuation.
2. Persistent `CURRENT_FINAL_OUTLINE.txt` (7 `[PART N]` blocks) and outline_sha256 of exact file bytes. `video_id = SHA256(title + '\n' + outline_sha256)[:16]`.
3. Writer stage manifest locks title hash, outline hash, video_id and A/B/C file SHA-256. Reopen source files, never reconstruct old Parts from chat memory.
4. Full: exact bytes of A+B+C; seven headings `[PART 1]`..`[PART 7]` ordered. No non-heading text before Part1. UTF-8, LF only, no BOM. Count code points AFTER REMOVING ONLY THE SEVEN HEADING LINES; include body whitespace, punctuation, accents and dialogue. **70,000–80,000 inclusive**, recommended 74,000–78,000. A target 20.4–22k; B 30.6–33k; C remainder to full (approx 21.6–23.6k). Parts should be meaningfully balanced; numbers are planning guidelines, full gate is hard.
5. QA READ ONLY; must inspect full current file. Frozen edit windows are UTF-8 **byte offsets**, with exact baseline hash, window hash, evidence, root cause, acceptance test. QA controls scope; Writer controls prose. Never silently truncate.
6. `MAX_REPAIR_ROUNDS=1`. Step5 generates separate revised manuscript and immutable proof; never overwrite original. After repairing, call Step4 *verification only*; **no second repair even if QA finds remaining problems**. Record NOT_READY and escalate to manual/editorial redesign outside this workflow if needed.
7. Step6 only after newest V1.1 independent QA for exact current manuscript AND SHA-bound `QA_EDITORIAL_EVIDENCE.json`, score >=98/100, zero unresolved issues, `TECH_PASS=true`, `EDITORIAL_PASS=true` and all proof gates PASS. Legacy V1 READY does not authorize V1.1 SEO. Numeric score is editorial judgment, never a tool-measured retention guarantee.

## Editorial scoring is NOT deterministic proof
Title/editorial scores are judgments with specific supporting evidence and reservations. No fabricated CTR, retention, A/B test or competitor script reading. The supplied CSVs are snapshots, not proof of causality; video durations and views are descriptive only. If no subtitles exist in the data, do not claim textual analysis of the video transcript. Do not copy competitor phrases, thumbnail body text or plot beat-for-beat.

## Logic / Mexican-localization hard gates
- Agency: the older mother has concrete choices, financial limits, allies, mistakes and consequences; no pure victim/magical rescuer.
- Legality: ownership, escrituras, notaría, succession, bank authorization, leases, inheritance, privacy, civil court, authorities, foster/elder care require plausibility **without claiming a universal Mexican legal rule**. For jurisdiction-dependent facts, keep scenes conditional or request legal review. No instant sale of occupied property; no magically freezing another person's accounts without authority; no unverified judge protagonist in a courtroom.
- Chronology: age / birthdays / widowhood / travel / arrival / bank processing / deed transfers / repair lead times must agree.
- Character knowledge: narrator cannot know private dialogue without witness, recording, document or later disclosure.
- Money: clear owner, currency MXN when relevant, account holder, actual access, documented amounts and timing. Avoid improbable billionaire rescue.
- Language: native-sounding Mexican Spanish; consistent tú/usted and natural references (nuera, consuegra, escritura, recibo, notario as context warrants). Correct accents and ñ; no unnatural translated English calques; no forced slang every sentence.
- Story title promise: primary betrayal visibly happens; proof/resolution follows from setup, not an unrelated last-minute inheritance.
- Ethics: avoid ageist mockery and false stereotypes; domestic harm is handled carefully without instructional violence. Don't promise *historia real* for invented drama.

## Mandatory exchange files
`TITLE_LOCK.json`, `CURRENT_FINAL_OUTLINE.txt`, `OUTLINE_LOCK.json`, `MXF_<title_sha12>_SCRIPT_A.txt`, `..._B.txt`, `..._C.txt`, `MXF_<title_sha12>_SCRIPT_MANIFEST.json`, `MXF_<title_sha12>_FULL_SCRIPT.txt`, `QA_ISSUES.json`, `QA_FROZEN_LEDGER.json`, `REPLACEMENTS.json`, optional `FULL_SCRIPT_REVISED.txt` and `REPAIR_PROOF.json`, `QA_EDITORIAL_EVIDENCE.json`, `QA_FINAL_INPUT.json`, `QA_FINAL.json`, `SEO_GATE.json`, `FULL_SCRIPT_TTS_CLEAN.txt`, `SEO_PUBLISH_PACK.md`.

## Hand-off syntax
Every step emits `STEP`, `VIDEO_ID` when known, source identity hashes, actual paths if files created, `PASS/FAIL` with failure reasons, and one explicit next authorized step. Never claim a saved file without checking existence. Controller only routes; each Skill owns its own output. If only text/attachment is available, report missing artifact proof rather than inventing filenames.

## V1.1 binding and verification
- Preserve all **five existing root folder names and Skill slug names** (`..._V1`) so installer and routing references remain valid; versions inside are 1.1.0. Only archive labels / overall container version change.
- Step2 MUST lock scene-by-scene timeline including time-of-day and fact first-known. Step3 MUST carry the same data through A/B/C and patch impact checks.
- Step4 FINAL MUST rebuild anchored 21+ scene ledger and first-known fact chain on the exact final script, with every patch's before/after context; run `review-evidence` then `qa-final --editorial-evidence ...`.
- CLI may mechanically flag structured chronology and already-known discovery contradictions; it cannot understand everything in narration, and flags are only as accurate as the honest independent review and actual cited passages.
- The report must distinguish `TECH_PASS` from `EDITORIAL_PASS` and must not claim a human editor performed review unless that is factually true.
- Step6 MUST bind both `QA_FINAL.json` and `QA_EDITORIAL_EVIDENCE.json` SHA; export `FULL_SCRIPT_TTS_CLEAN.txt` with `tts-export` after READY and remove only the exact seven heading lines, without changing story text.
- A postrepair NOT_READY is terminal for that production run; one-frozen-batch rule remains permanent.
