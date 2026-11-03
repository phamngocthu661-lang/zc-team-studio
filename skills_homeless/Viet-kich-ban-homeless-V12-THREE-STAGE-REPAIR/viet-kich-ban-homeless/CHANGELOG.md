## v2.0.0 — HOMELESS V12

- Writer exclusively owns Step3 three-stage drafting AND Step5 surgical prose repairs.
- Introduced QA-frozen byte-window repair contract, SHA-bound deterministic composer and immutable-span checks.
- Stage manifest schema v2 binds exact outline SHA and video_id in addition to title; V11 manifests require explicit migration and are not silently overwritten.
- Keeps all original creative-DNA and forensic craft reference material; eliminates contradictory One-Shot delivery in master engine.
- Writer cannot score independent QA or declare readiness.

---

## 1.6.9 — THREE-STAGE PERSIST-FIRST (HOMELESS V11)
- User canceled One-Shot delivery after repeated failures.
- Same `step3` command is called three times: A (P1–2), B (P3–5), C (P6–7).
- Each call must materialize/rehash one UTF-8 segment and record manifest source proof.
- C assembles existing A+B+C byte-exact; full 70k–80k body is only certified after final verifier PASS.
- Adds `THREE_STAGE_PERSIST_PROTOCOL.md`, `scripts/segment_workflow.py`, and retains full verifier.
- Mandatory source rehash and title binding prevent invented files and cross-story joins.
- Older One-Shot delivery requirements are superseded. Quality/Canon/Forensic gates remain unchanged.

## 1.6.8 — ONE-SHOT FILE-FIRST (HOMELESS V11)
- Replaces default AUTO ABC 3-turn delivery with one `step3` call for all seven Parts.
- Authorizes one verified UTF-8 TXT manuscript as the primary user-facing output; no mandatory inline 70k–80k prose dump.
- Adds `ONE_SHOT_FILE_PROTOCOL.md` and `scripts/verify_full_script.py`.
- Removes active A/B/C protocol/assembler to prevent mixed behavior; preserves story-quality / canon / forensic / length gates.
- The previous 1.6.4 INLINE delivery lock and 1.6.7 AUTO ABC mode are historical for this version; the user explicitly overrides delivery only.
- Downstream independent QA and STRICT Mode B patch rules remain unchanged.

## 1.6.7 — PERSIST-FIRST ABC
- File persistence is mandatory at A/B/C, before segment completion; validate and link same-turn TXT.
- B/C must load existing A/B artifacts, not assumed chat history.
- C assembles source files and proves full-body count/hash.
- Story-specific filenames and explicit recovery behavior prevent V8 C deadlock.

## 1.6.6 — AUTO ABC three-turn optional mode
- User-authorized A (P1–2), B (P3–5), C (P6–7) drafting; each segment is visible inline.
- On C assemble the complete script literally from A+B+C, machine count/hash and deliver full text artifact.
- Default direct One-Shot unchanged.
- QA revisions use exact-span controlled patches without rewriting unaffected segments.

# CHANGELOG

## 1.6.4 — INLINE TEXT DELIVERY HARD LOCK
- Script prose must be rendered directly in the response; file-only delivery is forbidden.
- `.txt`, `.docx`, `.pdf`, ZIP, attachment, artifact link, or download link cannot replace the requested script body.
- Temporary files remain allowed internally for exact count/hash/comparator verification only.
- Clarified that `materialize/artifact` in count-proof rules refers to verification state, not the user-facing delivery surface.
- If inline delivery cannot be completed, fail closed rather than claiming `SCRIPT_READY` through a file-only artifact.

## 1.6.3 — EXACT FINAL-BODY COUNT PROOF
- Added shared `EXACT_BODY_COUNT_ARTIFACT_PROOF_LOCK.md`.
- Full script cannot be output unless exact final body is hashed + machine-counted at 70k–80k inclusive.
- Any edit after count invalidates proof and requires recount.
- Reusing older draft counts, token/word estimates, or inferred micro-patch stability is explicitly forbidden.
- Final delivery must include count certificate.

## 1.6.2
- Added QA-Driven Repair Mode Exact Copy Lock.
- Full revised script must be assembled by deterministic splice from MASTER BASELINE + approved patches.
- All non-patch spans must be copied verbatim; no global polish or incidental rewrite.
- Synced Cross-Skill Quality Contract V1.4 One-Sweep QA Finality rules.

# 1.6.1 — SHARED STRICT-REVISION CONTRACT SYNC

- Shared contract upgraded to V1.3 so Script and QA use the same immutable-pass-zone and score-transparency semantics.
- New-script drafting rules, 70k–80k hard range, Early Retention and forensic gates remain unchanged.
- Downstream QA may not rewrite passed script text merely to chase a higher re-audit score.

# 1.6.0 — RETENTION + LENGTH ARCHITECTURE UPDATE

- HARD 70k–80k full-script range; removed <8k word cap; added Promise→Proof→Micro-Payoff early survival ladder, No Hook Reset and 6.5k retention-desert gate.
- Shared contract upgraded to V1.2.
- Older changelog length values below are historical only and are not current rules.

# V1.5.1 — EXPLICIT PART SCOPE + CONTRACT V1.1
- Removed the stale INPUT CONTRACT sentence that restricted `REQUESTED PART` to repair/rewrite only.
- Explicit `viết Part X` now unambiguously means output only that Part for both first drafting and revision, matching Delivery Contract, Master Script Engine, Length Lock and Part QA.
- This supersedes the historical V1.3 behavior recorded later in this changelog.
- Upgraded shared contract to V1.1 for synchronized QA late-fix authorization semantics.

# V1.5.0 — CROSS-SKILL SYNC + STABLE 98 GATE
- Removed conflicting 60k minimum / 74k–78k operating target.
- New shared default: 49k–53k chars, ~7.2k–7.8k words, hard <55k chars + <8k words.
- Added identical CROSS_SKILL_QUALITY_CONTRACT with Outline V2.2 and QA V1.4.
- Added State Delta / animal-inventory transitions and no-new-state-without-transition.
- Added fixed QA-mirror 100-point rubric using the original V1.4 story-quality weights unchanged; >=98 remains mandatory.
- Added Patch-Artifact Gate and no-output-below-target internal stabilization.
- Protected title promise, mystery/clue causality, competence, pressure, reveal and emotional ending from length trimming.

# CHANGELOG

## 1.4.0 — 2026-09-03

### 98+ quality architecture
- Added mandatory `CANON_STATE_MATRIX.md` and converted continuity from passive memory to explicit state transitions.
- Added timeline Event IDs, age arithmetic, money before/change/after, object state, knowledge state and access/authority matrices.
- Added Naming Introduction Lock and STATE-vs-CHEKHOV exact-number classification.
- Added Cold-Open Event Lock: same discovery cannot be replayed as new after flashback.
- Added Period Language Gate: verify exact historical terminology when available; otherwise generalize instead of inventing modern legal/professional language.
- Added Procedural Resolution Mode: legal/title/water-right/probate/institutional conflicts may carry from Part 6 into Part 7 with explicit forward chronology.
- Added two independent pre-output passes: State/Canon and Skeptical Viewer/Forensic.
- Added final internal score threshold **>=98/100**; critical logic failures cannot be offset by aggregate score.

### Delivery scope alignment
- Full-script request still defaults to 7 Parts in one response.
- Explicit `viết Part X` now outputs only the requested Part, matching direct user scope.
- `continue/tiếp tục` advances to the next Part using current canon.


## 1.3.0 — 2026-08-23

### One-pass delivery lock
- New scripts must output all 7 Parts in one response.
- Removed default Part-by-Part / `continue` workflow.
- `Part 1` in a new-script request means start at Part 1 and continue through Part 7.
- Single-Part output remains only for explicit repair/rewrite scope.

### Hard character ceilings
- P1 max 10,000; P2 11,000; P3 12,000; P4 12,000; P5 12,000; P6 13,000; P7 11,000 characters including spaces.
- Exceeding a Part cap by any amount fails QA and must be trimmed before output.
- Default structural maximum is 81,000 characters; global absolute ceiling remains 90,000.
- Added 500-character safety-buffer principle and full seven-Part pre-output budget validation.
- Removed visible per-turn count/status footers that encouraged segmented generation.

### QA
- Length is now a CRITICAL gate, not a soft target.
- Trimming requires a post-trim continuity/logic/open-loop recheck.

## 1.2.0 — 2026-08-23
- Added mandatory `FORENSIC_LOGIC_GATE.md` and pre-draft logic audit.
- Changed outline fidelity: preserve story payoff/facts, but repair implausible implementation mechanisms before prose.
- Added hidden-for-decades plausibility rule: no “smart hero because everyone else was stupid.”
- Added physics checks for mass, leverage, scale, corrosion, settlement, material aging, and old mechanisms.
- Added artifact-conservation rule: avoid using rare originals as torque/pry tools when replica/measurement substitute is plausible.
- Added scaled-plan rule: never place full-size ruler directly on reduced drawing without conversion.
- Added legal/evidence triangulation: no magic deed/covenant/letter; use authenticity + independent corroboration for major public outcomes.
- Added antagonist/institution competence rule and due-diligence realism.
- Added hard-choice incentive realism for salary, housing, safety, debt, inheritance, and career offers.
- Added career/credential realism for final job titles and professional oversight.
- Added exact-detail/Chekhov check to eliminate unpaying “4:17”-style fake clues.
- Added theme-naturalism rule to avoid conveniently identical quotes/inscriptions across generations.
- Added document-density control and anti-repeat punchline check.
- Recalibrated prose paragraph target to 45–60% of NARRATIVE paragraphs at 2–4 sentences, excluding dialogue/document/list/reveal fragments.
- Refined pressure timing: seed ~35–42%, direct pressure ~45–50%, grand reveal still 78–85%.


## 1.1.0 — 2026-08-23
- Reduced cinematic staccato target by roughly 30–40%.
- Tightened very-short 1–5-word sentence target to ~3–5%.
- Added paragraph-flow target: ~65–75% of prose paragraphs should contain 2–4 complete sentences.
- Changed Part 2 from forced first pressure to pressure foreshadow.
- Added preferred active external-pressure window at 35–45% when outline causality supports it.
- Preserved grand title-level reveal at 78–85%.
- Added Ending-by-Action Lock: show belonging through physical reversal/callback before naming it.
- Expanded Part QA for rhythm, pressure timing, grand-reveal protection, and action-based endings.

## 1.0.0 — 2026-08-22

Initial packaged release.

- Built as Stage 2 companion to `viet-gian-y-homeless` V2.
- 7-Part long-form architecture.
- 60k–90k hard character range.
- Preferred 68k–82k, ideal 74k–78k.
- Quiet-humanity HEART DNA from 1261-style storytelling.
- Mystery/open-loop/reveal/pressure SPINE from KB1-style retention.
- Added continuity ledger.
- Added outline handoff contract.
- Added per-Part QA checklist.
- Removed rigid repeated seven-sentence hook requirement.
- Generic early CTA disabled by default.
- Antagonist may recur when each return changes stakes.
- Grand title-level payoff normally staged around 78–85%.
