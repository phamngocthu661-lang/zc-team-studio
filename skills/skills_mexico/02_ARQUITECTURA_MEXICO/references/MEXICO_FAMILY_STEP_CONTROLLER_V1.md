# MEXICO FAMILY — STEP CONTROLLER V1.2.0 (V1 file name/API retained)

Read `SHARED_CROSS_SKILL_CONTRACT_V1.md` and this controller before any step; then owning `SKILL.md`, its `VERSION.txt`, and mandatory references. Do NOT load parallel Homeless/Mafia step-routing rules. A call runs exactly one user-named step, not automatically the next. Valid user commands: `step1...step6` or Vietnamese equivalents explicitly naming the stage.

| Step | Owner folder / installable ZIP | Responsibility | Verified exit artifact |
|---|---|---|---|
| step1 | `01_TITULOS_MEXICO` | title candidates + lock | exact `LOCKED_TITLE` (Spanish) |
| step2 | `02_ARQUITECTURA_MEXICO` | 7-Part outline + cast/canon | `OUTLINE.txt`, SHA, `video_id` |
| step3 A/B/C | `03_ESCRITOR_MEXICO` | writer in 3 persisted source segments | `MXF_<title_sha12>_SCRIPT_A/B/C.txt`, manifest, full verified after C |
| step4 | `04_AUDITOR_MEXICO` | independent audit-only | QA checkpoint or frozen READY/NOT READY, scoped contract for NOT READY |
| step5 | `03_ESCRITOR_MEXICO` | QA-scoped writer repair only | versioned `FULL_SCRIPT_REVISED.txt`, repair proof |
| step6 | `05_SEO_MEXICO` | source-locked SEO/3 thumbnail concepts/trailer | Spanish publish pack |

## Step1
Accept topic, competitor titles or user premise; 5 original title options ≤100 Unicode characters, no plagiary. Winner chosen by user if supplied; do not silently replace an already locked title. Output title explanation and only next-step suggestion.

## Step2
Require locked title. Outline must contain production promise and the resolved seven-Part causal arc, hook and retention gates, Mexico setting and plausible law/ownership, original cast + timeline, quote ledger, object/receipt/message/evidence ledger, property and money ledger, character agency/knowledge, each Part's 10k± allotment, open-loop setup/closure, consequence/reconciliation terms, character names and stable Spanish spelling. Save actual exact outline bytes for script identity.

## Step3
Three explicit separate calls, mode `THREE_STAGE_PERSIST`: A [PART1][PART2], B [PART3][PART4][PART5], C [PART6][PART7] + exact assembly. For every stage call `python scripts/segment_workflow.py stage --title ... --outline-file ... --segment A|B|C --file <canonical path> --directory ...`. Re-read source A/B physically before B/C. After C `assemble` and `verify_full_script.py`; only VERIFIED full script gets Step4. Partial scripts are not full. Count exact codepoints not words.

## Step4
Source identity and validation first; `qa_checkpoint.py init` or resume matching exact hash; actual 3 passes and 168 cells, score and evidence, saturate, `freeze`. Freeze READY only if all criteria in shared contract. On NOT READY with Pxx and valid scoped windows, `freeze_repair_contract.py`, no replacement prose. If audit incomplete output checkpoint only (no frozen score). A postrepair Step4 MUST re-audit the entire revised file, not just patches.

## Step5
Only on frozen NOT READY Pxx and scoped contract with explicit authorization from user; compare original baseline/frozen QA/outline hashes; Writer outputs zone text in `REPLACEMENTS.json` and runs `apply_authorized_patches.py --user-approved`. Copy all bytes outside zones unchanged. Do not re-score and do not open Step6 until another independent Step4 READY.

## Step6
Require current frozen READY file with source hash equal to script hash, score≥98, no actionable patches, and newest source version. `verify_seo_ready.py` preflight; deliver locked primary title, exactly two secondary packaging titles (not replacements), short es-MX SEO description (no uncontrolled false claims), near-500-character comma-separated SEO tags ≤500, appropriate 0–3 hashtags, three completely separate thumbnail prompts 16:9 and 10–30s Omni Trailer shots. Include publish warnings if metadata unverified.

## Exact success suggestions (Vietnamese)
- Step1: `Gợi ý bước tiếp theo: Gõ step2 để viết giàn ý 7 Part.`
- Step2: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 1–2 (lượt A).`
- Step3 A: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 3–5 (lượt B).`
- Step3 B: `Gợi ý bước tiếp theo: Gõ step3 để viết Part 6–7 (lượt C) và ghép Full Script.`
- Step3 C verified: `Gợi ý bước tiếp theo: Gõ step4 để QA độc lập kịch bản.`
- Step4 READY: `Gợi ý bước tiếp theo: Gõ step6 để tạo gói SEO xuất bản.`
- Step4 NOT READY with frozen contract: `Gợi ý bước tiếp theo: Gõ step5 để sửa đúng các vùng QA đã phê duyệt.`
- Step5 verified: `Gợi ý bước tiếp theo: Gõ step4 để QA độc lập lại bản sửa.`
- Step6: no next-step suggestion.
Never append success suggestion to a blocked/partially completed step or within a script file.

## Controller V1.1 backward-compatible quality overlay
Keep ALL command strings, owner folders, segment filenames, SHA formulas, script/QA command interfaces and Step sequence unchanged. At Step1, call new `COMPETITOR_HOOK_BENCHMARK` / two-axis score before winner recommendation. At Step2, require `PROMISE_OWNERSHIP_MAP`; at Step3 use `EMOTIONAL_RETENTION_ENGINE_V1_1`; at Step4 include qualitative `AUDIENCE_COMPETITIVENESS` as an independent pass/fail (map actionable issues to existing QA schema, no schema change); at Step6 ensure thumbnail's decisive action is script-grounded. These gates are editorial reviews, not Python-enforceable CTR or storytelling measures. On incomplete narrative evidence, stay NOT READY / UNVERIFIED and do not auto-advance.

## V1.2 DNA LOCK — CONTROLLER ROUTE OVERLAY (SAME COMMANDS)
STEP1: load Title `FAMILY_DNA_LOCK_V1_2.md`, score and benchmark; run both `title_quality_gate.py` and `title_niche_gate_v12.py` when generating a structured title packet, plus human editorial check. Any off-niche among five => regenerate options, no winner. Treat feedback idea 05 (abandoned older mother/earned signature) as principal test case, idea 01 wedding as runner-up only after direct family culpability and heroine agency established; reject default male millionaire, child or unrelated janitor hero.
STEP2: require older mother/grandmother first-person narrator + explicit family culprit `NICHE_CANON_LOCK` in actual outline; seed all authority/signature evidence rather than deus-ex-machina.
STEP3: enforce first-person witness, mother's decisive action, nonrepetitive escalation; unchanged A/B/C and 70–80k exact body count.
STEP4: `FAMILY_DNA_QA=PASS` + prior `AUDIENCE_COMPETITIVENESS=PASS` needed for editorial READY and tool gate; unresolved DNA issue produces actionable Pxx, NOT READY. No QA JSON schema edit.
STEP5: unchanged byte-scoped repair only. STEP6: mother-centered family thumbnail/SEO and literal source-grounded trailer; no 30–45min inference.
Never change original ZIP folder names, version of Python manifest, command strings or hash inputs. Source analysis is comparative quality judgement, NOT CTR measured uplift.
