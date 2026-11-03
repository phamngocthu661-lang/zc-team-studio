# Three stage deterministic handoff
- `python scripts/segment_workflow.py stage --title 'EXACT LOCKED TITLE' --outline-file CURRENT_FINAL_OUTLINE.txt --directory OUTDIR --segment A --file OUTDIR/DADUS_<title_sha12>_SCRIPT_A.txt`
- Repeat with B and C strictly sequentially. `segment_workflow.py inspect` before continuing. Do not recompute prior prose from context; read exact saved files.
- `python scripts/segment_workflow.py assemble --title 'EXACT LOCKED TITLE' --outline-file CURRENT_FINAL_OUTLINE.txt --directory OUTDIR`
- `python scripts/verify_full_script.py OUTDIR/DADUS_<title_sha12>_FULL_SCRIPT.txt --outline-file CURRENT_FINAL_OUTLINE.txt`
- Real files only. Script body excludes standalone Part heading lines. Every script stage ends with LF; no BOM, no CRLF. A/B/C equal assembled script byte for byte. Each mode uses same `LENGTH_PROFILE` locked inside outline.
