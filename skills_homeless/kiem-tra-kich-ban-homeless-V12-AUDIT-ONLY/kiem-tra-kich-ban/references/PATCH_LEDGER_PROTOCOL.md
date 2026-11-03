# V12 OWNER SCOPE: QA creates the DIAGNOSTIC and freezes allowed byte windows; only Writer step5 authors actual replacement prose.

# PATCH LEDGER PROTOCOL V1.7.0

## PURPOSE
Patch Ledger là **closed edit contract cho một lần sửa**. Sau khi user duyệt, không có lỗi mới nào được tự động mở rộng phạm vi sửa trong cùng revision.

## NO ISSUE LIMIT
Không giới hạn Pxx/Oxx. Có 100 actionable locations thì phải đại diện đủ 100.

## EXACT LOCATION REQUIRED
Mỗi patch phải có locator đủ chính xác:
- Part N;
- scene/beat;
- quote anchor mở đầu/kết thúc hoặc line/paragraph range nếu có.

Không chấp nhận `ở giữa Part 3`, `đoạn nói chuyện với luật sư`, `giảm staccato toàn bài` nếu không enumerate occurrence.

## ISSUE THRESHOLD
Include mọi điểm một careful human editor thực sự sẽ sửa:
P0/P1/P2/P3.
Exclude pure preference khi text hiện tại đã logic, tự nhiên và hiệu quả.

## PATCH FORMAT

### P01 — [P0/P1/P2/P3] Short name
**Vị trí:** Part/scene + quote anchors hoặc line range.  
**Lỗi:** ...  
**Cần sửa thành:** ...  
**Cách sửa:** ...  
**Dependencies:** setup/callback/object/knowledge/timeline/legal/ending nào phải cập nhật.  
**Defect Class:** PRE-EXISTING QA MISS / PATCH-EXPOSED / TRUE REGRESSION / BASELINE DEFECT.  
**Primary Rubric Category:** exactly one frozen 100-point category.  
**Score Deduction:** -N points, fixed for this defect lineage.  
**Affected State Delta:** before → change → after, if applicable.  
**Length Intent:** KEEP / ADD ~N / CUT ~N / REDISTRIBUTE.  
**Phạm vi:** LOCAL / SCENE / CHAIN / PART / GLOBAL.

Nếu useful:
**MUST PRESERVE trong vùng này:** quote/beat/function.

## RECURRING ROOT ISSUE
Một root patch được phép group, nhưng phải enumerate mọi edit occurrence:
- O01 — exact location → action.
- O02 — exact location → action.
...
Intentional strong occurrences phải ghi `PRESERVE`, không xóa theo pattern máy móc.

## REWRITE ENTIRE PART
Chỉ dùng khi local patching không đủ/an toàn:

### Pxx — [P0/P1] REWRITE ENTIRE PART N — REQUIRED
**Root problem:** ...
**Why local patching is insufficient:** ...
**MUST CHANGE zones:** scene/anchor list.
**MUST PRESERVE — EXACT:** S01...Sn.
**MUST PRESERVE — functions:** clue/open loop/emotional beat/reveal/strong dialogue/process detail.
**Dependencies:** ...
**Baseline characters:** ...
**Target revised characters:** baseline band hoặc explicit target/cap.
**Length Intent:** KEEP / controlled ADD/CUT with reason.
**Method:** SCAFFOLD RECONSTRUCTION, not free regeneration.

## STRONG-SPAN LEDGER
Strong span là protected edit zone. Đặc biệt khóa:
- hook line/beat đang mạnh;
- antagonist nuance;
- emotional action;
- restoration/process detail có giá trị;
- clue causality đã đúng;
- natural dialogue;
- reveal timing;
- ending action;
- intentional short-line emphasis.

Nếu không liên quan patch → **COPY VERBATIM / IMMUTABLE**.

## PATCH CLOSURE / REPAIR SIMULATION
Trước khi publish ledger, simulate mỗi Pxx:
- nó thay đổi fact nào?
- cần dependency nào?
- có gây length loss không?
- có làm callback khác sai không?
- có làm character/knowledge drift không?
- có gây YouTube/voice/prose regression không?

Bổ sung tất cả dependency ngay trong review đầu.

## PRE-FREEZE SATURATION CERTIFICATE
Patch Ledger may be frozen only when:
- Read #1 complete;
- Read #2 complete;
- Reverse Read #3 complete;
- Coverage Matrix has zero blank cells;
- Repair simulation complete;
- the most recent full Saturation Pass found **0 new actionable defects**.

If a new defect appears during saturation, it MUST enter the same first ledger and saturation restarts. Do not publish a partial ledger.

## PATCH FREEZE + IMMUTABLE PASS ZONE
Sau khi publish và user duyệt:
- Pxx/Oxx IDs stable;
- dependencies that may be edited must already be enumerated inside the approved patch;
- all other baseline text becomes `IMMUTABLE PASS ZONE`;
- rewrite applies only approved IDs;
- no new creative/polish/QA agenda may be opened internally.

If final blind audit finds a latent actionable issue outside approved scope, classify it `AUDIT INTEGRITY MISS`. **Do not edit it in the current revision, do not auto-open a new patch cycle, and do not use it to erase the score gain earned by correctly fixed approved patches.** A critical hard-gate miss may block READY, but must be labeled as an initial-audit failure.

A TRUE REGRESSION caused by an approved Pxx may be fixed as `REG(Pxx)` only within the original Pxx or its pre-authorized dependency span. Otherwise redesign/revert Pxx rather than touching untouched baseline text.

## COVERAGE TEST
Chỉ publish khi đã:
- two full reads;
- omission sweep;
- exact-detail sweep;
- hook/retention sweep;
- character/canon/knowledge sweep;
- spelling/US-English sweep;
- YouTube readiness;
- every recurring occurrence enumerated;
- strong spans locked;
- baseline length recorded;
- Length Intent assigned where relevant;
- repair simulation/dependencies complete.


## KNOWN DEFECT UNIVERSE FREEZE — V1.5.0
Before publishing the first ledger for a lineage, freeze all actionable Pxx/Oxx plus dependencies, affected states, severity and length intent as `KNOWN DEFECT UNIVERSE V1`. At the same moment freeze a `SCORE DEDUCTION LEDGER` mapping every defect family to exactly one primary rubric category and one fixed deduction. The ledger must reconcile to the visible baseline score.
Later audit discoveries must be classified as PRE-EXISTING QA MISS, PATCH-EXPOSED or TRUE REGRESSION.
A pre-existing miss is an audit-completeness failure, not evidence that a correct revision lowered script quality.

## POST-REVISION NEW-FINDING SUPPLEMENT — NQxx
`NQxx` is report-only in the current revision. It is used for PRE-EXISTING QA MISS / PATCH-EXPOSED defects discovered after the approved ledger was frozen.

Record:
`NQ ID | exact location | class | primary rubric category | fixed score deduction | hard-gate impact | proposed future repair | why not editable now`.

If NQxx is PRE-EXISTING/PATCH-EXPOSED in unchanged baseline text, back-apply the same fixed deduction to `AUDIT_CORRECTED_BASELINE_SCORE`. This prevents a stricter later audit from falsely making the approved patch appear to have reduced quality.

It becomes editable only if the user later approves it as a new Patch ID in a subsequent patch cycle.
