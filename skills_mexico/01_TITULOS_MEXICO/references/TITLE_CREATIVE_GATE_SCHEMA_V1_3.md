# Optional V1.3 structure gate: new additive JSON key, NO OLD KEY CHANGES

For the original `TITLE_GATE_INPUT.json` already accepted by `title_quality_gate.py` and `title_niche_gate_v12.py`, add this `creative_v13` object to EVERY candidate (do not alter existing `title`, `click`, `story`, `niche_lock`, `benchmarks` or `suggested_winner`):

```json
"creative_v13": {
  "resolution_family": "reversed_dependency",
  "hook_frame": "unexpected_request",
  "specific_family_contrast": "My son dismissed my street-food work yet needs my credibility with partners",
  "collision_scene": "Partners hear the son ask for the mother's guarantee during a scheduled meeting",
  "open_question": "Will she accept the request, and what will refusing cost their relationship?",
  "part6_payoff": "She attends the meeting by choice, reads the exact request and decides in front of those affected.",
  "story_cost": "She faces possible estrangement from the son whose business she once helped finance.",
  "originality_delta": "The decisive request concerns family trust, not an unrelated courtroom identity reveal."
}
```

Production call, after both inherited gates:
`python scripts/title_creative_gate_v13.py TITLE_GATE_INPUT.json --output CREATIVE_GATE_REPORT.json`

Scope: deterministic structural checks only (exactly 5; 3 distinct resolution families and hook frames; no family >2; nonempty actionable evidence). It cannot tell whether labels or claims are truthful, whether a plot is legally realistic, or how actual viewers click. Human editorial comparison remains mandatory. `V13_CREATIVE_GATE=PASS` never substitutes for legacy scores or niche fit. Source `SUGGESTED_WINNER` remains not locked until user choice.
