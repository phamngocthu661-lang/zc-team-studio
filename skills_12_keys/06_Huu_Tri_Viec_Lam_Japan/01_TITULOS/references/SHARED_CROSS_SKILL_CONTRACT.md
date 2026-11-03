# JAPAN SENIOR KUCHIKOMI — SHARED CROSS-SKILL CONTRACT V1.0

## 1. Source of truth & precedence
1. Explicit current user command, legal/safety boundaries.
2. This shared V1.0 production contract and JAPAN_STEP_CONTROLLER_V1.md.
3. Locked title → locked outline → immutable baseline script → independent QA frozen report → at most ONE controlled repair pass → independent post-check → SEO.
4. Skill-specific operational rule.
5. DNA references, examples and competitor data **for craft, never for overriding workflow or forcing invented facts**.

Do not borrow the Mafia/Homeless narrative facts, target language, compulsory 70k characters, crime-romance tropes, or plot twists. Reuse only compatible 5-Skill / 6-Step architecture and artifact validation.

## 2. Niche lock / audience
Market Japan; natural Japanese (ja-JP), 60–70+ listeners. Topic: 定年後・老後・年金・再雇用・再就職・シニアバイト・住まいと生活費・孤独・同世代の本音. Winning format is **omnibus of 30 distinctive anonymous 口コミ narratives** (NOT one 7-part crime mystery). Editorial instructions in Vietnamese; video-facing outputs Japanese.

Niche focus priority: retirement work/money/housing, with adjacent senior life only when directly tied to concrete post-retirement choices. 54 competitor videos supplied: 41 titles mention 30; median duration ~32 min. Figures are snapshot observations, not CTR/retention proof.

## 3. Roles / commands (one owner per step)
- `step1`: Title writer only; creates `TITLE_LOCK.json` (one `CURRENT_FINAL_TITLE`, ≤100 Unicode characters).
- `step2`: Outline writer only; creates immutable `OUTLINE.md` + `OUTLINE_LOCK.json`; **7 editorial PARTS with exactly 30 reviews**. 7 PARTS are packing chapters, not one continuous protagonist story.
- `step3`: Writer only; creates `PART_A.txt`, `PART_B.txt`, `PART_C.txt` and verified `FULL_SCRIPT.txt` via assemble, with `SCRIPT_MANIFEST.json`.
- `step4`: Independent QA auditor only; reads script, checks logic and spelling, freezes all defects in `QA_FROZEN.json`. No prose rewriting in this stage.
- `step5`: Writer `ONE_REPAIR_PASS` only if QA identifies actionable defects. One execution, potentially multiple exact local patches from the frozen ledger. Produces `FULL_SCRIPT_REVISED.txt` + `REPAIR_PROOF.json`. No second rewrite even if post-QA identifies more faults.
- `step4-post`: Independent QA verifies revised script once, creates `QA_FINAL.json` (READY or BLOCKED). On BLOCKED stop and ask for manual resolution/new run, don't secretly rewrite again.
- `step6`: SEO & thumbnails only after READY on exact SHA256 current script; one primary unchanged title + exactly 2 supporting titles.

## 4. Standard contracts / immutable identities
- `CURRENT_FINAL_TITLE` exact UTF-8 text, do not silently change it.
- `TITLE_LOCK.json`: title, source/provenance, title_sha256.
- `OUTLINE.md` with `## PART 1` ... `## PART 7` and `口コミ01` ... `口コミ30` once each.
- `OUTLINE_LOCK.json` with outline_sha256, title_sha256, video_id.
- `FULL_SCRIPT.txt` exact concatenation of A+B+C bytes; **do not silently append or inject separators**. A/B/C files must explicitly end on clean newlines.
- `SCRIPT_MANIFEST.json` hashes: part A/B/C, exact full script, outline, title, video_id; character count.
- `QA_FROZEN.json` records `original_sha256`, `qa_decision` (`READY` / `NEEDS_ONE_REPAIR` / `BLOCKED`), reviewer evidence and authorized patches (exact original snippets).
- `REPAIR_PROOF.json` records original/final hashes, exactly one pass, affected patch IDs.
- `QA_FINAL.json` refers to exact current script hash and must carry `status=READY`, `editorial_verified=true`, `blocking_issue_count=0` before SEO.
- `SEO_PACKAGE.md` generated only after gate.
- Every output file must be UTF-8. Store full paths in handoffs, not presumed chat history.

## 5. Length & structure (new niche; **not Homeless 70k/80k**)
Default 30 narratives in 7 presentation PARTs: Part1 口コミ01–04, Part2 05–08, Part3 09–12, Part4 13–16, Part5 17–20, Part6 21–25, Part7 26–30. Stage A writes Parts1–2; B Parts3–5; C Parts6–7. Chapter labels do not imply one fictional multi-part continuous event.

Default narrated Japanese BODY 10,500–13,500 visible chars excluding section headings/review indices; target ~11,800–12,600 for ~30–40min depending reading speed. Detect duration as estimate, not a guarantee. For user-provided exact runtime, adjust explicitly and reflect budget in outline. No padding/repetition just to reach threshold. Reading-aloud Japanese uses smooth sentences and natural kana/kanji; no TTS markup unless requested.

Each review = one viewpoint with identifiable situation, sensory fact, conflict or trade-off, consequence, and optional practical takeaway; NOT generic bullet advice. Anonymous personal accounts must be truthfully presented as fictional reconstruction if user did not provide verified original testimonials.

## 6. Factual accuracy, ethics and copyright
Don't claim synthetic first-person vignettes are authentic viewer submissions, direct interviews, or proof. Use label `再構成した架空の事例` / `創作・再構成した口コミ形式` when synthetic. If supplied verified real accounts, label source as appropriate and remove personally identifying details; never copy other channel's unique lines/plots/thumbnails verbatim. Title promise must be fulfilled in body without fabricated guarantee, law, pension rates or municipal eligibility. Facts about laws, pension thresholds, insurance, municipal public housing etc require official, dated sources checked **at production time**. If not verified, avoid numeric/legislative claim and add check-the-official-source note. Do not falsely claim human voice/real interview.

## 7. QA priorities & ONE-REPAIR HARD LOCK
Priority: (1) causal and money/time/location/age/status consistency; (2) Japanese spelling/kanji/particles/punctuation/naturalness; (3) source/numerical claims; (4) repeated stories, promise fulfillment, original review diversity; (5) audio flow. No full rewrite, no new subplot, no changing video title, no adding invented 'real testimonies'. All defects found in one exhaustive QA pass BEFORE one repair. After repair only one independent verification; if fail mark BLOCKED; never second auto-repair. Mechanical checker only verifies structure/hashes/one-pass count, NOT semantic quality.

## 8. Success criteria
Technical PASS: artifact hashes, 7 PARTS/30 reviews exactly, correct review order, narrated-char range or explicitly approved override, 1 or fewer repair runs, SEO hash gate. Editorial READY: evidence-backed independent review of all 30 micro-stories, no known blocking issues or Japanese spelling faults, and credible presentation. 96/100 or 98/100 is editorial heuristic, not a guaranteed quality score or market-outperformance claim.

## 9. V1.1 editorial acceptance gates — lessons from first-run IDEA 3
The first run passed 7/30 structure and had 11,146 narrated chars; passing minimum length is not "high-quality story" proof. Writers should aim for **11,800–12,600** at ordinary pace, without filler; 10,500–13,500 remains the backward-compatible technical limit. Audio speed must be measured against recorded narration; don't promise 30–40min from text alone.

**Narrative diversity contract:** For all 30 reviews, freeze a `story_signature` = protagonist profile | role | particular cost | decisive action | ending type. Mix at least six distinct *ending mechanisms*: boundary-setting, accept-and-learn, honest regret, genuinely positive discovery, unresolved tradeoff, changed choice/quit, family negotiation, practical small victory. No single mechanism above eight stories; don't force `相談→解決→教訓` on the whole collection. Give at least 4 unfinished/bittersweet dilemmas, 4 clearly positive results, 4 humorous/light reversals, 4 cases with tangible downside and real agency — these groups may overlap. This is an editorial variation target, **not an automatic text keyword PASS**.

**Cold open:** Begin the narrated body with a concrete dilemma or a startling accurate line from #01; show the tension before generic framing. Include a truthful `fictional reconstruction` disclosure early (ideally within first 20–35s), and again in description, but do not fake an "interview" hook. Anchor 3 turning points across the 7 PARTs and ensure #30 offers a specific, memorable payoff rather than restating the theme.

**Canon consistency:** Every review must specify age/gender (or leave gender explicitly unspecified), occupation, family role, work hours, geography, actual change, unique sensory proof, and ending mechanism; check every drafted claim against it. If a gender/relationship detail differs from CANON, obtain an explicit outline update *before* baseline lock; never silently reinterpret the character after lock. Contradictions on partner roles, household composition or shift durations should be flagged even when implied rather than explicit.

**Independent editorial QA:** 30 review rows must include `canon_matched`, `causal_check`, `jp_proofread`, `proof_quote`, `ending_mechanism`, and `finding`. PASS on a row without specific textual evidence is not independent QA. Every actionable defect found in the pre-repair audit enters one `QA_FROZEN` ledger with exact `review_id`, excerpt, severity and proposed reason. ONE repair pass only; postcheck must verify patches and look for regressions. Any remaining blocker → BLOCKED/MANUAL, never stealth second repair.

**Packaging:** Thumbnail must map every written claim to a concrete review; exact overlay Japanese text is checked at rendered pixel size and at 320px mobile preview. A/B/C must test different hypotheses, not three layouts of same phrase. Images must be real separate files when claimed. Thumbnail text should normally be **two short prominent zones**, no tiny checklist or several independent subcaptions unless still legible. Record `TEXT_QA=PASS/FAIL`, `MOBILE_QA=PASS/FAIL`, `SCRIPT_TRUTH=PASS/FAIL`; fail or re-render if Japanese is wrong/cropped. Metadata source provenance remains explicit.

**Mechanics V1.1:** `editorial-diagnostics` output contains warnings, not QA; frozen surgical patches now require `review_id`, enforced by review-body span; `seo-verify` cannot be bypassed by QA_FINAL changing min/max narrated length. For stronger provenance pass `--qa-frozen` and `--baseline` with `--proof` to SEO verification.
