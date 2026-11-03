# US MIDNIGHT — V1.1 CONTROLLER (STABLE V1 FILENAME)

Execute exactly **one** explicitly requested step; same five Skill folders and command labels as V1. Unsupported `next` alone = clarify, never assume. Re-read shared contract and owning SKILL before each stage.

| Command | Owner | Output / precise gate |
|---|---|---|
| `step1` | `01_title_rewriter` | 5 title candidates, winner `TITLE_LOCK.txt`, handoff; do not write story |
| `step2` | `02_outline_engine` | N distinct story architecture, persisted OUTLINE, CANON, IDENTITY and stage handoff |
| `step3` | `03_script_writer` DRAFT | 3 separate invocations: A, B, C; on C merge exact persisted bytes and create manifest; verify project |
| `step4` first | `04_script_auditor` | Audit only, source-bound issue ledger and report, no narrative editing |
| `step5` if needed | `03_script_writer` REPAIR | One script execution only, strict authorized spans; auto-updated revised manifest; reverify |
| `step4` second | `04_script_auditor` | One READ-ONLY final check, create source-locked `FINAL_QA_GATE.json`, no second patch |
| `step6` | `05_seo_publish` | Run full release validator first, then SEO and thumbnails and revalidate source binding |

Dispatch gate:
- Step3 stage A if no A exists; B if A valid and B absent; C if A+B valid and C absent. If existing file has wrong hash/identity, STOP rather than overwrite. Three invocations mandatory.
- Before Step4 first audit, confirm `tools/verify_project.py PROJECT_DIR` PASS. If the story is already READY in first QA, skip step5 and seal `FINAL_QA_GATE.json` for original SHA.
- Before Step5, must have baseline `QA_ISSUES.json` bound to original SHA and all project hashes valid; no `REPAIR_LOCK.json`, revised script or repair proof. If repair has already happened, REFUSE even if asked again.
- Before Step4 final, source manifest and REPAIR_PROOF must PASS; QA cannot edit any text. If any critical defect persists, gate BLOCKED forever for that video identity.
- Before Step6, `verify_project.py` plus release flag must PASS. `finalize_release.py --seo` must PASS after metadata. Do not reuse a V1 human-readable final report without V1.1 gate JSON.
- Never declare generated files, runtime, quality or READY solely from a descriptive summary. Explain precise blockers and next permissible command.

Call sequence for a default video: `step1`, `step2`, `step3` (A), `step3` (B), `step3` (C), `step4`, optional `step5`, `step4` (only after repair), `step6`. No automatic multi-step jump.
