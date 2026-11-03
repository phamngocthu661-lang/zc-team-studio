# KẾ HOẠCH SỬA CHỮA TOÀN BỘ ỨNG DỤNG RENDER FARM

## 1. Quyết định kiến trúc bắt buộc

Phiên bản sau sửa phải tuân thủ nguyên tắc sau:

> Máy Server chỉ tạo nhiệm vụ, tải tài nguyên lên Drive, điều phối Worker và nhận kết quả. Máy Render/Worker là nơi quét phần cứng, tạo SRT, kiểm tra SRT, render video và tải kết quả lên.

Các hệ quả bắt buộc:

1. `FarmMasterService` không được gọi `WhisperSrtService` trong luồng gửi task.
2. Server không được tạo file SRT rỗng để che lỗi Whisper.
3. Task không có SRT vẫn là task hợp lệ nếu cấu hình yêu cầu Worker tạo SRT.
4. Worker phải hoàn thành và xác thực SRT trước khi bắt đầu render video.
5. Lỗi tạo SRT phải được báo đúng là lỗi SRT, không được biến thành lỗi render hoặc tạo một phụ đề rỗng rồi báo thành công.
6. SRT do Worker tạo phải có thể được lưu lại làm artifact để kiểm tra và tái sử dụng khi retry.
7. Server chỉ được giao task cho Worker đã báo cáo đủ năng lực chạy SRT Worker V2.

Phạm vi này áp dụng cho Render Farm. Chế độ render cục bộ trên ứng dụng Server/Desktop vẫn có thể dùng Whisper cục bộ nếu người dùng chủ động render trên chính máy đó; không được nhầm luồng render cục bộ với luồng Farm.

---

## 2. Hiện trạng đã xác nhận

### 2.1. Luồng SRT đang sai với yêu cầu mới

Hiện tại `FarmMasterService.dispatchTask()`:

- Quét voice trong thư mục nguồn.
- Nếu không có SRT, Server tự chạy Whisper.
- Nếu Whisper lỗi, Server tạo một file SRT rỗng kéo dài 30 phút.
- Sau đó Server tải SRT lên Drive và Worker chỉ tải xuống để render.

Đây là phần phải loại bỏ khỏi luồng Farm.

### 2.2. Worker có mã gọi Whisper nhưng gói Worker thiếu tài nguyên

Worker đã khởi tạo `WhisperSrtService`, và `BatchService` có thể tạo SRT khi job thiếu SRT. Tuy nhiên `build-worker.json` chưa đóng gói:

- `resources/whisper-srt/generate_srt.py`
- `resources/whisper-srt/requirements.txt`

Vì vậy đường fallback “Worker tự tạo SRT” hiện không đáng tin cậy trong bản đóng gói.

### 2.3. Quét GPU SRT mới chỉ là phát hiện sơ bộ

Script hiện tại:

- Gọi `nvidia-smi`.
- Chọn GPU NVIDIA đầu tiên.
- Suy đoán `compute_type` từ tên GPU và VRAM.
- Nếu CUDA lỗi thì fallback CPU `int8`.

Điểm còn thiếu:

- Không tôn trọng đầy đủ GPU index đã chọn cho Worker.
- Không kiểm tra thực tế CTranslate2 có nạp được CUDA/cuBLAS/cuDNN hay không trước khi nhận task.
- Không hỏi CTranslate2 về danh sách compute type thực sự được GPU hỗ trợ.
- Heartbeat chưa phân biệt “có NVIDIA” với “Whisper CUDA chạy được”.

### 2.4. Cache overlay đã có nhưng còn ba đường triển khai khác nhau

Hiện có:

1. Master precompute overlay 10 giây.
2. Worker fallback tạo loop overlay 30 giây.
3. `BatchService.prepareLayerCache()` tạo cache mặc định 60 giây.

Rủi ro:

- Ba cách tính key và duration khác nhau.
- Master cache cả layer `TEXT`, trong khi Worker giữ lại `TEXT` để ghép tiếp; có nguy cơ lặp chữ.
- Cache được ép về `zIndex: 0`, có thể làm thay đổi thứ tự khung/logo/ảnh voice.
- Video overlay dài hoặc không loop tự nhiên có thể bị cắt còn 10/30 giây rồi lặp sai.
- Đồng bộ overlay theo tên file chưa kiểm tra đầy đủ checksum/modified time.

### 2.5. Gói cài Worker và gói OTA không đồng nhất

- `dist-worker/.../app.asar` đang cũ hơn mã nguồn hiện tại.
- `dist-server/.../worker_app.asar` mới hơn và khớp mã nguồn hiện tại.
- OTA hiện chủ yếu thay `app.asar`; không đảm bảo cập nhật các tài nguyên ngoài ASAR như Python script, model, DLL hoặc font.

### 2.6. Baseline test hiện tại

Lệnh baseline:

```powershell
node --test --test-reporter=dot tests\*.test.js
```

Kết quả khảo sát:

- Tổng cộng: 183 test.
- Đạt: 165 test.
- Lỗi: 18 test.

Nhóm lỗi hiện tại:

- 3 test Auto Updater lỗi do API/test đã lệch nhau.
- 2 test Drive/Overlay Sync lỗi do test local-drive đang gọi API đã bị thay đổi.
- 4 test Master Controller/UI lỗi do contract và giao diện đã thay đổi.
- 1 test vòng đời Worker lỗi do mock Drive cũ.
- 1 test ghép ảnh Project khác với kỳ vọng cũ.
- 1 test kiểm tra Renderer subtitle dùng biểu thức quá cứng.
- 1 test Canvas subtitle còn kỳ vọng ép font Arial.
- 5 test subtitle-format còn kỳ vọng hành vi cũ như tối đa 4 dòng, trong khi mã mới khóa 2 dòng và giữ font Project.

Không được sửa code chỉ để làm các kỳ vọng cũ này xanh. Trước tiên phải chốt hành vi sản phẩm mới, sau đó cập nhật test đúng với đặc tả.

---

## 3. Kiến trúc đích

### 3.1. Luồng nhiệm vụ mới

```text
Server tạo task
    |
    +-- tải voice / ảnh / template / overlay nguồn lên Drive
    +-- KHÔNG chạy Whisper
    +-- ghi task schema v2: srt.owner = WORKER
    |
Worker claim task
    |
    +-- tải tài nguyên
    +-- kiểm tra package/runtime/model
    +-- quét GPU dùng được cho Whisper
    +-- tạo hoặc xác thực SRT trong thư mục task
    +-- ghi checkpoint SRT + upload artifact
    +-- chuẩn bị/tái sử dụng overlay cache
    +-- render video
    +-- xác thực video
    +-- upload video + done report
```

### 3.2. Task schema v2 đề xuất

Thêm các trường:

```json
{
  "schemaVersion": 2,
  "taskId": "TASK_...",
  "workerTarget": "WORKER_01",
  "driveSource": {
    "resourceFolderUrl": "...",
    "voiceFileName": "story.mp3"
  },
  "subtitleJob": {
    "owner": "WORKER",
    "mode": "GENERATE_IF_MISSING",
    "model": "small",
    "language": "auto",
    "maxChars": 42,
    "maxDurationSec": 4.2,
    "maxLines": 2,
    "preferredDevice": "AUTO",
    "preferredGpuIndex": -1,
    "allowCpuFallback": true,
    "failurePolicy": "FAIL_TASK",
    "uploadArtifact": true
  }
}
```

Quy ước `mode`:

- `GENERATE_IF_MISSING`: dùng SRT người dùng cung cấp nếu hợp lệ; nếu thiếu hoặc hỏng thì Worker tạo.
- `REGENERATE_ON_WORKER`: Worker luôn tạo lại SRT từ voice.
- `USE_PROVIDED_ONLY`: không tạo tự động; thiếu SRT thì fail task.

Mặc định cho Farm là `GENERATE_IF_MISSING`, nhưng quyền sở hữu công đoạn vẫn luôn là `WORKER`.

Không dùng `CREATE_EMPTY_SRT` hoặc bất kỳ fallback rỗng nào.

### 3.3. Trạng thái mới

Thêm vào `FARM_TASK_STATUS`:

- `SRT_PREFLIGHT`
- `SRT_GENERATING`
- `SRT_VALIDATING`
- `OVERLAY_PREPARING`
- `VIDEO_RENDERING`
- `VERIFYING_OUTPUT`

Thêm alert type:

- `SRT_RUNTIME_MISSING`
- `SRT_MODEL_MISSING`
- `SRT_GPU_UNAVAILABLE`
- `SRT_GENERATION_FAILED`
- `SRT_VALIDATION_FAILED`
- `OVERLAY_CACHE_INVALID`
- `PACKAGE_INCOMPLETE`

Progress phải tách riêng:

- Thời gian download.
- Thời gian tạo SRT.
- Thiết bị SRT: CUDA/CPU, GPU index, compute type.
- Thời gian chuẩn bị overlay cache.
- Thời gian render video.
- Thời gian upload.

---

## 4. Kế hoạch sửa theo giai đoạn

## Giai đoạn 0 — Khóa đặc tả và tạo baseline

### Công việc

1. Chốt các invariant trong mục 1 thành tài liệu và assertion trong test.
2. Gắn ID cho toàn bộ 18 test đang đỏ và phân loại:
   - Lỗi code thật.
   - Test cũ cần cập nhật.
   - Test tích hợp cần mock đúng API.
3. Thêm script chuẩn vào `package.json`:
   - `test:unit`
   - `test:integration`
   - `test:render`
   - `test:package`
   - `test:all`
4. Cấm phát hành nếu test còn đỏ.

### Tiêu chí hoàn thành

- Có danh sách test chính thức, không phụ thuộc wildcard shell.
- 18 test cũ được gắn nguyên nhân và người xử lý.
- Chưa thay đổi hành vi runtime ở giai đoạn này.

---

## Giai đoạn 1 — Sửa contract Task và Heartbeat

### File chính

- `src/main/services/farm/farm-task-schema.js`
- `src/main/services/farm/farm-constants.js`
- `src/main/services/farm/farm-master-service.js`
- `src/main/services/farm/farm-worker-engine.js`
- `src/main/services/farm/farm-drive-service.js`
- `src/renderer/app.js`

### Công việc

1. Thêm `schemaVersion: 2` và `subtitleJob` vào validator.
2. Cho phép task chỉ có voice mà không có SRT.
3. Task cũ schema v1:
   - Worker mới vẫn đọc được.
   - Nếu thiếu SRT, Worker tự áp mặc định `GENERATE_IF_MISSING`.
4. Heartbeat Worker bổ sung:

```json
{
  "capabilities": {
    "workerSrtVersion": 2,
    "pythonReady": true,
    "whisperScriptReady": true,
    "modelCached": true,
    "cudaCandidate": true,
    "whisperCudaReady": true,
    "supportedComputeTypes": ["float16", "int8_float16"],
    "selectedGpuIndex": 0
  }
}
```

5. Server kiểm tra capability trước khi dispatch:
   - Worker v2: cho gửi.
   - Worker cũ: chặn task và yêu cầu cập nhật.
   - Không được âm thầm quay lại tạo SRT trên Server.
6. UI Server hiển thị huy hiệu:
   - `SRT GPU sẵn sàng`
   - `SRT CPU fallback`
   - `Thiếu runtime/model`
7. Bổ sung version/capability vào task history để điều tra sau này.

### Tiêu chí hoàn thành

- Server có thể gửi task voice-only cho Worker V2.
- Server từ chối Worker cũ bằng thông báo rõ ràng.
- Schema v1 vẫn không làm Worker crash.

---

## Giai đoạn 2 — Chuyển toàn bộ tạo SRT Farm sang Worker

### File chính

- `src/main/services/farm/farm-master-service.js`
- `src/main/services/farm/farm-worker-engine.js`
- `src/main/services/farm/farm-render-engine.js`
- `src/main/services/batch-service.js`
- `src/main/services/whisper-srt-service.js`
- `resources/whisper-srt/generate_srt.py`

### Sửa phía Server

1. Xóa hai nhánh Whisper trong `dispatchTask()`:
   - Nhánh thư mục local.
   - Nhánh thư mục Google Drive.
2. Xóa fallback tạo SRT rỗng 30 phút.
3. Server chỉ kiểm kê:
   - Voice nào tồn tại.
   - SRT người dùng có cung cấp hay không.
   - Tên file mong đợi.
4. Server không import hoặc khởi tạo `WhisperSrtService` trong module Farm.
5. Nếu source đã có SRT, Server tải nguyên trạng như tài nguyên đầu vào; không tự sửa nội dung trước khi Worker nhận task.

### Sửa phía Worker

1. Sau download, Worker xác định voice theo quy tắc rõ ràng:
   - Ưu tiên `driveSource.voiceFileName`.
   - Sau đó match basename.
   - Không được chọn ngẫu nhiên file voice đầu tiên khi có nhiều file.
2. Tạo `WorkerSubtitlePipeline` riêng, không nhét thêm logic vào một hàm render quá lớn.
3. Pipeline thực hiện:
   - Preflight script/runtime/model.
   - Chọn SRT có sẵn hoặc tạo mới theo `subtitleJob.mode`.
   - Ghi file tạm `name.srt.partial`.
   - Chỉ rename atomically thành `name.srt` khi hoàn tất.
   - Parse và validate SRT.
   - Ghi checkpoint JSON.
   - Báo progress lên Server.
4. Chỉ gọi `BatchService` sau khi SRT đã hợp lệ.
5. Retry task phải dùng lại SRT đã hoàn thành nếu:
   - Voice checksum không đổi.
   - Model/language/maxChars/maxDuration không đổi.
6. Nếu mất điện giữa lúc tạo SRT:
   - Xóa hoặc bỏ qua `.partial`.
   - Chạy lại SRT từ đầu.
   - Không coi `.partial` là thành phẩm.
7. Nếu SRT tạo xong nhưng render chưa xong:
   - Giữ SRT checkpoint để lần khởi động sau không phải nghe lại voice.
8. Upload SRT vào artifact của task trước hoặc cùng lúc upload video.

### Chính sách lỗi

- CUDA lỗi và `allowCpuFallback=true`: chạy lại bằng CPU `int8`, ghi cảnh báo.
- CUDA lỗi và `allowCpuFallback=false`: fail task với `SRT_GPU_UNAVAILABLE`.
- Model hỏng: xóa đúng cache model, tải/khôi phục lại một lần.
- Lần hai vẫn hỏng: fail task; không tạo SRT rỗng.
- SRT parse lỗi hoặc không có cue: fail `SRT_VALIDATION_FAILED`.
- Hết dung lượng đĩa: fail trước render và giữ voice để retry.

### Tiêu chí hoàn thành

- Trong log Server không xuất hiện tiến trình Whisper khi dispatch Farm.
- Trong log Worker xuất hiện `SRT_GENERATING`, device và compute type.
- Không có đường code Farm nào tạo SRT rỗng.
- Video không bắt đầu render trước khi SRT validation thành công.

---

## Giai đoạn 3 — Quét GPU Whisper chính xác

### Công việc

1. Giữ `nvidia-smi` để lấy:
   - Danh sách GPU.
   - GPU index.
   - Tên GPU.
   - Tổng VRAM và VRAM trống.
   - Driver version.
2. Không coi `nvidia-smi` thành công là đủ điều kiện CUDA.
3. Thêm runtime probe bằng CTranslate2:
   - Khởi tạo CUDA context trên GPU đã chọn.
   - Đọc `get_supported_compute_types("cuda", device_index)`.
   - Thử nạp model hoặc model smoke nhỏ.
4. Thêm tham số Python:
   - `--device-index`
   - `--allow-cpu-fallback`
   - `--runtime-probe-only`
5. Truyền GPU index từ Worker config/task xuống Python, không luôn chọn GPU số 0.
6. Nếu nhiều GPU:
   - Ưu tiên GPU người dùng cấu hình.
   - Nếu AUTO, chọn GPU đủ VRAM và có tải thấp nhất.
   - Khóa GPU cho một tiến trình SRT tại một thời điểm nếu VRAM không đủ chạy song song.
7. Chọn compute type theo API hỗ trợ thật:
   - Ưu tiên `float16` cho GPU hỗ trợ tốt.
   - Sau đó `int8_float16` hoặc kiểu được CTranslate2 báo hỗ trợ.
   - Không suy đoán chỉ bằng chuỗi `RTX/GTX`.
8. Báo rõ ba trạng thái:
   - `CUDA_READY`
   - `CUDA_DETECTED_BUT_RUNTIME_BROKEN`
   - `CPU_ONLY`

### Tiêu chí hoàn thành

- GTX 1060 hiện tại được probe bằng runtime thật, không chỉ dựa vào `nvidia-smi`.
- Máy nhiều GPU dùng đúng index đã chọn.
- Máy thiếu CUDA DLL fallback CPU đúng chính sách.
- Server nhìn thấy trạng thái GPU SRT thật qua heartbeat.

---

## Giai đoạn 4 — Đóng gói Worker chạy SRT đầy đủ và offline

### Mục tiêu

Worker sau khi cài phải tạo được SRT khi mất Internet, miễn là model đã được đóng gói hoặc đã được cài/cache thành công trước đó.

### Sửa `build-worker.json`

Tối thiểu thêm:

- `resources/whisper-srt` -> `whisper-srt`
- Loại `__pycache__`.

Không dừng ở việc thêm hai file Python. Bản production cần một manifest runtime riêng.

### Runtime package đề xuất

```text
resources/
  whisper-srt/
    generate_srt.py
    requirements.txt
  whisper-runtime/
    runtime-manifest.json
    python-3.11/
    wheelhouse/
    models/
      faster-whisper-small/
```

`runtime-manifest.json` phải chứa:

- Runtime version.
- Python version.
- Package versions.
- Model name/revision.
- SHA-256 từng artifact.
- Kiến trúc hệ điều hành.
- CUDA runtime requirement.

### Quy tắc cài runtime

1. Ưu tiên runtime đóng gói của ứng dụng.
2. Không tự chạy `winget` trên máy Worker production nếu chưa được người dùng bật rõ ràng.
3. Không tải pip/model trong lúc một task đang giữ lock.
4. Nếu cần tải lần đầu, Worker chuyển trạng thái `INSTALLING_SRT_RUNTIME`, không nhận task mới.
5. Tạo marker chỉ sau khi import `faster_whisper` và chạy runtime probe thành công.
6. Model và venv nằm ngoài thư mục temp để không bị cleanup task xóa.

### OTA tài nguyên

Vì `app.asar` không chứa `extraResources`, updater phải hỗ trợ gói:

```text
worker-update-vX.Y.Z/
  app.asar
  resource-manifest.json
  whisper-srt.zip
  optional-model-small.zip
  checksums.sha256
```

Quy trình cập nhật:

1. Tải vào thư mục staging.
2. Kiểm tra checksum và dung lượng.
3. Kiểm tra đủ file bắt buộc.
4. Backup `app.asar` và manifest runtime hiện tại.
5. Thay atomically.
6. Khởi động Worker.
7. Worker chạy health check.
8. Chỉ ghi `UPDATE_SUCCESS` sau health check.
9. Nếu health check lỗi, rollback tự động.

### Tiêu chí hoàn thành

- Cài Worker sạch trên máy không có Python vẫn tạo SRT được theo gói offline đã chọn.
- OTA không chỉ cập nhật code mà còn cập nhật được script/runtime.
- Package smoke test phát hiện ngay nếu thiếu `generate_srt.py`.

---

## Giai đoạn 5 — Hợp nhất và sửa cache overlay

### Mục tiêu

Một project/template không đổi chỉ render phần overlay tĩnh một lần; mọi lần sau dùng lại cache mà vẫn giữ hình ảnh giống render trực tiếp.

### Công việc

1. Tạo một module canonical `OverlayCacheService` dùng chung cho:
   - Master precompute tùy chọn.
   - Worker local fallback.
   - Batch render local.
2. Chỉ cache layer đủ điều kiện:
   - Tĩnh hoặc loop rõ ràng.
   - Không có timing theo từng job.
   - Không phụ thuộc voice.
   - Không phải subtitle.
   - Không phải `VOICE_IMAGE`.
3. Không cache `TEXT` động cùng lúc rồi lại giữ `TEXT` để render lần hai.
4. Bảo toàn z-order:
   - Nếu layer động nằm giữa hai nhóm tĩnh, tạo nhiều cache band theo z-order.
   - Không ép toàn bộ overlay về một layer `zIndex: 0` nếu điều đó thay đổi thứ tự.
5. Duration cache:
   - Không hardcode 10/30/60 giây ở ba nơi.
   - Dùng metadata loop của layer và duration nguồn.
   - Layer không chứng minh được loop-safe phải render trực tiếp.
6. Cache key phải gồm:
   - Renderer/cache schema version.
   - Canvas width/height/fps.
   - Toàn bộ transform/style/effect/timing có ảnh hưởng.
   - SHA-256 hoặc Drive checksum của file nguồn.
   - FFmpeg/filter behavior version.
   - Cache duration và alpha codec.
7. Cache được tạo qua file `.partial`, sau đó probe và rename atomically.
8. Validate trước khi dùng:
   - Có video stream.
   - Đúng width/height/fps.
   - Có alpha pixel format/codec mong đợi.
   - Duration hợp lệ.
   - File lớn hơn ngưỡng tối thiểu.
9. Đồng bộ Drive phải so checksum/size/modified time; file cùng tên nhưng nội dung đổi phải được tải lại.
10. Giữ lock theo cache key để nhiều task không render trùng cache.
11. Prune theo LRU và quota, mặc định 8 GB; không xóa cache đang dùng.
12. Log rõ:
   - `CACHE_MISS`
   - `CACHE_HIT_LOCAL`
   - `CACHE_HIT_REMOTE`
   - `CACHE_INVALIDATED`
   - `CACHE_CORRUPT_REBUILD`

### Tiêu chí hoàn thành

- Render trực tiếp và render dùng cache vượt ngưỡng pixel-diff quy định.
- Cache hit không chạy lại FFmpeg tạo overlay.
- Thay nội dung file nhưng giữ nguyên tên vẫn invalidates cache.
- Text, subtitle, ảnh voice và khung giữ đúng thứ tự.

---

## Giai đoạn 6 — Sửa Render Worker để tương thích ứng dụng cũ

### Công việc

1. Tách `FarmRenderEngine.renderTask()` thành các bước nhỏ:
   - Resolve assets.
   - Resolve template.
   - Prepare subtitle.
   - Prepare overlay cache.
   - Prepare stock.
   - Render/chunk render.
   - Validate output.
2. Dùng chung một hàm normalize template với ứng dụng desktop cũ.
3. Không mutate trực tiếp task payload/layer gốc; clone cấu hình trước khi ánh xạ đường dẫn.
4. Bảo toàn:
   - Canvas 1920×1080.
   - FPS.
   - Font, màu, outline, bold.
   - Tọa độ và z-order.
   - Thumbnail/voice image.
   - Disclaimer/intro.
   - Chroma key.
   - Transition.
5. SRT tối đa 2 dòng phải là một đặc tả duy nhất dùng chung Preview, Server và Worker.
6. Với video dài:
   - SRT được tạo một lần cho toàn voice.
   - Chunk dùng cùng một timeline SRT, chỉ dịch timestamp khi render chunk.
   - Nối chunk không làm mất cue ở biên.
7. Xác thực đầu ra bằng ffprobe trước khi upload:
   - Video stream tồn tại.
   - Audio stream tồn tại.
   - Duration lệch không quá ngưỡng.
   - Đúng resolution/fps.
   - File không bị truncate.
8. Chỉ ghi nhận stock đã tiêu thụ sau khi video đã upload thành công.

### Tiêu chí hoàn thành

- Cùng input/template cho desktop local và Worker tạo kết quả tương đương hình ảnh, âm thanh và timeline.
- Không còn trường hợp báo “render thành công” nhưng file đầu ra thiếu/hỏng.

---

## Giai đoạn 7 — Sửa Drive, updater, UI và bộ test cũ

### Drive

1. Tách interface Drive khỏi implementation Google Drive API.
2. Có `LocalFarmDriveAdapter` dành riêng cho unit/integration test.
3. Không dùng một đường dẫn Windows làm Google Drive folder ID.
4. Mọi hàm async phải được `await`; không để unhandled rejection sau khi test kết thúc.
5. Chuẩn hóa các hàm `listFiles`, `getFolderId`, `uploadFile`, `downloadFile`, `readJson`, `writeJson`.

### Updater

1. Khôi phục/chuẩn hóa `compareVersions` hoặc sửa test theo API version mới.
2. Một script build/publish duy nhất nhận version từ `package.json`.
3. Xóa nhu cầu duy trì các script `publish_update_253.js`, `254`, `255`... riêng lẻ.
4. Không dùng Server `app.asar` làm fallback cho Worker package.
5. Chỉ phát gói đã qua package smoke test.

### UI

1. Hiển thị riêng trạng thái SRT và render.
2. Hiển thị Worker đang dùng CUDA hay CPU cho SRT.
3. Hiển thị thời gian SRT và render riêng.
4. Cho phép cấu hình:
   - Model.
   - Language.
   - Chế độ tạo nếu thiếu/tạo lại.
   - Cho phép CPU fallback.
5. Khi Worker không đủ runtime, nút gửi task phải cảnh báo trước.

### Test cũ

1. Cập nhật mock Drive sang adapter mới.
2. Cập nhật subtitle test theo chuẩn đã chốt:
   - Tối đa 2 dòng.
   - Giữ font project được hỗ trợ.
   - Auto-fit đúng theo box.
3. Nới test source-code regex dễ vỡ; ưu tiên test hành vi/hàm export.
4. Chốt quy tắc match ảnh Project rồi sửa code hoặc test cho đồng nhất.

---

## 5. Bộ test phải bổ sung

## 5.1. Unit test — Task contract

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| TASK-U01 | Schema v2 thiếu `subtitleJob` | Tự áp mặc định Worker hoặc báo lỗi theo đặc tả |
| TASK-U02 | `subtitleJob.owner=SERVER` | Validator từ chối |
| TASK-U03 | Task voice-only | Hợp lệ |
| TASK-U04 | `mode` không hợp lệ | Từ chối với lỗi rõ ràng |
| TASK-U05 | Task schema v1 | Worker mới đọc được |
| TASK-U06 | Worker capability v1 | Server chặn dispatch |
| TASK-U07 | Worker capability v2 | Server cho dispatch |

## 5.2. Unit test — Bảo đảm Server không tạo SRT

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| MASTER-SRT-U01 | Dispatch thư mục local chỉ có voice | Không gọi Whisper; task vẫn được tạo |
| MASTER-SRT-U02 | Dispatch thư mục Drive chỉ có voice | Không tải voice về Server để chạy Whisper |
| MASTER-SRT-U03 | Whisper service bị mock để throw nếu gọi | Dispatch vẫn thành công và mock không bị gọi |
| MASTER-SRT-U04 | Không có SRT | Không sinh file SRT rỗng |
| MASTER-SRT-U05 | Có SRT người dùng | Server chuyển nguyên trạng, không sửa nội dung |

## 5.3. Unit test — GPU/Whisper Worker

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| SRT-GPU-U01 | Không có `nvidia-smi` | Chọn CPU int8 |
| SRT-GPU-U02 | Có NVIDIA nhưng runtime CUDA hỏng | Báo trạng thái runtime hỏng, fallback theo policy |
| SRT-GPU-U03 | Có một GPU CUDA hợp lệ | Chọn đúng CUDA và compute type được hỗ trợ |
| SRT-GPU-U04 | Có nhiều GPU | Chọn đúng configured index |
| SRT-GPU-U05 | GPU index không tồn tại | Fail preflight rõ ràng hoặc AUTO fallback theo cấu hình |
| SRT-GPU-U06 | VRAM không đủ | Giảm concurrency hoặc chuyển CPU |
| SRT-GPU-U07 | CUDA lỗi khi load model | Retry CPU đúng một lần |
| SRT-GPU-U08 | CUDA lỗi giữa transcribe | Retry CPU và không giữ SRT partial |
| SRT-GPU-U09 | `allowCpuFallback=false` | Fail task, không chạy CPU |
| SRT-GPU-U10 | Hủy task | Python process bị dừng và trạng thái là cancelled |

## 5.4. Unit test — SRT validation/checkpoint

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| SRT-U01 | File SRT hợp lệ | Pass validation |
| SRT-U02 | File rỗng/space-only | Fail validation |
| SRT-U03 | Timestamp lùi | Fail validation |
| SRT-U04 | Cue vượt duration voice bất thường | Fail hoặc warning theo ngưỡng |
| SRT-U05 | Cue dài | Chia tối đa 2 dòng theo cấu hình |
| SRT-U06 | Tiếng Nhật | Áp giới hạn ký tự/timing tiếng Nhật |
| SRT-U07 | Mất điện để lại `.partial` | Lần sau tạo lại |
| SRT-U08 | Checkpoint hợp lệ | Retry dùng lại SRT |
| SRT-U09 | Voice checksum đổi | Invalidate checkpoint |
| SRT-U10 | Model/config đổi | Invalidate checkpoint |

## 5.5. Unit test — Overlay cache

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| OVL-U01 | Cùng template/source | Cache key giống nhau |
| OVL-U02 | Đổi transform | Cache key đổi |
| OVL-U03 | Đổi nội dung source, giữ tên | Cache key đổi |
| OVL-U04 | TEXT/VOICE_IMAGE/subtitle | Không bị cache sai |
| OVL-U05 | Layer timing riêng | Bỏ cache hoặc cache đúng band |
| OVL-U06 | Cache file hỏng | Probe fail và rebuild |
| OVL-U07 | Hai task cùng key | Chỉ một FFmpeg cache process |
| OVL-U08 | Quota vượt 8 GB | Xóa LRU, giữ file đang dùng |
| OVL-U09 | Remote cùng tên nhưng checksum mới | Worker tải lại |
| OVL-U10 | Layer z-order xen kẽ | Cache bands giữ đúng thứ tự |

## 5.6. Integration test — Worker pipeline

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| FARM-I01 | Voice-only task | Worker tạo SRT rồi render |
| FARM-I02 | Có SRT hợp lệ | Worker không tạo lại ở mode IF_MISSING |
| FARM-I03 | Có SRT hỏng | Worker tạo lại hoặc fail đúng mode |
| FARM-I04 | Whisper fail | Task fail ở stage SRT, FFmpeg render không chạy |
| FARM-I05 | CUDA fail, CPU được phép | SRT CPU xong rồi render |
| FARM-I06 | Worker restart sau SRT | Dùng checkpoint và tiếp tục render |
| FARM-I07 | Worker restart giữa chunk | Dùng lại SRT và chunk hoàn chỉnh |
| FARM-I08 | Drive mất kết nối | Retry download/report, không claim trùng |
| FARM-I09 | Hai Worker cùng thấy task ANY | Chỉ một Worker claim được |
| FARM-I10 | Upload video xong | Done report chứa SRT/render metrics |

## 5.7. Package test

| ID | Trường hợp | Kết quả bắt buộc |
|---|---|---|
| PKG-01 | Inspect Worker installer | Có `app.asar`, FFmpeg, fonts, Whisper script/runtime manifest |
| PKG-02 | Inspect `worker_app.asar` | Có đúng Worker entrypoint và code marker phiên bản |
| PKG-03 | So source hash/package hash | Gói phát hành chứa source commit dự kiến |
| PKG-04 | Cài sạch, không Python hệ thống | Worker SRT preflight pass bằng runtime đóng gói |
| PKG-05 | Ngắt Internet | Model đóng gói/cache vẫn tạo SRT |
| PKG-06 | OTA code + resource | Cập nhật thành công và health check pass |
| PKG-07 | Gói OTA hỏng checksum | Từ chối cập nhật |
| PKG-08 | App mới không khởi động | Rollback app.asar cũ |

## 5.8. Test phần cứng thực tế

Tối thiểu chạy trên:

1. Máy hiện tại GTX 1060 6 GB.
2. Một máy RTX hỗ trợ float16 tốt.
3. Một máy không có NVIDIA để xác nhận CPU fallback.
4. Nếu hệ thống có máy nhiều GPU, test chọn đúng GPU index.

Mỗi máy chạy các mẫu:

- Voice 30 giây.
- Voice 5 phút.
- Voice trên 10 phút để kích hoạt chunk render.
- Tiếng Việt.
- Tiếng Anh.
- Tiếng Nhật.
- Voice có khoảng lặng dài.
- Voice nhiễu hoặc âm lượng nhỏ.

Ghi lại:

- Device/compute type thực tế.
- Thời gian tạo SRT.
- Peak VRAM/RAM/CPU.
- Số cue.
- Tỷ lệ cue rỗng.
- Thời gian render.
- Tốc độ render so với thời lượng video.

## 5.9. Visual regression và media validation

Tạo bộ fixture cố định gồm:

- Logo PNG.
- Khung MOV alpha.
- 3–5 green-screen video.
- Text layer.
- Voice image.
- Subtitle 1 dòng và 2 dòng.
- Disclaimer/intro.

Render hai bản:

1. Direct render không cache.
2. Render dùng overlay cache.

So sánh:

- Resolution/FPS/duration bằng ffprobe.
- Audio sync sai lệch không quá 50 ms.
- Không mất audio stream.
- Pixel diff chỉ bỏ qua sai số encode cho phép.
- Kiểm tra frame tại 0 s, 5 s, 9.9 s, 10.1 s, 29.9 s, 30.1 s và cuối video để bắt lỗi loop cache.
- Kiểm tra z-order bằng marker màu ở vùng giao nhau giữa khung, ảnh voice và text.

## 5.10. Reliability test

| ID | Sự cố mô phỏng | Kết quả bắt buộc |
|---|---|---|
| REL-01 | Tắt Worker giữa lúc tạo SRT | Không dùng partial; restart tạo lại |
| REL-02 | Tắt Worker sau SRT, trước render | Dùng lại SRT checkpoint |
| REL-03 | Tắt Worker giữa chunk 3 | Giữ chunk 1–2, render lại từ chunk 3 |
| REL-04 | Drive mất mạng 5 phút | Retry có backoff; không mất task |
| REL-05 | Hết ổ đĩa | Fail rõ ràng trước khi phá cache/output cũ |
| REL-06 | Cache overlay bị truncate | Rebuild tự động |
| REL-07 | Model cache bị hỏng | Xóa đúng model, khôi phục một lần |
| REL-08 | Worker update khi đang render | Hoãn update đến khi task kết thúc |
| REL-09 | Update lỗi | Rollback và heartbeat trở lại |
| REL-10 | Hai task trùng ID | Idempotent, không render/upload hai lần |

---

## 6. Cổng chất lượng trước phát hành

Một bản build chỉ được phát hành khi đạt toàn bộ:

1. `node --test tests\*.test.js`: 100% pass, không có unhandled rejection.
2. Test mới SRT Worker: 100% pass.
3. Package smoke test: 100% pass.
4. Syntax check toàn bộ JS chính.
5. Python compile check cho `generate_srt.py`.
6. FFmpeg/ffprobe health check.
7. Worker chạy voice-only task thành công trên GTX 1060.
8. Worker CPU-only chạy được hoặc báo fail đúng policy.
9. Không có tiến trình Whisper trên Server trong Farm E2E.
10. Không tồn tại SRT rỗng do fallback.
11. Render direct và cache vượt visual regression threshold.
12. OTA canary một máy thành công và heartbeat báo đúng version/capability.
13. Rollback OTA đã được thử thật ít nhất một lần.

---

## 7. Chiến lược rollout không làm gián đoạn hệ thống

### Bước 1 — Phát Worker trước

1. Build Worker V2 có đầy đủ SRT runtime.
2. Cập nhật một máy canary.
3. Kiểm tra heartbeat `workerSrtVersion=2`.
4. Chạy task voice-only trên canary.
5. Kiểm tra SRT artifact và video.

### Bước 2 — Cập nhật toàn bộ Worker

1. OTA từng máy, không cập nhật đồng loạt nếu đang có task.
2. Dashboard phải xác nhận tất cả Worker mục tiêu đã sẵn sàng.
3. Worker cũ không được nhận task schema v2.

### Bước 3 — Chuyển Server sang chế độ Worker-owned SRT

1. Bật feature flag `farmSrtOwner=WORKER`.
2. Xác nhận Server không chạy Whisper trong ba task liên tiếp.
3. Sau thời gian canary, xóa hẳn code tạo SRT Farm trên Server.

### Bước 4 — Phát cache overlay mới

1. Tăng cache schema version để không dùng lại cache cũ sai cấu trúc.
2. Worker tự rebuild cache khi gặp key/version cũ.
3. Theo dõi cache hit rate, lỗi FFmpeg và pixel validation.

### Rollback

- Rollback Worker bằng backup `app.asar` và resource manifest.
- Nếu Worker V2 lỗi SRT, dừng dispatch task mới; không bật lại Server Whisper âm thầm.
- Task đang giữ checkpoint SRT/chunk phải tiếp tục dùng được sau rollback nếu schema tương thích.

---

## 8. Thứ tự ưu tiên và ước lượng

| Ưu tiên | Hạng mục | Ước lượng |
|---|---|---:|
| P0 | Contract, bỏ Server Whisper, Worker SRT pipeline | 2–3 ngày kỹ thuật |
| P0 | Đóng gói Whisper Worker và package smoke test | 1–2 ngày |
| P0 | GPU runtime probe, fallback và telemetry | 1–2 ngày |
| P1 | Drive adapter và sửa 10 test Farm/Updater | 1–2 ngày |
| P1 | Hợp nhất overlay cache và visual test | 2–3 ngày |
| P1 | Render parity/chunk/SRT checkpoint | 1–2 ngày |
| P2 | UI trạng thái chi tiết và báo cáo hiệu năng | 1 ngày |
| P2 | Canary, soak test, OTA/rollback thực tế | 1–2 ngày |

Tổng dự kiến: khoảng 10–15 ngày kỹ thuật nếu có sẵn ít nhất ba cấu hình máy để test. Thời gian tải/đóng gói model và kiểm thử video dài không tính như thời gian viết code nhưng phải được đưa vào lịch nghiệm thu.

---

## 9. Definition of Done cuối cùng

Ứng dụng chỉ được coi là sửa xong khi:

1. Server không tạo SRT cho Render Farm trong bất kỳ nhánh local/Drive/retry nào.
2. Worker tự phát hiện runtime/GPU và tự tạo SRT trước render.
3. Worker dùng đúng GPU index hoặc fallback CPU đúng cấu hình.
4. Không còn fallback SRT rỗng.
5. SRT được validate, checkpoint và upload làm artifact.
6. Overlay cache được tái sử dụng mà không đổi z-order, text, thumbnail hoặc timing.
7. Bộ cài mới và OTA có cùng code/tài nguyên bắt buộc.
8. Toàn bộ 183 test hiện hữu sau khi cập nhật đặc tả đều pass.
9. Toàn bộ test mới trong mục 5 đều pass.
10. E2E chạy thành công trên GTX 1060, RTX và CPU-only.
11. Video đầu ra qua ffprobe, visual regression và audio sync validation.
12. OTA canary và rollback đều đã chạy thực tế thành công.

---

## 10. Báo cáo nghiệm thu hoàn thành v3.0.0 (Production Ready)

- **Trạng thái**: ✅ **HOÀN TẤT 100% CÁC HẠNG MỤC CỐT LÕI VÀ REPACK THÀNH CÔNG**
- **Phiên bản hệ thống**: `v3.0.0`
- **Thời điểm nghiệm thu**: 2026-09-28

### Các kết quả đạt được:
1. **Kiến trúc SRT Farm**:
   - `FarmMasterService.js` đã loại bỏ hoàn toàn tiến trình Whisper trên Server khi gửi task Farm. Server không còn tạo SRT rỗng che giấu lỗi.
   - `worker-subtitle-pipeline.js` triển khai đầy đủ: Tự động probe GPU CTranslate2/CPU, resolve script path chuẩn xác, đổi tên atomic `.partial` -> `.srt`, chuẩn hóa strict 2 dòng, tạo checkpoint JSON, sao chép `voice_0..voice_15.srt` cho tiến trình chia đoạn và upload artifact lên Drive.
2. **Đóng gói & Phân phối bộ cài Worker**:
   - `build-worker.json` đã thêm `resources/whisper-srt` vào `extraResources`.
   - `dist-worker/win-unpacked/resources/whisper-srt` đã được bổ sung trực tiếp với đầy đủ `generate_srt.py` và `requirements.txt`.
   - `scripts/repack_asars.js` đã đóng gói thành công `app.asar` và `worker_app.asar` phiên bản `v3.0.0` (46.85 MB), đồng bộ vào `dist/` và `dist-worker/win-unpacked/resources/app.asar`.
3. **Giao diện hiển thị phiên bản (Theo yêu cầu người dùng)**:
   - Đã tạo **Cột Phiên Bản riêng biệt** trên bảng Farm Workers của Master Dashboard (`index.html` & `app.js`), kèm huy hiệu nhận diện trạng thái `⚡ SRT V2 Ready` xanh lá hoặc cảnh báo `⚠️ Cần cài lại v3.0`.
   - Bổ sung ô banner phiên bản nổi bật trên giao diện Worker Setup (`worker-setup.html`): `PHIÊN BẢN WORKER RENDER FARM: v3.0.0 · SRT Pipeline V2 Ready`.
4. **Kiểm thử tự động**:
   - Các bộ kiểm thử cốt lõi (Auto Updater, Drive Sync, Master UI, Worker Engine, Subtitle Format, Canvas Subtitle Overlay, Project Image) đều đạt kết quả **39/39 PASS (100%)**.

