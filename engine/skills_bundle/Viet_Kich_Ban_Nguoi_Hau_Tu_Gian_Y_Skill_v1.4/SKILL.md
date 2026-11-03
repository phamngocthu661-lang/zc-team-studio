---
name: viet-kich-ban-nguoi-hau-tu-gian-y
display_name: "Viết Kịch Bản Người Hầu Từ Giàn Ý"
version: "1.4"
language: "vi"
description: "Biến giàn ý do skill Viết Giàn Ý Người Hầu tạo ra thành full script Mafia Boss × Maid/Waitress/Underestimated Woman bằng American English, giữ đúng số Part/Beat của giàn ý, target vận hành 44.000–48.000 ký tự, word-budget 7.400–7.650 từ, STRICT WORD LOCK <8.000 từ, standard character target 44.000–48.000 và hard ceiling 55.000 ký tự, continuity/causality chặt, YouTube-safe, và xuất toàn bộ trong một lần."
---

# SKILL — VIẾT KỊCH BẢN NGƯỜI HẦU TỪ GIÀN Ý

## 1. NHIỆM VỤ DUY NHẤT

Nhận **FULL STORY OUTLINE** được tạo bởi skill **Viết Giàn Ý Người Hầu** và chuyển nó thành **FULL LONG-FORM SCRIPT**.

Không tự thiết kế lại giàn ý.
Không đổi PRIMARY DNA.
Không đổi Content Family.
Không tự thêm/bớt/gộp/tách Part/Beat.
Không viết từng Part qua nhiều lượt.

**Một outline hoàn chỉnh → một full script hoàn chỉnh trong một response.**

---

## 2. BẮT BUỘC ĐỌC REFERENCE

Trước khi viết, phải đọc và tuân thủ toàn bộ:

1. `references/SHARED_PRODUCTION_CONTRACT.md`
2. `references/MASTER_PROMPT_WRITE_SCRIPT_FROM_OUTLINE.md`

Nếu chưa đọc đủ hai file này thì không được bắt đầu viết kịch bản.

---

## 3. INPUT CONTRACT

Input chuẩn là output đầy đủ từ skill **Viết Giàn Ý Người Hầu**, thường gồm:

- STORY DNA MATCH
- STORY CORE
- RETENTION MAP
- DETAILED OUTLINE
- PAYOFF AUDIT
- FINAL QUALITY SCORE

Trong đó **DETAILED OUTLINE** là bản đồ Part/Beat bắt buộc.

### PART COUNT LOCK

1. Đếm số mục `BEAT X` hoặc `PART / BEAT X` trong DETAILED OUTLINE.
2. Gọi số đó là `N`.
3. Full script phải có **đúng N Part**, ánh xạ 1:1 theo thứ tự:
   - Outline Beat 1 → Script Part 1
   - Outline Beat 2 → Script Part 2
   - ...
   - Outline Beat N → Script Part N
4. Nếu outline có 5 beat → viết 5 Part.
5. Nếu outline có 6 beat → viết 6 Part.
6. Nếu outline có 7 beat → viết 7 Part.
7. Nếu outline có số khác → vẫn theo đúng số đó.
8. **Tuyệt đối không hard-code 8 Part.**

---

## 4. SOURCE OF TRUTH HIERARCHY

Khi có xung đột, ưu tiên theo thứ tự:

1. Latest explicit user hard constraints
2. Exact Video Title / TITLE ANCHORS trong outline
3. STORY CORE và các fact đã khóa trong outline
4. DETAILED OUTLINE / causal chain / beat order
5. `SHARED_PRODUCTION_CONTRACT.md`
6. RETENTION MAP / open loops / payoff
7. PRIMARY DNA + Content Family
8. Writing-style upgrades trong master prompt
9. Raw/historical DNA evidence và fallback invention rules

Rule cấp thấp không được phép phá rule cấp cao.

---

## 5. DUAL LENGTH LOCK — WORD-FIRST + CHARACTER FINAL GATE

**Không thay đổi story core để đạt độ dài. Chỉ nén hoặc mở rộng prose bên trong các Beat đã khóa.**

Lý do vận hành: model không được phép dựa vào ước lượng ký tự trong lúc sinh prose. **WORD BUDGET là throttle chính khi viết; CHARACTER COUNT là release gate cuối.**

### HARD CHARACTER RANGE — GIỮ NGUYÊN CONTRACT

- Standard production target: **44,000–48,000 visible characters**.
- Recovery hard envelope: **40,000–55,000 characters**.
- `40,000–43,999` hoặc `48,001–55,000` = **TARGET MISS** trong standard production; phải revise về 44,000–48,000 nếu không phá fidelity.
- Absolute character ceiling: **55,000**.
- `>55,000` → **INVALID OUTPUT — MUST NOT BE SHOWN**.
- `<40,000` → **INVALID** trừ khi user explicit yêu cầu ngắn hơn; nếu không, mở rộng prose trong các Beat hiện có, không thêm Part/Beat/cốt truyện mới.
- Standard release mặc định chỉ khi exact character count nằm trong **44,000–48,000**; hard envelope ngoài target chỉ được chấp nhận khi latest user constraint explicit cho phép.

### PRIMARY GENERATION THROTTLE — WORD BUDGET

#### STRICT UNDER-8K WORD LOCK — INDEPENDENT HARD GATE

- Full script bắt buộc thỏa **`TOTAL_WORDS < 8,000`**.
- **7,999 words = PASS** nếu các gate khác cũng PASS.
- **8,000 words = FAIL.**
- **8,001+ words = FAIL.**
- Gate này độc lập với character gate 40.000–55.000; script phải PASS **cả hai**.
- Không được làm tròn 8.000 xuống 7.999, không được ước lượng để cho PASS. Khi có counter, dùng exact word count.

Trước khi viết, bắt buộc chọn:

- `TARGET_WORDS = 7,400–7,650 words`.
- `SOFT_WORD_CEILING = 7,750 words`.
- `STRICT_WORD_LIMIT = TOTAL_WORDS < 8,000` (tối đa hợp lệ: **7,999 words**).

Rules:

1. **Không dùng 55.000 ký tự làm mục tiêu viết.** 55.000 chỉ là trần chết cuối cùng.
2. Trong quá trình draft, kiểm soát độ dài bằng word budget trước; không tin vào character estimate thô.
3. Nếu draft tiến gần **7.750 từ**, bắt buộc chuyển sang compression mode ngay.
4. Nếu draft `>=8.000 từ`, coi là **INVALID DRAFT** ngay cả khi chưa biết exact character count. **Đúng 8.000 từ cũng FAIL.**
5. Không được “mượn” độ dài từ phần prose sau khi Beat đã hoàn thành chức năng chỉ để đạt cảm giác cinematic hơn.

### PRE-DRAFT DUAL PART BUDGET — MANDATORY

Trước prose:

1. Đếm `N` Beat từ DETAILED OUTLINE.
2. Chọn `TARGET_WORDS` trong **7.400–7.650** và `TARGET_CHARS` trong **44.000–48.000**.
3. Dùng `Position` của từng Beat để normalize tỷ trọng; nếu Position unusable thì dùng narrative weight nhưng không đổi Beat function.
4. Tạo đồng thời:
   - `PART_WORD_BUDGET[i]`
   - `PART_CHAR_GUIDE[i]`
5. **PART_WORD_BUDGET là giới hạn điều khiển chính.** `PART_CHAR_GUIDE` chỉ là secondary guide.
6. Tổng `PART_WORD_BUDGET` phải bằng `TARGET_WORDS`; không được tự tăng tổng budget trong khi viết.

Ví dụ nếu outline có tỷ trọng `15 / 15 / 20 / 30 / 20` và `TARGET_WORDS = 7,500` thì budget gần đúng là:

- Part 1 ≈ 1,125 words
- Part 2 ≈ 1,125 words
- Part 3 ≈ 1,500 words
- Part 4 ≈ 2,250 words
- Part 5 ≈ 1,500 words

Không cần in các con số này ra output.

### PART STOP-WRITING GATE — HARD

Cho từng Part:

- Khoảng **80–85% PART_WORD_BUDGET** → bắt đầu dẫn thẳng về `Re-hook` / `End-of-Beat Turn`.
- Khoảng **90–95%** → cấm mở scene mới, cấm thêm vòng dialogue mới, cấm thêm technical explanation thứ hai.
- Khi đạt **100% PART_WORD_BUDGET** → phải kết Part tại faithful turn gần nhất. **Không tiếp tục embellishment.**
- Nếu Beat chưa đủ chức năng khi chạm budget, phải **compress prose đã viết trong chính Beat đó**, không được tăng tổng word budget.

### ANTI-EXPANSION RULES

Không tăng length bằng cách:

- tạo scene không nằm trong Key Events / causal chain;
- thêm subplot thứ cấp;
- kéo một confrontation thành nhiều vòng rebuttal tương đương;
- giải thích cùng một clue bằng narration rồi lặp lại gần như đầy đủ bằng dialogue;
- lặp lại emotional realization nếu chưa có consequence mới;
- tạo micro-climax sau `End-of-Beat Turn`;
- mô tả lại location/biography đã establish;
- lặp technical reasoning sau khi nó đã thay đổi plot;
- thêm filler transition chỉ để nối Part.

Khi Beat đã đạt đủ **Purpose + Key Events + Causal Chain + End-of-Beat Turn**, phải chuyển Part.

### EXACT COUNT TOOL GATE

Nếu môi trường thực thi có **bất kỳ công cụ đếm text đáng tin cậy** (code/Python/text counter/file counter), bắt buộc dùng nó trước khi release:

1. Count exact visible characters của full script.
2. Count exact words.
3. Nếu `chars >55,000` hoặc `words >=8,000` → BLOCK OUTPUT, compress, recount.
4. Chỉ release khi pass.

Nếu **không có** exact counting tool, bắt buộc giữ draft trong safe operational envelope bằng word budget: **target 7.400–7.650 từ và không vượt 7.750 từ**. Không được tự tuyên bố đã đếm exact characters nếu chỉ là ước lượng.

### FINAL RELEASE STATUS

Trước output, phải có nội bộ:

- `WORD_STATUS = PASS` chỉ khi `TOTAL_WORDS < 8.000`; **8.000 từ trở lên = FAIL**; preferred ≤7.750.
- `CHAR_STATUS = PASS-TARGET` khi exact count nằm trong **44.000–48.000**.
- `CHAR_STATUS = TARGET-MISS` khi nằm trong **40.000–43.999** hoặc **48.001–55.000** mà user chưa explicit override.
- `LENGTH_STATUS = PASS` trong standard production chỉ khi `WORD_STATUS = PASS` và `CHAR_STATUS = PASS-TARGET`; nếu user explicit override character target thì áp dụng hard envelope theo override.

Nếu `LENGTH_STATUS != PASS` → revise/compress/expand nội bộ. **Không được xuất script đang fail.**

---

## 6. SINGLE-PASS OUTPUT LOCK

Phải viết **toàn bộ Part 1 → Part N liên tục trong cùng một response**.

Không được:
- dừng sau Part 1;
- yêu cầu user gõ `continue`;
- hứa viết phần còn lại sau;
- chia kịch bản thành nhiều lượt chat;
- lặp recap ở đầu Part mới.

---

## 7. CONTINUITY & LOGIC LOCK

Trước khi viết, dựng internal continuity ledger cho:

- tên, tuổi, vai trò, ngoại hình quan trọng;
- nghề nghiệp/năng lực;
- quan hệ giữa các nhân vật;
- thương tích và trạng thái hồi phục;
- timeline, địa điểm, quãng di chuyển;
- vật chứng, tài liệu, đồ vật;
- ai biết thông tin gì và biết từ thời điểm nào;
- trạng thái threat/betrayal/open loop;
- trang phục/vật dụng nếu có giá trị continuity;
- mức độ tin tưởng/romance/power balance.

Kịch bản cấm:
- nhân vật đổi tên/tuổi/nghề/vai trò vô cớ;
- biết thông tin chưa từng được học/nhìn/nghe;
- teleport hoặc travel time vô lý;
- vật thể/vũ khí/chứng cứ tự xuất hiện;
- chấn thương biến mất không có recovery;
- năng lực chuyên môn xuất hiện không được seed;
- hành động đi ngược động cơ nhân vật mà không có trigger;
- clue/payoff không có setup;
- combat/action vi phạm spatial logic hoặc physical consequence.

---

## 8. YOUTUBE-SAFE LOCK

Kịch bản là **fictional/dramatized entertainment** và phải tuân thủ Community Guidelines hiện hành của YouTube.

Ưu tiên cách viết bảo thủ, phù hợp quảng cáo:
- không ca ngợi, tuyển mộ, hỗ trợ hoặc kêu gọi người xem tham gia tổ chức tội phạm/bạo lực;
- không biến tội phạm thành hướng dẫn thực hành;
- không có gore, mô tả thương tích cực kỳ đồ họa, tra tấn kéo dài hoặc shock-for-shock's-sake;
- không hướng dẫn chế tạo/mua/bán/sửa đổi vũ khí hoặc né tránh thực thi pháp luật;
- không hướng dẫn sản xuất/phân phối ma túy hay hành vi nguy hiểm;
- không sexual violence; không explicit sexual content; romance phải có consent;
- không hate speech hoặc gán tội ác cho một nhóm sắc tộc, tôn giáo hay quốc tịch;
- tránh strong profanity dày đặc, đặc biệt trong hook;
- violence nếu có phải phục vụ plot, ngắn, không graphic, có hậu quả tâm sinh lý;
- không dùng người thật/tổ chức tội phạm có thật theo cách cổ vũ hoặc tuyên truyền.

Nếu policy hiện hành của YouTube thay đổi, policy hiện hành có ưu tiên cao hơn bản tóm tắt này.

---

## 9. TTS CLEAN SCRIPT LOCK

Script body chỉ được chứa **narration + spoken dialogue** có thể đưa thẳng vào ElevenLabs TTS.

Cấm tuyệt đối trong script body:
- bracketed stage/audio cues như `[silence]`, `[beat]`, `[breath]`, `[glass shatters]`, `[music]`, `[door closes]`, `[pause]`, `[SFX]`;
- camera direction, shot labels, production notes;
- screenplay sound-effect labels hoặc non-spoken performance directions.

Nếu cần thể hiện âm thanh, im lặng, hơi thở, chuyển động hoặc phản ứng vật lý, phải viết thành **natural narrative prose**, không dùng cue token.

---

## 10. OUTPUT FORMAT

Chỉ xuất full script.

Dùng:

`PART 1 — [beat name]`

...prose...

`PART 2 — [beat name]`

...prose...

cho đến `PART N`.

Không xuất:
- analysis;
- DNA scoring;
- outline lại;
- continuity ledger;
- checklist;
- character-count calculations;
- lời nhắc `continue`.

---

## 11. READY STATE

Nếu user chỉ yêu cầu đọc/nạp skill mà chưa gửi outline, trả lời ngắn:

**VIẾT KỊCH BẢN NGƯỜI HẦU TỪ GIÀN Ý — READY**  
**Gửi full outline.**
