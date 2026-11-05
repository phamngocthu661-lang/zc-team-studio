# JAPAN KUCHIKOMI STEP CONTROLLER V1.0 — 5 SKILLS / 6 STEPS

## Lệnh điều phối
| Lệnh | Skill | Required input | Artifact / Next |
|---|---|---|---|
| `step1` | viet-lai-tieu-de-japan-kuchikomi | Competitor CSV / requested topic | `TITLE_LOCK.json` → step2 |
| `step2` | viet-gian-y-japan-kuchikomi | Locked title | `OUTLINE.md`, `OUTLINE_LOCK.json` → step3 |
| `step3` | viet-kich-ban-japan-kuchikomi | Locked outline and title | Three stages A/B/C, assemble verified full script → step4 |
| `step4` | kiem-tra-kich-ban-japan-kuchikomi | Exact full script | Frozen pre-repair QA; if READY → step6, otherwise step5 **only once** |
| `step5` | viet-kich-ban-japan-kuchikomi (repair) | QA_FROZEN + baseline | Surgical patches; REPAIR_PROOF → step4-post |
| `step4-post` | kiem-tra-kich-ban-japan-kuchikomi | Revised script+proof | One independent postcheck: READY → step6; BLOCKED → stop, no more automatic repair |
| `step6` | viet-seo-japan-kuchikomi | Locked title + exact READY QA script | SEO, 2 alternate titles, 3 thumbnail concepts/prompts, optional 3 actual images when tool available |

**Hard prohibition:** QA must not draft rewrites; writer cannot self-certify READY; SEO cannot bypass the independent final QA. Never rerun step5 for the same `video_id`/baseline. If pre QA READY (zero problems), no revision needed. "Một lần chỉnh sửa" means maximum ONE repair run, not one sentence.

## Files / working directory example
`OUTPUT/<video_id>/TITLE_LOCK.json`, `OUTLINE.md`, `OUTLINE_LOCK.json`, `PART_A.txt`, `PART_B.txt`, `PART_C.txt`, `FULL_SCRIPT.txt`, `SCRIPT_MANIFEST.json`, `QA_FROZEN.json`, `REPAIR_PATCHES.json`, `FULL_SCRIPT_REVISED.txt`, `REPAIR_PROOF.json`, `QA_FINAL.json`, `SEO_PACKAGE.md`.

## Important CLI examples
From the bundle root, run `python scripts/pipeline_guard.py --help` for commands. Use Python 3.9+. Each standalone Skill ZIP includes the same guard, so it can run alone in its own folder.

1. `title-lock --title '...' --source '...' --output OUTPUT/TITLE_LOCK.json`
2. `outline-lock --title-lock OUTPUT/TITLE_LOCK.json --outline OUTPUT/OUTLINE.md --output OUTPUT/OUTLINE_LOCK.json`
3. `assemble --title-lock ... --outline-lock ... --outline ... --a ... --b ... --c ... --out-script OUTPUT/FULL_SCRIPT.txt --manifest OUTPUT/SCRIPT_MANIFEST.json`
4. `qa-preflight --script OUTPUT/FULL_SCRIPT.txt --manifest OUTPUT/SCRIPT_MANIFEST.json --output OUTPUT/QA_PREFLIGHT.json` (structure only)
5. QA reads fully, produces `QA_FROZEN.json` according to template. Either READY or freezes complete patch ledger.
6. `repair-once --script ... --qa-frozen ... --patches ... --out-script ... --proof ...` (once only)
7. QA does independent semantic check, fills `QA_FINAL.json` with verified status + evidence.
8. `seo-verify --script ... --qa-final ... --title-lock ... --outline-lock ...` (must PASS).

## Customer-facing handoff after each step
Respond in Vietnamese; output video material in Japanese. Say what is finished, exact artifact path, next allowed step, and actual measured counts. Do not claim files saved if environment can't save; don't invent hash and do not say 'READY' based solely on script counts.

## Controller V1.1 overlay (interface unchanged)
- STEP2 requires STORY_SIGNATURE_MATRIX and ending mechanism diversity before OUTLINE_LOCK.
- STEP3 may make as many **pre-baseline draft edits** as necessary; the one-repair limit begins ONLY after frozen QA. Run `editorial-diagnostics` before baseline freeze.
- STEP4 requires exact citation evidence for all 30 reviews and checks canon/persona, not only technical counts.
- STEP5 still **one and only one** repair (all frozen patches batched); each patch must specify `review_id`. No second round.
- STEP4-POST no rewrite; BLOCKED needs explicit new authorization for a fresh project/version.
- STEP6 uses `seo-verify --proof REPAIR_PROOF.json --qa-frozen QA_FROZEN.json --baseline FULL_SCRIPT.txt` for stronger traceability, then independent asset/publishing QA.
- Keep all legacy folder names and existing `TITLE_LOCK`, `OUTLINE_LOCK`, `SCRIPT_MANIFEST`, `QA_FROZEN`, `REPAIR_PROOF`, `QA_FINAL` filename conventions.
