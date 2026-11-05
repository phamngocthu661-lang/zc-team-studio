# Strict ONE controlled repair protocol

A. Before repair, QA must find all current defects and freeze complete ledger. If `QA_FROZEN` already exists for original hash, do not silently overwrite it.
B. Only writer in `step5` edits. Single call to `repair-once` implements all approved exact snippet replacements and writes a non-overwritable proof. No global replace if old substring occurs multiple times, no crossing Part or 口コミ boundaries.
C. Post check is a separate independent QA read. If new issue found, output `BLOCKED_MANUAL_REVIEW_REQUIRED` without second auto-fix.
D. Do not convert `BLOCKED` to READY by increasing an arbitrary score. `SEO_READY` requires final QA JSON with `editorial_verified=true`, no blocking issues, matched script/title/outline hashes and structural validation.
E. If QA pre-review says READY, skip repair: final status may be produced on the original script after independent review, with `repair_rounds=0`.

### Example Frozen JSON
```json
{
  "original_sha256": "<actual SHA256>",
  "qa_decision": "NEEDS_ONE_REPAIR",
  "editorial_review_completed": true,
  "covered_reviews": 30,
  "authorized_patches": [{"patch_id":"J001","category":"spelling","old_text":"シルバー人材セーター","reason":"誤変換"}]
}
```

### Example `REPAIR_PATCHES.json`
```json
{"patches":[{"patch_id":"J001","new_text":"シルバー人材センター"}]}
```

Patch sample for documentation only, not a source text or promise that a specific original script contains that typo.

## V1.1 — only one edit, all identified blocking findings consolidated
Audit ALL 30 reviews and the intro/closing BEFORE writing a frozen patch ledger. Each authorized patch includes `patch_id`, `review_id`, `category`, `old_text`, `reason`, `severity`, and proposed `new_text` separately in Writer patches. Repair replaces only exact excerpts in target review; never make wholesale stylistic rewrites. For a fault in the standalone introduction or outro, attach the text to 口コミ01 or 口コミ30 respectively only if it is physically within that review body; otherwise route to manual correction/new baseline before QA freeze. After one repair, QA_POST checks every patch and every causal statement touched; if a new error persists mark `BLOCKED_MANUAL`. `repair_rounds` stays 1 permanently for this baseline.
