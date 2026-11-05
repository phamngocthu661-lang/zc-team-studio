# THREE-STAGE PERSISTENCE AND ASSEMBLY (CLI CONTRACT)

## Source identity
`title_sha12 = SHA256(title UTF8)[:12]`; `outline_sha256 = SHA256(exact OUTLINE.txt bytes)`; `video_id = SHA256((title+'\n'+outline_sha256).encode('utf8'))[:16]`. All three stages bind same exact outline. Actual file path is stable in one per-video workspace.

## File naming
`MXF_<title_sha12>_SCRIPT_A.txt`, `MXF_<title_sha12>_SCRIPT_B.txt`, `MXF_<title_sha12>_SCRIPT_C.txt`, `MXF_<title_sha12>_SCRIPT_MANIFEST.json`, `MXF_<title_sha12>_FULL_SCRIPT.txt`.

## Commands (replace variable placeholders with shell-quoted actual values)
```
python 03_ESCRITOR_MEXICO/scripts/segment_workflow.py stage --title "$LOCKED_TITLE" --outline-file "$OUTLINE" --segment A --file "$DIR/MXF_${TITLE_SHA12}_SCRIPT_A.txt" --directory "$DIR"
python 03_ESCRITOR_MEXICO/scripts/segment_workflow.py inspect --title "$LOCKED_TITLE" --outline-file "$OUTLINE" --directory "$DIR"
python 03_ESCRITOR_MEXICO/scripts/segment_workflow.py stage --title "$LOCKED_TITLE" --outline-file "$OUTLINE" --segment B --file "$DIR/MXF_${TITLE_SHA12}_SCRIPT_B.txt" --directory "$DIR"
python 03_ESCRITOR_MEXICO/scripts/segment_workflow.py stage --title "$LOCKED_TITLE" --outline-file "$OUTLINE" --segment C --file "$DIR/MXF_${TITLE_SHA12}_SCRIPT_C.txt" --directory "$DIR"
python 03_ESCRITOR_MEXICO/scripts/segment_workflow.py assemble --title "$LOCKED_TITLE" --outline-file "$OUTLINE" --directory "$DIR"
python 03_ESCRITOR_MEXICO/scripts/verify_full_script.py "$DIR/MXF_${TITLE_SHA12}_FULL_SCRIPT.txt"
```
`TITLE_SHA12` is title-only hash, but manifest validates **title+outline**, so never reuse same-title workspace with different outline. For changed outline create a fresh per-video directory and re-stage A/B/C; never silently mutate an existing manifest.

## Stage A lock
Write `[PART 1]` and `[PART 2]`, complete prose with LF terminating. Check title hook and evidence. Stage A output includes file path, hash, body codepoint count from script and state summary separate from story body. Do not claim full 70k body yet.

## Stage B lock
Before writing read exact stored A. Write P3/P4/P5, preserve A. Check all names, chronologies, evidence, offers, payments and legal state. Stage B output is partial proof, no QA.

## Stage C lock
Before writing read exact A and B from persistent files. Write P6/P7 without changing prior bytes. Assemble literal byte concatenation; verify full 7 headings and 70–80k. If under target, revise only *currently open stage* BEFORE locking; if prior stages already locked and full exists, use a versioned repair decision, don't fake hashes.

## Failure conditions
Malformed UTF-8, BOM, CRLF, missing LF at segment end, wrong Part numbers, nonsequential stage, same-title wrong-outline, missing A/B bytes, unsupported `--replace` of locked stage, full out of range, duplicated headings. Exit FAIL / blocked, do not suggest Step4. Test fixture's 22/22 structural cases do not constitute an actual editorial approval.
