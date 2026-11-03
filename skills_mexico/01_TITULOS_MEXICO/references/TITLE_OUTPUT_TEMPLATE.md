# STEP1 OUTPUT — TITLE V1.1 / CROSS-SKILL-COMPATIBLE

`NICHE: Drama familiar | Mercado: México | Idioma: es-MX | STEP1`

Show EXACTLY five options (no pseudo-winner #6):

| # | TÍTULO es-MX (verbatim) | CARACTERES verified/UNVERIFIED | DNA | CLICK/100 | STORY/100 | COMPOSITE/100 | BENCHMARK |

After table, show for EACH option a compact **DEDUCTIONS** ledger, e.g. `CLICK injustice -2; reversal -6 (only detects ad); open loop -5; STORY ...`; sum must agree with score. Explain WHO wronged WHOM, WHAT irreversible/moral reversal is promised, and what viewer still wants to see. A 96 without explicit lost points is invalid.

**COMPETITOR HOOK BENCHMARK** (at least 3 sourced anchors/candidate; concise table permissible): `CANDIDATE | REF ID + SAME/ADJACENT DNA | WHY ORIGINAL HOOK WORKS | CANDIDATE STRONGER/ON PAR/WEAKER IN (offense, relationship contrast, reversal, unsolved consequence) | OVERALL STRONG/PARITY/WEAKER/DATA_LIMITED | LIMITATION`. Example sources in `COMPETITOR_HOOK_BENCHMARK.md`. Do not say 'my title will get more views'.

**WINNER DECISION**:
- `SUGGESTED_WINNER:` exact title OR `NONE` if not eligible, explicitly `NOT LOCKED`.
- `WHY THIS ONE WINS FOR CLICK:` specific comparison, not merely `high composite`.
- `RUNNER_UP / A-B TEST:` exact second option + why its hook could win under different audience reactions (a hypothesis, not CTR forecast).
- `TITLE_PROMISE`: injustice, contrast, earned heroine action, live curiosity.
- `TITLE_HOOK_BRIEF`: lead; relative; offense; stakes; proof; competence; action in 7-Part; antagonist motive; **climax confrontation**, likely cost; what to withhold; **non-negotiable literal payoff**; no magic legal/account solution.
- `ORIGINALITY CHECK`: ≥3 specific differences from nearest source.
- `STORY_FEASIBILITY`: two credible pathways to 7-Part narrative, identify unresolved procedural uncertainties honestly.
- `LOCKED_TITLE:` only after user confirms exact title; else `PENDING_USER_SELECTION`. Never silently rewrite user-locked original.
- `VALIDATION`: if `title_quality_gate.py` run, report actual output path/result; else unverified numerical counts.

Only after explicit lock, append exact controller suggestion: `Gợi ý bước tiếp theo: Gõ step2 để viết giàn ý 7 Part.`

## V1.2 ADDITIONAL REQUIRED FIELDS (no old columns removed)
For EACH title add `NICHE_FIT: PASS/FAIL + older mother & narrator POV + explicit family wrongdoer + concrete insult + mother's decision + consequence + citation to title's relevant words`. Show V1.2 result from `title_niche_gate_v12.py` if actually run, separately from legacy score gate; if not, `UNVERIFIED`. A title with unspecified culprit like `Me echaron...` must not be silently labeled PASS. Winner gate needs NICHE_FIT PASS **and** existing all score/benchmark guards. Explicitly declare `SCRIPT_CONTRACT: 7 PARTS; 70,000–80,000 Unicode body characters; runtime not inferred`.

## V1.3 REQUIRED AFTER V1.2 OUTPUT FIELDS
Add `DIVERSITY_LEDGER` with five `resolution_family / hook_frame / named_family_wound / collision_scene / unresolved_question` rows. Show `CREATIVE_GATE_V1_3: PASS/FAIL/UNVERIFIED`, referencing actual JSON command result if run; a claimed PASS without script run is invalid. Provide `NONREVEAL_HOOK_CHECK`: at least 2 options promise a concrete encounter without revealing elder's final yes/no. A weak set receives `SUGGESTED_WINNER: NONE` irrespective of winner's composite score. Identify which title risks predictable refusal/denial. No changes to legacy fields and no user lock without explicit selection.
