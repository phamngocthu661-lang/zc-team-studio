---
name: viet-tieu-de-mexico-celebrity
version: "1.1.0"
language: vi
rewrite_language: es-MX
description: "STEP1: phân tích 137 video mẫu tiểu sử sao Mexico, tạo 5 title tiếng Tây Ban Nha ≤100 ký tự, chấm 100 điểm, chọn 1 LOCKED_TITLE và kiểm soát sự thật/tin đồn."
---
# SKILL — VIẾT LẠI TIÊU ĐỀ SAO MEXICO V1.1

**V1.1 bắt buộc:** Đọc `references/V11_UPGRADE_NOTES.md` và shared contract trước khi chạy. Phát hiện RUN đầu Pedro Infante là bộ test regression bắt buộc, nhưng không phải dữ liệu sự thật cho các tập sau.

## 0. Scope/mandatory references
Read `references/SHARED_PRODUCTION_CONTRACT.md`, `references/COMPETITOR_DATA_DNA.md`, `references/TITLE_SCORING_AND_PATTERNS.md`. Only STEP1; never outline/script/SEO. Historical competitors are inspiration, NOT independent fact sources.

## 1. Inputs and output
INPUT `source_title` or `verified_fact_pack` + optional person name, topic focus, primary public-source links, title history ledger. If user provides competitor title only, analyze formula and suggest **conditional packaging** without repeating unverified adverse claims. A high-sensitivity claim requires sourcing before final title lock.

Output exactly: (1) PERSON + research/fact status (2) 60/40 viral blueprint (3) 5 diverse Spanish titles ≤100 Unicode characters each (4) character count, 100-point score and rationale for each (5) ONE winner locked verbatim + family + anchors + hook promise (6) source risk ledger (7) Step2 handoff. Never mark a claim VERIFIED solely on basis of CSV description.

## 2. What to copy, what to change
Preserve approximately 60% functional viral DNA (celebrity name recognizability, immediate contrast, relevant documented conflict, unresolved factual question, consequent stake). Change ~40% unique verified angle, concrete publicly documented incident/year, perspective, payoff and original wording. Never copy a competitor's inflammatory accusation as fact.

Generate 5 distinct paths: relationship documentary, public/private paradox, career reversal, a documented turning point, legacy question. Don't force five if unsupported: present available variants + `RESEARCH_REQUIRED`.

Title ideas must be spoken/understood within 3 seconds by Mexican viewers. Use conversational Spanish, not English calques. Favor name leading; title capped at 100 chars. Sensational ADJECTIVES and ALL-CAPS optional but should be rare, substantive and not derogatory. CTR does not outrank truth. For a title asserting a specific number of incidents or a definitive causal connection, require explicit independent source coverage and an opposition check, not merely 2 articles echoing the same wire story.

## 3. Content family classifier
- A `DOBLE_IMAGEN_DOCUMENTADA`: stage persona versus concrete public record, not an invented double life.
- B `AMOR_RUPTURA_FAMILIA`: public, attributed love/family tension with counterviews and no private speculations.
- C `CAIDA_RETORNO`: career collapse/recovery or withdrawal, with accurate timeline and non-stigmatizing treatment.
- D `DECISION_QUE_CAMBIO_TODO`: documented consequential choice with clear before/after.
- E `LEGADO_TRAS_EL_APLAUSO`: final career chapters, enduring work, legacy, disputed myth appropriately framed.

Use only one PRIMARY family, one optional secondary.

## 4. Title selection algorithm
1. Identify exactly who, profession, known work, event, sources and sensitive claims.
2. Verify fact statuses; `UNSUPPORTED` adverse premise => reject title despite strong hooks.
3. Read provided competitor ranking/view distribution; infer title devices not truth or causality. Rank within THIS source, not cross-channel.
4. Draft 5 original Spanish options; keep each ≤100 Unicode characters, no invented numeric duration/age/years.
5. Score with the 100-point rubric in reference; reject below 90 or any hard gate failure. Aim ≥95, no artificial score inflation. If none pass, return research gap, do not invent stronger claim.
6. Check title history for exact/near duplicate and overlapping premise with earlier production; if no ledger, mark `HISTORY_NOT_CHECKED` (not PASS).
7. Lock only best verified/faithful one, output `LOCKED_TITLE` verbatim and source anchors; preserve this downstream. No script here.

## 5. Title output template
```
PROJECT_ID: MEX-...
PERSON: ...
TOPIC_STATUS: VERIFIED | LIMITED | RESEARCH_REQUIRED
PRIMARY_FAMILY: ...
TITLE_CANDIDATES:
1. ... | LENGTH: ... | SCORE: .../100 | FACT_GATE: PASS/FAIL
...
WINNER: ...
LOCKED_TITLE: ...
TITLE_ANCHORS: [person, public event, consequence, open question]
HOOK_FACTS: [short supported points with source IDs]
SOURCE_RISKS: [specific missing evidence]
TITLE_HISTORY_CHECK: PASS / CONFLICT / HISTORY_NOT_CHECKED
STEP2_HANDOFF: [person, family, title, anchors, fact ledger, sources, target 7-part]
```
When tools are absent do not claim exact measured character count; mark UNVERIFIED. No SEO block in STEP1.
