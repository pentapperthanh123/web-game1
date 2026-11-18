# Viet-TTS Service (`dangvansam/viet-tts`) Setup & Batch Audio Tool

Tích hợp mô hình **Viet-TTS** ([huggingface.co/dangvansam/viet-tts](https://huggingface.co/dangvansam/viet-tts)) làm hệ thống chuyển đổi văn bản sang giọng nói tiếng Việt độc lập (chuẩn OpenAI `/v1/audio/speech`).

## 1. Khởi chạy Viet-TTS Service bằng Docker (Bản vá CPU FP32)

Bản gốc của `dangvansam/viet-tts` yêu cầu NVIDIA GPU và ép kiểu `.half()` (FP16). Bộ Docker tại thư mục này đã được vá tự động sang `float32` khi chạy trên CPU và dùng `onnxruntime` CPU để chạy mượt trên máy không có card rời NVIDIA:

```bash
# Cách 1: Chạy bằng pnpm từ thư mục gốc
pnpm run viet-tts:docker

# Cách 2: Chạy file .bat trực tiếp
scripts\viet-tts\start-viet-tts.bat
```

- Lần khởi chạy đầu tiên, container sẽ tự động tải bộ trọng số (~2.5 GB) từ HuggingFace `dangvansam/viet-tts` vào `scripts/viet-tts/pretrained-models/` (được lưu vĩnh viễn trên ổ cứng, các lần sau không cần tải lại).
- Theo dõi tiến trình tải model:
  ```bash
  docker logs -f viet-tts-service
  ```
- Kiểm tra service đã sẵn sàng:
  ```bash
  curl http://localhost:8298/health
  # Trả về: VietTTS API is running...
  ```

## 2. Chạy Tool chuyển đổi toàn bộ câu thoại sang Audio riêng

Sau khi service tại `http://localhost:8298` đã sẵn sàng (hoặc nếu bạn có URL server GPU từ xa), chạy lệnh:

```bash
# Chuyển đổi toàn bộ 2,088 câu thoại tĩnh (Giọng Nam: cdteam, Giọng Nữ: quynh)
pnpm run pregenerate:viet-tts

# Hoặc chạy thử trước 5 câu đầu tiên để kiểm tra chất lượng giọng:
node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --limit=5 --force

# Chuyển đổi 1 câu bất kỳ:
node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --text="Baron Nashor tung Đại Địa Chấn Hư Không!" --force

# Chuyển đổi từ file danh sách câu thoại riêng (.txt, mỗi dòng 1 câu):
node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --input-file=my-lines.txt --force

# Đổi sang giọng đọc khác (VD: nsnd-le-chuc, atuan, son-tung-mtp, nguyen-ngoc-ngan) hoặc trỏ tới GPU Server từ xa:
node scripts/sfx/pregenerate-caster-tts.mjs --provider=VIET_TTS --url=http://localhost:8298 --voice-male=nsnd-le-chuc --voice-female=nu-nhe-nhang --force
```

## 3. Nơi lưu trữ kết quả âm thanh

Mỗi câu thoại sau khi chuyển đổi sẽ được lưu đồng thời vào **2 nơi**:
1. **Thư mục riêng dễ quản lý**: `server/data/viet-tts-audio/`
   - Tên file rõ ràng: `0001_BOSS_SKILL_cdteam_<hash>.mp3`
   - Kèm file danh mục `server/data/viet-tts-audio/manifest.json` ánh xạ từng câu thoại, phân loại, giọng đọc và tên file `.mp3`.
2. **Thư mục Cache trực tiếp của Game**: `server/data/tts-cache/`
   - Đồng bộ sẵn toàn bộ mã băm SHA1 để Server phát ngay lập tức với **độ trễ 0ms**.

## 4. Bật Viet-TTS trực tiếp cho Game Server (Live TTS)

Để Game Server dùng trực tiếp `Viet-TTS` cho cả các câu thoại động (như đọc tên người xem donate/triệu hồi), đặt biến môi trường khi chạy server:

```env
CASTER_TTS_PROVIDER=VIET_TTS
VIET_TTS_URL=http://localhost:8298
VIET_TTS_VOICE_MALE=cdteam
VIET_TTS_VOICE_FEMALE=quynh
CASTER_TTS_FALLBACK_VOICE=GOOGLE
```
