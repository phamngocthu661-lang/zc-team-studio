# Optional deterministic TITLE QUALITY GATE JSON

`python scripts/title_quality_gate.py TITLE_GATE_INPUT.json --output TITLE_GATE_REPORT.json`

The complete JSON contains exactly 5 `candidates` objects, plus `suggested_winner` (1–5 or null). Each candidate:

```json
{
  "title": "Mi hijo se burló de mi negocio...",
  "dna": "C",
  "click": {"injustice": 18, "stakes": 13, "contrast": 14, "reversal": 18, "open_loop": 13, "clarity": 9, "language": 5},
  "story": {"promise": 23, "causality": 19, "evidence": 13, "agency": 14, "escalation": 14, "mx_plausibility": 9},
  "composite": 90,
  "deduction_ledger": {
    "click": {"injustice": 2, "stakes": 2, "contrast": 1, "reversal": 2, "open_loop": 2, "clarity": 1, "language": 0},
    "story": {"promise": 2, "causality": 1, "evidence": 2, "agency": 1, "escalation": 1, "mx_plausibility": 1}
  },
  "guards": {"originality": true, "legal_mx": true, "deliverability": true},
  "benchmark_verdict": "PARITY",
  "benchmarks": [
    {"id": "E01", "match": "ADJACENT", "reason": "Specific insult to elder and visible price of family favoritism"},
    {"id": "E02", "match": "ADJACENT", "reason": "Contrasts a brazen rights claim against mother's true authority"},
    {"id": "S01", "match": "ADJACENT", "reason": "Less sensational but leaves a believable consequence unresolved"}
  ],
  "deductions": ["Click clarity minus one: long setting clause near the mobile cutoff"],
  "story_payoff": "The protagonist refuses to sign an optional guarantee and faces a credible family backlash before the final reconciliation."
}
```

The displayed composite **must equal** `round(.75*sum(click) + .25*sum(story))`; the example above is illustrative and should be verified rather than trusted by eye. The comparator match label is an EDITORIAL declaration the script cannot independently verify. It validates structure, math, references, title length and eligibility—not truthfulness of judgments. The packet schema is OPTIONAL so legacy Step1 plain-text consumers are not broken. `SUGGESTED_WINNER` is never a `LOCKED_TITLE` until user confirmation.

Each numeric `deduction_ledger` entry MUST equal rubric maximum minus candidate component score; the validator enforces this for every candidate to expose score inflation. Editorial explanation text must still explain the meaningful lost points; the script cannot verify its truth.

## V1.2 mandatory SECOND gate (additive; no old keys changed)
A packet valid by V1.1 alone is **not** V1.2 production-eligible. For every candidate, add `niche_lock` as specified in `TITLE_NICHE_GATE_SCHEMA_V1_2.md`. Run original `title_quality_gate.py` AND `title_niche_gate_v12.py` on the same JSON. Never nominate a winner until both pass and human editorial evaluation confirms that the family offender is truly culpable and the older woman drives the reversal. Each gate has limits; test scripts are not CTR predictions.
