# PERSIST A/B/C / EXACT-BYTE BUILD

Lock title and exact outline file first, hash and `video_id`. For each of 3 distinct step3 calls, save UTF-8 LF source into a real file. Stage tool copies verified source bytes to canonical `WRV_<title_sha12>_SCRIPT_A.txt`, B, C and writes/updates `WRV_<title_sha12>_SCRIPT_MANIFEST.json` verified on every reuse; never fake `B` from a partial response. Run `stage`, `inspect` to verify identity and prior segments, and `assemble` after C only. Assembly is exact concatenation of A+B+C and structural+length verification; no extra teaser text or ellipses.

Examples:
```
python scripts/segment_workflow.py stage --title 'LOCKED TITLE' --outline-file CURRENT_FINAL_OUTLINE.txt --directory WORKDIR --segment A --file draft_A.txt
python scripts/segment_workflow.py inspect --title 'LOCKED TITLE' --outline-file CURRENT_FINAL_OUTLINE.txt --directory WORKDIR
python scripts/segment_workflow.py assemble --title 'LOCKED TITLE' --outline-file CURRENT_FINAL_OUTLINE.txt --directory WORKDIR
python scripts/verify_full_script.py WORKDIR/WRV_<title_sha12>_FULL_SCRIPT.txt
```

On failure report actual error/status. Keep immutable prior segments, do not silently `--replace` published text. Number of calls remains three, no 'auto next' behavior.
