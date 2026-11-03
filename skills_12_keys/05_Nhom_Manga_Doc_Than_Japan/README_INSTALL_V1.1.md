# MANGA ĐÀN ÔNG ĐỘC THÂN NHẬT — SKILLS V1.1.0

## WHAT CHANGED FROM V1.0
- 5 **same skill slugs** and 6 steps, same paths of all original output artifacts and one Step5 repair transaction.
- Step1 includes promise-to-reveal and personal-stakes proof; Step2 adds 8 creative gates and stronger 7-Part emotional progression.
- Writer drafts manga-drawable actions and reciprocal mature romance; no filler with repeated administrative procedures.
- QA still prioritizes **logic, continuity and Japanese spelling/grammar**, and after QA only **one repair**; adds separate creative quality status (not a 98/100 substitute).
- Step6 introduces mandatory **visible PNG inspection** (A/B/C), scene/season/text/ages, distinct compositions, phone-size text. Batch metadata is not visual QA.
- New `release_gate.py` automatically checks lock chain, A/B/C assembly, SHA, one-pass patch integrity, QA status/arithmetic, TTS identical final, SEO tag lengths, 16:9 PNG dimensions. `--strict-publish` additionally requires actual creative and visual review files.

## INSTALL WITHOUT BREAKING EXISTING SYSTEM
1. Import or replace the five ZIPs from `INDIVIDUAL_SKILL_ZIPS/` by **matching existing manga slugs**, not overwriting Mafia/Homeless.
2. Replace Project Instructions with `MANGA_JAPAN_PROJECT_INSTRUCTIONS_V1.1.md` or append the revised creative + publish gating instructions.
3. Follow `MANGA_JAPAN_STEP_CONTROLLER_V1.1.md`. Old output names and role route remain backward-compatible.
4. Python scripts use standard library. No PIL, ffmpeg or OCR needed to validate size/hash/format; actual image scene/text still must be inspected by vision or human.
5. Unit/smoke test the new 5 individual ZIPs + tools first. Report `CREATIVE_EDITORIAL_STATUS` and `THUMBNAIL_VISUAL_QA` separately from `READY_FINAL`.

## VERIFICATION
Run `python skills/manga-doc-than-jp-writer/scripts/test_tools.py` and `python skills/manga-doc-than-jp-qa/scripts/release_gate.py --project-dir EPISODE`. Strict mode with no real review artifacts MUST block. Never invent TTS runtime or claim 98/100 viewer retention. V1.0 reference data retained unchanged.
