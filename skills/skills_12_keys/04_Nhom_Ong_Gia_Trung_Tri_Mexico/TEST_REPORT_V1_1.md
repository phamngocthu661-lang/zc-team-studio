> Historical V1.1 evidence ONLY; V1.2 overrides length and thumbnail steps. Do not treat this as a current V1.2 test report.

# V1.1 regression test report

## test_system.py

```text
PASS B stage without A is rejected
PASS Stage A saved with checksums
PASS Stage B saved with checksums
PASS Stage C saved with checksums
PASS Assembly exact bytes A+B+C and length 70k–80k
PASS Verify 7 ordered Parts and plausible length
PASS Inspect all three stages
PASS Wrong outline identity rejected
PASS Short/incomplete manuscript rejected
PASS QA baseline freezes only eligible findings
PASS SEO blocks QA NOT READY
PASS Synthetic anchors found
PASS Partial intersection with protected text rejected
PASS Narrow exact anchored edit zone allowed
PASS One authorized surgical repair writes full revision/proof
PASS Outside edited window byte EXACT
PASS Same output second repair prohibited
PASS Second repair via alternative output paths prohibited
PASS Post-repair independent QA can reach READY
PASS SEO exact revised READY QA + proof accepted
PASS SEO source mismatch fails (cannot reuse QA on baseline)
PASS SEO revised without repair proof fails
PASS QA rejects tampered revised source
PASS Postrepair with unresolved defect becomes BLOCKED_FINAL
PASS QA cannot freeze second repair contract
TOTAL 25 PASS 25 FAIL 0
```

## test_v11_regressions.py

```text
PASS Age 41 in 2026 + pregnancy after 1986 flagged
PASS QA 99/100 cannot silently READY with unresolved risk
PASS Explicit TIMELINE finding allows freeze as NOT READY
PASS Unsupported narrative-resolution assertion is rejected
PASS Documented on-page chronological clarification can resolve ambiguity
PASS Inflated QA score rejected by rubric sum
PASS Missing Part 7 source-backed audit rejected
PASS Nonexistent evidence quote rejected
PASS Explicit pregnancy year after birth window rejected
PASS Chronologically plausible earlier pregnancy not false-flagged
PASS Narrative chronology module compiles
PASS Uploaded first-run script contains same flagged risk
V11_TOTAL 12 PASS 12 FAIL 0
```

## test_seo_v11.py

```text
SEO tags fixture len: 474
PASS Valid source-backed SEO with 450..500 tag chars
PASS Invented exact quote is rejected
PASS Oversized tags rejected
PASS Missing distinct B thumbnail rejected
SEO_V11_TOTAL 4 PASS 4 FAIL 0
```

