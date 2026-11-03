# SHARED CROSS-SKILL CONTRACT — MEX_INFIDELIDAD_V1
Version: 1.0.0. This file is normative and overrides conflicting creative references, except explicit later user instructions.

## Roles & exclusive authorities
| Step | Skill | Owns | Cannot do |
|---|---|---|---|
| S1 | viet-lai-tieu-de-mexico | Analyze competitors; 5 title candidates; winner; title lock | Write full script; change title after lock without new run |
| S2 | viet-gian-y-mexico | Canonical outline, story DNA, scene and continuity state | Change locked title; claim script written |
| S3 | viet-kich-ban-mexico | Full es-MX story and source-verified assembly | Official QA score or SEO readiness |
| S4 | kiem-tra-kich-ban-mexico | Independent diagnostics, scoped freeze, QA report | Rewrite any story prose |
| S5 | viet-kich-ban-mexico | Exactly one QA-scoped revision | Expand editable areas or run a second repair |
| S4B | kiem-tra-kich-ban-mexico | One independent verification of the revised FULL | Do new repair; hide remaining issues |
| S6 | viet-seo-mexico | Fact-aligned SEO, thumbnails/prompts, trailer | Alter title/script or claim renders without media |

## Source precedence
1. Current video `TITLE_LOCK` / `CURRENT_FINAL_TITLE` EXACT string.
2. Current `FINAL_OUTLINE.md` + `OUTLINE_LOCK` and canonical state ledgers.
3. Current `FULL_SCRIPT.txt` (or `FULL_SCRIPT_REVISED.txt`) + actual SHA.
4. QA frozen findings + final report + exact verified SHA.
5. Niche DNA analysis and competitor evidence — only patterns, never ungrounded events.

## Shared video identity and file invariants
- `NICHE_ID = MEX_INFIDELIDAD_V1`.
- `video_id = sha256(exact title in UTF-8).hexdigest()[:12]`; distinct original title requires distinct run.
- Fixed 7 PART headings exactly `[PART 1]` through `[PART 7]`, in order, once. Headings are metadata, not narrated.
- Script body = document with `[PART N]` headings removed, excluding leading/trailing whitespace. Counts are true Unicode code points / Spanish lexical words, not bytes.
- Default: body 12,500–14,500 spoken words AND 75,000–100,000 body characters, unless user sets a consistent explicit custom target before S2. Any conflict must be resolved BEFORE drafting; no fabricated proof.
- Script dialogue should be naturally quoted or integrated for a single narrator; no stage directives, emojis, `[SFX]`, AI prompt prose, narrator meta talk, timestamps or English meta in TTS file.
- Every artifact saves UTF-8 with LF; actual hash of exact disk bytes recorded. No copy/paste hallucinated hashes.
- `CURRENT_FINAL_TITLE` immutable after S1; 2 alternate SEO titles do not replace it.

## Audience, format, originality
- Spanish (Mexico), fluent vernacular, emotional but credible telenovela, women primarily as autonomous protagonists; no gender stereotyping or copying real scripts.
- Preserve what earns the click: betrayal act, relationship stake, difficult irreversible choice, evidence/reversal, consequences. Never copy a competitor's distinctive plot beats/name combination, shot/image or exact title structure with superficial synonym substitution.
- 60/40 describes emotional mechanic vs creative originality, NOT a permission to reproduce copyrighted text.
- Family/medical/legal scenes are fiction; no fabricated citations or implausible quick legal victories. Use accurate everyday terms (pesos, not dollars unless specified; CDMX, not 'Mexico City' inside narration except context). Verify high-impact legal/medical rules before stating them as fact.
- Depict emotional abuse / infidelity responsibly. Avoid sexual explicitness, revenge porn, graphic harm, spectacle around pregnancy or child suffering, and gendered humiliation as an end in itself.

## Shared run statuses
`S1_TITLE_LOCKED → S2_OUTLINE_LOCKED → S3_DRAFTING(A/B/C) → S3_FULL_VERIFIED → S4_QA_FROZEN → S5_ONE_REPAIR_DONE(optional) → S4B_FINAL_READY | S4B_FINAL_BLOCKED → S6_SEO_DONE`.
- A run with READY at S4 and no issues can freeze `QA_FINAL.json` with `repair_count=0` directly.
- If S4 finds problems, S5 exactly once (`repair_count=1`), S4B always required. Post-S4B P0/P1 or unresolved critical issues -> BLOCKED / human decision, never recurse back automatically.
- QA passing target: editorial >=97/100, **no P0/P1**, no blocking typo/identity/timeline/causality faults, all hard gates pass. Scores are human/editorial estimates, not measurable YouTube predictions.

## One-shot QA repair safety
- QA builds `QA_FINDINGS.json` with `source_sha256` matching full baseline, `issues:[{id,category,severity,part,old_text,root_cause,acceptance_test}]`, protected-span quotes; text anchors must be unique. Freeze via `scripts/workflow_tools.py qa-freeze`.
- Writer generates `{replacements:[{id,text}]}` corresponding to ALL frozen issues. Apply once via `repair-apply` with unchanged baseline and frozen contract. Any attempt to write into protected-span byte ranges MUST fail.
- Repair proof locks original SHA, revised SHA, every byte interval, replacement hashes and `repair_count=1`; verification recomputes exact expected revised bytes. Whole-script logic/typo validation still belongs to S4B.
- Any additional proposed repair requires a new editorial run/version and explicit human decision; never misrepresent as same cycle.

## Full SEO gate
- `QA_FINAL.json` must identify `title_sha256`, `outline_sha256` (when known), exact final `script_sha256`, `status=READY`, and `repair_count` in {0,1}. If these are missing or mismatch, S6 = BLOCKED.
- Thumbnail: 3 distinct A/B/C prompts mandatory, image render only when actual image tool available; record distinct proof paths for real files if made, otherwise say `NOT_RENDERED`.
- Trailer 10s and 20/30s options cannot invent scenes outside the script.

## Unsupported states
Do not invent artifacts, tool execution, audit pass, native speakers, or real publisher outcome. Disclose blockers precisely. `next` resumes only a verifiable matching run and nearest unfinished stage; `status` reports facts; `redo` needs a fresh version and may invalidate downstream artifacts.


## V1.1 ADDENDUM — execution-level acceptance
- EXACTLY ONE repair **after** independent S4 audit; gather all objective P0–P2 in one frozen contract. S4B NEVER performs second repair, even if newly noticed defects are important.
- Language QA must examine awkward/ambiguous referents and tautological collocations, not only typos and accents. Witness knowledge must distinguish direct observation vs hearing later from media.
- Any QA score 97+ requires a 7-PART EVIDENCE TRACE in `QA_INITIAL_REPORT.md` and `QA_FINAL_REPORT.md` with at least one quote and witness/event timeline per part. Script length/hash is not a quality certificate.
- `audit-run --workdir runs/<video_id>` checks staged script, title and outline locks, frozen contract, one repair marker, final source chain; `--require-seo` additionally checks SEO files. `seo-gate --workdir runs/<video_id>` runs strict cross-step source verification. Basic `seo-gate` without `--workdir` is legacy and does not establish chain integrity.
- All outputs continue to use original V1 filenames, folder names, PART labels and JSON keys. The new CLI options are additive and preserve old scripts.
- Manifest V1.1 stores stage paths relative to run when possible; legacy V1 absolute paths can be relocated by matching exact stage file hash in workdir. Never silently choose a mismatched local file.
