---
name: viet-gian-y-mexico
version: "1.1.0"
language: "vi"
description: "S2 Mexico telenovela: biến title đã khóa thành outline 7 Part, retention dài 95–110 phút, 6 DNA ngoại tình/phản bội, canon timeline–tiền–bằng chứng–quyền, heroine agency, handoff chuẩn S3/QA."
---
# S2 — VIẾT GIÀN Ý TÌNH YÊU / PHẢN BỘI (MEXICO)

## 0. Role & mandatory reading
READ `references/SHARED_CROSS_SKILL_CONTRACT.md`, `references/MEXICO_MARKET_DNA.md`, `references/SEVEN_PART_STORY_ENGINE.md`, `references/CONTINUITY_CANON.md`, `references/OUTLINE_OUTPUT_TEMPLATE.md`. This is an architect, not Writer, QA or SEO. Story content and scene descriptions must be in **natural Spanish es-MX**, operational metadata may use Vietnamese/English field names.

## 1. Source / inputs
Required: `CURRENT_FINAL_TITLE.txt` exact from S1 and verified `TITLE_LOCK.json` with same SHA; family hypothesis and title promise. Optional: user direction, title source rank, target duration, pre-approved character/setting. Never change title without S1 new version. Default 7 Parts, `LONG_95_110` body 12.5–14.5k spoken words, 75–100k chars.

## 2. Title promise decomposition
Write `PROMISE_ACT`, `PROMISE_OBJECT`, `PROMISE_WITNESS`, `PROMISE_EMOTION`, `PROMISE_EARLY_PROOF`, `PROMISE_LATE_CONSEQUENCE`. First 90s must stage event/proof from title, not just a tease. Final punishment/resolution later. Every title noun that promises a visible object/role must appear in actual story and not be redefined.

## 3. DNA selector and combination
Primary F1 Gala/Status; F2 Parto/Hospital; F3 Ex/Primer amor; F4 Dinero/Divorcio; F5 Suegros/Familia; F6 Quiet Exit/Second Chance. Secondary at most one unless multi-plot is earned. Selection score by (a) title fit 25 (b) emotional mechanism 20 (c) material evidence fit 15 (d) protagonist autonomy 15 (e) 100-min expandability 15 (f) ending feasibility 10. The script should resemble the *emotional contract* of model videos, not imitate a sample storyline.

## 4. Story core
Name, age, occupation, city, history, credible finances and moral boundary for each main character. Heroine wants something independent of male validation (work, home, safety, dignity, custody, creative credit). Husband/partner has intelligible selfish motives without universal stupidity; mistress/ex is a person, not merely a caricature; supporting family individuals have distinct roles. New romance only after trust and independent recovery; not mandatory.

## 5. 7-Part macro arc
Part 1 THE BETRAYAL: cold open 30–90s; concrete wrongdoing, first evidence, heroine's autonomous choice; consequence set. 
Part 2 THE PUBLIC/PRIVATE COST: consequences at home/work/child, attempts to minimize betrayal, proof retained; protagonist chooses real next action.
Part 3 THE SECOND LIE: trusted person or material record reveals a deeper contradiction; legitimate leverage identified; heroine pays cost for investigating.
Part 4 COUNTERMOVE: antagonist's pressure, mutually incompatible loyalties, controlled evidence, midpoint moral reversal; avoid fake despair.
Part 5 THE IRREVERSIBLE CHOICE: heroine sets boundary, protects child/finances/career using credible steps; next complication is causal, not random disaster.
Part 6 TRUTH IN FRONT OF WITNESSES: precise original proof pays off, title's humiliation reversed by competence/procedure/truth, realistic consequences begin.
Part 7 AFTERMATH AND AUTONOMY: emotional and material resolution earned; no magical overnight inheritance/trial; no humiliation-loop; quiet image demonstrates self-respect.

## 6. Retention scaffolding
- 0–30 sec: shock action or clear quote and locus of betrayal, immediate title recognition.
- 30–90 sec: prove the scene is real via tangible event, not "te contaré" promise.
- 90 sec–5 min: heroine chooses nontrivial next step, reveals new dilemma; end first 5m with concrete question.
- Every ~8–12 min: believable piece of NEW information, progression of evidence, role shift or risk; not repeated crying/accusations.
- Each Part must earn a partial payoff and new specific open loop; mark 2–4 loops simultaneously max, track when open/answer.
- Midpoint must force revised interpretation of betrayal (who knew, why, how), not arbitrary secret millionaire identity.
- Final resolution is seeded in Part 1–4; avoid a conveniently appearing lawyer with omnipotent authority.

## 7. Scene-level outline: target 45–60 usable scenes
For each of exactly 7 Parts, provide 6–9 SCENE IDs (`P1-S01`, ...), viewpoint, location/time, participants, starting facts, action/conflict, evidence and its custody, emotional transition, new information, decision/consequence, seeded/payoff loop, handoff to next scene. Budget approximate spoken words by Part so S3 can generate 12.5–14.5k total. No bullet-filler disguised as scene.

## 8. Canon evidence ledgers MUST be concrete
- MASTER_TIMELINE: precise dates or relative day counters; pregnancy/child age/work schedules/custody; travel realistic.
- RELATIONSHIP_MATRIX: married/engaged/ex/parents/children/sibling links; who is aware of affairs when.
- MONEY_AND_ASSETS: pesos MXN vs other currencies; amounts, bank permissions, legal owner, source/use, timing; e.g. shares are not transferred by a phone call.
- OBJECT_AND_EVIDENCE: original, copy, storage, retrieval, alteration possibility, who physically possesses an object at each turn.
- KNOWLEDGE_LEDGER: scene ID when each person learns what; nobody responds to undisclosed facts.
- ACCESS_AUTHORITY: who can enter office, review corporate logs, access patient records, sign or dispute documents; professional/legal constraints.
- EXACT_NUMBERS: ages, years married, dates, contracts, flights, number of children, amounts, shares; no drifting figures.
- OPEN_LOOP_AND_PAYOFF: setup scene, milestone scene, closure scene, payoff not earlier than proof chain.
- ANTI_REGRESSION_STRONG_SPANS: pinpoint 3–6 early essential beats/dialogue to preserve if QA requests patch.

## 9. Realism/ethics lock
In Mexico set urban details grounded and used sparingly; don't decorate with stereotypes. Legal/medical cases: record uncertainty; do not assert instant divorce/asset transfer/custody by voice call or a spouse overriding informed consent; only use verified process if story depends on legal rule. No glamorizing harassment, violence, intimate-photo leaks, humiliating medical vulnerability or children.

## 10. Final outline quality gate (editorial)
Score out of 100: premise/title 15; causality 20; emotional complexity 15; heroine agency 15; 7-Part retention 15; continuity ledgers 10; es-MX authenticity 5; 100-min expandability 5. Aim >=97, but if hard continuity issues exist no PASS despite high score. Correct S2 problems here (not S5) BEFORE lock. Validate promised reveal actually occurs and 1st 5 min are concrete.

## 11. Deliverables
- `FINAL_OUTLINE.md` using template, complete scene map + canon and 7 budgets.
- `OUTLINE_LOCK.json` with `title_sha256`, `outline_sha256` actual bytes, `parts=7`, `target_words_min=12500`, `target_words_max=14500`, `niche_id`.
- Show brief score and `S2_OUTLINE_LOCKED` only when files verified; otherwise `UNVERIFIED` and no fake handoff. NEXT S3 must consume actual bytes and ledgers.

## V1.1 mandatory first-run hardening
Read `references/WITNESS_AND_PAYOFF_PREFLIGHT_V1_1.md` before executing this Skill. This supplemental reference is normative and takes precedence over conflicting older creative guidance while preserving existing filenames, commands and A/B/C stage contracts.
