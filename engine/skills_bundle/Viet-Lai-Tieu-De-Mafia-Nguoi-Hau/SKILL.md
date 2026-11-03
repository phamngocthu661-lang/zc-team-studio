---
name: viet-lai-tieu-de-mafia-nguoi-hau
version: "1.2"
language: "vi"
description: "Rewrite high-performing YouTube titles for the Mafia Boss + maid/waitress/secretary/nurse story niche. Reverse-engineer source titles and channel data, preserve ~60% of the proven keyword/click DNA, creatively mutate ~40% of story variables, and return original US-English titles optimized for CTR, niche recognition, and YouTube title length."
---

# VIẾT LẠI TIÊU ĐỀ MAFIA + NGƯỜI HẦU

## VERSION / SYNC STATUS
- VERSION: **V1.2**
- STATUS: SYNCED FOR PRODUCTION
- Shared downstream contract: winner becomes `CURRENT FINAL TITLE` for Outline/Script/SEO routing.
- **HARD TITLE LENGTH LOCK: every rewritten candidate and the final WINNER must be ≤100 visible characters.**

## 1) MỤC TIÊU DUY NHẤT

Biến tiêu đề đối thủ đã được thị trường chứng minh thành **tiêu đề mới cùng content family**, giữ đúng từ khóa và cơ chế tạo click nhưng không biến thành bản paraphrase.

Pipeline bắt buộc:

`RAW CHANNEL DATA / SOURCE TITLES → PERFORMANCE WEIGHTING → TITLE DNA → KEYWORD LOCK → 60/40 MUTATION → QA → NEW TITLES`

Skill này chuyên cho hệ sinh thái:
- Mafia Boss / Mafia Don / Crime Boss
- Maid / Waitress / Secretary / Assistant / Nurse / Nanny / Single Mom / Wife
- dark protector romance
- jealous / possessive romance
- hidden competence
- rescue / warning / sacrifice
- family healing
- humiliation → reversal
- secret / hidden identity / hidden evidence

Không dùng công thức của niche khác nếu user không yêu cầu.

---

## 1.1) HARD TITLE LENGTH LOCK — ≤100 CHARACTERS

Đây là **hard gate**, không phải preference.

- Mọi rewritten candidate được hiển thị phải có **≤100 visible characters**.
- `WINNER` cũng bắt buộc **≤100 visible characters**.
- Tính cả spaces, punctuation, quotation marks, apostrophes, em dash và các ký tự hiển thị khác.
- Target tối ưu thông thường: **72–98 characters**. Title 99–100 characters vẫn hợp lệ nếu hook mạnh và scan tốt.
- Candidate **>100 characters = HARD REJECT**: phải rewrite/regenerate trước scoring và tuyệt đối không được hiển thị như candidate hợp lệ.
- Nếu có công cụ đếm ký tự, dùng exact visible-character count; không ước lượng bằng mắt.
- Khi cần rút ngắn, bỏ modifier yếu / redundancy trước; không hy sinh primary keyword, core click reason hoặc title promise chỉ để cắt ký tự.
- Length gate chạy **trước final scoring và sau mọi revision** để không có candidate bị sửa xong vượt 100 ký tự.

---

## 2) NGUYÊN TẮC CỐT LÕI: 60/40 KHÔNG PHẢI ĐẾM TỪ

**Không được hiểu 60% là giữ nguyên 60% câu chữ.**

60% = **PROTECTED VIRAL DNA**.
40% = **CREATIVE STORY MUTATION**.

### PROTECTED VIRAL DNA — mục tiêu ~60 điểm

1. **Primary keyword spine — 20**
   - Mafia Boss / Mafia Boss’s / Italian Mafia Boss / Mafia Don / Crime Boss nếu source dùng chúng như anchor chính.

2. **Secondary role / relationship keyword — 15**
   - Maid / Waitress / Secretary / Assistant / Nurse / Nanny / Wife / Single Mom / Daughter / Son / Mother... tùy source.

3. **Title formula / curiosity connector — 10**
   - Until / Unaware / Then / But / Hours Later / Next Day / direct quote / reveal structure.

4. **Click psychology / power dynamic — 10**
   - underdog vs power, protector fantasy, jealousy, competence reveal, family healing, humiliation reversal, danger rescue...

5. **Payoff direction — 5**
   - protection, recognition, romance, shock, exposure, rescue, family bond, reversal.

### CREATIVE MUTATION — mục tiêu ~40 điểm

1. **Concrete incident — 15**
2. **Object / setting / time / amount / evidence — 10**
3. **Reveal or consequence detail — 10**
4. **Surface wording / syntax variation — 5**

Các tỷ lệ là **trọng số chiến lược**, không phải công thức toán cứng. Nếu thay một biến làm mất keyword spine hoặc click mechanism thì KHÔNG thay.

### NUMBER RULE

Số tiền, số giờ, số người, số ngày **không phải keyword bắt buộc theo mặc định**.
- Có thể đổi nếu đó chỉ là specificity detail.
- Giữ nếu chính con số là trung tâm của curiosity gap hoặc social proof trong title.
- Không đổi số chỉ để giả vờ tạo khác biệt.
- Không tự bịa số phi lý.

---

## 3) THỨ TỰ ƯU TIÊN BẰNG CHỨNG

Khi user cung cấp dữ liệu, dùng thứ tự:

1. **Title + views + tuổi video của chính channel đang nghiên cứu**
2. **Danh sách title top-view của cùng channel**
3. **Thumbnail / thumbnail concept nếu có**
4. **Channel description + video description + channel tags + video tags**
5. **Giờ đăng / upload cadence**
6. **Baseline DNA đóng gói trong `references/BASELINE_MAFIA_MAID_TITLE_DNA.md`**

Dữ liệu mới của user luôn ưu tiên hơn baseline.

Không bịa performance nếu user chỉ gửi title.

---

## 4) INPUT MODE

Skill phải chấp nhận cả hai dạng.

### MODE A — CALIBRATION
User có thể gửi:
- tên kênh
- mô tả kênh
- tags kênh
- mô tả video cao view
- tags video cao view
- giờ đăng
- title + views + tuổi video
- thumbnail hoặc mô tả thumbnail

Nhiệm vụ: học DNA title của batch/channel trước khi rewrite.

### MODE B — TITLE-ONLY
User chỉ gửi một hoặc nhiều title, mỗi dòng một title.

Nhiệm vụ: dùng source title + baseline niche DNA để rewrite ngay.

Không bắt user cung cấp lại dữ liệu đã có trong chat.

---

## 5) PERFORMANCE WEIGHTING

Khi có views và tuổi video:

### A. KHÔNG dùng view tuyệt đối một cách máy móc
Video cũ có nhiều thời gian tích view hơn video mới.

### B. Tính tín hiệu tương đối trong từng channel
Ưu tiên:
- top-view percentile
- title xuất hiện trong nhóm thắng lặp lại
- approximate view velocity khi tuổi video có sẵn

Có thể ước lượng:

`velocity ≈ views / max(age_in_days, 1)`

Nhưng:
- video <24h = tín hiệu rất sớm, không kết luận mạnh
- video 1–3 ngày = dùng như emerging signal
- video cũ = ưu tiên total-view rank + pattern repetition

### C. PHÂN TẦNG
- **VIRAL / WINNER:** rõ ràng vượt baseline channel hoặc top tier
- **STRONG:** trên mức trung vị đáng kể
- **NORMAL:** quanh baseline
- **WEAK:** thấp rõ rệt so với peer cùng thời gian

Winner titles có trọng số lớn hơn trong việc rút công thức.
Weak titles được dùng để tìm anti-pattern, không dùng làm template chính.

---

## 6) KEYWORD EXTRACTION — BẮT BUỘC TRƯỚC KHI REWRITE

Với mỗi source title, tách thành:

### PRIMARY KEYWORD
Từ/cụm xác định niche và promise chính.
Ví dụ thường gặp:
- Mafia Boss
- Mafia Boss’s
- Italian Mafia Boss
- Mafia Don
- Crime Boss

### SECONDARY KEYWORD
Từ/cụm xác định archetype hoặc relationship.
Ví dụ:
- Maid
- Waitress
- Secretary
- Assistant
- Nurse
- Nanny
- Single Mom
- Wife
- Daughter / Son / Mother / Father

### POWER / EMOTION MODIFIER
Ví dụ:
- Ruthless
- Jealous
- Cold
- Poor
- Shy
- Pregnant
- Injured
- Abusive
- Toxic Ex
- Fiancée

### ACTION KEYWORD
Ví dụ:
- Saved
- Warned
- Shielded
- Refused
- Found
- Mocked
- Insulted
- Whispered
- Ordered
- Called
- Followed
- Hid
- Exposed

### CURIOSITY KEYWORD / CONNECTOR
Ví dụ:
- Until
- Unaware
- Then
- But
- Never Knew / Never Knowing
- Hours Later
- Next Day
- Seconds Later
- What He Did Next

### REVEAL / PAYOFF KEYWORD
Ví dụ:
- Hidden Secret
- Hidden Past
- Hidden Identity
- Froze
- Speechless
- Changed Everything
- Saved His Life
- Exposed the Traitor
- Refuses to Let Her Go

Không buộc mọi title phải chứa mọi nhóm.

---

## 7) BASELINE HIGH-PERFORMING CONTENT FAMILIES

Chọn **ONE PRIMARY FAMILY** cho mỗi source title.

### FAMILY A — ACCIDENT / UNAWARE DARK PROTECTOR
Pattern:
`She [ordinary/urgent action] — Unaware [Mafia Boss / danger / identity]...`

Core:
- ordinary woman
- accidental collision
- hidden powerful man
- curiosity from ignorance

### FAMILY B — WARNING / SAVE THE BOSS
Pattern:
`[Maid/Waitress] [warned/shielded/saved] the Mafia Boss — [consequence/reveal]`

Core:
- low-status woman has situational awareness
- danger is immediate
- competence reverses hierarchy

### FAMILY C — HIDDEN COMPETENCE REVEAL
Pattern:
`[Boss] mocked/challenged/needed X — Until [Waitress/Maid] revealed unexpected skill`

Common skills:
- language
- math/accounting
- fighting
- medicine
- music
- legal/business insight

### FAMILY D — FAMILY BRIDGE / CAREGIVING
Pattern:
`Mafia Boss’s [Child/Mother/Father] [problem] — Until [Maid/Waitress/Single Mom] [healing act]`

Core:
- family wound
- female care/competence
- emotional replacement/family fantasy

### FAMILY E — HUMILIATION → REVERSAL
Pattern:
`[Antagonist] humiliated [female lead] — Never Knowing / Until [Mafia connection or hidden status]`

Core:
- unfair treatment
- public social contrast
- anticipated justice

### FAMILY F — JEALOUS / POSSESSIVE ROMANCE
Pattern:
`“[possessive/jealous quote],” the Mafia Boss [said/growled] when [Maid/Secretary/Wife]...`

Core:
- direct dialogue pattern interrupt
- jealousy / territorial tension
- romantic dominance
- unresolved relationship question

### FAMILY G — ACCIDENTAL INTIMACY / WRONG CONTACT
Pattern:
`She [texted/called/sat/slept] by mistake — The Mafia Boss [unexpected response]`

Core:
- social accident
- forced proximity
- romantic escalation

### FAMILY H — SECRET / OBJECT / IDENTITY REVEAL
Pattern:
`[Boss] saw/found [object/letter/scar/name/photo] — [hidden truth changed reaction]`

Core:
- tangible clue
- old secret
- delayed revelation

### FAMILY I — SACRIFICE / RESCUE
Pattern:
`She risked/took a bullet/shielded/saved [Boss/family] — [emotional response]`

Core:
- physical or moral sacrifice
- protection reversal
- emotional debt

### FAMILY J — REJECTION / RULE BREAKER
Pattern:
`No [Nurse/Nanny/Waitress] lasted... — Until one [woman] broke the rules / changed him`

Core:
- impossible man/problem
- everyone failed
- underdog succeeds

Do not hybridize families unless the source title itself clearly contains two compatible engines.

---

## 8) CHANNEL-SUBSTYLE SELECTOR

Dùng baseline 3 substyles để giữ đúng flavor, nhưng không được ép source vào sai style.

### STYLE 1 — ARCHIVES: DARK PROTECTOR + SECRET + ACCIDENT
Tín hiệu:
- Unaware / Until
- Mafia Boss in second clause
- hidden scar / letter / identity / rival
- accidental encounter
- dangerous ex/stalker
- possessive payoff

### STYLE 2 — ROMANCE: JEALOUS / POSSESSIVE + DIRECT QUOTE
Tín hiệu:
- “You’re not leaving”
- “Who bought you those flowers?”
- dress/date/husband/wife/engagement
- maid/secretary + jealousy
- direct command or intimate confrontation

### STYLE 3 — HIDDEN HEART: COMPETENCE + FAMILY + RESCUE
Tín hiệu:
- waitress/maid saves, warns, protects
- child/mother/father
- language/skill reveal
- humble underdog earns respect
- family healing and protection

When user provides new channel data, recalibrate these styles rather than treating them as fixed truth.

---

## 9) TITLE REWRITE ALGORITHM

For EACH source title:

### STEP 1 — PARSE
Extract:
- primary keyword
- secondary keyword
- content family
- protagonist
- power character
- inciting event
- curiosity connector
- emotional trigger
- specificity detail
- expected payoff

### STEP 2 — DEFINE THE SOURCE CLICK REASON
Write internally one sentence:

`Viewer clicks because ______.`

If this sentence cannot be stated clearly, analyze again.

### STEP 3 — LOCK THE 60%
Mark elements that must survive.

At minimum preserve:
- primary niche keyword
- strongest secondary keyword when important
- content family
- core power dynamic
- click reason

### STEP 4 — SELECT THE 40% MUTATION ZONE
Choose the safest variables to change:
- incident
- object
- setting
- specific danger
- secondary character
- evidence
- time
- amount
- reveal detail
- consequence wording

Never change every meaningful variable at once.

### STEP 5 — GENERATE EXACTLY 5 CANDIDATES
For EACH source title, generate exactly 5 publishable rewritten titles:

1. **VERSION 1 — SAFE**  
   Closest to the proven source structure while still creating a genuinely different story premise.

2. **VERSION 2 — SAFE+**  
   Preserves the strongest keyword spine and click mechanism, with a clearer creative mutation.

3. **VERSION 3 — BALANCED**  
   Best balance between source DNA fidelity, novelty, CTR, and natural language.

4. **VERSION 4 — BOLD**  
   Uses a stronger new incident/reveal while protecting the same audience promise and core keywords.

5. **VERSION 5 — ALT FORMULA**  
   Repackages the same proven content family using a different but compatible title syntax or curiosity structure.

All 5 versions must be strong enough to publish. Do NOT intentionally make weaker filler options.

The five candidates must not differ only by synonyms. Across the set, vary meaningful dimensions such as:
- incident
- setting
- object/evidence
- danger/reveal
- consequence
- quote structure
- curiosity connector

while preserving the protected 60% DNA.

### STEP 6 — DUPLICATION FILTER
Reject candidate if:
- it is only synonym replacement
- it preserves an unusually distinctive long phrase unnecessarily
- story premise is nearly identical to source
- title could be mistaken for the exact same video

### STEP 7 — KEYWORD FIDELITY FILTER
Reject candidate if:
- primary keyword disappears without strategic reason
- secondary archetype disappears and changes audience expectation
- content family changes
- SEO anchor is replaced with a weaker generic term

### STEP 8 — NATIVE ENGLISH FILTER
Use natural US English.
Fix:
- article usage
- punctuation
- capitalization
- tense
- possessives
- awkward AI phrasing

### STEP 9 — HARD LENGTH FILTER
Every rewritten candidate and the final WINNER must be **≤100 visible characters**.
Target normally: **72–98 characters**; 99–100 is valid when justified by hook strength.

Count spaces and punctuation. If exact counting is available, use it.
**Any candidate >100 characters is rejected before scoring and must be regenerated.**
After any wording revision, re-count before display.

Do not destroy a proven hook merely to hit a lower arbitrary number.
If too long, remove weak modifiers/redundancy before removing keyword anchors or the core click reason.

### STEP 10 — SCORE ALL 5 + FINAL SELECTION
Score EACH of the 5 candidates using the 100-point QA rubric in Section 10.

Then rank them from strongest to weakest internally.

The WINNER must be the candidate with the **highest actual total score**.

Do NOT automatically select BALANCED, SAFE, or any preferred slot.
The score decides the winner.

If two candidates tie:
1. choose stronger CTR / Curiosity;
2. if still tied, choose stronger Keyword Spine Fidelity;
3. if still tied, choose the more original premise;
4. if still tied, choose the shorter / cleaner title.

Before finalizing the winner, verify it has the strongest balance of:
- keyword fidelity
- click psychology
- originality
- clarity
- emotional voltage
- niche recognizability
- natural US English

---

## 10) TITLE QA SCORE — 100 POINTS

Score internally:

### Keyword Spine Fidelity — 25
- primary keyword retained
- secondary keyword retained when strategically important

### Viral DNA / Family Fidelity — 20
- same audience promise
- same content family

### CTR / Curiosity — 20
- immediate story tension
- meaningful unanswered question

### Creative Novelty — 15
- different story incident/reveal
- not a synonym rewrite

### Natural US English — 10
- sounds human
- easy to read aloud

### SEO / Niche Recognition — 5
- keyword placement natural
- no stuffing

### Length / Mobile Scan — 5
- hard prerequisite: ≤100 visible chars
- strongest words not buried unnecessarily
- >100 chars is not a low score; it is a HARD REJECT and must be regenerated before scoring

**Minimum acceptable for EACH displayed candidate: 85/100.**  
**Target for the WINNER: 90+/100.**

If any candidate scores below 85, regenerate that candidate before display.
If the best candidate is below 90, regenerate the weakest candidates and rescore until a 90+ winner is produced whenever reasonably possible.

Scores must be comparative, not decorative. Do not give every option the same score or inflate all five to 98–100 without meaningful differences.

---

## 11) SEO RULES FOR THIS NICHE

SEO ở đây không có nghĩa nhồi từ khóa.

Priority:

`CTR → Content-family recognition → Primary keyword → Secondary keyword → Natural language`

Rules:
- Keep `Mafia Boss` when it is the main niche anchor of source.
- Keep the female archetype (`Maid`, `Waitress`, `Secretary`, `Nurse`, etc.) when it helps classify the story family.
- Preserve a high-value relationship keyword if it creates the click (`Daughter`, `Mother`, `Fiancée`, `Ex`, `Wife`).
- Use one strong curiosity connector, not three stacked connectors.
- Do not repeat `Mafia Boss` multiple times.
- Do not stuff `Mafia`, `Boss`, `Maid`, `Romance`, `Love Story` together mechanically.

---

## 12) DIRECT-QUOTE RULE

Direct quotes are a major pattern interrupt in this niche, especially jealousy, warning, danger, and protection titles.

Use quote structure when source family supports it.

Good quote types:
- threat/warning: “Don’t Get In That Car.”
- possessive: “You’re Not Leaving.”
- emergency: “Get Down!”
- intimate conflict: “Who Bought You Those Flowers?”
- hidden competence: “This Clause Is a Trap.”

Do not insert a quote just because quotes are clickable.
The quote must create immediate context and tension.

---

## 13) PAYOFF PHRASE RULE

Generic payoff phrases can work, but must not become a crutch.

Common:
- Left Him Speechless
- Froze
- Stunned Everyone
- Changed Everything
- His Next Move...
- What He Did Next...

Use them only when the first clause is specific enough.

Prefer concrete payoff when possible:
- `His Only Order Was: “Find Her.”`
- `He Canceled His Wedding.`
- `He Locked the Office Door.`
- `His Private Jet Was Waiting.`

Specific consequence > generic “shocked everyone” when equally compelling.

---

## 14) THUMBNAIL-AWARE TITLE RULE

Skill does NOT generate thumbnail unless user asks.

If thumbnail or thumbnail concept is provided:
- title and thumbnail must complement, not duplicate
- thumbnail shows the visible shock/action
- title supplies context, relationship, or withheld reveal
- avoid repeating the exact same information in both

If no thumbnail is provided, do not invent one.

---

## 15) BATCH DIVERSITY CONTROL

When user sends many titles in one batch:
- preserve exact input order
- output exact same number of new titles
- do not collapse distinct source families into one formula
- avoid repeating the same connector in consecutive titles when alternatives preserve DNA
- avoid repeating the same payoff phrase excessively
- keep the batch feeling like one channel, not one duplicated template

Internal batch checks:
- repeated opening phrase count
- repeated connector count
- repeated payoff phrase count
- repeated protagonist role count
- repeated incident type count

Variation must come from story variables, not by removing core niche keywords.

---

## 16) ANTI-PATTERNS — REJECT IMMEDIATELY

1. Literal 60% word-copying.
2. Synonym-only rewriting.
3. Removing `Mafia Boss` from a source where it is the main niche anchor.
4. Replacing `Maid/Waitress/Secretary/Nurse` with a random female role that changes the audience promise.
5. Changing the content family just to appear original.
6. Randomly changing numbers as the only innovation.
7. Keyword stuffing.
8. Generic clickbait with no concrete incident.
9. Three curiosity connectors in one title.
10. Long setup with strongest keyword buried at the end for no reason.
11. Awkward English or unnatural capitalization.
12. Inventing performance claims.
13. Treating every high-view title as equivalent without considering age/channel context.
14. Copying weak/low-performing patterns because they are recent.
15. Creating title >100 characters.

---

## 17) DEFAULT OUTPUT — 5 VERSIONS + AUTO-SCORE + WINNER

This is the DEFAULT production mode.

For EACH source title, always return exactly **5 rewritten titles**, score every version, then select the highest-scoring title.

If the user sends multiple source titles, preserve exact input order and repeat the following block for each source.

### TITLE 01
**SOURCE:** [original source title]

1. **[rewritten title 1]** — **XX/100**
2. **[rewritten title 2]** — **XX/100**
3. **[rewritten title 3]** — **XX/100**
4. **[rewritten title 4]** — **XX/100**
5. **[rewritten title 5]** — **XX/100**

**🏆 WINNER: [highest-scoring rewritten title] — XX/100**

Do not show long explanations in default mode.
Do not show the hidden scoring breakdown unless the user asks.
Before output, run a final exact/available character-count gate on all 5 displayed candidates and the WINNER; **no displayed rewritten title may exceed 100 visible characters**.

### SCORING DISCIPLINE
- Score all five with the SAME rubric.
- Winner = highest total score, always.
- Never select based on version label.
- Avoid fake precision: scores should reflect meaningful qualitative differences.
- Two or more versions may be close, but the ranking must be defensible.

### If user says `CHỈ WINNER`
Return only the single winning rewritten title for each source title.
One line per source title.
No scores, no explanations.

### If user says `PHÂN TÍCH`
Return for each source title:
- SOURCE
- PRIMARY KEYWORD
- SECONDARY KEYWORD
- FAMILY
- 60% PROTECTED DNA
- 40% MUTATION ZONE
- all 5 rewritten titles
- score breakdown for each candidate
- final WINNER
- concise reason why the winner beats the other four

### If user says `5 PHIÊN BẢN`
Use the same default 5-version output.

### If user says `SO SÁNH`
Show source vs the 5 candidates and explain why the winner preserves the source click DNA while creating a new story premise.

---

## 18) FIRST RESPONSE AFTER SKILL LOAD

If the user has not yet sent source titles, reply only:

**TITLE REWRITE ENGINE READY.  
Gửi tiêu đề đối thủ — mỗi dòng 1 tiêu đề. Nếu có views/tuổi video, hãy giữ nguyên để tôi ưu tiên đúng mẫu thắng.**

If titles are already present in the same user message, do NOT send READY; process them immediately.

---

## 19) SCOPE LOCK

Unless explicitly asked, do NOT:
- write script
- write outline
- write description
- write tags
- generate thumbnail
- generate image prompt
- do channel SEO package

This skill's primary job is:

**REVERSE-ENGINEER TITLE → KEEP THE WINNING KEYWORD/CLICK DNA → WRITE A NEW TITLE.**
