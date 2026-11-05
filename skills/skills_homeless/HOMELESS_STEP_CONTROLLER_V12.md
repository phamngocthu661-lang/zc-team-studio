# HOMELESS — STEP CONTROLLER V12 (SIX COMMANDS / DISTINCT DUTIES / PERSIST-FIRST)

**ACTIVE CONTROLLER: V12 only.** Old V8/V9/V10, V11 and their old step router and QA Mode B are ARCHIVED; do not load alongside this file. In a user turn execute **exactly the named step**, never move to next step automatically. Valid commands are `step1`, `step2`, `step3`, `step4`, `step5`, `step6` and clear Vietnamese equivalents. `next`/`continue` are not recognized. Do not generate `WORKFLOW_STATUS`, `NEXT_ALLOWED_PHASE` or corresponding orchestration status boxes.

## 1. Ownership / routing / deliverable

| Command | Owning ZIP (exact name) | Only allowed duty |
|---|---|---|
| `step1` | `Viet-Tieu-De-HOMELESS-V12.zip` (Title v1.2) | Rewrite/score/lock title only |
| `step2` | `viet-gian-y-homeless-V12.zip` (Outline v2.4.0) | Original 7-Part outline + Canon + exact outline-file identity only |
| `step3` (3 calls A/B/C) | `Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR.zip` (Writer v2.0.0 DRAFT) | Genuine full narrative in persistent A/B/C; exact-byte assembly + verified script |
| `step4` | `kiem-tra-kich-ban-homeless-V12-AUDIT-ONLY.zip` (QA v2.0.0) | Independent read-only forensic QA, score, QA checkpoint, frozen defects and QA-owned approved edit-window proposal; postrepair QA also uses step4 |
| `step5` | `Viet-kich-ban-homeless-V12-THREE-STAGE-REPAIR.zip` (Writer v2.0.0 REPAIR) | Write/compose prose ONLY in approved exact byte windows, verified revised full TXT and preservation proof |
| `step6` | `seo-homeless-V12.zip` (SEO v2.1.0) | FACT-LOCKED SEO, two secondary packaging titles, thumbnail, Omni trailer on current exact QA READY script |

The same Writer skill owns **Step3 and Step5** in **mutually exclusive modes**. QA must NEVER compose replacement narrative. Writer must NEVER issue QA score or READY. Controller must NEVER author missing content or invent artifacts.

## 2. Mandatory source loading + proof

Before every step read this controller, `HOMELESS_INSTRUCTION_DIEU_PHOI_SKILL_STEP1_STEP6_V12.md`, the chosen ZIP's `VERSION.txt`, `SKILL.md`, `references/CROSS_SKILL_QUALITY_CONTRACT.md`, and all mandatory references for that exact mode. Content and proof must correspond to same video with actual file bytes, not assumed from prior chat.

`title_sha12 = SHA256(exact UTF-8 title)[:12]`; `outline_sha256 = SHA256(exact outline TXT bytes)`; `video_id = SHA256(title + LF + outline_sha256)[:16]`. `SCRIPT_MANIFEST.json` v2 binds title AND outline. Same-title different-outline videos cannot reuse draft file/manifest. If only V11 manifests exist, do NOT silently use/mutate: explicit migration/version decision and immutable source validation are needed.

## 3. Step3 persistent source contract

- Invocations: `step3` (`SCRIPT_MODE=THREE_STAGE_PERSIST`) A Part 1–2, next explicit `step3` B Part 3–5, next explicit `step3` C Part 6–7 and full assemble, only one sub-stage per user request.
- Source: locked final title + actual persistent 7-Part outline and canon. Reopen and read A before B; reopen A/B before C. Segment text is complete prose American English, no filler or placeholders.
- Save real UTF-8 LF `HML_<title_sha12>_SCRIPT_A.txt`/`B.txt`/`C.txt`; `scripts/segment_workflow.py stage|inspect|assemble` V12 ALWAYS requires `--outline-file` and verifies same exact title+outline identity/manifest. Never use `next` or `continue`.
- `FULL_SCRIPT.txt` after C is EXACT A+B+C bytes; independently run `scripts/verify_full_script.py`: 7 ordered headings, each substantive, 70,000–80,000 exact body codepoints inclusive, preferably 74,000–78,000, file/body SHA-256. No full result/Step4 suggestion until PASS.
- A/B are valid PARTIAL artifacts, not QA eligible. If a segment fails, resume same unfinished stage using verifiable source, not regenerate previous locked text from memory.

## 4. Step4 forensic QA only

1. Inspect actual full/revised script and its provenance; exact file/body hash, headings, codepoint count and title/video identity, then initialize/resume real QA checkpoint with mandatory `--outline-file` identity binding.
2. Actually complete Read #1, #2, reverse #3, 7×24 dimension matrix, canon/physical/legal/financial/knowledge and retention sweeps, omission/repair simulation, full zero-new-defect saturation; persist evidence between passes. `qa_checkpoint.py` is an evidence validator, NOT an AI story critic.
3. Freeze full score/rubric, QA source and actionable Pxx/Oxx only after genuine coverage; numeric score exactly /100, no inflation. `READY` only with ≥98, all hard gates PASS, valid length, zero unresolved actionable defects.
4. For `NOT READY`, QA identifies root causes, viewer impact and acceptance tests; creates **exact QA_ZONE_SPEC byte offsets** and freezes `QA_REPAIR_CONTRACT` using `freeze_repair_contract.py`, which rejects vague/overlapping/unanchored windows, protected quotes/heading edit and wrong SHA/video. QA NEVER writes the replacement story text. Without frozen full contract and user approval, no Step5.
5. For incomplete audit, checkpoint only, no frozen score/contract; another explicit `step4` resumes same source hash. For QA after Writer repair, re-audit entire current revised TXT independently and freeze a NEW QA record bound to revised SHA.

## 5. Step5 Writer Repair only

Only when user explicitly calls `step5` for frozen actionable findings and QA-owned scoped contract:

- User's explicit `step5` means approval for that identified frozen ledger unless user narrows the scope; if partial, first return to QA for subset-specific closed scope. No presumed user approval in Step4.
- Verify exact baseline, prior QA frozen file hash, V12 repair contract SHA, outline/video ID, all zones, strong spans, approved Pxx and scope; stop if any source missing/conflicting.
- Writer authors `REPLACEMENTS.json` containing one original American English replacement prose string per approved zone; it doesn't author outside zones.
- Run `scripts/apply_authorized_patches.py` with actual explicit `--user-approved` and all source files; verify exact copied immutable spans, all patch zones mapped, same headings, 70k–80k and revised SHA; output versioned `FULL_SCRIPT_REVISED.txt` + `REPAIR_PROOF.json`.
- Writer does not decide QA readiness or rescore. Return Step4 suggestion after the revision proof PASSES; Step6 remains prohibited until a subsequent QA READY on the revised exact file.

## 6. Step6 SEO publication gate

Run SEO `scripts/verify_seo_ready.py` with exact current script, *newest frozen QA on that same file*, locked title and outline. QA must report READY, numeric score ≥98, all hard gates PASS and no actionable defects; hashes must match current bytes. Writer proof or older baseline READY is insufficient. SEO keeps primary locked title, generates **exactly TWO secondary packaging titles** (nonreplacement), grounded descriptions/tags/thumbnail and 10–30s Omni multishot trailer; no invented events or title changes. No next-step suggestion.

## 7. Verified learning feedback

A post-repair QA may create `QA_LESSON_CANDIDATES.json` bound to baseline and postrepair QA proof; proposals require separate editor validation/versioning before becoming `VERIFIED` improvements to Title/Outline/Writer/QA/SEO. The machine does not autonomously retrain or change a future skill. Never mix lessons between video IDs unless human-approved and generalized.

## 8. Exact one-sentence suggestion on SUCCESS only

| Verified success | Exactly one last sentence |
|---|---|
| Step1 | **Gợi ý bước tiếp theo:** Gõ `step2` để viết giàn ý 7 Part. |
| Step2 | **Gợi ý bước tiếp theo:** Gõ `step3` để viết phần A (Part 1–2). |
| Step3 A | **Gợi ý bước tiếp theo:** Gõ `step3` để viết phần B (Part 3–5). |
| Step3 B | **Gợi ý bước tiếp theo:** Gõ `step3` để viết phần C (Part 6–7) và ghép Full Script. |
| Step3 C + verified Full | **Gợi ý bước tiếp theo:** Gõ `step4` để kiểm tra và chấm điểm kịch bản. |
| Step4 score≥98/READY/all gates PASS | **Gợi ý bước tiếp theo:** Gõ `step6` để tạo SEO hoàn chỉnh. |
| Step4 NOT READY + frozen Pxx + valid QA repair contract | **Gợi ý bước tiếp theo:** Gõ `step5` để Writer sửa đúng Frozen Patch Ledger đã duyệt. |
| Step5 verified revised | **Gợi ý bước tiếp theo:** Gõ `step4` để QA độc lập đánh giá lại bản sửa. |
| Step6 | NO next-step suggestion. |

On errors/unfinished audit/blocked proof, report actual file, source hash if known, missing conditions and recovery action; do not give next-step suggestion as if step succeeded. Never put the suggestion inside a manuscript or proof file.
