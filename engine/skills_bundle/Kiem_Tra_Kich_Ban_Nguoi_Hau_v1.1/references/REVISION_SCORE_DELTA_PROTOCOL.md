# REVISION SCORE DELTA PROTOCOL — NGƯỜI HẦU V1.1

## PURPOSE
Prevent misleading claims that a revision became worse merely because a later audit discovered an older defect that the previous audit missed.

## 1. NEW-FINDING CLASSIFICATION
For every defect not present in the immediately preceding frozen Patch Ledger, classify:

- `R — REGRESSION`: created by the latest revision or by an authorized patch dependency.
- `L — LATENT OMISSION`: already existed in the prior script but the prior QA failed to ledger it.
- `N — NEWLY APPLICABLE`: only became a defect because the story/contract/state changed.
- `P — PREFERENCE`: not actionable; no deduction and no patch.

Use textual comparison, baseline snapshots, and authorized diff when available.

## 2. TWO SCORE VIEWS
When a previous published QA score exists, report:

### CURRENT ABSOLUTE FORENSIC SCORE
Score the current script using the frozen deterministic rubric and all defects known now.

### COMPARABLE REVISION SCORE
For an apples-to-apples revision comparison:
1. Retroactively apply any `L — LATENT OMISSION` deductions to the prior script to calculate `CORRECTED PRIOR SCORE`.
2. Compare current absolute score against that corrected prior score.
3. `REVISION QUALITY DELTA = CURRENT ABSOLUTE SCORE - CORRECTED PRIOR SCORE`.

Do not compare current score only against an inflated prior score that omitted known-at-present defects.

## 3. ATTRIBUTION
Report the delta in four buckets:
- Known defects fixed: +X
- Revision regressions: -Y
- Latent QA omissions discovered: audit debt; not revision blame
- Newly applicable defects: -Z if genuinely caused by changed state/contract

## 4. SCORE-DECREASE RULE
If the current published absolute score is lower than the previously published score, the QA must explicitly explain why.
Never say “revision got worse” unless `R — REGRESSION` or an authorized content change actually caused the decrease.

## 5. CONTRACT CHANGE
If user changed title, outline, length target, safety requirement, or other scoring contract between rounds:
- label `CONTRACT CHANGED`;
- compute the current score under the new contract;
- do not claim direct score comparability unless also rescoring the prior script under the new contract.
