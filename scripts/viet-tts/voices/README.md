# Custom Viet-TTS Voice Reference Samples

Đặt các file giọng mẫu `.wav` (khuyến nghị 5–15 giây, rõ tiếng, ít tạp âm) vào thư mục này để `scripts/generateCasterAudio.mjs` tự động clone theo sắc thái `tone`:

- `blv_hype.wav` — giọng cao trào / la hét (`tone: "hype"`)
- `blv_normal.wav` — giọng dứt khoát / rõ chữ (`tone: "normal"`)
- `blv_calm.wav` — giọng trầm / dịu (`tone: "calm"`)

Nếu chưa có file `.wav` tương ứng, script sẽ tự động fallback về giọng built-in (`cdteam`) của `viet-tts` kèm tốc độ và bộ lọc FFmpeg tương ứng từng `tone`.
