# HOMELESS SCRIPT V12 — THREE-STAGE PERSIST-FIRST PROTOCOL

**Highest delivery-mode authority for `step3`.** The user explicitly rejected One-Shot. `step3` runs over **three separate user calls** A → B → C; each call MUST write and verify genuine American English narrative prose. Older One-Shot/ABC-next/INLINE wording is superseded for delivery only. Keep exact full-length, forensic quality, locked canon and all 7-Part narrative obligations.

## 1. Routing: one stage per user call

- User sends `step3` after `step2` → stage **A** (`[PART 1]`, `[PART 2]`), then stop.
- User sends `step3` again once A is verified → stage **B** (`[PART 3]`, `[PART 4]`, `[PART 5]`), then stop.
- User sends `step3` third time once A+B are verified → stage **C** (`[PART 6]`, `[PART 7]`), then assemble full verified file and stop.
- No `next`/`continue`, no automatic extra stage. If output or manifest is invalid/missing, resume/retry **the same** stage. If full script already exists and is valid, don't overwrite without explicit user instruction.
- Any requested `step3 Part N` outside this default sequence is PARTIAL user-scoped work, not a completed staged phase by assumption.

## 2. Lock canonical sources

- Before A, fully read exact locked title and full final outline (Part 1–7), plus character/date/age/relationship/location/object/money/evidence/knowledge/legal/open-loop Canon Ledger.
- `title_sha12 = SHA256(locked_title.encode('utf-8')).hexdigest()[:12]`. Use it in every artifact path. A's manifest stores exact title and hashes. Use current outline unchanged for B and C; the exact accessible outline file and its SHA are MANDATORY; manifest v2 binds outline SHA and video_id. Never synthesize a missing outline file from memory solely to supply a hash.
- At B, re-read the **actual A TXT** and original outline/Canon Ledger. At C re-read actual A and B, the outline and unresolved open loops. Track decisions, dates, objects and evidence from prior segments, but prose must come from the files and not reconstructed summaries.

## 3. Staged file contracts

All files under `/mnt/data` unless another accessible output directory was specified:

- `HML_<title_sha12>_SCRIPT_A.txt` — only Part 1–2; aim ~20.4k–22k body chars.
- `HML_<title_sha12>_SCRIPT_B.txt` — only Part 3–5; aim ~30.6k–33k body chars.
- `HML_<title_sha12>_SCRIPT_C.txt` — only Part 6–7; aim ~21.6k–23.6k body chars.
- `HML_<title_sha12>_SCRIPT_MANIFEST.json` — source title + segment SHA-256/counts/heading lists, updated after each stage.
- After C PASS, `HML_<title_sha12>_FULL_SCRIPT.txt` — exactly A+B+C bytes in order, no regenerated prose.

These segment budgets are **planning guides**, not independent hard caps. The actual combined body must be 70,000–80,000 chars inclusive (prefer 74,000–78,000). If a segment is short, improve relevant narrative functions and audit continuity before locking it; never pad it with filler. Every segment must contain the complete designated Parts with natural prose, no placeholders, ellipsis-as-omission or summaries. UTF-8 without BOM; LF line endings; headings standalone; segment begins at its first heading and ends in LF. No telemetry/status/footer inside TXT.

## 4. Machine verification and persistent source proof

1. Write the complete source segment file to disk **during the active call**; do not mistake text printed in chat for saved bytes.
2. Verify and lock via:
   `python scripts/segment_workflow.py stage --title '<exact title>' --outline-file '/mnt/data/FINAL_OUTLINE.txt' --segment A --file '/mnt/data/HML_<sha12>_SCRIPT_A.txt'`
   (replace A with B/C on later calls). Script checks headings, nonempty Part contents, filename/title binding, existing preceding source hashes and manifest. It outputs true segment char/word/file SHA-256; no prose-generation is performed by this utility.
3. Stage B/C requires A/(B) from existing saved manifest. If source hash changed, stop and report; don't reconstruct/rewrite previous Parts silently. If explicitly correcting a staged file, use the utility's `--replace` guard and invalidate later sources (which may need user-authorized regeneration).
4. On C, after staging, run:
   `python scripts/segment_workflow.py assemble --title '<exact title>' --outline-file '/mnt/data/FINAL_OUTLINE.txt'`
   This rehashes all segment sources, assembles exact bytes, then invokes full-script validator before publishing `FULL_SCRIPT.txt`.
5. Finally independently re-run:
   `python scripts/verify_full_script.py '/mnt/data/HML_<sha12>_FULL_SCRIPT.txt'`
   Confirm headings 1..7 exactly once, nonempty parts, 70,000–80,000 exact full-body characters, word telemetry, body/file SHA-256. Any mutation after count requires re-verification.

## 5. Output and next-step suggestion

- A PASS: link actual `SCRIPT_A.txt`, report its real segment chars/words/hash and **only** suggest user enter `step3` again for B.
- B PASS: link actual `SCRIPT_B.txt`, report its real segment chars/words/hash and **only** suggest user enter `step3` again for C.
- C + Full PASS: link actual `SCRIPT_C.txt` and verified `FULL_SCRIPT.txt`, report exact full-body characters/words/body SHA-256. **Only then** suggest `step4`.
- C assembled but length/quality fail: do **not** describe a final full script; keep verified segment sources, identify specific shortfall, repair only necessary staged content (with explicit version/replace integrity), then re-assemble and verify. Do not claim QA READY; that is reserved for independent step4.
- If the file/manifest cannot be created, read or verified, say exactly what is blocked, do not fake a path/hash/count and do not advance the stage.
- Default **file-first** output to reduce truncation; segment prose may be shown inline upon explicit user request if feasible. No `WORKFLOW_STATUS` or other controller-status block.

## 6. Integrity/QA boundary

All segments must be bound to the SAME exact locked title AND exact outline_file_SHA/video_id; the final full file is the source of truth for independent QA V12 step4 independent audit (`step4`). Segment certificate ≠ full script certificate; full script certificate ≠ QA score. No auto-run `step4`, `step5`, `step6`.
