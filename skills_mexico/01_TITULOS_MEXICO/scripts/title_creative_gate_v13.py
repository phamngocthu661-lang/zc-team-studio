#!/usr/bin/env python3
"""V1.3 ADDITIVE portfolio gate for metadata completeness and title variety.
Semantic/editorial judgment is NOT automated; must also run title_quality_gate.py
and title_niche_gate_v12.py and manually review family/click/plot truth.
"""
import argparse
import collections
import json
from pathlib import Path
import re
import sys
import unicodedata

FAMILIES = {"withheld_support", "public_confrontation", "reclaimed_space",
            "reversed_dependency", "evidence_ambush", "family_ultimatum",
            "procedural_boundary", "unresolved_request", "other"}
FRAMES = {"direct_quote", "family_contrast", "caught_in_the_act",
          "humiliation_to_collision", "unexpected_request",
          "betrayal_plus_cost", "other"}
FIELDS = ("specific_family_contrast", "collision_scene", "open_question",
          "part6_payoff", "story_cost", "originality_delta")
# These regexes are HEURISTIC; they cannot catch all semantic refusals.
REFUSAL = re.compile(r"\b(?:le\s+negu[eé]|les\s+negu[eé]|rechac[eé]|"
                     r"le\s+exig[ií]|les\s+exig[ií]|no\s+firm[eé]|"
                     r"no\s+le\s+di|me\s+negu[eé])\b", re.I)

def validate(packet):
    issues = []
    candidates = packet.get("candidates")
    if not isinstance(candidates, list) or len(candidates) != 5:
        return {"status": "FAIL", "issues": ["Exactly five candidates required"]}
    fam, fram = [], []
    refusals = []
    for i, item in enumerate(candidates, 1):
        p = f"candidate_{i}"
        if not isinstance(item, dict):
            issues.append(p + ": must be object")
            continue
        title = item.get("title", "")
        if not isinstance(title, str) or len(unicodedata.normalize("NFC", title)) > 100 or len(title.strip()) < 20:
            issues.append(p + ": title length invalid; must be 20-100 codepoints")
        if isinstance(title, str) and REFUSAL.search(title):
            refusals.append(i)
        cr = item.get("creative_v13")
        if not isinstance(cr, dict):
            issues.append(p + ": creative_v13 object missing")
            continue
        ff = cr.get("resolution_family")
        frame = cr.get("hook_frame")
        if ff not in FAMILIES:
            issues.append(p + ": invalid resolution_family")
        else: fam.append(ff)
        if frame not in FRAMES:
            issues.append(p + ": invalid hook_frame")
        else: fram.append(frame)
        for k in FIELDS:
            value = cr.get(k)
            if not isinstance(value, str) or len(value.strip()) < 20 or value.strip().lower() in ("unknown", "n/a", "none"):
                issues.append(p + ": missing substantive " + k)
    cf = collections.Counter(fam)
    ch = collections.Counter(fram)
    if len(set(fam)) < 3:
        issues.append("portfolio: at least 3 distinct resolution families required")
    if any(v > 2 for v in cf.values()):
        issues.append("portfolio: a resolution family appears over twice")
    if len(set(fram)) < 3:
        issues.append("portfolio: at least 3 distinct hook frames required")
    if len(refusals) > 2:
        issues.append("portfolio: over 2 explicit refusal-type endings detected; check semantic equivalents manually")
    return {
        "status": "PASS" if not issues else "FAIL",
        "issues": issues,
        "family_counts": dict(cf), "hook_frame_counts": dict(ch),
        "detected_explicit_refusals": refusals,
        "requires_semantic_human_review": True,
        "disclaimer": "Technical packet/variety check only; not a CTR or literary-quality score."
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input_json")
    ap.add_argument("--output")
    args = ap.parse_args()
    try:
        packet = json.loads(Path(args.input_json).read_text(encoding="utf-8"))
        result = validate(packet)
    except (OSError, ValueError) as exc:
        result = {"status": "FAIL", "issues": [str(exc)]}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if args.output:
        Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return 0 if result["status"] == "PASS" else 1

if __name__ == "__main__":
    sys.exit(main())
