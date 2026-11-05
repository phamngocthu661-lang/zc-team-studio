# CHANGELOG

## 1.1.0 — 2026-11-01 — first real Mexico story dry-run review

- Reproduced original V1 false positive: Python placeholder checker matched ordinary Spanish `todo` 30 times in the test story, blocking `FULL_SCRIPT.txt` despite valid narration. Fixed exact upper-case placeholder matching.
- Added exact QA finding anchor verification, duplicate finding ID rejection, immutable report digest after checkpoint, and explicit handling for cross-part `related_anchors`.
- Added paragraph-bounded `ONE_REPAIR` proof against frozen QA findings: changed paragraphs within ±1 of anchor, up to 25% of text/paragraphs, original preserved. Audit helper `audit-repair` added, separate from commit. Original example repair is within scope.
- Fixed SEO state semantics: `seo_gate_ready` for QA approval, `seo_ready` after actual 11-section `check-seo` validation. Enforced exact registered QA report digest for publishing gate.
- Increased per-Part completeness floor in default longform from 300 to 1000 words to reduce fabricated 7-chapter completions.
- Expanded storytelling QA: no account-book exposition fatigue, emotional external stakes in each Part, evidence custody and historical/date uncertainty.
- Test cases expanded from 8 to 16, including intentionally invalid changes and false anchors. Standalone test report documented.
- Preserved five Skill folder names, six command steps, 7-Part A/B/C contract, es-MX, and exactly one automatic repair.

## 1.0.0 — initial release

- Initial Mexican Rural Classic 5-Skill/6-step system.
