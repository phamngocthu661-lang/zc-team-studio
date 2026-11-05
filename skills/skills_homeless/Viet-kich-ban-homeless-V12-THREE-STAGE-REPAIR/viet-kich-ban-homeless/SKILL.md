---
name: viet-kich-ban-homeless
version: "2.0.0"
language: "vi"
display_name: "HOMELESS Writer — Draft & Surgical Repair"
description: "Writer only: STEP3 three-stage persistent American-English narrative drafting and STEP5 QA-authorized byte-exact surgical repairs. Never independently score, freeze defects or claim QA READY."
---

# HOMELESS WRITER V12 / V2.0.0 — TWO EXCLUSIVE WRITER MODES

## 0. Mandatory reading order

1. This `SKILL.md`, `VERSION.txt` and `references/CROSS_SKILL_QUALITY_CONTRACT.md` (V12 role and artifact contract).
2. For `step3`: `references/THREE_STAGE_PERSIST_PROTOCOL.md`, `references/EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`, `references/LENGTH_DELIVERY_LOCK.md`, `references/OUTLINE_HANDOFF_CONTRACT.md`, `references/MASTER_SCRIPT_ENGINE.md`, `references/FORENSIC_LOGIC_GATE.md`, `references/CANON_STATE_MATRIX.md`, `references/PART_QA_CHECKLIST.md`.
3. For `step5`: `references/QA_REPAIR_IMPLEMENTATION_V12.md`, frozen QA report and frozen scoped repair contract, `references/EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`, `references/LENGTH_DELIVERY_LOCK.md`, `references/CANON_STATE_MATRIX.md`, `references/FORENSIC_LOGIC_GATE.md`, `references/PART_QA_CHECKLIST.md`. Read baseline in full when editing for accurate causal continuity.
4. Read verified and human-approved cross-video lessons when supplied; do not assume an automatically learning model.

**Older references remain for writing craft, not command routing. No One-Shot, no QA MODE B.** The Writer does not issue official `QA_SCORE`, Frozen Patch Ledger, numeric independent audit, hard-gate publication assessment or SEO.

## 1. Choose exactly one writing mode

| Command | Mode | Input | Authorized output |
|---|---|---|---|
| `step3` | `DRAFT_THREE_STAGE` (SCRIPT_MODE=THREE_STAGE_PERSIST) | Locked title + exact 7-Part outline file + canon | A or B or C (one invocation) / assemble on C only |
| `step5` | `QA_SCOPED_REPAIR` | Exact baseline + frozen QA + closed zone contract + explicit user-approved ledger | Replacement prose in approved byte windows, verified revised TXT and Writer proof |

Never use Step3 to repair an audited finalized file and never use Step5 to originate a full story. A human author asks for step5 by itself only once Frozen QA exists; explicit `step5` on that frozen ledger authorizes its listed patches, unless the user restricts approval to a subset, in which case require QA to freeze a subset-specific contract first.

## 2. Writer creative DNA (applies to DRAFT and authorial quality of repairs)

Niche: **displaced/homeless woman × abandoned property × hidden legacy × practical restoration × quiet humanity × high-integrity family/historical mystery**. Narration is natural **American English** for an American 40+ audience, not generic AI-staccato prose. Maintain agency, earned competence, believable sensory realism, human motives, genuine causal pressure, respectful treatment of vulnerability, credible physical/legal/historical process, and ending-by-action rather than a moralizing summary.

Story engine: personal stake → impossible detail → first real proof → practical investigation → partial rewards → active pressure → deeper reveal → difficult choice → irreversible consequence → healing/legacy. The property has material constraints. Avoid deus-ex-machina documents, arbitrary money, impossible age/timeline, illegal legal shortcuts, all-knowing narrators, cliffhanger filler, repeated sentimental statements, unsupported character knowledge, and artificial “viewer retention” instructions embedded as prose.

The detailed implementation, 7-Part job descriptions, hook checkpoints, causality checks, State Delta Matrix, physical/legal examples and narrative style gates live in the existing mandatory creative-engine references and must be genuinely consulted rather than replaced by generic advice.

### Early retention gate (Writer self-check, NOT QA certification)

- In the opening, pay the title's promise with concrete character/stakes/proof without prematurely revealing final secret.
- First roughly 5 min must establish urgency, clear dilemma, real clue or test, protagonist agency and credible next choice.
- Across long-form body, give periodic observable progress or reversal and clear open-loop maturation; do not create an artificial "retention desert".
- End each Part by causally motivating the next; save final major revelation for earned resolution but provide earlier partial rewards.
- Writer checks all continuity ledgers on every stage; if unsure, mark defect internally and make functional prose corrections BEFORE locking draft.

## 3. Step3 DRAFT / THREE-STAGE PERSIST (only)

Inputs required:

- `CURRENT_FINAL_TITLE` EXACT string, not a paraphrase.
- `CURRENT_FINAL_OUTLINE` EXACT accessible UTF-8 file of same video; 7 Parts + verified handoff canon. Outline file SHA participates in stage identity.
- Canon/timeline/age/money/object/location/knowledge/evidence/access/legal/clues/pressure/open loops/ending details from this exact outline.
- Stored `SCRIPT_MANIFEST.json` when resuming; exact prior A/B TXT on subsequent calls.

If title/outline file/manifest missing or hashes conflict, stop. Do not invent missing files from a chat summary or borrow facts from a different video with same title.

### Invocation A

1. Load complete outline and canon; read `references/THREE_STAGE_PERSIST_PROTOCOL.md` and writer craft references.
2. Write complete meaningful American-English prose `[PART 1]` and `[PART 2]`, only those headings. Practical planning target A ~20.4k–22k body chars; full total remains hard 70k–80k.
3. Save UTF-8 LF, no BOM, exact name `HML_<title_sha12>_SCRIPT_A.txt`. Reopen/read bytes.
4. `python scripts/segment_workflow.py stage --title '<exact locked title>' --outline-file FINAL_OUTLINE.txt --segment A --file HML_<title_sha12>_SCRIPT_A.txt --directory /mnt/data`.
5. Only report real file path, verified A count/word/hash and suggest `step3` B. No full-script certificate or official QA score.

### Invocation B

1. Inspect manifest with `--outline-file`. Rehash and **read exact A TXT** and full locked outline/canon, not a digest.
2. Maintain clues, characters and object states. Write only `[PART 3]`–`[PART 5]`, target B ~30.6k–33k.
3. Save `..._SCRIPT_B.txt` and run `segment_workflow.py stage ... --segment B --file ... --outline-file ...`.
4. Do not modify A; report B artifact/count/hash and suggest step3 C only after PASS.

### Invocation C

1. Inspect A+B and re-read both exact prose files, locked outline and unresolved canon/open loops.
2. Write only `[PART 6]`–`[PART 7]`, target C ~21.6k–23.6k. Resolve clues, consequences, moral decisions and earned human ending through action.
3. Save, read back and stage C using same manifest-bound title+outline.
4. Run `python scripts/segment_workflow.py assemble --title '<exact title>' --outline-file FINAL_OUTLINE.txt --directory /mnt/data`, then separately run `python scripts/verify_full_script.py HML_<title_sha12>_FULL_SCRIPT.txt`.
5. Only after exact byte assembly, seven ordered headings and 70,000–80,000 characters PASS may `CURRENT_FINAL_SCRIPT` be declared. Print true counts/file SHA/body SHA, link C and full, then suggest step4.

**No placeholders; no fictional source-proof; no `next` or `continue`; do not claim A/B are full.** An explicit request for Part N outside this staging is PARTIAL, not a silent advancement. When a locked segment needs correction after later locks exist, do not silently overwrite—use versioned controlled revision requiring user approval and verifiable reassembly.

## 4. Step5 QA_SCOPED_REPAIR — OWNED BY WRITER

### Entry gates

The USER explicitly invokes `step5` for the identified most recent Frozen QA of the same video, or separately approves specified defect IDs. Verify ALL:

- actual baseline TXT file that matches `QA_FROZEN.frozen_source.file_sha256`;
- actual `QA_FROZEN.json` finalized by QA `step4`, not a checkpoint;
- QA-owned `REPAIR_CONTRACT.json` created from exact byte windows with `freeze_repair_contract.py`; SHA and `video_id` match the current title and outline file;
- all requested Pxx and dependencies represented with exact windows; no approved window overlaps protected strong-span quotes/Part headings/other windows;
- explicit user approval of this exact ledger (the `--user-approved` flag is only an assertion of that real approval, never a way to invent it).

If any missing, stop and request regeneration/approval via QA. Do not create, widen, or self-approve QA windows; do not edit a merely conversational baseline or recompile the full file from memory.

### Repair execution

1. Read full source baseline, frozen findings, dependencies, protected spans and approved windows. Maintain clarity about each root cause, viewer impact, intended state delta, length intent and acceptance test.
2. For EACH authorized window create replacement **narrative prose** preserving character voice, title promise, object/knowledge/legal/physics states, clue timing, period reality, pacing and human ending. Avoid meta QA language in story. For `REWRITE ENTIRE PART`, ask QA to authorize the relevant disjoint windows while retaining exact protected spans; never infer an implicit whole-Part allowance.
3. Write actual `REPLACEMENTS.json` matching schema `HOMELESS_REPAIR_REPLACEMENTS_V12`, one `{zone_id,text}` per frozen window; strings are exact to insert (including any needed spaces/newlines) and all non-windows remain immutable.
4. Run `python scripts/apply_authorized_patches.py --baseline FULL.txt --frozen QA_FROZEN.json --contract REPAIR_CONTRACT.json --outline-file OUTLINE.txt --replacements REPLACEMENTS.json --out FULL_SCRIPT_REVISED.txt --proof REPAIR_PROOF.json --user-approved`.
5. Composer builds revised TXT via deterministic byte splice; checks every original window SHA, QA SHA, frozen contract SHA, outline identity, protected boundaries, ALL preserved spans byte-for-byte, headings, hard length range; only publishes revised TXT on PASS.
6. Writer performs literary **self-check** within approved scope and linked dependencies. Does not change outside windows even for a newly noticed mistake. If repair creates a regression, adjust/revert solely within approved window and rerun tool; if impossible, report blocker and require new QA-scoped contract.
7. Return genuine verified revised TXT and proof. Describe mapped Pxx, what was changed and what needs QA verification without assigning independent scores or READY. End with one suggestion `step4` only after PASS.

### Absolute prohibitions

- Never regenerate entire script, rewrite unapproved transitions, normalize line endings, or polish unrelated lines.
- Never alter `[PART N]` headings or cross Parts.
- Never claim `Patch Execution PASS` means QA has declared story `READY`.
- Never use pre-repair READY for SEO if bytes changed.
- Never overwrite prior `SCRIPT_A/B/C`, previous full manuscript or previous QA file.

## 5. Proof, limitations, failure output

`verify_full_script.py`, segment manifest and byte-splice scripts prove bounded structural facts; they do NOT prove factual history, story originality, legal accuracy, viewer retention or independent QA score. Writer still has to read all relevant prose and canon. If output files do not exist, hashes mismatch, or the revision is outside 70k–80k, report actual blocker without fake links, counts, score, hash or progress. No next-step success suggestion on a failed invocation.

## 6. Cross-video improvement policy

Writer may consume only explicitly stored, QA-verified and editor-approved lesson records of matching scope/version. For recurring defects add an internal preview check (e.g. character Knowledge Ledger before each scene), not generic filler. Proposed lessons remain hypotheses until a post-repair Step4 validates change and a human approves inclusion in a revised skill. Source and version are mandatory; do not claim implicit memory-based skill updates.
