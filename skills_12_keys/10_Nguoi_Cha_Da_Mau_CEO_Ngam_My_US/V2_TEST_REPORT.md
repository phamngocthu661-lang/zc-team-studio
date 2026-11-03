# V2 TEST REPORT — NOVEMBER 1, 2026

## Objective
Validate integrity of upgrade package and regression detection on deterministic artifacts, preserving original 5-Skill workflow. This testing cannot certify story quality, business outcomes, YouTube CTR/retention, English editorial perfection or real-time legal rules.

## Input first run
- `10-Black_Dad_Free_Kitchen_ALL_STEPS.zip`: 13 non-corrupt entries.
- Original script: **7,655 words**, SHA-256 `7307a55e6b896825b12424f43fbd88cade480cf6d525cc60756b15cf9ce19718`.
- Once-revised script: **7,712 words**, SHA-256 `e24931c80cb7597e0279134e7c9bd028ff2148778c09b16fe4110f64fcb52429`.
- Three exact authorized replacements, byte-exact preservation of all other content.
- Original QA scores 94 then 98, but fails V2 editorial hook timing review (outline's signature clue at 60–90 seconds, located around 605 words). Under V2 the original run lacks `02_hook_contract.json` and `04_hook_proof.json`; FAIL V2 proof gate (expected, these didn't exist in V1).
- Legacy compatibility mode detects original correct file lineage with warnings only. Legacy mode is **not** an editorial re-approval.

## Synthetic validator regression tests
8/8 PASS via `python -m unittest discover -s tests -v`:
1. Valid synthetic file and hook lineage accepted (mechanical checks only).
2. Missing final hook proof rejected.
3. Frozen outline's required early event omitted from final hook proof rejected.
4. Hook placed late rejected even with textual '98/100'.
5. WPM altered after outline lock rejected.
6. Tampered SHA / draft rejected.
7. Unauthorized text appended during single repair rejected.
8. SEO using wrong final script SHA rejected.

## Boundaries
The script verifies declared anchor positions and frozen deadlines, but cannot infer from the prose alone whether a phrase is semantically a genuine clue. Independent editorial reading remains mandatory. V2 was tested with synthetically generated artifact structures and V1 historical outputs; no new full-length real production was authored using V2 during this test.
