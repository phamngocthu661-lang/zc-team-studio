---
name: viet-gian-y-mexico-celebrity
version: "1.1.0"
language: vi
script_language: es-MX
description: "STEP2: 7-Part documentary biographical outline, timeline, source fact ledger, retention design and 3-stage Writer handoff."
---
# SKILL — VIẾT GIÀN Ý TIỂU SỬ SAO MEXICO V1.1

**V1.1 bắt buộc:** Đọc `references/V11_UPGRADE_NOTES.md` và shared contract trước khi chạy. Phát hiện RUN đầu Pedro Infante là bộ test regression bắt buộc, nhưng không phải dữ liệu sự thật cho các tập sau.

## 0. Mandatory reads / scope
Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/DOCUMENTARY_DNA_7_PART.md`, `references/SOURCE_RESEARCH_AND_CANON.md`. STEP2 ONLY. No original full prose, no unverified exposé.

## 1. Inputs
Exact `LOCKED_TITLE`, `PERSON`, `TITLE_ANCHORS`, `PRIMARY_FAMILY`, verified/attributed evidence records with links and dates and explicit gaps, optional direct interview/official chronology. If evidence is only competitor metadata, output researched outline framework with `RESEARCH_REQUIRED`, **not** `ARCHITECTURE_PASS` or a made-up factual story.

## 2. Scriptability / factual gating
Decide whether available material can sustain 45–55 minutes / ~42k–48k Spanish characters WITHOUT fabricated events or filler. Require enough major turning points, time anchors, public milestones, first-hand voices, acknowledged counterpoint and documented aftermath. 7 Parts are narrative chapters, not seven manufactured scandals. If thin, return `INSUFFICIENT_VERIFIED_MATERIAL` and specific missing source questions; do not pad.

## 3. Required analysis before outline
- Contract: person full name/aliases, works, nationality vs Mexican market presence, career years, deceased/alive if sourced, public event at center.
- Source register IDs S01... with link, outlet/author, published date, accessed date, primary/secondary, core claim, corroboration/denial, exact supported facts and limitations.
- Claim ledger C01... with status VERIFIED / ATTRIBUTED_CONTESTED / INFERENCE / UNSUPPORTED, sensitive yes/no, sources, approved Spanish narration wording.
- MASTER TIMELINE: year/month/day only if supported; age/year arithmetic; where and when and by whom claims were known. Distinguish interview publication date from event date; avoid future knowledge in early chapters.
- Before ARCHITECTURE_PASS, enforce `TITLE_CLAIM_PROOF`: for numerals in the title, enumerate each event and each independent supporting source, record the strongest contradictory source and require a defensible qualifier or a new title if unproven. Title promise proof map: which verifiable event resolves the title's main question; no clickbait promise unsupported by actual case.

## 4. 7-Part story architecture
Use main `FAMILY` chosen at Step1, adapt evidence; follow `DOCUMENTARY_DNA_7_PART`. 3-stage budgets A=~14,000, B=~18,000, C=~14,000 Spanish characters, total ~46,000 with hard target 40–49k. Part budgets: P1 6.5k; P2 7.5k; P3 6k; P4 6k; P5 6k; P6 7k; P7 7k = 46k, alter ±15% by available facts; output budget table.

P1 hook documented turning point + stakes + clarity; P2 background and rise to fame; P3 public/private friction grounded in evidence; P4 material public event and contested narratives; P5 fallout and responses/counterfacts; P6 consequences, resilience, later developments; P7 balanced legacy and closure answering title promise. Chronological time-jumps labeled; not all biographical arcs need tragedy.

## 5. Retention without inventing
Opening 60–90s (~140–200 Spanish words at narrator pace) gives name, documented event, contrast and one concrete question. Every ~5–7 minutes close a factual question and open another based on known source-supported events. Add 2-3 rare honest open loops (not false mystery). Distinguish what records say from what people alleged; humanize opposing stakeholders and acknowledge gaps. The ending must answer title explicitly or explain evidentiary limit.

## 6. Output and handoff
Output in Vietnamese analytical notes + all proposed VO beats in natural Spanish. Sections REQUIRED:
`PROJECT/LOCKED_TITLE`, `RESEARCH_STATUS`, `SOURCE_REGISTER`, `CLAIM_LEDGER`, `MASTER_TIMELINE`, `TITLE_PROMISE`, `PRIMARY_DNA`, `7_PART_DETAILED_OUTLINE` (each: events, CIDs, date/setting, narrative shift, tension, factual reveal, transition, target chars), `CANON_LOCKS`, `BANNED_UNSUPPORTED_CLAIMS`, `HOOK_PLAN`, `RETENTION_MAP`, `CROSS_PART_DEPENDENCIES`, `STEP3_HANDOFF` and `OUTLINE_SHA256` if measured from actual outline file.

The outline must be saved as a real UTF-8 file to bind Step3; no pseudo file path or invented SHA. If insufficient research, mark gaps and do not issue source-verified production release.
