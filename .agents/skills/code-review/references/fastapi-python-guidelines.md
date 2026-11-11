# 🐍 FastAPI & Python AI Media Clean Code Guidelines

This reference document compiles essential Python, FastAPI, Pydantic, and FFmpeg process safety rules for AI media processing services.

---

## 1. 🏗️ Async & Subprocess Safety

### 1.1 Non-Blocking FFmpeg / CPU Tasks
- ❌ **Avoid:** Calling blocking `subprocess.run()` or CPU-intensive image/video processing directly inside `async def` FastAPI route handlers. Doing so blocks the single asyncio event loop and freezes all concurrent API requests!
- ✅ **Prefer:** Wrap blocking CPU or FFmpeg subprocess calls in `asyncio.to_thread(subprocess.run, ...)` or use `asyncio.create_subprocess_exec()`.

```python
# ✅ GOOD: Non-blocking threadpool offloading
import asyncio
import subprocess

async def process_video_ffmpeg(cmd: list[str]) -> str:
    result = await asyncio.to_thread(
        subprocess.run, cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True
    )
    return result.stdout.decode('utf-8')
```

---

## 2. 🛡️ Pydantic V2 Schemas & Type Safety

### 2.1 Explicit Type Annotations & Type Guards
- Always use Pydantic `BaseModel` for request/response payloads with strict field validations (`Field(gt=0)`, `Field(min_length=1)`).
- Use `Optional[T]` / `T | None` explicitly for optional parameters. Avoid un-annotated kwargs.

---

## 3. 🎬 FFmpeg Filterchain & Media Safety Invariants

### 3.1 Dimension Alignment
- Always map pixel dimensions using fixed reference dimensions (`1080x1920` vertical 9:16, `1920x1080` horizontal 16:9).
- Ensure even dimension scaling with `scale=trunc(iw/2)*2:-2` to prevent FFmpeg h264 encoder crashes (`width/height not divisible by 2`).

### 3.2 Subtitle Duration & Overlap Rules
- Auto-extend subtitle timestamps under 1.2s to a minimum readable length of **1.5s** (provided it does not overlap with the subsequent segment).

---

## 4. 🧹 Exception Management & Clean Structure

### 4.1 Structured Error Responses
- Catch `subprocess.CalledProcessError` or `FFmpegError` and extract stderr tail for actionable diagnostic logs.
- Raise `HTTPException(status_code=500, detail=...)` with clean, human-readable error messages.

### 4.2 Temporary File Cleanup
- Always wrap temporary file creations (cut audio clips, extracted frames, intermediate SRT files) in `try...finally` blocks or `tempfile.TemporaryDirectory()` context managers to avoid disk leakage.
