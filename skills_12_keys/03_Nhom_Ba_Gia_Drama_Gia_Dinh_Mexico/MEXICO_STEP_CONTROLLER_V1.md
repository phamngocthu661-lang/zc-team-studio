# MEXICO DOÑA FAMILY DRAMA — STEP CONTROLLER V1.1

Compatibility: retain **five installed Skill root folder names ending `_V1`** and the same six commands; version inside each is 1.1.0. For this upgrade, remove/replace the five V1 folders as a coordinated set. Do NOT mix V1 and V1.1. Python >=3.9 (stdlib-only).

| User command | Active Skill (existing root name) | Output / contract |
|---|---|---|
| `step1` | `01_Tieu_De_Mexico_Dona_V1` | five original es-MX titles, ONE locked `TITLE_LOCK.json` |
| `step2` | `02_Gian_Y_Mexico_Dona_V1` | outline with 21–28 causal scenes, dates and fact-first-known; `OUTLINE_LOCK.json` |
| `step3 A/B/C` | `03_Viet_Kich_Ban_Mexico_Dona_V1` | 7-Part full script, 70–80k body characters; exact SHA of persisted 3 stages |
| `step4 INITIAL` | `04_QA_Mexico_Dona_V1` | original full read; one complete `QA_ISSUES.json`, freeze one batch if needed |
| `step5` | `03_Viet_Kich_Ban_Mexico_Dona_V1` | exactly ONE surgical Writer batch; separate revised file and patch SHA/offset proof |
| `step4 FINAL` | `04_QA_Mexico_Dona_V1` | independent full reread + `QA_EDITORIAL_EVIDENCE.json`, `qa-final` with evidence and correct `TECH_PASS` / `EDITORIAL_PASS` |
| `step6` | `05_SEO_Thumbnail_Mexico_Dona_V1` | `seo-gate` with evidence, metadata + 3 thumbs + `FULL_SCRIPT_TTS_CLEAN.txt` |

**Order:** 1 → 2 → 3A → 3B → 3C → 4 INITIAL → [5 if defects] → 4 FINAL → 6 only on READY. If baseline had no issues, 4 FINAL can run directly with zero repairs and current original script. Do not silently advance to a different step. Segment A/B/C require three separate invocations, persisting real files; no "I saved" without on-disk evidence.

## Critical V1.1 release conditions
- Actual latest script must have 7 headings; body 70,000–80,000 Unicode codepoints; exact title/outline/video ID and SHA lineage.
- QA must do its *own* date/time/character-knowledge/orthography review of the final script, not copy tables from outline or trust previously passed numbers.
- QA must create `QA_EDITORIAL_EVIDENCE.json` with 21+ actual scene spans, all 7 Parts, exact source quotes, ISO story dates, part-specific times of day, causal change and fact/revelation chain. Mark flashbacks by an ACTUAL quoted in-story textual signal. Divide at every material shift of day/time or knowledge state: no hiding a time jump inside an overly broad scene record.
- On each patch, reread the before and after context and two neighboring scenes, and produce anchored patch reviews. Use `review-evidence` CLI before final QA. At postrepair `qa-final`, even score 100 cannot override structured chronology/knowledge/patch findings. `QA_FINAL.json` must be V1.1 with separate `TECH_PASS=true` and `EDITORIAL_PASS=true`.
- `MAX_REPAIR_ROUNDS=1` never changes. One failed postrepair QA -> `NOT_READY`, TERMINAL, NO STEP6 and NO second Step5. Evidence collection itself is not a second story rewrite; manuscript bytes must remain untouched.
- SEO `seo-gate` requires both exact final QA and matching `--editorial-evidence` SHA; V1.0 READY results are not sufficient. Export TTS only after READY. Always distinguish thumbnail **prompts** from genuinely rendered/checked image files.
- Automatic validators enforce structural consistency of *reviewer-provided* evidence; they cannot independently read story meaning, guarantee natural es-MX, Mexican legal accuracy, future CTR or audience retention. Do not mislabel an AI-only review as human.

## Exact additional V1.1 command flags
`python scripts/mexico_pipeline.py review-evidence --script FULL_SCRIPT_REVISED.txt --evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json`

`python scripts/mexico_pipeline.py qa-final --script FULL_SCRIPT_REVISED.txt --report QA_FINAL_INPUT.json --editorial-evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --out QA_FINAL.json`

`python scripts/mexico_pipeline.py seo-gate --script FULL_SCRIPT_REVISED.txt --qa QA_FINAL.json --editorial-evidence QA_EDITORIAL_EVIDENCE.json --repair-proof REPAIR_PROOF.json --title-lock TITLE_LOCK.json --manifest MXF_<sha12>_SCRIPT_MANIFEST.json --out SEO_GATE.json`

`python scripts/mexico_pipeline.py tts-export --script FULL_SCRIPT_REVISED.txt --qa QA_FINAL.json --out FULL_SCRIPT_TTS_CLEAN.txt`

If no repair, omit `--repair-proof` from review-evidence, qa-final and seo-gate and use the original full script. The rest of existing CLI args remain unchanged.
