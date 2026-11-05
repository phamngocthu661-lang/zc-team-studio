# HOMELESS V12 — SHARED CROSS-SKILL CONTRACT (NORMATIVE)

Version: 12.0 | Applicable: Title, Outline, Writer Draft, QA Audit, Writer Repair, SEO

## 1. Boundary of authority (do not conflate)

| User step | Owner | May change | Must never change/claim |
|---|---|---|---|
| step1 | Title skill | Proposed titles and final title after scoring | Outline, script, QA verdict, SEO |
| step2 | Outline skill | Seven-part story blueprint and canon | Final title, manuscript, QA verdict |
| step3 | Writer skill in `DRAFT` | A/B/C manuscript stages, then byte assembly | Frozen title and outline; QA score/READY |
| step4 | QA skill `AUDIT_ONLY` | Evidence, deficiencies, numeric score, frozen findings, authorized patch zones, lesson proposals | ANY manuscript character or independently generated replacement prose |
| step5 | Writer skill `REPAIR_ONLY` | Exactly the approved and frozen edit windows in exact baseline | Untouched bytes, QA findings/score/readiness/approval scope |
| step6 | SEO skill | Accurate title-aligned metadata, two secondary packaging titles, art/trailer prompts | Title lock, story canon, script, QA verdict |

Controller is a router and prerequisite verifier only, not a second writer, evaluator, repairer or SEO author. A user call runs exactly ONE step. After a successful step, print exactly one conventional next-step suggestion; after error print blockers instead. `next` and `continue` are NOT commands. No `WORKFLOW_STATUS` or similar routing block.

## 2. Exact artifacts / identity

1. `CURRENT_FINAL_TITLE` = exact locked UTF-8 title string (no normalization before hashing); `title_sha12 = SHA256(title UTF-8)[:12]`.
2. `CURRENT_FINAL_OUTLINE` = actual 7-Part outline file + Canon/Forensic handoff; compute SHA-256 of exact outline file bytes. `video_id` is SHA-256 of title UTF-8 + literal LF + outline file SHA string, truncated to 16 lowercase hex characters. Same title alone is NOT sufficient to identify the same video.
3. Draft segments `SCRIPT_A` Parts 1–2, `SCRIPT_B` Parts 3–5, `SCRIPT_C` Parts 6–7, each real UTF-8 LF TXT with SHA-256 and Stage manifest. Do not re-author A/B in future steps. B and C must actually re-open/read prior exact prose and canon, not infer from context summaries.
4. `FULL_SCRIPT` = exact byte concatenation A+B+C and pass `verify_full_script.py`; title and outline identity must match segment manifest before stage/assembly. Never replace a verified full script silently.
5. `QA_CHECKPOINT` and `QA_FROZEN` reference exact current full-script source hash. The first is resumable incomplete work; only `QA_FROZEN` is eligible to authorize repair, and only if it is `NOT READY` with actionable patch findings and a separately frozen zone contract.
6. `QA_REPAIR_CONTRACT` lists explicit non-overlapping zero-based HALF-OPEN UTF-8 BYTE intervals `[start_byte,end_byte)` in baseline. It binds `baseline_file_sha256`, `baseline_body_sha256`, exact `qa_frozen_file_sha256`, title, video id, permitted Patch ID(s), original interval hash, and user approval. A general prose instruction such as “fix Part 4” is not a valid patch interval.
7. `REPAIR_PROOF` binds authorized windows, before/after file SHA-256, exact unchanged intervals, revised body chars, no heading edits, and a complete zone-to-Patch-ID map. This is integrity evidence, not literary QA.
8. `QA_FROZEN` after revision evaluates the revised exact source with the SAME rubric; this is the only mechanism that can issue `READY` for revised script. SEO requires that QA source hash equals the exact script it processes.

### Length rule

Count Unicode code points (Python `len`) of the script after removing ONLY exactly seven standalone `[PART N]` heading lines AND their line endings. All other body whitespace and LF line breaks count. Full inclusive hard bound 70,000–80,000; preferred 74,000–78,000. Counts are about a real file, not estimates. Segment A/B/C are partial and exempt from full length bound until assembly.

## 3. Source-of-truth / precedence

1. Direct user's step request, provided it does not authorize fabricating facts or bypass proof gates;
2. this shared V12 role, safety, identity and artifact contract;
3. active V12 controller + routing file;
4. `SKILL.md` V12 of the owning skill;
5. mandatory V12 references;
6. retained legacy creative-DNA references only for content craft, not routing or edit authority.

If an old text states `one shot`, `QA MODE B REWRITE`, `QA / Revision owner`, or `Writer self score 98 = QA READY`, treat the old statement as superseded and resolve it in the actual shipped source, not simply by hoping it is ignored.

## 4. Fixed official QA rubric (do not redistribute)

| Criterion | Maximum |
|---|---:|
| Title Fulfillment + Hook | 10 |
| Causality / Discovery / Why-now | 15 |
| Timeline / Money / State / Knowledge | 15 |
| Legal / Historical / Authority / Professional | 10 |
| Physical / Mechanical | 10 |
| Mystery / Clue / Reveal | 10 |
| Retention / Pressure / Pacing | 10 |
| Character Agency / Competence / Human Behavior | 8 |
| Human Prose / Dialogue / US40+ / TTS / Platform | 7 |
| Emotional Payoff / Ending-by-Action | 5 |
| **TOTAL** | **100** |

Numeric score is independent of length and other hard gates. QA may issue `READY` only if score >=98 (equivalent to score >97), all hard gates PASS, manuscript length PASS, and zero remaining actionable defects. Score <98 or any pending hard gate => `NOT READY`. Score can be low; never round up, fabricate findings, or equate a Writer's self-check with official QA. If not enough evidence for complete QA, checkpoint instead of claiming a score or READY.

For a subsequent QA: preserve rubric weights and score deduction history. Distinguish `PRE-EXISTING QA MISS`, `PATCH-EXPOSED`, and `TRUE REGRESSION`. Report historical baseline score, audit-corrected baseline score where applicable, and current absolute score. Do not manipulate post-repair scores to make progress appear monotonic.

## 5. QA finding / root-cause / acceptance-test standard

Retain the existing `qa_checkpoint.py` fields needed for interoperability: `id` (`Pxx`), `severity` (`P0..P3`), `part`, `problem`, `repair`, `zone`, `anchor` (exact original quote), `occurrences`, `dependencies`, `rubric_category`, `deduction`, `length_intent` (`KEEP|ADD|CUT|REDISTRIBUTE`). Expand each finding with:

- `root_cause`: mechanism, not a restatement of symptom;
- `viewer_impact`: coherence, credibility, emotion, retention or TTS impact;
- `classification`: `CANON|LOGIC|TIMELINE|MONEY|KNOWLEDGE|ACCESS|LEGAL|HISTORY|PHYSICS|CLUE|RETENTION|VOICE|ENDING|LENGTH|OTHER`;
- `acceptance_tests`: concrete checks that can be carried out after Writer's repair;
- `prevention_candidate`: optional reusable rule, with whether the defect originates in Outline/Writer/QA/SEO;
- `approved_dependencies` and `protected_anchor_quotes`: proof of scope;
- `confidence` and `evidence_excerpt` when uncertain;
- `optional_improvement`: separate genuine defect from taste-based polish (optional improvements DO NOT automatically become edits).

Do not issue a frozen patch with vague offsets, no exact anchor or unclear repair intent. QA freezes *what* to fix, permitted scope and tests. QA must NOT write replacement story prose, even in an illustrative example likely to be inserted verbatim. For zone boundaries, explicitly authorize even adjoining punctuation/newline when needed; unspecified bytes are immutable.

## 6. Immutable edit safety

- All spans not in approved edit windows are immutable byte-for-byte.
- Edits cannot touch `[PART N]` headings or span Part boundaries. Protected strong anchors must not fall into a zone.
- Unapproved cosmetic changes, CRLF/BOM normalization, typo correction or whole-script regen are prohibited.
- An editor can propose a necessary dependency window to QA BEFORE freeze; after approval, new locations require NEW QA contract and NEW explicit user authorization.
- Composer must assemble `baseline[:start0] + replacement0 + baseline[end0:start1] + replacement1 + ... + baseline[end_last:]`. Its pre-publish proof must rerun independent source hash and exact preservation checks.
- Do not claim a revised script is `CURRENT_FINAL_SCRIPT` or READY merely because integrity proof passed; return to step4 for forensic re-audit.

## 7. Lessons learned, controlled improvement, and provenance

Only QA may suggest a cross-video lesson after identifying a verified root cause; Writer may attach repair implementation evidence, but cannot alone approve the lesson. A lesson is structured as `lesson_id`, `origin_video_id`, `baseline_qa_sha256`, `postrepair_qa_sha256` (if resolved), defect IDs, root-cause classification, negative example anchor, preferred prevention test, owning step, scope, confidence, status (`PROPOSED|VERIFIED|REJECTED`), and rule version. `VERIFIED` requires evidence of post-repair outcome and human approval before incorporation into a released skill. A single story-specific circumstance must NOT become a global writing restriction. Maintain source per video. Never claim the model trained itself or silently changed a future ZIP.

## 8. Failure / manual approvals / truthful reporting

A script or QA file referenced in conversation is not equivalent to source file bytes. Missing file, mismatched outline/video_id, SHA drift, incomplete checkpoint, absent patch zone or user approval, invalid diff, hard length FAIL, or QA not READY are blockers. State what exists, what failed and how to restore; never fabricate files, hashes, patch counts, scores, story facts or user approvals. Proof scripts validate syntax and integrity; narrative quality still requires actual reading and judgment.
