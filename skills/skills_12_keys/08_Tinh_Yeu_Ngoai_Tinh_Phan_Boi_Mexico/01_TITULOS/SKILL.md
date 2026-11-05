---
name: viet-lai-tieu-de-mexico
version: "1.1.0"
language: "vi"
description: "S1: phân tích dữ liệu 215 video Mexico ngoại tình/phản bội, viết 5 tiêu đề viral es-MX nguyên bản theo DNA 60/40; khóa winner <=100 ký tự và chống lặp chủ đề trước Outline."
---
# S1 — VIẾT LẠI TIÊU ĐỀ MEXICO (ES-MX / ORIGINAL VIRAL DNA)

## 0. Scope & references
Read in this order: `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/TITLE_DNA_ENGINE.md`, `references/MEXICO_MARKET_DNA.md`, `references/TITLE_OUTPUT_TEMPLATE.md`. If source CSV is available, inspect actual comparable ranks, title, duration, URL; never treat views as CTR. Title step only. Language output: title in idiomatic **es-MX**, analysis in Vietnamese.

## 1. Inputs & modes
- `MODE A/CALIBRATION`: 1 source competitor title plus URL / views / duration if present, preferably supplied rank row. Consult `references/source_video_catalog.csv` (a snapshot of all 215 records, included in this Skill). Can take more than one reference, but not conflate their plots.
- `MODE B/TITLE_ONLY`: one user-supplied topic or rough title without performance data. No invented reference metrics.
- `MODE C/BATCH`: N sources; output one distinct winner per source. Deduplicate all winners across the batch and persistent ledger.
- If no input title but user says `tìm đề xuất`: select top-performing original *family patterns* from CSV and propose fresh original concepts, not reissue source titles.

## 2. Exact viewer contract
Title must convey (a) relationship role—esposo/prometido/ex/amante etc.; (b) an observable betrayal; (c) protagonist's non-passive response or new leverage; (d) a curiosity gap paid in first five minutes or seeded with tangible proof. Avoid zero-context pronouns as opening and implausible "instantly inherited everything" revenge.

## 3. 60/40 emotional DNA, not word copying
PRESERVE ~60%: betrayal type; public/private pressure; identifiable relationship; emotional shock; meaningful object/action; reversal mechanism category. REBUILD >=40%: original setting/occupation and names; distinctive proof object; response, consequence and chronology; central moral decision. Do not preserve exact distinctive premise, 8+ contiguous source words, same names plus same payoff, or trademark-ish thumbnail copy. No superficial translations of one English original.

## 4. Classification and candidate generation
Classify into ONE primary DNA: `GALA_STATUS_REVEAL`, `BIRTH_MEDICAL_ABANDONMENT`, `FIRST_LOVE_SECOND_CHOICE`, `FINANCE_CONTROL_PROOF`, `FAMILY_BETRAYAL_ESCAPE`, `SILENT_EXIT_NEW_CHAPTER`; optional secondary DNA. Extract primary keyword (esposo / amante / boda / divorcio), secondary (gala / parto / ex / suegra / acciones), power verb (abandonó / eligió / mintió / firmé / recuperé), proof object (contrato / grabación / credencial), and earned consequence. Generate exactly 5 viable candidates with DIFFERENT emotional timing or proof object. Reject a candidate whose payoff needs law-breaking or medically impossible choice.

## 5. HARD LENGTH & language lock
- Every title max **100 Unicode code points including spaces and punctuation**, using `len(title)` in Python. Keep accents, `¿`, `¡` intact; no removal to game length.
- Lead subject/action must be clear in first 60–70 chars; don't spend first half on setup.
- All title text native-sounding Spanish Mexico, never bilingual mashup; avoid unnatural caps/stilted verb forms, dangling ellipses without a specific setup.
- Numbers only if consequence is plausible and story outline can support exact quantity. No false "3.5 millones" copied from sample.
- All 5 may be 80–100 chars for flexibility; never truncate until nonsense or promise unfilmable event.

## 6. Evidence prioritization and original strategy
Compare competitor titles by within-source ranks and normalized view tiers if supplied; never claim a causal ranking or fresh YouTube stats from the archive. Compare premise families and production duration. `DIRECT_QUOTE` is optional not mandatory. Hooks are often strongest when heroine visibly moves from humiliation to a professional/financial agency: proof -> decision -> consequence. Give true differentiators.

## 7. Dedup engine: source vs project history
- Normalize Unicode to NFC; for similarity only lowercase, strip punctuation/accents and collapse spaces; retain original accented display.
- Reject exact normalized match to any 215 sample titles or history ledger.
- Near duplicate if 5-gram overlap unusually high or same `Betrayal+Proof+Consequence` fingerprint; flag and rewrite. Do not claim algorithmic near duplicate certainty from string similarity alone; read premise.
- Immediately write `TITLE_HISTORY_LEDGER.csv` row as `LOCKED`, with title, `video_id`, premise fingerprint. Before publishing update status, never erase historic title without a versioned record.

## 8. 100-point conservative score (not YouTube prediction)
A. Viewer contract specificity 20; B. Emotional betrayal & stakes 15; C. Curiosity & credible reversal 15; D. Novelty vs source/history 15; E. es-MX naturalness 10; F. Proof/premise serviceability 10; G. Thumbnail scene 5; H. Keyword recognizability 5; I. <=100 char/mobile clarity 5. Reject candidate regardless of sum if too similar, implausible, >100 chars, exploitative, or title cannot be paid in Part 1. Aim `>=98` when warranted, but do not fabricate 98: if none genuinely qualifies, mark `NO_WINNER` and offer new candidate pass inside S1 only.

## 9. Output and handoff
Use `references/TITLE_OUTPUT_TEMPLATE.md` and save:
1. `TITLE_CANDIDATES.md`: source evidence, DNA, protected mechanism, originality changes, 5 scored options, char counts, risk flags, recommended thumbnail concept and exact final winner.
2. `CURRENT_FINAL_TITLE.txt`: EXACT one-line winner, only Spanish title and one newline.
3. `TITLE_LOCK.json`: real title SHA256, `video_id` first 12 hex, `score`, `family`, `niche_id=MEX_INFIDELIDAD_V1`, `language=es-MX`, `source_refs`.
4. Add ledger row on verified final lock. If operating without file tools, output content explicitly marked `NOT_FILE_VERIFIED` and do not assert persisted hashes or unlock S2.

## 10. Failure handling
No source/invalid input -> state `NEEDS_SOURCE_TITLE`. Duplicate -> reroute to fresh premise. Missing ledger -> produce winner but mark cross-video duplication unchecked. Do not call S2 READY on a speculative title. NEXT S2 must consume actual `CURRENT_FINAL_TITLE.txt` and `TITLE_LOCK.json`.

## V1.1 mandatory first-run hardening
Read `references/TITLE_PROMISE_STRICT_V1_1.md` before executing this Skill. This supplemental reference is normative and takes precedence over conflicting older creative guidance while preserving existing filenames, commands and A/B/C stage contracts.
